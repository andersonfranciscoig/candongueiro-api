# Templates de email — CandongueiroPay

Todos os emails usam layout partilhado em `templates/layout.ts` (header gradiente azul com logotipo SVG, onda de transição, card branco, footer com tagline).

## Catálogo

| Template | Ficheiro | Quando usar |
|----------|----------|-------------|
| OTP verificação | `authVerifyOtp` | Login / registo |
| Boas-vindas passageiro | `authWelcomePassenger` | Após registo PASSENGER |
| Boas-vindas motorista | `authWelcomeDriver` | Após registo DRIVER |
| Pedido carregamento | `walletTopUpRequest` | Referência Express gerada |
| Carregamento confirmado | `walletTopUpConfirmed` | Saldo creditado |
| Pagamento enviado | `walletPaymentSent` | Passageiro pagou viagem |
| Pagamento recebido | `walletPaymentReceived` | Motorista recebeu viagem |
| Levantamento | `walletWithdrawalConfirmed` | Express ou IBAN |
| Saldo baixo | `walletLowBalance` | Alerta de saldo |
| Perfil actualizado | `profileUpdated` | Nome/telefone alterados |
| Novo acesso | `securityNewLogin` | Login em novo dispositivo |
| Veículo registado | `vehicleRegistered` | Onboarding motorista |
| Bónus boas-vindas | `promoWelcomeBonus` | Primeiros 15 passageiros |

## Envio via MailService

```typescript
// Inject MailService
this.mail.sendTopUpConfirmed({ email, name, amount, balanceAfter, reference, occurredAt });
this.mail.sendWelcomePassenger({ email, name });
```

Emails transaccionais de carteira são **fire-and-forget** (`dispatch`) — não bloqueiam a resposta HTTP.

OTP é **await** — falha bloqueia o pedido se Brevo estiver indisponível.

## Preview local

Com `EMAIL_PROVIDER=console`, os subjects aparecem nos logs da API.

## Variável

`FRONTEND_URL` — links nos botões (carteira, motorista, carregar).
