import "./load-env.mjs";
import crypto from "node:crypto";

const baseUrl = process.env.PERMISSION_TEST_BASE_URL ?? "http://127.0.0.1:3000";
const cookieName = process.env.NODE_ENV === "production" ? "__Host-airgsa-session" : "airgsa-session";
const secret =
  process.env.AUTH_SESSION_SECRET ||
  process.env.SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "airgsa-development-session-secret-change-me";

const adminSession = {
  email: "permission-admin@airgsa.test",
  role: "admin",
  accessRole: "owner",
  name: "Permission Admin",
  company: "AirGSA",
};

function signSession(payload, overrides = {}) {
  const now = overrides.now ?? Math.floor(Date.now() / 1000);
  const signedPayload = {
    ...payload,
    iat: now,
    exp: overrides.exp ?? now + 60 * 60 * 24 * 7,
  };
  const body = Buffer.from(JSON.stringify(signedPayload), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${cookieName}=${body}.${signature}`;
}

async function request(path, session, init = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set("cookie", signSession(session));
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });
}

async function requestWithCookie(path, cookie, init = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set("cookie", cookie);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });
}

async function requestWithoutSession(path, init = {}) {
  return fetch(`${baseUrl}${path}`, init);
}

async function json(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sessionFromContract(contract, role, overrides = {}) {
  if (role === "airline") {
    return {
      email: contract.airlineEmail,
      role: "airline",
      accessRole: "admin",
      name: "Airline User",
      company: contract.airline,
      companyId: contract.airlineCompanyId,
      ...overrides,
    };
  }

  return {
    email: contract.email ?? "gsa-owner@airgsa.test",
    role: "gsa",
    accessRole: "admin",
    name: contract.contactName ?? "GSA User",
    company: contract.gsaName,
    companyId: contract.gsaCompanyId,
    ...overrides,
  };
}

async function main() {
  const contractsResponse = await request("/api/contracts", adminSession);
  assert(contractsResponse.ok, `Admin could not list contracts: ${contractsResponse.status}`);
  assert(contractsResponse.headers.get("x-content-type-options") === "nosniff", "Security header X-Content-Type-Options missing");
  assert(contractsResponse.headers.get("x-frame-options") === "DENY", "Security header X-Frame-Options missing");
  assert(contractsResponse.headers.get("cache-control")?.includes("no-store"), "API cache-control header missing");
  const contractsPayload = await json(contractsResponse);
  const contracts = contractsPayload?.contracts ?? [];
  assert(contracts.length > 0, "Permission check needs at least one contract. Run the workflow seed or create a contract first.");

  const contract = contracts.find((item) => item.status === "active") ?? contracts[0];
  const foreignAirline = {
    email: "foreign-airline@airgsa.test",
    role: "airline",
    accessRole: "admin",
    name: "Foreign Airline",
    company: "Foreign Airline",
    companyId: "foreign-airline-company",
  };
  const foreignGsa = {
    email: "foreign-gsa@airgsa.test",
    role: "gsa",
    accessRole: "admin",
    name: "Foreign GSA",
    company: "Foreign GSA",
    companyId: "foreign-gsa-company",
  };
  const operatorAirline = sessionFromContract(contract, "airline", {
    email: "operator-airline@airgsa.test",
    accessRole: "operator",
  });
  const ownerGsa = sessionFromContract(contract, "gsa");

  const foreignContractResponse = await request(`/api/contracts/${contract.id}`, foreignAirline);
  assert(foreignContractResponse.status === 404, "Foreign airline can read another airline contract");

  const foreignContractsResponse = await request("/api/contracts", foreignAirline);
  assert(foreignContractsResponse.ok, `Foreign airline contract list failed: ${foreignContractsResponse.status}`);
  const foreignContracts = (await json(foreignContractsResponse))?.contracts ?? [];
  assert(!foreignContracts.some((item) => item.id === contract.id), "Foreign airline list leaks another airline contract");

  const foreignRoutesResponse = await request("/api/gsa/routes", foreignGsa);
  assert(foreignRoutesResponse.ok, `Foreign GSA routes failed: ${foreignRoutesResponse.status}`);
  const foreignRoutes = (await json(foreignRoutesResponse))?.routes ?? [];
  assert(!foreignRoutes.some((route) => route.contractId === contract.id), "Foreign GSA can see another GSA route");

  const foreignAdminRegistrationsResponse = await request("/api/admin/registrations", foreignAirline);
  assert(foreignAdminRegistrationsResponse.status === 403, "Foreign airline can read admin registrations");

  const unauthenticatedFlightsResponse = await requestWithoutSession("/api/flights/saudia");
  assert(unauthenticatedFlightsResponse.status === 401, "Unauthenticated user can read flight API");

  const expiredAt = Math.floor(Date.now() / 1000) - 60;
  const expiredSessionResponse = await requestWithCookie(
    "/api/contracts",
    signSession(adminSession, { now: expiredAt - 60, exp: expiredAt }),
  );
  assert(expiredSessionResponse.status === 401, "Expired session cookie is accepted");

  const ownerGsaContractsResponse = await request("/api/contracts", ownerGsa);
  assert(ownerGsaContractsResponse.ok, `Owner GSA contract list failed: ${ownerGsaContractsResponse.status}`);
  const ownerGsaContracts = (await json(ownerGsaContractsResponse))?.contracts ?? [];
  assert(ownerGsaContracts.some((item) => item.id === contract.id), "Owner GSA cannot see its own contract");

  const operatorPatchResponse = await request(`/api/contracts/${contract.id}`, operatorAirline, {
    method: "PATCH",
    body: JSON.stringify({ status: contract.status }),
  });
  assert(
    operatorPatchResponse.status === 403 || operatorPatchResponse.status === 404,
    `Airline operator can edit contract: ${operatorPatchResponse.status}`,
  );

  console.log(JSON.stringify({
    ok: true,
    contractId: contract.id,
    checks: [
      "foreign airline cannot read contract",
      "security headers are present on API responses",
      "foreign airline list does not leak contract",
      "foreign GSA cannot read assigned routes",
      "foreign airline cannot read admin registrations",
      "unauthenticated user cannot read flight API",
      "expired session cookie is rejected",
      "owner GSA can read own contract",
      "airline operator cannot edit contract",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
