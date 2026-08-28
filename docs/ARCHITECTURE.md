# Arquitectura — CandongueiroPay API

## Estilo

Monólito modular com **DDD** e **Clean Architecture**.

- Um deploy, vários módulos (bounded contexts)
- Domínio isolado de frameworks (Nest/Prisma só em `infrastructure`)
- Dependências apontam para dentro: `infrastructure → application → domain`

## Bounded contexts

| Módulo | Responsabilidade |
|--------|------------------|
| `identity` | Utilizadores, OTP email, JWT |
| `wallet` | Saldo, ledger, top-up Express, levantamentos |
| `vehicle` | Veículos do motorista, QR |
| `notification` | Canais de comunicação (futuro) |

## Persistência

PostgreSQL via Prisma. O schema vive em `prisma/schema.prisma`.  
Mappers/repositórios Prisma implementam ports do domínio.

## Regras

1. Controllers não acedem ao Prisma directamente nos módulos core (excepto stubs iniciais de leitura).
2. Regras de negócio ficam em entidades / use cases.
3. Novas features = novo use case no módulo certo.
