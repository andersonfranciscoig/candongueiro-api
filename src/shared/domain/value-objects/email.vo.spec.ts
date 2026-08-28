import { Email } from "./email.vo";
import { DomainException } from "../exceptions/domain.exception";

describe("Email", () => {
  it("normaliza e valida email", () => {
    const email = new Email("  Anderson@Email.COM ");
    expect(email.value).toBe("anderson@email.com");
  });

  it("rejeita email inválido", () => {
    expect(() => new Email("invalido")).toThrow(DomainException);
    try {
      new Email("invalido");
    } catch (error) {
      expect(error).toMatchObject({ code: "INVALID_EMAIL" });
    }
  });
});
