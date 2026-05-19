import "./load-env.mjs";
import crypto from "node:crypto";

const baseUrl = process.env.WORKFLOW_SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
const cookieName = process.env.NODE_ENV === "production" ? "__Host-airgsa-session" : "airgsa-session";
const secret =
  process.env.AUTH_SESSION_SECRET ||
  process.env.SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "airgsa-development-session-secret-change-me";

const runId = `smoke-${Date.now()}`;
let createdTenderId = null;

const airlineSession = {
  email: `airline-${runId}@airgsa.test`,
  role: "airline",
  accessRole: "admin",
  name: "Workflow Smoke Airline",
  company: "Smoke Cargo",
  companyId: `airline-${runId}`,
};

const gsaSession = {
  email: `gsa-${runId}@airgsa.test`,
  role: "gsa",
  accessRole: "admin",
  name: "Workflow Smoke GSA",
  company: "Smoke GSA Partner",
  companyId: `gsa-${runId}`,
};

function signSession(payload) {
  const now = Math.floor(Date.now() / 1000);
  const signedPayload = {
    ...payload,
    iat: now,
    exp: now + 60 * 60,
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

async function json(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function expectOk(response, label) {
  if (response.ok) return json(response);
  const body = await json(response);
  throw new Error(`${label} failed with ${response.status}: ${body?.error ?? response.statusText}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const route = {
    id: `route-${runId}`,
    origin: "JED",
    destination: "FRA",
    operatingDays: "Mon/Wed/Fri",
    frequencyPerWeek: 3,
    aircraft: "B777F",
  };

  const tenderPayload = {
    title: `Workflow Smoke Tender ${runId}`,
    countryScope: "Saudi Arabia - Germany",
    regions: ["DACH"],
    lanes: "JED-FRA",
    annualTonnage: 120000,
    productMix: "General cargo and pharma",
    deadline: "2026-06-30",
    expectedStart: "2026-07-15",
    status: "open",
    awardMode: "single",
    maxAwards: 1,
    commercialModel: "commission",
    requirements: ["GDP capable", "Weekly sales reporting"],
    commercialExpectations: "Commission proposal with named account activation plan",
    routes: [route],
    attachments: [],
  };

  const tenderResponse = await request("/api/tenders", airlineSession, {
    method: "POST",
    body: JSON.stringify(tenderPayload),
  });
  const tender = (await expectOk(tenderResponse, "Create tender")).tender;
  assert(tender?.id, "Tender response has no id");
  createdTenderId = tender.id;
  assert(tender.airlineCompanyId === airlineSession.companyId, "Tender did not persist airline company id");

  const applicationPayload = {
    proposedCommission: "5% net-net commission with volume accelerator",
    launchTimeline: "4 weeks from award",
    namedAccountCoverage: "DHL Global Forwarding, Kuehne+Nagel, DB Schenker",
    monthlySalesTarget: "35 t/month",
    networkPlan:
      "Activate named forwarders in Frankfurt and Riyadh, weekly pipeline review, pharma lane launch in first month.",
    operationalReadiness:
      "Dedicated GSA owner, daily booking desk coverage, weekly airline report, escalation path for pricing approvals.",
    documents: [],
  };

  const applicationResponse = await request(`/api/tenders/${tender.id}/applications`, gsaSession, {
    method: "POST",
    body: JSON.stringify(applicationPayload),
  });
  const application = (await expectOk(applicationResponse, "Create application")).application;
  assert(application?.id, "Application response has no id");
  assert(application.gsaCompanyId === gsaSession.companyId, "Application did not persist GSA company id");

  const acceptResponse = await request(`/api/applications/${application.id}`, airlineSession, {
    method: "PATCH",
    body: JSON.stringify({ status: "accepted" }),
  });
  const acceptedPayload = await expectOk(acceptResponse, "Accept application");
  assert(acceptedPayload.application?.status === "accepted", "Application was not accepted");

  const contractsResponse = await request("/api/contracts", airlineSession);
  const contracts = (await expectOk(contractsResponse, "List airline contracts")).contracts ?? [];
  const contract = contracts.find((item) => item.sourceApplicationId === application.id);
  assert(contract, "Accepted application did not create a contract");
  assert(contract.airlineCompanyId === airlineSession.companyId, "Contract airline company id mismatch");
  assert(contract.gsaCompanyId === gsaSession.companyId, "Contract GSA company id mismatch");
  assert(contract.tenderId === tender.id, "Contract tender id mismatch");
  assert(contract.contractRoutes?.some((item) => item.id === route.id), "Tender route was not copied to contract");

  const assignResponse = await request(`/api/contracts/${contract.id}/routes`, airlineSession, {
    method: "POST",
    body: JSON.stringify({ routeId: route.id }),
  });
  const assignedContract = (await expectOk(assignResponse, "Assign route")).contract;
  const assignedRoute = assignedContract?.contractRoutes?.find((item) => item.id === route.id);
  assert(assignedRoute?.status === "assigned", "Route was not marked assigned on contract");

  const gsaRoutesResponse = await request("/api/gsa/routes", gsaSession);
  const gsaRoutes = (await expectOk(gsaRoutesResponse, "List GSA routes")).routes ?? [];
  const visibleRoute = gsaRoutes.find((item) => item.contractId === contract.id && item.id === route.id);
  assert(visibleRoute, "Assigned route is not visible to the GSA");
  assert(visibleRoute.gsaCompanyId === gsaSession.companyId, "GSA route company id mismatch");

  console.log(JSON.stringify({
    ok: true,
    runId,
    tenderId: tender.id,
    applicationId: application.id,
    contractId: contract.id,
    routeId: route.id,
    checks: [
      "airline created tender",
      "gsa submitted application",
      "airline accepted application",
      "contract created with airlineCompanyId, gsaCompanyId, tenderId and sourceApplicationId",
      "tender route copied to contract",
      "airline assigned route through API",
      "gsa can see assigned route through API",
    ],
  }, null, 2));
}

main()
  .then(cleanup)
  .catch(async (error) => {
    await cleanup();
    console.error(error.message);
    process.exit(1);
  });

async function cleanup() {
  if (!createdTenderId || process.env.WORKFLOW_SMOKE_KEEP_DATA === "true") return;
  const response = await request(`/api/tenders/${createdTenderId}`, airlineSession, { method: "DELETE" });
  if (!response.ok) {
    const body = await json(response);
    console.warn(`Workflow smoke cleanup failed for ${createdTenderId}: ${response.status} ${body?.error ?? response.statusText}`);
  }
}
