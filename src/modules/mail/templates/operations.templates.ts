import {
  detailTable,
  highlightBox,
  iconHeader,
  mailButton,
  mailLayout,
  muted,
  paragraph,
  type RenderedEmail,
} from "./layout";
import { formatDateTime, formatKz } from "./format";

export function opsGenericAlert(props: {
  name: string;
  preview: string;
  headline: string;
  message: string;
  emoji?: string;
  details?: Array<{ label: string; value: string }>;
  ctaUrl?: string;
  ctaLabel?: string;
}): RenderedEmail {
  const subject = props.headline;
  const text = `Olá ${props.name},\n\n${props.message}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: props.preview,
    title: props.headline,
    bodyHtml: `
      ${iconHeader(props.emoji ?? "🔔")}
      ${paragraph(`Olá <strong>${props.name}</strong>,`)}
      ${paragraph(props.message)}
      ${props.details?.length ? detailTable(props.details) : ""}
      ${props.ctaUrl && props.ctaLabel ? mailButton(props.ctaUrl, props.ctaLabel) : ""}
      ${muted("Abra a app CandongueiroPay para ver todos os detalhes.")}
    `,
  });

  return { subject, html, text };
}

export function opsPaymentToConfirm(props: {
  name: string;
  amount: number;
  vehiclePlate: string;
  reference: string;
  occurredAt: string;
  dashboardUrl: string;
}): RenderedEmail {
  return opsGenericAlert({
    name: props.name,
    preview: `Confirme pagamento de ${formatKz(props.amount)}`,
    headline: "Novo pagamento na viagem",
    message: `Um passageiro pagou <strong>${formatKz(props.amount)}</strong> no veículo <strong>${props.vehiclePlate}</strong>. Confirme o recebimento na app.`,
    emoji: "💳",
    details: [
      { label: "Valor", value: formatKz(props.amount) },
      { label: "Matrícula", value: props.vehiclePlate },
      { label: "Referência", value: props.reference },
      { label: "Data", value: formatDateTime(props.occurredAt) },
    ],
    ctaUrl: props.dashboardUrl,
    ctaLabel: "Confirmar pagamento",
  });
}

export function opsSessionResponse(props: {
  name: string;
  accepted: boolean;
  conductorName?: string;
  driverName?: string;
  dashboardUrl: string;
}): RenderedEmail {
  const headline = props.accepted ? "Cobrador aceitou o turno" : "Cobrador recusou o turno";
  const message = props.accepted
    ? `<strong>${props.conductorName ?? "O cobrador"}</strong> confirmou que vai trabalhar consigo hoje.`
    : `<strong>${props.conductorName ?? "O cobrador"}</strong> não pode trabalhar neste horário. O turno continua activo sem cobrador.`;

  return opsGenericAlert({
    name: props.name,
    preview: headline,
    headline,
    message,
    emoji: props.accepted ? "✅" : "ℹ️",
    ctaUrl: props.dashboardUrl,
    ctaLabel: "Ver turno",
  });
}

export function opsSessionEnded(props: {
  name: string;
  driverName: string;
  vehiclePlate: string;
  dashboardUrl: string;
}): RenderedEmail {
  return opsGenericAlert({
    name: props.name,
    preview: "Turno encerrado pelo motorista",
    headline: "Turno encerrado",
    message: `<strong>${props.driverName}</strong> encerrou o turno no veículo <strong>${props.vehiclePlate}</strong>.`,
    emoji: "🕐",
    ctaUrl: props.dashboardUrl,
    ctaLabel: "Abrir painel",
  });
}

export function opsPayoutAlert(props: {
  name: string;
  headline: string;
  message: string;
  amount?: number;
  dashboardUrl: string;
  ctaLabel?: string;
}): RenderedEmail {
  return opsGenericAlert({
    name: props.name,
    preview: props.headline,
    headline: props.headline,
    message: props.message,
    emoji: "💰",
    details: props.amount ? [{ label: "Valor", value: formatKz(props.amount) }] : undefined,
    ctaUrl: props.dashboardUrl,
    ctaLabel: props.ctaLabel ?? "Ver pagamento",
  });
}

export function opsRefundAlert(props: {
  name: string;
  headline: string;
  message: string;
  amount: number;
  paymentReference: string;
  dashboardUrl: string;
}): RenderedEmail {
  return opsGenericAlert({
    name: props.name,
    preview: props.headline,
    headline: props.headline,
    message: props.message,
    emoji: "↩️",
    details: [
      { label: "Valor", value: formatKz(props.amount) },
      { label: "Pagamento", value: props.paymentReference },
    ],
    ctaUrl: props.dashboardUrl,
    ctaLabel: "Ver reembolso",
  });
}

export function authWelcomeConductor(props: {
  name: string;
  dashboardUrl: string;
}): RenderedEmail {
  const subject = "Conta de cobrador activa";
  const text = `Olá ${props.name},\n\nA sua conta de cobrador está pronta.\nAceda: ${props.dashboardUrl}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: "Confirme pagamentos e acompanhe turnos",
    title: "Bem-vindo, cobrador!",
    bodyHtml: `
      ${iconHeader("🎫")}
      ${paragraph(`Olá <strong>${props.name}</strong>,`)}
      ${paragraph("A sua conta de <strong>cobrador</strong> está activa. Pode confirmar pagamentos de passageiros, aceitar turnos e receber pagamentos do motorista.")}
      ${highlightBox("Mantenha a disponibilidade activa para receber convites de turno.", "info")}
      ${mailButton(props.dashboardUrl, "Abrir painel do cobrador")}
    `,
  });

  return { subject, html, text };
}
