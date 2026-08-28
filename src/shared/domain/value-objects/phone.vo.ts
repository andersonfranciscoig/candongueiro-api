import { DomainException } from "../exceptions/domain.exception";

/** Telefone angolano E.164 aproximado (+244 9XX XXX XXX). */
export class Phone {
  readonly value: string;

  constructor(raw: string) {
    const digits = raw.replace(/\D/g, "").replace(/^244/, "");
    if (digits.length !== 9 || !digits.startsWith("9")) {
      throw new DomainException(
        "Número angolano inválido (9XX XXX XXX).",
        "INVALID_PHONE",
      );
    }
    const g = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9)];
    this.value = `+244 ${g.join(" ")}`;
  }

  toString() {
    return this.value;
  }
}
