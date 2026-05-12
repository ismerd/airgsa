import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const PROFILE_PATH = join(process.cwd(), "data", "airline-profile.json");

export type AirlineProfile = {
  logoPath?: string; // public-relative, e.g. "/logos/airline-logo.png"
};

export function getAirlineProfile(): AirlineProfile {
  try {
    return JSON.parse(readFileSync(PROFILE_PATH, "utf-8")) as AirlineProfile;
  } catch {
    return {};
  }
}

export function saveAirlineProfile(profile: AirlineProfile): void {
  mkdirSync(join(process.cwd(), "data"), { recursive: true });
  writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2));
}
