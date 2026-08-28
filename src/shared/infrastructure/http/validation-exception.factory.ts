import { BadRequestException, ValidationError } from "@nestjs/common";

function flattenValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    if (error.children?.length) {
      messages.push(...flattenValidationErrors(error.children));
    }
  }
  return messages;
}

/** Normaliza erros do class-validator para o formato da API. */
export function validationExceptionFactory(errors: ValidationError[]) {
  const details = flattenValidationErrors(errors);
  return new BadRequestException({
    code: "VALIDATION_ERROR",
    message: details[0] ?? "Dados inválidos.",
    errors: details,
  });
}
