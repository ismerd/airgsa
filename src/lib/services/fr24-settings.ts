import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { rowData, withPostgres } from "@/lib/services/postgres-store";

const SETTINGS_PATH = path.join(process.cwd(), "data", "fr24-settings.json");

export type Fr24Settings = {
  enabled: boolean;
  updatedAt?: string;
};

function defaultEnabled() {
  return process.env.FR24_API_ENABLED?.toLowerCase() === "true";
}

export async function getFr24Settings(): Promise<Fr24Settings> {
  const dbSettings = await withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", ["fr24_settings"]);
    if (!result.rows[0]) return null;
    const parsed = rowData<Partial<Fr24Settings>>(result.rows[0]);
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : defaultEnabled(),
      updatedAt: parsed.updatedAt,
    };
  });
  if (dbSettings) return dbSettings;

  const fileSettings = await readFileSettings();
  if (fileSettings.updatedAt) {
    await withPostgres(async (client) => {
      await client.query(
        `
          insert into app_settings (key, value, updated_at)
          values ($1, $2::jsonb, $3)
          on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
        `,
        ["fr24_settings", JSON.stringify(fileSettings), fileSettings.updatedAt],
      );
      return true;
    });
  }
  return fileSettings;
}

async function readFileSettings(): Promise<Fr24Settings> {
  try {
    const raw = await readFile(SETTINGS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Fr24Settings>;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : defaultEnabled(),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return { enabled: defaultEnabled() };
  }
}

export async function setFr24Enabled(enabled: boolean): Promise<Fr24Settings> {
  const settings: Fr24Settings = {
    enabled,
    updatedAt: new Date().toISOString(),
  };

  const saved = await withPostgres(async (client) => {
    await client.query(
      `
        insert into app_settings (key, value, updated_at)
        values ($1, $2::jsonb, $3)
        on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
      `,
      ["fr24_settings", JSON.stringify(settings), settings.updatedAt],
    );
    return settings;
  });
  if (saved) return saved;

  await mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await writeFile(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
  return settings;
}
