import {
  detailTable,
  highlightBox,
  iconHeader,
  mailLayout,
  paragraph,
  type RenderedEmail,
} from "./layout";
import { formatDateTime } from "./format";

export function profileUpdated(props: {
  name: string;
  changedFields: string[];
  occurredAt: string;
}): RenderedEmail {
  const fields = props.changedFields.join(", ");
  const subject = "Dados da conta actualizados";
  const text = `Olá ${props.name},\n\nActualizou: ${fields}.\nData: ${formatDateTime(props.occurredAt)}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: "Confirmamos alterações no seu perfil",
    title: "Perfil actualizado",
    bodyHtml: `
      ${iconHeader("👤", "#eff6ff")}
      ${paragraph(`Olá <strong>${props.name}</strong>, confirmamos alterações na sua conta.`)}
      ${detailTable([
        { label: "Campos alterados", value: fields },
        { label: "Data", value: formatDateTime(props.occurredAt) },
      ])}
      ${highlightBox("Se não fez estas alterações, contacte-nos imediatamente.", "warning")}
    `,
  });

  return { subject, html, text };
}

export function securityNewLogin(props: {
  name: string;
  occurredAt: string;
  deviceHint?: string;
}): RenderedEmail {
  const subject = "Novo acesso à sua conta";
  const text = `Olá ${props.name},\n\nDetectámos um novo acesso em ${formatDateTime(props.occurredAt)}.\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: "Novo acesso detectado",
    title: "Novo acesso",
    bodyHtml: `
      ${iconHeader("🔒", "#fef2f2")}
      ${paragraph(`Olá <strong>${props.name}</strong>, detectámos um novo acesso à sua conta CandongueiroPay.`)}
      ${detailTable([
        { label: "Data", value: formatDateTime(props.occurredAt) },
        ...(props.deviceHint ? [{ label: "Dispositivo", value: props.deviceHint }] : []),
      ])}
      ${highlightBox("Se não foi você, altere os dados de acesso e contacte o suporte.", "warning")}
    `,
  });

  return { subject, html, text };
}
