import { hashPin, isValidPinFormat, verifyPinHash } from "./pin-hash";

describe("pin-hash", () => {
  it("valida formato de PIN", () => {
    expect(isValidPinFormat("123456")).toBe(true);
    expect(isValidPinFormat("12345")).toBe(false);
    expect(isValidPinFormat("abcdef")).toBe(false);
  });

  it("hash e verifica PIN", () => {
    const stored = hashPin("654321");
    expect(verifyPinHash("654321", stored)).toBe(true);
    expect(verifyPinHash("000000", stored)).toBe(false);
  });
});
