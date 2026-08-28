import { Phone } from "./phone.vo";
import { DomainException } from "../exceptions/domain.exception";

describe("Phone", () => {
  it("formata telefone angolano", () => {
    const phone = new Phone("+244 923 000 000");
    expect(phone.value).toBe("+244 923 000 000");
  });

  it("rejeita telefone inválido", () => {
    expect(() => new Phone("123")).toThrow(DomainException);
    try {
      new Phone("123");
    } catch (error) {
      expect(error).toMatchObject({ code: "INVALID_PHONE" });
    }
  });
});
