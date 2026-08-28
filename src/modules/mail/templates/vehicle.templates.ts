import {
  detailTable,
  highlightBox,
  iconHeader,
  mailButton,
  mailLayout,
  paragraph,
  type RenderedEmail,
} from "./layout";
import { formatDateTime } from "./format";

export function vehicleRegistered(props: {
  name: string;
  plate: string;
  model?: string;
  qrCode: string;
  dashboardUrl: string;
  occurredAt: string;
}): RenderedEmail {
  const subject = `Veículo registado · ${props.plate}`;
  const text = `Olá ${props.name},\n\nVeículo ${props.plate} associado à conta.\nQR: ${props.qrCode}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: `Candongueiro ${props.plate} pronto para receber`,
    title: "Veículo associado",
    bodyHtml: `
      ${iconHeader("🚐", "#ecfdf5")}
      ${paragraph(`Olá <strong>${props.name}</strong>, o seu candongueiro foi registado com sucesso.`)}
      ${detailTable([
        { label: "Matrícula", value: props.plate },
        ...(props.model ? [{ label: "Modelo", value: props.model }] : []),
        { label: "QR Code", value: props.qrCode },
        { label: "Registado em", value: formatDateTime(props.occurredAt) },
      ])}
      ${highlightBox("Os passageiros podem pagar viagens lendo o QR Code do veículo.", "success")}
      ${mailButton(props.dashboardUrl, "Ver QR Code")}
    `,
  });

  return { subject, html, text };
}
