import { mailBrandFooter, mailBrandHeader } from "./brand-logo";

export const MAIL = {
  bg: "#e8eef6",
  card: "#ffffff",
  ink: "#0c1929",
  navy: "#0b1f3a",
  muted: "#64748b",
  primary: "#0066ff",
  primaryDark: "#0047b3",
  primarySoft: "#eff6ff",
  gold: "#e8a317",
  goldSoft: "#fef9ec",
  success: "#059669",
  successSoft: "#ecfdf5",
  danger: "#dc2626",
  dangerSoft: "#fef2f2",
  border: "#e2e8f0",
  button: "#0066ff",
  buttonText: "#ffffff",
} as const;

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function e(value: string): string {
  return escapeHtml(value);
}

export function divider(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0"><tr><td style="height:1px;background:linear-gradient(90deg,transparent,${MAIL.border},transparent);font-size:0;line-height:0">&nbsp;</td></tr></table>`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:${MAIL.ink}">${text}</p>`;
}

export function muted(text: string): string {
  return `<p style="margin:0 0 12px;font-size:13px;line-height:1.7;color:${MAIL.muted}">${text}</p>`;
}

export function highlightBox(html: string, tone: "info" | "success" | "warning" = "info"): string {
  const tones = {
    info: { bg: MAIL.primarySoft, border: MAIL.primary, accent: MAIL.primary },
    success: { bg: MAIL.successSoft, border: MAIL.success, accent: MAIL.success },
    warning: { bg: MAIL.goldSoft, border: MAIL.gold, accent: "#b45309" },
  };
  const t = tones[tone];
  return `<div style="margin:24px 0;padding:18px 20px;background:${t.bg};border:1px solid ${MAIL.border};border-left:4px solid ${t.accent};border-radius:16px;font-size:14px;line-height:1.7;color:${MAIL.ink}">${html}</div>`;
}

export function mailButton(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:32px auto 12px">
  <tr>
    <td style="border-radius:999px;background:linear-gradient(135deg,${MAIL.button} 0%,${MAIL.primaryDark} 100%);box-shadow:0 12px 28px rgba(0,102,255,0.28)">
      <a href="${e(href)}" target="_blank" rel="noopener"
        style="display:inline-block;padding:15px 36px;font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:15px;font-weight:700;letter-spacing:0.02em;color:${MAIL.buttonText};text-decoration:none;border-radius:999px">
        ${e(label)}
      </a>
    </td>
  </tr>
</table>`;
}

export function mailOtpBoxes(code: string): string {
  const digits = code.replace(/\D/g, "").padEnd(6, "•").slice(0, 6).split("");
  const cells = digits
    .map(
      (d) =>
        `<td style="width:48px;height:58px;text-align:center;vertical-align:middle;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:26px;font-weight:800;color:${MAIL.ink};background:linear-gradient(180deg,#f8fbff 0%,${MAIL.primarySoft} 100%);border:1px solid #bfdbfe;border-radius:14px;box-shadow:0 4px 12px rgba(0,102,255,0.08)">${e(d)}</td>`,
    )
    .join('<td style="width:10px"></td>');

  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:32px auto"><tr>${cells}</tr></table>`;
}

export function amountHero(props: {
  label: string;
  amount: string;
  tone?: "credit" | "debit" | "neutral";
}): string {
  const colors = {
    credit: MAIL.success,
    debit: MAIL.danger,
    neutral: MAIL.ink,
  };
  const color = colors[props.tone ?? "neutral"];

  return `<div style="margin:28px 0;padding:32px 24px;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%);border:1px solid ${MAIL.border};border-radius:20px;text-align:center;box-shadow:0 8px 24px rgba(12,25,41,0.05)">
  <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${MAIL.muted}">${e(props.label)}</p>
  <p style="margin:0;font-size:34px;font-weight:800;letter-spacing:-0.04em;color:${color};font-variant-numeric:tabular-nums">${e(props.amount)}</p>
</div>`;
}

export function detailTable(rows: Array<{ label: string; value: string }>): string {
  const items = rows
    .map(
      (row, i) => `<tr>
      <td style="padding:${i === 0 ? "0" : "14px"} 0 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MAIL.muted}">${e(row.label)}</td>
    </tr>
    <tr>
      <td style="padding:0 0 ${i === rows.length - 1 ? "0" : "18px"};font-size:15px;font-weight:600;color:${MAIL.ink}">${e(row.value)}</td>
    </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0 24px;padding:22px;background:#f8fafc;border:1px solid ${MAIL.border};border-radius:16px">${items}</table>`;
}

export function statusPill(label: string, tone: "success" | "pending" | "info" = "success"): string {
  const styles = {
    success: { bg: MAIL.successSoft, color: MAIL.success },
    pending: { bg: MAIL.goldSoft, color: "#b45309" },
    info: { bg: MAIL.primarySoft, color: MAIL.primary },
  };
  const s = styles[tone];
  return `<span style="display:inline-block;padding:7px 14px;border-radius:999px;background:${s.bg};color:${s.color};font-size:11px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase">${e(label)}</span>`;
}

export function iconHeader(emoji: string, bg: string = MAIL.primarySoft): string {
  return `<div style="width:56px;height:56px;margin:0 auto 24px;border-radius:18px;background:${bg};text-align:center;line-height:56px;font-size:26px;box-shadow:0 8px 20px rgba(0,102,255,0.08)">${emoji}</div>`;
}

export function mailLayout(opts: {
  preview: string;
  title: string;
  bodyHtml: string;
  footerNote?: string;
}): string {
  const footer =
    opts.footerNote ??
    "Recebeu este email porque tem actividade na CandongueiroPay. Se não reconhece, ignore.";

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>${e(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${MAIL.bg};font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:${MAIL.ink};-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(opts.preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${MAIL.bg};padding:40px 16px 48px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px">
          <tr>
            <td>
              ${mailBrandHeader()}
            </td>
          </tr>
          <tr>
            <td style="background:${MAIL.card};border:1px solid ${MAIL.border};border-top:none;padding:8px 40px 40px;box-shadow:0 24px 60px rgba(12,25,41,0.1)">
              <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;line-height:1.2;letter-spacing:-0.04em;text-align:center;color:${MAIL.ink}">${e(opts.title)}</h1>
              <p style="margin:0 0 28px;font-size:14px;line-height:1.6;text-align:center;color:${MAIL.muted}">${e(opts.preview)}</p>
              ${divider()}
              ${opts.bodyHtml}
              ${divider()}
              <p style="margin:0;font-size:12px;line-height:1.7;text-align:center;color:${MAIL.muted}">${e(footer)}</p>
            </td>
          </tr>
          <tr>
            <td>
              ${mailBrandFooter()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
