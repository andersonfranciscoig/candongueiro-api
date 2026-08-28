import { httpStatusForDomainCode, buildErrorBody } from "./domain-exception.mapper";

describe("domain-exception.mapper", () => {
  it("mapeia códigos de domínio para HTTP status", () => {
    expect(httpStatusForDomainCode("NOT_FOUND")).toBe(404);
    expect(httpStatusForDomainCode("UNAUTHORIZED")).toBe(401);
    expect(httpStatusForDomainCode("CONFLICT")).toBe(409);
    expect(httpStatusForDomainCode("INSUFFICIENT_FUNDS")).toBe(400);
    expect(httpStatusForDomainCode("INVALID_EMAIL")).toBe(400);
  });

  it("constrói corpo de erro padronizado", () => {
    const body = buildErrorBody({
      code: "NOT_FOUND",
      message: "Utilizador não encontrado.",
      statusCode: 404,
      path: "/api/v1/profile/me",
    });

    expect(body.code).toBe("NOT_FOUND");
    expect(body.message).toBe("Utilizador não encontrado.");
    expect(body.statusCode).toBe(404);
    expect(body.path).toBe("/api/v1/profile/me");
    expect(body.timestamp).toBeDefined();
  });
});
