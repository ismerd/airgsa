import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const initialKeys = new Set(Object.keys(process.env));
const nodeEnv = process.env.NODE_ENV;
const files = [
  ".env",
  nodeEnv ? `.env.${nodeEnv}` : null,
  ".env.local",
  nodeEnv ? `.env.${nodeEnv}.local` : null,
].filter(Boolean);

for (const file of files) {
  const envPath = path.join(process.cwd(), file);
  if (!existsSync(envPath)) continue;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!key || initialKeys.has(key)) continue;
    process.env[key] = parseValue(trimmed.slice(separator + 1).trim());
  }
}

function parseValue(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
