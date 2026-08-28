import {
  amountHero,
  detailTable,
  highlightBox,
  iconHeader,
  mailButton,
  mailLayout,
  muted,
  paragraph,
  statusPill,
  type RenderedEmail,
} from "./layout";
import { formatDateTime, formatKz, formatSignedKz } from "./format";

export function walletTopUpRequest(props: {
  amount: number;
  entity: string;
  reference: string;
  expiresHint?: string;
}): RenderedEmail {
  const subject = `Carregamento · referência ${props.reference}`;
  const text = `Carregue ${formatKz(props.amount)} via Multicaixa Express.\nEntidade: ${props.entity}\nReferência: ${props.reference}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: `Pague ${formatKz(props.amount)} no Multicaixa Express`,
    title: "Dados para carregamento",
    bodyHtml: `
      ${iconHeader("📱", "#eff6ff")}
      ${paragraph("Use os dados abaixo no <strong>Multicaixa Express</strong> → Pagamentos → Por referência.")}
      ${amountHero({ label: "Valor a pagar", amount: formatKz(props.amount), tone: "neutral" })}
      ${detailTable([
        { label: "Entidade", value: props.entity },
        { label: "Referência", value: props.reference },
        { label: "Estado", value: "Aguarda pagamento" },
      ])}
      ${props.expiresHint ? muted(props.expiresHint) : muted("Após pagar, o saldo é creditado automaticamente na carteira.")}
      ${highlightBox("Guarde esta referência — é única para este pedido de carregamento.", "info")}
    `,
  });

  return { subject, html, text };
}

export function walletTopUpConfirmed(props: {
  name: string;
  amount: number;
  balanceAfter: number;
  reference: string;
  occurredAt: string;
}): RenderedEmail {
  const subject = `Carregamento confirmado · ${formatKz(props.amount)}`;
  const text = `Olá ${props.name},\n\nCarregamento de ${formatKz(props.amount)} confirmado.\nNovo saldo: ${formatKz(props.balanceAfter)}\nRef: ${props.reference}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: `${formatKz(props.amount)} creditados na carteira`,
    title: "Carregamento concluído",
    bodyHtml: `
      ${iconHeader("✅", "#ecfdf5")}
      ${paragraph(`Olá <strong>${props.name}</strong>, o seu carregamento foi confirmado.`)}
      ${amountHero({ label: "Valor creditado", amount: formatSignedKz(props.amount), tone: "credit" })}
      ${detailTable([
        { label: "Novo saldo", value: formatKz(props.balanceAfter) },
        { label: "Referência", value: props.reference },
        { label: "Data", value: formatDateTime(props.occurredAt) },
      ])}
      ${statusPill("Concluído", "success")}
    `,
  });

  return { subject, html, text };
}

export function walletPaymentSent(props: {
  name: string;
  amount: number;
  balanceAfter: number;
  vehiclePlate: string;
  reference: string;
  occurredAt: string;
}): RenderedEmail {
  const subject = `Pagamento de viagem · ${formatKz(props.amount)}`;
  const text = `Olá ${props.name},\n\nPagou ${formatKz(props.amount)} · ${props.vehiclePlate}\nSaldo: ${formatKz(props.balanceAfter)}\nRef: ${props.reference}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: `Pagamento de ${formatKz(props.amount)} registado`,
    title: "Pagamento concluído",
    bodyHtml: `
      ${iconHeader("🚌", "#eff6ff")}
      ${paragraph(`Olá <strong>${props.name}</strong>, a sua viagem foi paga com sucesso.`)}
      ${amountHero({ label: "Valor pago", amount: formatSignedKz(-props.amount), tone: "debit" })}
      ${detailTable([
        { label: "Candongueiro", value: props.vehiclePlate },
        { label: "Saldo actual", value: formatKz(props.balanceAfter) },
        { label: "Referência", value: props.reference },
        { label: "Data", value: formatDateTime(props.occurredAt) },
      ])}
    `,
  });

  return { subject, html, text };
}

export function walletPaymentReceived(props: {
  name: string;
  amount: number;
  balanceAfter: number;
  vehiclePlate: string;
  reference: string;
  occurredAt: string;
}): RenderedEmail {
  const subject = `Recebeu ${formatKz(props.amount)} · ${props.vehiclePlate}`;
  const text = `Olá ${props.name},\n\nRecebeu ${formatKz(props.amount)} por viagem.\nSaldo: ${formatKz(props.balanceAfter)}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: `Recebeu ${formatKz(props.amount)} na carteira`,
    title: "Recebimento de viagem",
    bodyHtml: `
      ${iconHeader("💰", "#ecfdf5")}
      ${paragraph(`Olá <strong>${props.name}</strong>, entrou dinheiro na sua carteira.`)}
      ${amountHero({ label: "Valor recebido", amount: formatSignedKz(props.amount), tone: "credit" })}
      ${detailTable([
        { label: "Veículo", value: props.vehiclePlate },
        { label: "Saldo actual", value: formatKz(props.balanceAfter) },
        { label: "Referência", value: props.reference },
        { label: "Data", value: formatDateTime(props.occurredAt) },
      ])}
      ${statusPill("Creditado", "success")}
    `,
  });

  return { subject, html, text };
}

export function walletWithdrawalConfirmed(props: {
  name: string;
  amount: number;
  balanceAfter: number;
  method: "EXPRESS" | "IBAN";
  reference: string;
  destination: string;
  occurredAt: string;
}): RenderedEmail {
  const methodLabel =
    props.method === "EXPRESS" ? "Multicaixa Express" : "Transferência IBAN";
  const subject = `Levantamento · ${formatKz(props.amount)}`;
  const text = `Olá ${props.name},\n\nLevantamento de ${formatKz(props.amount)} via ${methodLabel}.\nDestino: ${props.destination}\nSaldo: ${formatKz(props.balanceAfter)}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: `Levantamento de ${formatKz(props.amount)} processado`,
    title: "Levantamento concluído",
    bodyHtml: `
      ${iconHeader("🏦", "#fef9ec")}
      ${paragraph(`Olá <strong>${props.name}</strong>, o seu levantamento foi processado.`)}
      ${amountHero({ label: "Valor levantado", amount: formatSignedKz(-props.amount), tone: "debit" })}
      ${detailTable([
        { label: "Método", value: methodLabel },
        { label: "Destino", value: props.destination },
        { label: "Saldo actual", value: formatKz(props.balanceAfter) },
        { label: "Referência", value: props.reference },
        { label: "Data", value: formatDateTime(props.occurredAt) },
      ])}
    `,
  });

  return { subject, html, text };
}

export function walletLowBalance(props: {
  name: string;
  balance: number;
  topUpUrl: string;
}): RenderedEmail {
  const subject = "Saldo baixo na carteira";
  const text = `Olá ${props.name},\n\nSaldo actual: ${formatKz(props.balance)}.\nCarregue em: ${props.topUpUrl}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: `Saldo actual: ${formatKz(props.balance)}`,
    title: "Saldo baixo",
    bodyHtml: `
      ${iconHeader("⚠️", "#fef9ec")}
      ${paragraph(`Olá <strong>${props.name}</strong>, o saldo da sua carteira está baixo.`)}
      ${amountHero({ label: "Saldo actual", amount: formatKz(props.balance), tone: "neutral" })}
      ${highlightBox("Carregue via Multicaixa Express para continuar a pagar viagens sem interrupções.", "warning")}
      ${mailButton(props.topUpUrl, "Carregar carteira")}
    `,
    footerNote: "Pode desactivar estes avisos nas definições da conta (em breve).",
  });

  return { subject, html, text };
}
