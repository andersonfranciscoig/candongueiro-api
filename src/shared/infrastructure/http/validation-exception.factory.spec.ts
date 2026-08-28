import { ValidationError } from "@nestjs/common";
import { validationExceptionFactory } from "./validation-exception.factory";

describe("validationExceptionFactory", () => {
  it("agrega mensagens de validação", () => {
    const errors: ValidationError[] = [
      {
        property: "email",
        constraints: { isEmail: "email must be an email" },
        children: [],
      },
    ];

    const exception = validationExceptionFactory(errors);
    const body = exception.getResponse() as {
      code: string;
      message: string;
      errors: string[];
    };

    expect(body.code).toBe("VALIDATION_ERROR");
    expect(body.errors).toContain("email must be an email");
  });
});
