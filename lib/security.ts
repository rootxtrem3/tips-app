import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, salt, digest] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !digest) {
    return false;
  }
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function sha1(value: string): string {
  return createHash("sha1").update(value).digest("hex");
}
