import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
const STORE_PATH = path.join(process.cwd(), "data", "tender-workflow.json");

const tenderSeeds = [
  {
    id: "tnd-demo-benelux-2026",
    title: "Saudi Cargo representation Benelux",
    countryScope: "Netherlands, Belgium, Luxembourg",
    regions: ["Netherlands", "Belgium", "Luxembourg"],
    lanes: "AMS-JED, BRU-RUH, LGG-JED",
    annualTonnage: 18500,
    productMix: "Pharma, perishables, e-commerce, general cargo",
    deadline: "2026-06-12",
    expectedStart: "2026-07-15",
    status: "open",
    awardMode: "multi",
    maxAwards: 2,
    commercialModel: "hybrid",
    requirements: [
      "IATA / CASS capability",
      "GDP-qualified pharma sales coverage",
      "Named forwarder account pipeline across AMS, BRU and LGG",
      "Weekly pipeline and route performance reporting",
    ],
    commercialExpectations:
      "Saudia Cargo is looking for a Benelux GSA with strong pharma and e-commerce account access, active sales coverage in Amsterdam, Brussels and Liege, and the ability to grow both freighter and belly cargo flows into JED and RUH.",
    routes: [
      route("AMS", "JED", "Tue/Fri", 2, "Belly and freighter feed"),
      route("BRU", "RUH", "Wed/Sat", 2, "Pharma focus"),
      route("LGG", "JED", "Mon", 1, "Cargo uplift opportunity"),
    ],
    createdAt: "2026-05-14T18:05:00.000Z",
  },
  {
    id: "tnd-demo-uk-ireland-2026",
    title: "Saudi Cargo UK and Ireland sales mandate",
    countryScope: "United Kingdom, Ireland",
    regions: ["United Kingdom", "Ireland"],
    lanes: "LHR-JED, MAN-RUH, DUB-JED",
    annualTonnage: 14200,
    productMix: "Express, mail, e-commerce, high-value cargo",
    deadline: "2026-06-20",
    expectedStart: "2026-08-01",
    status: "open",
    awardMode: "single",
    maxAwards: 1,
    commercialModel: "capacity-risk",
    requirements: [
      "UK and Ireland field sales coverage",
      "Experience with express, mail and e-commerce cargo",
      "Local customer service desk with airline handover process",
      "Monthly sales forecast and key account conversion report",
    ],
    commercialExpectations:
      "The selected GSA should build a focused sales pipeline for UK and Ireland forwarders, prioritize high-yield express and e-commerce traffic, and support a structured launch plan for LHR, MAN and DUB origin cargo.",
    routes: [
      route("LHR", "JED", "Mon/Thu/Sun", 3, "Belly cargo focus"),
      route("MAN", "RUH", "Tue/Fri", 2, "Express and e-commerce"),
      route("DUB", "JED", "Sat", 1, "RFS feed accepted"),
    ],
    createdAt: "2026-05-14T18:04:00.000Z",
  },
  {
    id: "tnd-demo-france-2026",
    title: "Saudi Cargo France representation",
    countryScope: "France",
    regions: ["France"],
    lanes: "CDG-JED, CDG-RUH, LYS-JED",
    annualTonnage: 16800,
    productMix: "Pharma, luxury goods, perishables, general cargo",
    deadline: "2026-06-18",
    expectedStart: "2026-08-05",
    status: "open",
    awardMode: "single",
    maxAwards: 1,
    commercialModel: "commission",
    requirements: [
      "France-wide forwarder coverage",
      "Strong CDG cargo sales presence",
      "Pharma and high-value cargo process knowledge",
      "Named key-account plan for the first 90 days",
    ],
    commercialExpectations:
      "The France mandate focuses on CDG-origin cargo with selective regional feed from Lyon and Marseille. Saudia expects disciplined account planning, weekly opportunity review, and fast conversion of high-yield pharma and luxury cargo.",
    routes: [
      route("CDG", "JED", "Mon/Wed/Fri", 3, "Belly and freighter capacity"),
      route("CDG", "RUH", "Tue/Sat", 2, "High-yield cargo focus"),
      route("LYS", "JED", "Thu", 1, "Regional feed"),
    ],
    createdAt: "2026-05-14T18:03:00.000Z",
  },
  {
    id: "tnd-demo-dach-pharma-2026",
    title: "Saudia Cargo DACH pharma and industrial sales",
    countryScope: "Germany, Austria, Switzerland",
    regions: ["Germany", "Austria", "Switzerland"],
    lanes: "FRA-JED, FRA-RUH, MUC-JED, ZRH-JED",
    annualTonnage: 23600,
    productMix: "Pharma, automotive, machinery, express cargo",
    deadline: "2026-06-05",
    expectedStart: "2026-07-01",
    status: "open",
    awardMode: "multi",
    maxAwards: 2,
    commercialModel: "hybrid",
    requirements: [
      "DACH sales team with named account ownership",
      "GDP-capable pharma commercial handling",
      "Automotive and machinery shipper access",
      "Weekly route pipeline and conversion reporting",
    ],
    commercialExpectations:
      "This tender is designed for a GSA that can manage DACH as a structured sales territory, grow premium pharma and industrial cargo, and coordinate RFS feed into FRA, MUC and ZRH where direct uplift is not available.",
    routes: [
      route("FRA", "JED", "Daily", 7, "Core gateway"),
      route("FRA", "RUH", "Tue/Thu/Sat", 3, "Industrial cargo"),
      route("MUC", "JED", "Mon/Fri", 2, "RFS and belly feed"),
      route("ZRH", "JED", "Wed/Sun", 2, "Pharma feed"),
    ],
    createdAt: "2026-05-14T18:02:00.000Z",
  },
  {
    id: "tnd-demo-iberia-italy-2026",
    title: "Southern Europe GSA market scan",
    countryScope: "Spain, Portugal, Italy",
    regions: ["Spain", "Portugal", "Italy"],
    lanes: "MAD-JED, BCN-RUH, MXP-JED, FCO-RUH",
    annualTonnage: 12100,
    productMix: "Fashion, perishables, pharma, general cargo",
    deadline: "2026-07-08",
    expectedStart: "2026-09-01",
    status: "draft",
    awardMode: "multi",
    maxAwards: 3,
    commercialModel: "capacity-risk",
    requirements: [
      "Country-level sales coverage options",
      "Forwarder pipeline by market",
      "Launch plan with regional gateway priorities",
    ],
    commercialExpectations:
      "Draft tender for internal review. The airline is comparing whether to appoint one Southern Europe GSA or split Spain, Portugal and Italy into separate country mandates.",
    routes: [
      route("MAD", "JED", "TBD", 2, "Market scan"),
      route("MXP", "JED", "TBD", 2, "Market scan"),
    ],
    createdAt: "2026-05-14T18:01:00.000Z",
  },
  {
    id: "tnd-demo-nordics-closed-2026",
    title: "Nordics cargo representation review",
    countryScope: "Sweden, Denmark, Norway, Finland",
    regions: ["Sweden", "Denmark", "Norway", "Finland"],
    lanes: "CPH-JED, ARN-RUH, OSL-JED, HEL-JED",
    annualTonnage: 9700,
    productMix: "Pharma, seafood, e-commerce, general cargo",
    deadline: "2026-05-01",
    expectedStart: "2026-06-15",
    status: "closed",
    awardMode: "single",
    maxAwards: 1,
    commercialModel: "commission",
    requirements: [
      "Nordics-wide commercial representation",
      "Cold-chain and seafood cargo knowledge",
      "Consolidation plan into CPH and ARN",
    ],
    commercialExpectations:
      "Closed evaluation round retained as a realistic historical tender for application and shortlist views.",
    routes: [
      route("CPH", "JED", "Tue/Fri", 2, "Nordics gateway"),
      route("ARN", "RUH", "Thu", 1, "Regional feed"),
    ],
    createdAt: "2026-05-14T18:00:00.000Z",
  },
].map((tender) => ({
  ...tender,
  attachments: [],
  airline: "Saudia Cargo",
  airlineEmail: "saudia@airgsa.demo",
  updatedAt: tender.createdAt,
}));

const applicationSeeds = [
  app("tnd-demo-benelux-2026", "gsa-aeb", "shortlisted", "5.0% base commission plus 1.0% pharma growth accelerator", "2026-05-14T19:00:00.000Z"),
  app("tnd-demo-benelux-2026", "gsa-share-logistics", "pending", "4.8% base commission with quarterly route-performance review", "2026-05-14T19:08:00.000Z"),
  app("tnd-demo-benelux-2026", "gsa-neutral-freight", "pending", "4.6% base commission and consolidation bonus for LGG feed", "2026-05-14T19:16:00.000Z"),
  app("tnd-demo-benelux-2026", "gsa-cargo-airlines-services", "rejected", "5.4% base commission with CDG support desk add-on", "2026-05-14T19:24:00.000Z"),

  app("tnd-demo-uk-ireland-2026", "gsa-air-menzies", "shortlisted", "5.2% base commission plus express-volume accelerator", "2026-05-14T19:32:00.000Z"),
  app("tnd-demo-uk-ireland-2026", "gsa-air-business", "pending", "4.9% base commission with mail and e-commerce incentive", "2026-05-14T19:40:00.000Z"),
  app("tnd-demo-uk-ireland-2026", "gsa-priority-freight", "pending", "5.1% base commission focused on premium urgent cargo", "2026-05-14T19:48:00.000Z"),
  app("tnd-demo-uk-ireland-2026", "gsa-forto", "rejected", "4.7% base commission with digital pipeline reporting", "2026-05-14T19:56:00.000Z"),

  app("tnd-demo-france-2026", "gsa-cargo-airlines-services", "accepted", "5.0% base commission and 1.5% high-yield cargo bonus", "2026-05-14T20:04:00.000Z"),
  app("tnd-demo-france-2026", "gsa-eas-france", "shortlisted", "4.8% base commission with charter-support add-on", "2026-05-14T20:12:00.000Z"),
  app("tnd-demo-france-2026", "gsa-logfret", "pending", "4.9% base commission plus overseas-flow accelerator", "2026-05-14T20:20:00.000Z"),
  app("tnd-demo-france-2026", "gsa-sparta-cargo", "pending", "5.1% base commission focused on pharma and perishables", "2026-05-14T20:28:00.000Z"),
  app("tnd-demo-france-2026", "gsa-sky-art", "rejected", "5.3% base commission with special-cargo premium", "2026-05-14T20:36:00.000Z"),

  app("tnd-demo-dach-pharma-2026", "gsa-aerotrans", "shortlisted", "4.9% base commission with DACH route launch bonus", "2026-05-14T20:44:00.000Z"),
  app("tnd-demo-dach-pharma-2026", "gsa-critical-logistics", "shortlisted", "5.2% base commission for time-critical industrial cargo", "2026-05-14T20:52:00.000Z"),
  app("tnd-demo-dach-pharma-2026", "gsa-forto", "pending", "4.8% base commission with digital account pipeline reporting", "2026-05-14T21:00:00.000Z"),
  app("tnd-demo-dach-pharma-2026", "gsa-mycargogate", "pending", "4.6% base commission for SME forwarder conversion", "2026-05-14T21:08:00.000Z"),
  app("tnd-demo-dach-pharma-2026", "gsa-on-air-cargo", "pending", "4.7% base commission with trucking-feed incentive", "2026-05-14T21:16:00.000Z"),
  app("tnd-demo-dach-pharma-2026", "gsa-quivo", "pending", "4.9% base commission for e-commerce and parcel cargo", "2026-05-14T21:24:00.000Z"),
  app("tnd-demo-dach-pharma-2026", "gsa-teconja", "rejected", "4.5% base commission with industrial-account focus", "2026-05-14T21:32:00.000Z"),
  app("tnd-demo-dach-pharma-2026", "gsa-talogis", "pending", "4.7% base commission for air-sea consolidation traffic", "2026-05-14T21:40:00.000Z"),
  app("tnd-demo-dach-pharma-2026", "gsa-tci", "pending", "4.8% base commission with Middle East textile cargo focus", "2026-05-14T21:48:00.000Z"),
  app("tnd-demo-dach-pharma-2026", "gsa-aeb", "accepted", "5.0% base commission with pharma and DACH forwarder accelerator", "2026-05-14T21:56:00.000Z"),

  app("tnd-demo-nordics-closed-2026", "gsa-air-menzies", "accepted", "5.1% base commission with wholesale consolidation plan", "2026-05-14T22:04:00.000Z"),
  app("tnd-demo-nordics-closed-2026", "gsa-logfret", "rejected", "4.9% base commission with overseas network support", "2026-05-14T22:12:00.000Z"),
];

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const partners = await loadRealGsaPartners();
const demoStore = {
  tenders: tenderSeeds,
  applications: buildApplications(partners),
};

if (process.env.DATABASE_URL) {
  await seedPostgres(demoStore);
} else {
  await seedFileStore(demoStore);
}

console.log(
  `Seeded ${demoStore.tenders.length} demo tenders and ${demoStore.applications.length} demo applications ` +
    `to ${process.env.DATABASE_URL ? "Postgres" : STORE_PATH}`,
);

function route(origin, destination, operatingDays, frequencyPerWeek, aircraft) {
  return { id: `route-${origin.toLowerCase()}-${destination.toLowerCase()}`, origin, destination, operatingDays, frequencyPerWeek, aircraft };
}

function app(tenderId, gsaId, status, proposedCommission, submittedAt) {
  return { tenderId, gsaId, status, proposedCommission, submittedAt };
}

function buildApplications(partnersList) {
  const partnersById = new Map(partnersList.map((partner) => [partner.id, partner]));
  const tendersById = new Map(tenderSeeds.map((tender) => [tender.id, tender]));

  return applicationSeeds.map((seed) => {
    const partner = partnersById.get(seed.gsaId);
    const tender = tendersById.get(seed.tenderId);
    if (!partner) throw new Error(`Unknown GSA partner: ${seed.gsaId}`);
    if (!tender) throw new Error(`Unknown tender: ${seed.tenderId}`);

    const fitScore = Math.round((partner.networkScore + partner.financialScore + partner.complianceScore) / 3);
    const id = `app-demo-${seed.tenderId.replace("tnd-demo-", "").replace("-2026", "")}-${seed.gsaId.replace("gsa-", "")}`;
    const monthlyTarget = Math.max(180, Math.round((tender.annualTonnage / 12) * (0.18 + partner.winRate / 250)));

    return {
      id,
      tenderId: seed.tenderId,
      gsaId: partner.id,
      gsaName: partner.name,
      contactName: partner.contactName,
      email: partner.email,
      headquarters: partner.headquarters,
      coverage: partner.coverage,
      markets: partner.markets,
      certifications: partner.certifications,
      cargoFocus: partner.cargoFocus,
      networkScore: partner.networkScore,
      financialScore: partner.financialScore,
      complianceScore: partner.complianceScore,
      winRate: partner.winRate,
      proposedCommission: seed.proposedCommission,
      launchTimeline: `${partner.name} can mobilize a dedicated Saudia Cargo sales desk within ${fitScore >= 88 ? 30 : 45} days of award.`,
      namedAccountCoverage: `${partner.name} proposes named coverage for ${18 + (partner.networkScore % 12)} priority forwarder and shipper accounts across ${partner.coverage.slice(0, 3).join(", ")}.`,
      monthlySalesTarget: `${monthlyTarget.toLocaleString("en-US")} tons per month after ramp-up, with weekly pipeline review and monthly conversion reporting.`,
      networkPlan:
        `The plan focuses on ${partner.markets.join(", ")} accounts, using ${tender.routes.map((item) => `${item.origin}-${item.destination}`).join(", ")} as the initial route scope. ` +
        `Sales activity is prioritized around ${partner.cargoFocus.toLowerCase()} with route-by-route opportunity tracking.`,
      operationalReadiness:
        `${partner.certifications.join(", ")} capability is in place. The proposed launch model includes customer onboarding, GHA handover, rate desk setup, and weekly performance cadence with Saudia Cargo.`,
      documents: buildDocuments(partner, tender),
      status: seed.status,
      submittedAt: seed.submittedAt,
      updatedAt: seed.submittedAt,
    };
  });
}

function buildDocuments(partner, tender) {
  return [
    textDocument(
      `${slug(partner.name)}-company-profile.txt`,
      `${partner.name} company profile\n\nContact: ${partner.contactName}\nEmail: ${partner.email}\nHeadquarters: ${partner.headquarters}\nCoverage: ${partner.coverage.join(", ")}\nCertifications: ${partner.certifications.join(", ")}\n\n${partner.summary}`,
    ),
    textDocument(
      `${slug(tender.title)}-sales-plan.txt`,
      `${tender.title} sales plan\n\nTender scope: ${tender.countryScope}\nRoutes: ${tender.lanes}\nProduct focus: ${tender.productMix}\n\n${partner.name} will target named accounts, weekly pipeline reviews, and route-specific cargo conversion for the tender scope.`,
    ),
  ];
}

function textDocument(name, content) {
  const dataUrl = `data:text/plain;base64,${Buffer.from(content, "utf8").toString("base64")}`;
  return { id: `${name}-${Buffer.byteLength(content)}`, name, size: Buffer.byteLength(content), mimeType: "text/plain", dataUrl };
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function loadRealGsaPartners() {
  const sourcePath = path.join(process.cwd(), "src", "lib", "real-gsa-data.ts");
  const source = await fs.readFile(sourcePath, "utf8");
  const match = source.match(/export const realGsaPartners: RealGsaPartner\[] = \[([\s\S]*?)\];\r?\n\r?\nexport const realGsaProfiles/);
  if (!match) throw new Error("Could not parse realGsaPartners from src/lib/real-gsa-data.ts");
  return Function(`"use strict"; return [${match[1]}];`)();
}

async function loadEnvFile(fileName) {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), fileName), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Local development may not have every env file.
  }
}

async function seedFileStore(store) {
  const current = await readCurrentFileStore();
  const demoTenderIds = new Set(store.tenders.map((tender) => tender.id));
  const next = {
    tenders: [
      ...store.tenders,
      ...current.tenders.filter((tender) => !tender.id.startsWith("tnd-demo-")),
    ],
    applications: [
      ...store.applications,
      ...current.applications.filter(
        (application) => !application.id.startsWith("app-demo-") && !demoTenderIds.has(application.tenderId),
      ),
    ],
  };

  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

async function readCurrentFileStore() {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return { tenders: parsed.tenders ?? [], applications: parsed.applications ?? [] };
  } catch {
    return { tenders: [], applications: [] };
  }
}

async function seedPostgres(store) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" || process.env.DATABASE_URL.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const client = await pool.connect();
  try {
    await client.query(`
      create table if not exists live_tenders (
        id text primary key,
        status text not null,
        created_at timestamptz not null,
        updated_at timestamptz not null,
        data jsonb not null
      );

      create table if not exists live_applications (
        id text primary key,
        tender_id text not null,
        gsa_id text not null,
        gsa_name text not null,
        status text not null,
        submitted_at timestamptz not null,
        updated_at timestamptz not null,
        data jsonb not null
      );

      create index if not exists live_tenders_status_idx on live_tenders(status);
      create index if not exists live_applications_tender_idx on live_applications(tender_id);
      create index if not exists live_applications_status_idx on live_applications(status);
    `);

    await client.query("begin");
    await client.query("delete from live_applications where id like 'app-demo-%' or tender_id like 'tnd-demo-%'");
    await client.query("delete from live_tenders where id like 'tnd-demo-%'");

    for (const tender of store.tenders) {
      await client.query(
        `
          insert into live_tenders (id, status, created_at, updated_at, data)
          values ($1, $2, $3, $4, $5::jsonb)
        `,
        [tender.id, tender.status, tender.createdAt, tender.updatedAt, JSON.stringify(tender)],
      );
    }

    for (const application of store.applications) {
      await client.query(
        `
          insert into live_applications (id, tender_id, gsa_id, gsa_name, status, submitted_at, updated_at, data)
          values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        `,
        [
          application.id,
          application.tenderId,
          application.gsaId,
          application.gsaName,
          application.status,
          application.submittedAt,
          application.updatedAt,
          JSON.stringify(application),
        ],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
