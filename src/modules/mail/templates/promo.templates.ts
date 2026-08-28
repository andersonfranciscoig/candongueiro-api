import {
  amountHero,
  detailTable,
  highlightBox,
  iconHeader,
  mailButton,
  mailLayout,
  MAIL,
  muted,
  paragraph,
  statusPill,
  type RenderedEmail,
} from "./layout";
import { formatDateTime, formatKz } from "./format";

export function promoWelcomeBonus(props: {
  name: string;
  amount: number;
  rank: number;
  balanceAfter: number;
  limit: number;
  dashboardUrl: string;
  occurredAt: string;
}): RenderedEmail {
  const subject = `🎁 ${formatKz(props.amount)} de bónus na sua carteira`;
  const text = `Olá ${props.name},\n\nRecebeu ${formatKz(props.amount)} de bónus por ser o ${props.rank}.º dos primeiros ${props.limit} passageiros.\nNovo saldo: ${formatKz(props.balanceAfter)}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: `Ganhou ${formatKz(props.amount)} por ser um dos primeiros passageiros`,
    title: "Bónus de boas-vindas!",
    bodyHtml: `
      ${iconHeader("🎁", MAIL.goldSoft)}
      ${paragraph(`Olá <strong>${props.name}</strong>,`)}
      ${paragraph(`Parabéns! É o <strong>${props.rank}.º passageiro</strong> a juntar-se ao CandongueiroPay e recebeu um bónus especial na carteira.`)}
      ${statusPill(`#${props.rank} de ${props.limit}`, "success")}
      ${amountHero({ label: "Bónus creditado", amount: formatKz(props.amount), tone: "credit" })}
      ${detailTable([
        { label: "Novo saldo", value: formatKz(props.balanceAfter) },
        { label: "Data", value: formatDateTime(props.occurredAt) },
        { label: "Campanha", value: `Primeiros ${props.limit} passageiros` },
      ])}
      ${highlightBox("Use o saldo para pagar viagens de candongueiro via QR Code — sem troco, directo do telemóvel.", "success")}
      ${mailButton(props.dashboardUrl, "Ver a minha carteira")}
      ${muted("Este bónus foi creditado automaticamente e já está disponível para usar.")}
    `,
  });

  return { subject, html, text };
}
