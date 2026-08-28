import { DomainException } from "../exceptions/domain.exception";

export class Email {
  readonly value: string;

  constructor(raw: string) {
    const value = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new DomainException("Email inválido.", "INVALID_EMAIL");
    }
    this.value = value;
  }

  toString() {
    return this.value;
  }
}
