# CandongueiroPay API

Backend monólito modular para o CandongueiroPay (Angola).

## Stack

- NestJS + TypeScript
- Prisma ORM + PostgreSQL
- DDD + Clean Architecture
- JWT + OTP por email (mock em desenvolvimento)
- Swagger em `/docs`

## Arranque

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm prisma migrate dev --name init
pnpm prisma db seed
pnpm run start:dev
```

- Health: http://localhost:3002/api/v1/health
- Swagger: http://localhost:3002/docs

OTP de desenvolvimento: `123456` (ver `OTP_DEV_CODE` no `.env`).

## Email (Brevo)

OTP enviado por email via **Brevo** — mesma conta que o Ekanda (`ekandacode@gmail.com`). Ver [docs/EMAIL_BREVO.md](docs/EMAIL_BREVO.md).

```env
EMAIL_PROVIDER=brevo
EMAIL_API_KEY=<copiar do ekanda-school-portal-api>
EMAIL_FROM=ekandacode@gmail.com
EMAIL_FROM_NAME=CandongueiroPay
```

Para dev sem envio: `EMAIL_PROVIDER=console`.

## Auth

1. `POST /api/v1/auth/otp/request` — `{ email, flow: "login"|"register", role?, phone? }`
2. `POST /api/v1/auth/otp/verify` — `{ email, code, flow, name?, phone?, role? }` → cookie `cpay_session` (httpOnly) + `{ user }`
3. `POST /api/v1/auth/logout` — limpa o cookie de sessão

A sessão via cookie é enviada automaticamente pelo browser (`credentials: include`). O Swagger também aceita Bearer token para testes manuais.

## Perfil (sessão)

- `GET /api/v1/profile/me`
- `PATCH /api/v1/profile/me` — `{ name?, phone? }`

## Carteira (sessão)

- `GET /api/v1/wallet/me` — saldo + movimentos
- `POST /api/v1/wallet/topup/request` — `{ amount }` → referência Express (entidade 0407)
- `POST /api/v1/wallet/topup/confirm` — `{ reference }` — confirma carregamento (mock dev)
- `POST /api/v1/wallet/pay` — `{ amount, qrCode?, vehiclePlate? }`
- `POST /api/v1/wallet/withdraw` — `{ amount, method, expressPhone?, iban?, bankName? }`

## Veículos (sessão)

- `GET /api/v1/vehicles/me`
- `POST /api/v1/vehicles` — `{ plate, model?, driverName? }`
- `POST /api/v1/vehicles/scan` — `{ qrCode }`

## Seed

- Passageiro: `anderson@email.com` (OTP: 123456)
- Motorista: `joao.motorista@email.com` (OTP: 123456)

## Frontend

No projecto `candongueiro-flow`, copie `.env.example` para `.env` e defina:

```
VITE_API_URL=http://localhost:3002/api/v1
```

Sem esta variável, o frontend continua em modo mock (localStorage). Com API activa, a sessão usa **cookies httpOnly** (`credentials: include` automático).

## Arquitectura (ports)

```
domain/repositories/     ← ports (interfaces) — sem Prisma
application/use-cases/   ← dependem só dos ports
infrastructure/persistence/prisma/  ← implementações Prisma (único sítio com ORM)
```

Tipos de domínio (`Role`, `TransactionType`, etc.) vivem em `shared/domain/types/` — independentes da ORM.

## Testes

```bash
pnpm test          # unitários
pnpm test:watch    # modo watch
pnpm test:cov      # com cobertura
```

## Erros da API

Resposta padronizada:

```json
{
  "code": "NOT_FOUND",
  "message": "Utilizador não encontrado.",
  "statusCode": 404,
  "timestamp": "2026-08-28T08:00:00.000Z",
  "path": "/api/v1/profile/me"
}
```

Códigos comuns: `VALIDATION_ERROR`, `UNAUTHORIZED`, `CONFLICT`, `INSUFFICIENT_FUNDS`, `INVALID_EMAIL`, `INTERNAL_ERROR`.
