import { ArgumentsHost, BadRequestException, HttpStatus } from "@nestjs/common";
import { DomainException } from "../../domain/exceptions/domain.exception";
import { GlobalExceptionFilter } from "./http-exception.filter";

function createHost(url = "/api/v1/test") {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const req = { url };
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => req,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe("GlobalExceptionFilter", () => {
  const filter = new GlobalExceptionFilter();

  it("formata DomainException", () => {
    const { host, status, json } = createHost();
    filter.catch(new DomainException("Saldo insuficiente.", "INSUFFICIENT_FUNDS"), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "INSUFFICIENT_FUNDS",
        message: "Saldo insuficiente.",
        statusCode: 400,
        path: "/api/v1/test",
      }),
    );
  });

  it("formata HttpException de validação", () => {
    const { host, status, json } = createHost();
    filter.catch(
      new BadRequestException({
        code: "VALIDATION_ERROR",
        message: "email must be an email",
        errors: ["email must be an email"],
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        message: "email must be an email",
        errors: ["email must be an email"],
      }),
    );
  });

  it("formata erro interno desconhecido", () => {
    const { host, status, json } = createHost();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    filter.catch(new Error("boom"), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "INTERNAL_ERROR",
        message: "Erro interno do servidor.",
      }),
    );

    consoleSpy.mockRestore();
  });
});
