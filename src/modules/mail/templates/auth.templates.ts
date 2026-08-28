import {
  e,
  highlightBox,
  iconHeader,
  MAIL,
  mailButton,
  mailLayout,
  mailOtpBoxes,
  muted,
  paragraph,
  type RenderedEmail,
} from "./layout";

export function authVerifyOtp(props: {
  name?: string;
  otp: string;
  expiresMinutes: number;
  flow: "login" | "register";
}): RenderedEmail {
  const action =
    props.flow === "login" ? "entrar na sua conta" : "concluir o registo";
  const greeting = props.name?.trim()
    ? `Olá <strong>${e(props.name.trim())}</strong>,`
    : "Olá,";
  const subject = `${props.otp} — código CandongueiroPay`;
  const text = `${props.name ? `Olá ${props.name},` : "Olá,"}\n\nO seu código CandongueiroPay é: ${props.otp}\nExpira em ${props.expiresMinutes} minutos.\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: `Código ${props.otp} para ${action}`,
    title: "Confirme o seu email",
    bodyHtml: `
      <div style="text-align:center">
        ${iconHeader("🔐")}
        ${paragraph(`${greeting} use o código abaixo para <strong>${e(action)}</strong>.`)}
        ${mailOtpBoxes(props.otp)}
        ${muted(`Este código expira em <strong>${props.expiresMinutes} minutos</strong>. Não partilhe com ninguém.`)}
      </div>
      ${highlightBox("Se não pediu este código, pode ignorar este email com segurança.", "warning")}
    `,
  });

  return { subject, html, text };
}

export function authConductorInvite(props: {
  driverName: string;
  registerUrl: string;
}): RenderedEmail {
  const subject = `${props.driverName} convidou-o para CandongueiroPay`;
  const text = `Foi convidado por ${props.driverName} para ser cobrador no CandongueiroPay.\n\nCrie a sua conta: ${props.registerUrl}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: `Convite de cobrador de ${props.driverName}`,
    title: "Convite para cobrador",
    bodyHtml: `
      ${iconHeader("🎫")}
      ${paragraph(`<strong>${e(props.driverName)}</strong> convidou-o para ser <strong>cobrador</strong> na conta de motorista CandongueiroPay.`)}
      ${paragraph("Como cobrador, poderá confirmar pagamentos de passageiros e acompanhar o painel financeiro — sem levantamentos directos.")}
      ${mailButton("Criar conta de cobrador", props.registerUrl)}
      ${muted("Se não esperava este convite, pode ignorar este email.")}
    `,
  });

  return { subject, html, text };
}

export function authConductorSessionRequest(props: {
  conductorName: string;
  driverName: string;
  vehiclePlate: string;
  startAt: string;
  endAt: string;
}): RenderedEmail {
  const start = new Date(props.startAt).toLocaleString("pt-AO");
  const end = new Date(props.endAt).toLocaleString("pt-AO", { hour: "2-digit", minute: "2-digit" });
  const subject = `${props.driverName} convidou-o para um turno`;
  const text = `Olá ${props.conductorName},\n\n${props.driverName} convidou-o para trabalhar no veículo ${props.vehiclePlate}.\nInício: ${start}\nFim: ${end}\n\nAbra a app CandongueiroPay para aceitar ou recusar.\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: `Turno com ${props.driverName}`,
    title: "Pedido de turno",
    bodyHtml: `
      ${iconHeader("🕐")}
      ${paragraph(`Olá <strong>${e(props.conductorName)}</strong>,`)}
      ${paragraph(`<strong>${e(props.driverName)}</strong> convidou-o para trabalhar no veículo <strong>${e(props.vehiclePlate)}</strong>.`)}
      ${highlightBox(`Início: <strong>${e(start)}</strong><br/>Fim: <strong>${e(end)}</strong>`, "info")}
      ${paragraph("Abra a app CandongueiroPay para aceitar ou recusar este turno.")}
    `,
  });

  return { subject, html, text };
}

export function authWelcomePassenger(props: {
  name: string;
  dashboardUrl: string;
}): RenderedEmail {
  const subject = "Bem-vindo ao CandongueiroPay";
  const text = `Olá ${props.name},\n\nA sua carteira está pronta. Aceda: ${props.dashboardUrl}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: "A sua carteira digital está pronta",
    title: "Bem-vindo!",
    bodyHtml: `
      ${iconHeader("👋", MAIL.primarySoft)}
      ${paragraph(`Olá <strong>${e(props.name)}</strong>,`)}
      ${paragraph("A sua conta de <strong>passageiro</strong> foi criada com sucesso. Pague viagens de candongueiro sem troco, directamente do telemóvel.")}
      ${highlightBox("Carregue a carteira via Multicaixa Express e pague com QR Code em segundos.", "info")}
      ${mailButton(props.dashboardUrl, "Abrir a minha carteira")}
    `,
  });

  return { subject, html, text };
}

export function authWelcomeDriver(props: {
  name: string;
  dashboardUrl: string;
  vehiclePlate?: string;
}): RenderedEmail {
  const subject = "Conta de motorista activa";
  const text = `Olá ${props.name},\n\nConta de motorista criada.${props.vehiclePlate ? ` Veículo: ${props.vehiclePlate}.` : ""}\nAceda: ${props.dashboardUrl}\n\n— CandongueiroPay`;

  const html = mailLayout({
    preview: "Comece a receber pagamentos na carteira",
    title: "Conta de motorista pronta",
    bodyHtml: `
      ${iconHeader("🚌", MAIL.goldSoft)}
      ${paragraph(`Olá <strong>${e(props.name)}</strong>,`)}
      ${paragraph("A sua conta de <strong>motorista</strong> está activa. Cada viagem paga via CandongueiroPay entra directamente na sua carteira.")}
      ${props.vehiclePlate ? highlightBox(`Veículo associado: <strong>${e(props.vehiclePlate)}</strong>`, "success") : ""}
      ${mailButton(props.dashboardUrl, "Ir para o painel")}
    `,
  });

  return { subject, html, text };
}
