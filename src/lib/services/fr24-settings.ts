import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SETTINGS_PATH = path.join(process.cwd(), "data", "fr24-settings.json");

export type Fr24Settings = {
  enabled: boolean;
  updatedAt?: string;
};

function defaultEnabled() {
  return process.env.FR24_API_ENABLED?.toLowerCase() === "true";
}

export async function getFr24Settings(): Promise<Fr24Settings> {
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

  await mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
  await writeFile(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
  return settings;
}
