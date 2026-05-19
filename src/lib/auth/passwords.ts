import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return {
    salt,
    hash: derived.toString("hex"),
  };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  if (!salt || !expectedHash) return false;
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(expectedHash, "hex");
  if (derived.byteLength !== expected.byteLength) return false;
  return timingSafeEqual(derived, expected);
}

export function createTemporaryPassword() {
  return `${randomBytes(12).toString("base64url")}A1`;
}
