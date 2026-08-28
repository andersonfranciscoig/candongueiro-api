import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LEN = 64;

export function isValidPinFormat(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, KEY_LEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPinHash(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const derived = scryptSync(pin, salt, KEY_LEN);
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;

  return timingSafeEqual(derived, expected);
}
