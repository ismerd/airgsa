import { ECARGOWARE_BASE_URL, getEcargowareOperation, type EcargowareOperation } from "./ecargoware-catalog";

export type EcargowareExecuteInput = {
  operationId: string;
  body?: unknown;
  query?: Record<string, string>;
  pathParams?: Record<string, string>;
};

export type EcargowareExecutionResult = {
  mode: "live";
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

export function isEcargowareConfigured() {
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

export async function executeEcargowareOperation(input: EcargowareExecuteInput): Promise<EcargowareExecutionResult> {
  const operation = getEcargowareOperation(input.operationId);
  if (!operation) {
    throw new Error("Unknown eCargoWare operation.");
  }

  const url = buildUrl(operation, input.query, input.pathParams);
  const token = await getAccessToken();
  const request = {
    url: url.toString(),
    method: operation.method,
    query: input.query,
    pathParams: input.pathParams,
    body: input.body,
  };

  if (!token) {
    return {
      mode: "live",
      status: "not-configured",
      ok: false,
      operation: pickOperation(operation),
      request,
      response: null,
      message:
        "eCargoWare credentials are not configured. Live cargo-system execution is disabled until server credentials are set.",
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

function buildUrl(
  operation: EcargowareOperation,
  query: Record<string, string> | undefined,
  pathParams: Record<string, string> | undefined,
) {
  const baseUrl = process.env.ECARGOWARE_BASE_URL || ECARGOWARE_BASE_URL;
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

async function getAccessToken() {
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

  const baseUrl = process.env.ECARGOWARE_BASE_URL || ECARGOWARE_BASE_URL;
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

function pickOperation(operation: EcargowareOperation) {
  return {
    id: operation.id,
    group: operation.group,
    label: operation.label,
    method: operation.method,
    path: operation.path,
  };
}
