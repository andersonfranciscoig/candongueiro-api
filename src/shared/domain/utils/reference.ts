import { randomInt } from "crypto";

export const EXPRESS_ENTITY = "0407";

export function nextLedgerReference(seq: number): string {
  return `CP-${String(123 + seq).padStart(6, "0")}`;
}

export function nextTopUpReference(): string {
  const stamp = Date.now().toString().slice(-7);
  const rnd = String(randomInt(0, 100)).padStart(2, "0");
  return `${stamp}${rnd}`;
}

export function formatPlate(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
  if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}`;
  }
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6)}`;
}

export function buildVehicleQrCode(plate: string, model?: string): string {
  const base = `CPAY:VEH:${plate}`;
  return model?.trim() ? `${base}:${model.trim()}` : base;
}
