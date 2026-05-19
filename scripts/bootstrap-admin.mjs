import "./load-env.mjs";
import { scrypt as scryptCallback, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const { Client } = pg;
const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

const email = normalizeEmail(process.env.BOOTSTRAP_ADMIN_EMAIL);
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Platform Admin";
const company = process.env.BOOTSTRAP_ADMIN_COMPANY?.trim() || "AirGSA";
const companyId = process.env.BOOTSTRAP_ADMIN_COMPANY_ID?.trim() || "admin-airgsa";

if (!process.env.DATABASE_URL) {
  fail("DATABASE_URL is required.");
}

if (!email) {
  fail("BOOTSTRAP_ADMIN_EMAIL is required.");
}

if (!isValidEmail(email)) {
  fail("BOOTSTRAP_ADMIN_EMAIL must be a valid email address.");
}

if (password.length < 12) {
  fail("BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.");
}

const passwordHash = await hashPassword(password);
const now = new Date().toISOString();
const id = stableAdminId(email);
const data = {
  id,
  email,
  name,
  role: "admin",
  accessRole: "owner",
  company,
  companyId,
  passwordHash: passwordHash.hash,
  salt: passwordHash.salt,
  status: "active",
  mustChangePassword: false,
  createdAt: now,
  updatedAt: now,
};

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseDatabaseSsl(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : false,
});

await client.connect();
try {
  await ensureAuthAccountsTable(client);
  const existing = await client.query("select id, created_at from public.auth_accounts where email = $1 limit 1", [email]);
  const existingId = existing.rows[0]?.id;
  const createdAt = existing.rows[0]?.created_at ? new Date(existing.rows[0].created_at).toISOString() : now;
  const accountId = existingId || id;
  const accountData = {
    ...data,
    id: accountId,
    createdAt,
  };

  await client.query(
    `
      insert into public.auth_accounts
        (id, email, password_hash, password_salt, role, access_role, company, company_id, name, status, must_change_password, created_at, updated_at, data)
      values ($1, $2, $3, $4, 'admin', 'owner', $5, $6, $7, 'active', false, $8, $9, $10::jsonb)
      on conflict (email)
      do update set
        password_hash = excluded.password_hash,
        password_salt = excluded.password_salt,
        role = 'admin',
        access_role = 'owner',
        company = excluded.company,
        company_id = excluded.company_id,
        name = excluded.name,
        status = 'active',
        must_change_password = false,
        updated_at = excluded.updated_at,
        data = excluded.data
    `,
    [
      accountData.id,
      accountData.email,
      accountData.passwordHash,
      accountData.salt,
      accountData.company,
      accountData.companyId,
      accountData.name,
      accountData.createdAt,
      accountData.updatedAt,
      JSON.stringify(accountData),
    ],
  );

  console.log(JSON.stringify({
    ok: true,
    email,
    role: "admin",
    accessRole: "owner",
    company,
    companyId,
    action: existingId ? "updated" : "created",
  }, null, 2));
} finally {
  await client.end();
}

async function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(value, salt, KEY_LENGTH);
  return {
    salt,
    hash: Buffer.from(derived).toString("hex"),
  };
}

async function ensureAuthAccountsTable(client) {
  await client.query(`
    create table if not exists public.auth_accounts (
      id text primary key,
      email text not null unique,
      password_hash text not null,
      password_salt text not null,
      role text not null check (role in ('airline', 'gsa', 'admin')),
      access_role text check (access_role in ('owner', 'admin', 'manager', 'operator', 'viewer')),
      company text not null,
      company_id text,
      name text not null,
      status text not null default 'active' check (status in ('active', 'disabled')),
      must_change_password boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      data jsonb not null default '{}'::jsonb
    )
  `);
}

function normalizeEmail(value) {
  return value?.trim().toLowerCase() || "";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function stableAdminId(value) {
  return `auth-admin-${value.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48)}`;
}

function shouldUseDatabaseSsl(databaseUrl) {
  return process.env.DATABASE_SSL === "true" || databaseUrl.includes("sslmode=require") || /proxy\.rlwy\.net|railway\.internal/i.test(databaseUrl);
}

function fail(message) {
  console.error(`Bootstrap admin failed: ${message}`);
  process.exit(1);
}
