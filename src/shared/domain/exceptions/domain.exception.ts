export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code = "DOMAIN_ERROR",
  ) {
    super(message);
    this.name = "DomainException";
  }
}

export class NotFoundException extends DomainException {
  constructor(resource: string) {
    super(`${resource} não encontrado.`, "NOT_FOUND");
    this.name = "NotFoundException";
  }
}

export class ConflictException extends DomainException {
  constructor(message: string) {
    super(message, "CONFLICT");
    this.name = "ConflictException";
  }
}

export class UnauthorizedException extends DomainException {
  constructor(message = "Não autorizado.") {
    super(message, "UNAUTHORIZED");
    this.name = "UnauthorizedException";
  }
}

export class InsufficientFundsException extends DomainException {
  constructor(message = "Saldo insuficiente.") {
    super(message, "INSUFFICIENT_FUNDS");
    this.name = "InsufficientFundsException";
  }
}

export class BadRequestException extends DomainException {
  constructor(message: string) {
    super(message, "BAD_REQUEST");
    this.name = "BadRequestException";
  }
}

export class ForbiddenException extends DomainException {
  constructor(message = "Acesso negado.") {
    super(message, "FORBIDDEN");
    this.name = "ForbiddenException";
  }
}
