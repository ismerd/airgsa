import type { SessionPayload } from "@/lib/auth/session-cookie";
import { createId } from "@/lib/services/ids";
import { hasPostgres, rowData, withPostgres } from "@/lib/services/postgres-store";
import { createHash, randomBytes } from "node:crypto";
import { createTemporaryPassword, hashPassword, verifyPassword } from "./passwords";

export type RailwayAccountInput = {
  email: string;
  name: string;
  role: "airline" | "gsa" | "admin";
  accessRole?: SessionPayload["accessRole"];
  company: string;
  companyId?: string;
};

type StoredRailwayAccount = RailwayAccountInput & {
  id: string;
  passwordHash: string;
  salt: string;
  status: "active" | "disabled";
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RailwayProvisioningResult =
  | { enabled: false }
  | {
      enabled: true;
      userId: string;
      companyId: string;
      invited: false;
      temporaryPassword?: string;
      provider: "postgres";
    };

export async function provisionRailwayAccount(input: RailwayAccountInput): Promise<RailwayProvisioningResult> {
  if (!hasPostgres()) return { enabled: false };

  const email = input.email.trim().toLowerCase();
  const existing = await getRailwayAccountByEmail(email);
  const companyId = input.companyId?.trim() || existing?.companyId || createCompanyId(input.company, input.role);
  const now = new Date().toISOString();

  if (existing) {
    await withPostgres(async (client) => {
      const data: StoredRailwayAccount = {
        ...existing,
        name: input.name.trim(),
        role: input.role,
        accessRole: input.accessRole,
        company: input.company.trim(),
        companyId,
        status: existing.status === "disabled" ? "disabled" : "active",
        updatedAt: now,
      };
      await client.query(
        `update auth_accounts
         set role = $2,
             access_role = $3,
             company = $4,
             company_id = $5,
             name = $6,
             status = $7,
             updated_at = $8,
             data = $9::jsonb
         where id = $1`,
        [
          existing.id,
          data.role,
          data.accessRole ?? null,
          data.company,
          data.companyId,
          data.name,
          data.status,
          data.updatedAt,
          JSON.stringify(data),
        ],
      );
      return true;
    });

    return {
      enabled: true,
      userId: existing.id,
      companyId,
      invited: false,
      provider: "postgres",
    };
  }

  const temporaryPassword = createTemporaryPassword();
  const password = await hashPassword(temporaryPassword);
  const account: StoredRailwayAccount = {
    id: createId("auth"),
    email,
    name: input.name.trim(),
    role: input.role,
    accessRole: input.accessRole,
    company: input.company.trim(),
    companyId,
    passwordHash: password.hash,
    salt: password.salt,
    status: "active",
    mustChangePassword: true,
    createdAt: now,
    updatedAt: now,
  };

  await withPostgres(async (client) => {
    await client.query(
      `insert into auth_accounts
        (id, email, password_hash, password_salt, role, access_role, company, company_id, name, status, must_change_password, created_at, updated_at, data)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)`,
      [
        account.id,
        account.email,
        account.passwordHash,
        account.salt,
        account.role,
        account.accessRole ?? null,
        account.company,
        account.companyId,
        account.name,
        account.status,
        account.mustChangePassword,
        account.createdAt,
        account.updatedAt,
        JSON.stringify(account),
      ],
    );
    return true;
  });

  return {
    enabled: true,
    userId: account.id,
    companyId,
    invited: false,
    temporaryPassword,
    provider: "postgres",
  };
}

export async function authenticateRailwayAccount(email: string, password: string): Promise<SessionPayload | null> {
  const account = await getRailwayAccountByEmail(email);
  if (!account || account.status !== "active") return null;
  const valid = await verifyPassword(password, account.salt, account.passwordHash);
  if (!valid) return null;

  return {
    email: account.email,
    role: account.role,
    accessRole: account.accessRole,
    name: account.name,
    company: account.company,
    companyId: account.companyId,
  };
}

export async function createRailwayPasswordReset(email: string) {
  const account = await getRailwayAccountByEmail(email);
  if (!account || account.status !== "active") return null;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 30).toISOString();

  await withPostgres(async (client) => {
    await client.query(
      `insert into auth_password_reset_tokens
        (id, account_id, email, token_hash, expires_at, used_at, created_at, data)
       values ($1, $2, $3, $4, $5, null, $6, $7::jsonb)`,
      [
        createId("reset"),
        account.id,
        account.email,
        tokenHash,
        expiresAt,
        now.toISOString(),
        JSON.stringify({ email: account.email, accountId: account.id, expiresAt }),
      ],
    );
    return true;
  });

  return token;
}

export async function resetRailwayPassword(token: string, password: string) {
  if (!token || password.length < 8) return false;
  const tokenHash = hashResetToken(token);
  const nextPassword = await hashPassword(password);
  const now = new Date().toISOString();

  const updated = await withPostgres(async (client) => {
    const tokenResult = await client.query(
      `select id, account_id, email
       from auth_password_reset_tokens
       where token_hash = $1
         and used_at is null
         and expires_at > now()
       limit 1`,
      [tokenHash],
    );
    const row = tokenResult.rows[0] as { id: string; account_id: string; email: string } | undefined;
    if (!row) return false;

    const account = await getRailwayAccountByEmail(row.email);
    if (!account || account.id !== row.account_id) return false;

    const data: StoredRailwayAccount = {
      ...account,
      passwordHash: nextPassword.hash,
      salt: nextPassword.salt,
      mustChangePassword: false,
      updatedAt: now,
    };

    await client.query(
      `update auth_accounts
       set password_hash = $2,
           password_salt = $3,
           must_change_password = false,
           updated_at = $4,
           data = $5::jsonb
       where id = $1`,
      [account.id, data.passwordHash, data.salt, data.updatedAt, JSON.stringify(data)],
    );
    await client.query("update auth_password_reset_tokens set used_at = $2 where id = $1", [row.id, now]);
    return true;
  });

  return updated === true;
}

async function getRailwayAccountByEmail(email: string): Promise<StoredRailwayAccount | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const account = await withPostgres(async (client) => {
    const result = await client.query("select data from auth_accounts where email = $1 limit 1", [normalizedEmail]);
    return result.rows[0] ? normalizeAccount(rowData<StoredRailwayAccount>(result.rows[0])) : null;
  });
  return account ?? null;
}

function normalizeAccount(account: StoredRailwayAccount): StoredRailwayAccount {
  return {
    ...account,
    email: account.email.trim().toLowerCase(),
    name: account.name.trim(),
    company: account.company.trim(),
    companyId: account.companyId?.trim() || createCompanyId(account.company, account.role),
    status: account.status === "disabled" ? "disabled" : "active",
    mustChangePassword: Boolean(account.mustChangePassword),
  };
}

function createCompanyId(company: string, role: string) {
  const slug = company
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54) || "company";
  return `${role}-${slug}`;
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
