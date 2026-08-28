import { setDefaultResultOrder } from "node:dns";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./shared/infrastructure/http/http-exception.filter";
import { validationExceptionFactory } from "./shared/infrastructure/http/validation-exception.factory";
import { AUTH_COOKIE_NAME } from "./shared/infrastructure/auth/auth-cookie.service";

async function bootstrap() {
  // WSL / redes sem IPv6 estável: evita timeout ao contactar APIs (ex.: Brevo via Cloudflare).
  setDefaultResultOrder("ipv4first");

  const app = await NestFactory.create(AppModule);
  const prefix = process.env.API_PREFIX ?? "api/v1";
  app.setGlobalPrefix(prefix);
  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const swagger = new DocumentBuilder()
    .setTitle("CandongueiroPay API")
    .setDescription("Monólito modular — DDD + Clean Architecture")
    .setVersion("0.1.0")
    .addCookieAuth(AUTH_COOKIE_NAME)
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.PORT ?? 3002);
  await app.listen(port);
  console.log(`CandongueiroPay API → http://localhost:${port}/${prefix}`);
  console.log(`Swagger → http://localhost:${port}/docs`);
}

bootstrap();
