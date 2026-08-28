# Email com Brevo (CandongueiroPay)

Usamos o **mesmo serviço Brevo** e a **mesma conta** que o `ekanda-school-portal-api` (`ekandacode@gmail.com` como remetente verificado).

- `EMAIL_PROVIDER=brevo` — envio real via API REST Brevo
- `EMAIL_PROVIDER=console` — OTP apenas nos logs (sem envio)

## Variáveis

| Variável | Exemplo | Descrição |
|----------|---------|-----------|
| `EMAIL_PROVIDER` | `brevo` | `brevo` ou `console` |
| `EMAIL_API_KEY` | `xkeysib-…` | Chave API Brevo (copiar do `.env` do Ekanda) |
| `EMAIL_FROM` | `ekandacode@gmail.com` | Remetente verificado no Brevo |
| `EMAIL_FROM_NAME` | `CandongueiroPay` | Nome exibido |
| `EMAIL_REPLY_TO` | `ekandacode@gmail.com` | Resposta |

## Desenvolvimento

```env
EMAIL_PROVIDER=brevo
EMAIL_API_KEY=<mesma chave do ekanda-school-portal-api>
EMAIL_FROM=ekandacode@gmail.com
EMAIL_FROM_NAME=CandongueiroPay
EMAIL_REPLY_TO=ekandacode@gmail.com
```

Sem envio real:

```env
EMAIL_PROVIDER=console
OTP_DEV_CODE=123456
```

## OTP

O fluxo `POST /auth/otp/request` gera o código e envia email HTML com template CandongueiroPay. Com `OTP_DEV_CODE` definido, o código fixo é usado (útil em dev).

## Brevo

1. [brevo.com](https://www.brevo.com/) → Settings → SMTP & API → API keys
2. Copiar `EMAIL_API_KEY` do projecto Ekanda (mesma chave)
3. Remetente `ekandacode@gmail.com` já verificado na conta partilhada

## Erros comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| `EMAIL_API_KEY em falta` | Chave vazia com `brevo` | Copiar do Ekanda ou usar `console` |
| `fetch failed` / `UND_ERR_CONNECT_TIMEOUT` | Rede bloqueia `api.brevo.com` ou IPv6 instável (comum no WSL) | Reiniciar API (usa IPv4 primeiro); em dev o OTP cai no console; ou `EMAIL_PROVIDER=console` |
| Brevo `401` | Chave inválida | Regenerar no painel Brevo |
| Sender not valid | `EMAIL_FROM` não verificado | Usar `ekandacode@gmail.com` |

### WSL / desenvolvimento local

Se o Brevo falhar por timeout mas a internet funciona, a API em `development`:

1. Prioriza **IPv4** no arranque (`main.ts`)
2. Regista o OTP no **console** em vez de falhar o pedido
3. Com `OTP_DEV_CODE=123456`, use esse código no frontend (a resposta inclui `devCode` em dev)
