import { ECARGOWARE_BASE_URL, getEcargowareOperation, type EcargowareOperation } from "./ecargoware-catalog";
import type { CargoIntegrationRuntimeConfig } from "@/lib/services/cargo-integration-store";

export type EcargowareExecuteInput = {
  operationId: string;
  simulate?: boolean;
  body?: unknown;
  query?: Record<string, string>;
  pathParams?: Record<string, string>;
};

export type EcargowareExecutionResult = {
  mode: "live" | "simulation";
  status: number | "not-configured";
  ok: boolean;
  operation: Pick<EcargowareOperation, "id" | "group" | "label" | "method" | "path">;
  request: {
    url: string;
    method: string;
    query?: Record<string, string>;
    pathParams?: Record<string, string>;
    body?: unknown;
  };
  response: unknown;
  message?: string;
};

export type EcargowareTestResult = {
  ok: boolean;
  status?: number;
  message: string;
};

export function isEcargowareConfigured(config?: CargoIntegrationRuntimeConfig | null) {
  if (config?.enabled) {
    return Boolean(
      config.authMode === "bearer"
        ? config.bearerToken
        : config.username && config.password && config.company && config.application,
    );
  }
  return Boolean(
    process.env.ECARGOWARE_BEARER_TOKEN ||
      (
        process.env.ECARGOWARE_USERNAME &&
        process.env.ECARGOWARE_PASSWORD &&
        process.env.ECARGOWARE_COMPANY &&
        process.env.ECARGOWARE_APPLICATION
      ),
  );
}

export async function executeEcargowareOperation(
  input: EcargowareExecuteInput,
  config?: CargoIntegrationRuntimeConfig | null,
): Promise<EcargowareExecutionResult> {
  const operation = getEcargowareOperation(input.operationId);
  if (!operation) {
    throw new Error("Unknown eCargoWare operation.");
  }

  const url = buildUrl(operation, input.query, input.pathParams, config);
  const request = {
    url: url.toString(),
    method: operation.method,
    query: input.query,
    pathParams: input.pathParams,
    body: input.body,
  };

  if (input.simulate) {
    return simulateEcargowareOperation(operation, request);
  }

  const token = await getAccessToken(config);
  if (!token) {
    return {
      mode: "live",
      status: "not-configured",
      ok: false,
      operation: pickOperation(operation),
      request,
      response: null,
      message:
        "eCargoWare credentials are not configured for this GSA. Open Company Profile > Integrations and connect the cargo system first.",
    };
  }

  const init: RequestInit = {
    method: operation.method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  };

  if (operation.method !== "GET") {
    init.headers = {
      ...init.headers,
      "Content-Type": "application/json",
    };
    init.body = JSON.stringify(input.body ?? {});
  }

  const response = await fetch(url, init);
  const parsed = await parseResponse(response);

  return {
    mode: "live",
    status: response.status,
    ok: response.ok,
    operation: pickOperation(operation),
    request,
    response: parsed,
  };
}

export async function testEcargowareConnection(config: CargoIntegrationRuntimeConfig): Promise<EcargowareTestResult> {
  if (!config.enabled) {
    return { ok: false, message: "Integration is disabled." };
  }
  if (!isEcargowareConfigured(config)) {
    return { ok: false, message: "Credentials are incomplete." };
  }

  try {
    const token = await getAccessToken(config);
    if (!token) return { ok: false, message: "Could not obtain an access token." };

    if (!config.iataNo) {
      return {
        ok: true,
        message: "Credentials are present. Add an IATA number to run a live booking-list probe.",
      };
    }

    const url = new URL("/cargo-api/booking/list-booking", config.baseUrl || ECARGOWARE_BASE_URL);
    url.searchParams.set("iataNo", config.iataNo);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (response.ok || response.status === 404 || response.status === 204) {
      return {
        ok: true,
        status: response.status,
        message: `Connection reached eCargoWare/WebCargo with HTTP ${response.status}.`,
      };
    }
    const parsed = await parseResponse(response);
    return {
      ok: false,
      status: response.status,
      message: `Connection reached the API but was rejected with HTTP ${response.status}: ${summarizeResponse(parsed)}`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Connection test failed.",
    };
  }
}

function buildUrl(
  operation: EcargowareOperation,
  query: Record<string, string> | undefined,
  pathParams: Record<string, string> | undefined,
  config?: CargoIntegrationRuntimeConfig | null,
) {
  const baseUrl = config?.baseUrl || process.env.ECARGOWARE_BASE_URL || ECARGOWARE_BASE_URL;
  let path = operation.path;

  for (const param of operation.pathParams ?? []) {
    const value = pathParams?.[param]?.trim();
    if (!value) {
      throw new Error(`Missing path parameter: ${param}`);
    }
    path = path.replace(`{${param}}`, encodeURIComponent(value));
  }

  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query ?? {})) {
    const cleanValue = String(value ?? "").trim();
    if (cleanValue) url.searchParams.set(key, cleanValue);
  }
  return url;
}

async function getAccessToken(config?: CargoIntegrationRuntimeConfig | null) {
  if (config?.authMode === "bearer" && config.bearerToken) {
    return stripBearer(config.bearerToken);
  }
  if (config?.authMode === "login") {
    const token = await requestLoginToken({
      baseUrl: config.baseUrl || ECARGOWARE_BASE_URL,
      username: config.username,
      password: config.password,
      company: config.company,
      application: config.application,
    });
    if (token) return token;
  }

  if (process.env.ECARGOWARE_BEARER_TOKEN) {
    return process.env.ECARGOWARE_BEARER_TOKEN;
  }

  const username = process.env.ECARGOWARE_USERNAME;
  const password = process.env.ECARGOWARE_PASSWORD;
  const company = process.env.ECARGOWARE_COMPANY;
  const application = process.env.ECARGOWARE_APPLICATION;
  if (!username || !password || !company || !application) {
    return null;
  }

  return requestLoginToken({ baseUrl: process.env.ECARGOWARE_BASE_URL || ECARGOWARE_BASE_URL, username, password, company, application });
}

async function requestLoginToken({
  baseUrl,
  username,
  password,
  company,
  application,
}: {
  baseUrl: string;
  username?: string;
  password?: string;
  company?: string;
  application?: string;
}) {
  if (!username || !password || !company || !application) return null;

  const response = await fetch(new URL("/security/getToken", baseUrl), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_name: username,
      password,
      company,
      application,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`eCargoWare token request failed with ${response.status}.`);
  }

  const parsed = await parseResponse(response);
  return extractToken(parsed);
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractToken(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const direct =
    record.token ??
    record.access_token ??
    record.accessToken ??
    record.jwt ??
    record.id_token ??
    record.idToken;
  if (typeof direct === "string") return stripBearer(direct);

  for (const nested of Object.values(record)) {
    const token = extractToken(nested);
    if (token) return token;
  }
  return null;
}

function stripBearer(value: string) {
  return value.replace(/^Bearer\s+/i, "").trim();
}

function summarizeResponse(value: unknown) {
  if (!value) return "no response body";
  if (typeof value === "string") return value.slice(0, 180);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const message = record.message ?? record.error ?? record.errorMsg ?? record.status;
    if (typeof message === "string") return message.slice(0, 180);
  }
  return "response body received";
}

function pickOperation(operation: EcargowareOperation) {
  return {
    id: operation.id,
    group: operation.group,
    label: operation.label,
    method: operation.method,
    path: operation.path,
  };
}

function simulateEcargowareOperation(
  operation: EcargowareOperation,
  request: EcargowareExecutionResult["request"],
): EcargowareExecutionResult {
  return {
    mode: "simulation",
    status: 200,
    ok: true,
    operation: pickOperation(operation),
    request,
    response: buildSimulationResponse(operation.id, request),
    message: "Simulation only. No cargo-system API request was sent.",
  };
}

function buildSimulationResponse(operationId: string, request: EcargowareExecutionResult["request"]) {
  const body = asRecord(request.body);
  const route = `${body.origin ?? request.query?.origin ?? "FRA"}-${body.destination ?? request.query?.destination ?? "JED"}`;
  const awb = body.awbNo ?? body.awbno ?? request.pathParams?.awbno ?? "16012345678";

  if (operationId.includes("rate") || operationId.includes("routes")) {
    return {
      quoteId: `sim-rate-${Date.now()}`,
      route,
      rates: [
        { product: body.productType ?? "GENERAL", currency: "EUR", ratePerKg: 1.85, minimumCharge: 45, routing: route, availableKg: 3200 },
        { product: "EXPRESS", currency: "EUR", ratePerKg: 2.4, minimumCharge: 100, routing: route, availableKg: 1200 },
      ],
      nextAction: "Create a contract quote or request airline approval if the customer rate is below floor.",
    };
  }

  if (operationId.includes("booking")) {
    return {
      bookingId: `sim-booking-${Date.now()}`,
      awbNo: awb,
      status: operationId.includes("cancel") ? "cancelled" : operationId.includes("search") ? "found" : "confirmed",
      route,
      flight: body.flight ?? "SV170",
      flightDate: body.flightDate ?? request.query?.flightFromDate ?? "2026-06-01",
      nextAction: operationId.includes("cancel")
        ? "Mark the AirGSA booking as cancelled and release capacity."
        : "Persist AWB, revenue, and flown status against the contract booking.",
    };
  }

  if (operationId.includes("tracking")) {
    return {
      awbNo: awb,
      status: "in-transit",
      milestones: [
        { station: "FRA", event: "Received from agent", time: "2026-06-01T08:00:00Z" },
        { station: "FRA", event: "Departed on booked flight", time: "2026-06-01T14:30:00Z" },
        { station: "JED", event: "Expected arrival", time: "2026-06-02T03:15:00Z" },
      ],
    };
  }

  return {
    simulated: true,
    operationId,
    request,
    nextAction: "Review the mapped payload before enabling the live API call.",
  };
}

function asRecord(value: unknown): Record<string, string | number | boolean | null | undefined> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, string | number | boolean | null | undefined>;
}
