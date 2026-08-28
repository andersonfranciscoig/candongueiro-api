import { HttpStatus } from "@nestjs/common";

const STATUS_BY_CODE: Record<string, HttpStatus> = {
  NOT_FOUND: HttpStatus.NOT_FOUND,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  CONFLICT: HttpStatus.CONFLICT,
  INSUFFICIENT_FUNDS: HttpStatus.BAD_REQUEST,
  INVALID_EMAIL: HttpStatus.BAD_REQUEST,
  INVALID_PHONE: HttpStatus.BAD_REQUEST,
  BAD_REQUEST: HttpStatus.BAD_REQUEST,
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
  DOMAIN_ERROR: HttpStatus.BAD_REQUEST,
};

export function httpStatusForDomainCode(code: string): HttpStatus {
  return STATUS_BY_CODE[code] ?? HttpStatus.BAD_REQUEST;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  errors?: string[];
  statusCode: number;
  timestamp: string;
  path?: string;
}

export function buildErrorBody(input: {
  code: string;
  message: string;
  statusCode: number;
  path?: string;
  errors?: string[];
}): ApiErrorBody {
  return {
    code: input.code,
    message: input.message,
    statusCode: input.statusCode,
    timestamp: new Date().toISOString(),
    ...(input.errors?.length ? { errors: input.errors } : {}),
    ...(input.path ? { path: input.path } : {}),
  };
}
