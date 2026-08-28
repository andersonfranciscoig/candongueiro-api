import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response, Request } from "express";
import { DomainException } from "../../domain/exceptions/domain.exception";
import {
  buildErrorBody,
  httpStatusForDomainCode,
} from "./domain-exception.mapper";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === "object" && body !== null && "code" in body) {
        const payload = body as {
          code?: string;
          message?: string | string[];
          errors?: string[];
        };
        const message = Array.isArray(payload.message)
          ? (payload.message[0] ?? "Erro na requisição.")
          : (payload.message ?? exception.message);

        return res.status(status).json(
          buildErrorBody({
            code: payload.code ?? "HTTP_ERROR",
            message,
            statusCode: status,
            path: req.url,
            errors: payload.errors ?? (Array.isArray(payload.message) ? payload.message : undefined),
          }),
        );
      }

      const message =
        typeof body === "string"
          ? body
          : typeof body === "object" && body !== null && "message" in body
            ? String((body as { message: unknown }).message)
            : exception.message;

      return res.status(status).json(
        buildErrorBody({
          code: status === HttpStatus.UNAUTHORIZED ? "UNAUTHORIZED" : "HTTP_ERROR",
          message,
          statusCode: status,
          path: req.url,
        }),
      );
    }

    if (exception instanceof DomainException) {
      const status = httpStatusForDomainCode(exception.code);
      return res.status(status).json(
        buildErrorBody({
          code: exception.code,
          message: exception.message,
          statusCode: status,
          path: req.url,
        }),
      );
    }

    console.error(exception);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      buildErrorBody({
        code: "INTERNAL_ERROR",
        message: "Erro interno do servidor.",
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        path: req.url,
      }),
    );
  }
}
