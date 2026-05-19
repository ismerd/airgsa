import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertFileStoreFallbackAllowed, rowData, withPostgres } from "@/lib/services/postgres-store";

const SETTINGS_PATH = path.join(process.cwd(), "data", "fr24-settings.json");
const LEGACY_SETTINGS_KEY = "fr24_settings";

export type Fr24Settings = {
  enabled: boolean;
  updatedAt?: string;
};

function defaultEnabled() {
  return process.env.FR24_API_ENABLED?.toLowerCase() === "true";
}

export async function getFr24Settings(): Promise<Fr24Settings> {
  try {
    const dbResult = await withPostgres(async (client) => {
      const result = await client.query("select enabled, updated_at, data from fr24_runtime_settings where id = 'default'");
      if (!result.rows[0]) return { settings: null };
      const parsed = rowData<Partial<Fr24Settings>>(result.rows[0]);
      return {
        settings: {
          enabled: typeof result.rows[0].enabled === "boolean" ? result.rows[0].enabled : defaultEnabled(),
          updatedAt: result.rows[0].updated_at?.toISOString?.() ?? parsed.updatedAt,
        },
      };
    });
    if (dbResult?.settings) return dbResult.settings;

    const legacyDbResult = await readLegacySettingsFromDb();
    const legacySettings = legacyDbResult?.settings ?? (!dbResult ? await readFileSettings() : { enabled: defaultEnabled() });
    if (legacySettings.updatedAt) {
      await withPostgres(async (client) => {
        await client.query(
          `
            insert into fr24_runtime_settings (id, enabled, updated_at, data)
            values ('default', $1, $2, $3::jsonb)
            on conflict (id) do update set enabled = excluded.enabled, updated_at = excluded.updated_at, data = excluded.data
          `,
          [legacySettings.enabled, legacySettings.updatedAt, JSON.stringify(legacySettings)],
        );
        return true;
      });
    }
    if (legacySettings.updatedAt || !dbResult) return legacySettings;
  } catch (error) {
    console.error("[fr24-settings] failed to read settings:", error);
  }
  return { enabled: defaultEnabled() };
}

async function readFileSettings(): Promise<Fr24Settings> {
  assertFileStoreFallbackAllowed("FR24 settings store");
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

async function readLegacySettingsFromDb(): Promise<{ settings: Fr24Settings | null } | null> {
  return withPostgres(async (client) => {
    const result = await client.query("select value as data from app_settings where key = $1", [LEGACY_SETTINGS_KEY]);
    if (!result.rows[0]) return { settings: null };
    const parsed = rowData<Partial<Fr24Settings>>(result.rows[0]);
    return {
      settings: {
        enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : defaultEnabled(),
        updatedAt: parsed.updatedAt,
      },
    };
  });
}

export async function setFr24Enabled(enabled: boolean): Promise<Fr24Settings> {
  const settings: Fr24Settings = {
    enabled,
    updatedAt: new Date().toISOString(),
  };

  const saved = await withPostgres(async (client) => {
    await client.query(
      `
        insert into fr24_runtime_settings (id, enabled, updated_at, data)
        values ('default', $1, $2, $3::jsonb)
        on conflict (id) do update set enabled = excluded.enabled, updated_at = excluded.updated_at, data = excluded.data
      `,
      [settings.enabled, settings.updatedAt, JSON.stringify(settings)],
    );
    return settings;
  });
  if (saved) return saved;

  assertFileStoreFallbackAllowed("FR24 settings store");
  await mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await writeFile(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
  return settings;
}
