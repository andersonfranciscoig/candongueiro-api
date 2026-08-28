import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedDataUri: string | undefined;

function resolveLogoDataUri(): string {
  if (cachedDataUri) return cachedDataUri;

  const candidates = [
    join(__dirname, "../assets/logo.jpg"),
    join(__dirname, "../../assets/logo.jpg"),
    join(process.cwd(), "src/modules/mail/assets/logo.jpg"),
  ];

  for (const file of candidates) {
    try {
      const buffer = readFileSync(file);
      cachedDataUri = `data:image/jpeg;base64,${buffer.toString("base64")}`;
      return cachedDataUri;
    } catch {
      // tenta próximo caminho
    }
  }

  const fallback =
    process.env.MAIL_LOGO_URL ??
    `${(process.env.FRONTEND_URL ?? "http://localhost:5173").replace(/\/$/, "")}/brand/logo.png`;

  cachedDataUri = fallback;
  return cachedDataUri;
}

export function mailLogoImage(width = 280): string {
  const src = resolveLogoDataUri();
  return `<img src="${src}" width="${width}" alt="CandongueiroPay" style="display:block;margin:0 auto;max-width:100%;height:auto;border:0"/>`;
}

/** Cabeçalho de email com logotipo oficial sobre gradiente. */
export function mailBrandHeader(): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#0066FF 0%,#0047B3 48%,#0B1F3A 100%);border-radius:24px 24px 0 0">
  <tr>
    <td style="padding:32px 28px 0;text-align:center">
      <div style="display:inline-block;background:#ffffff;border-radius:20px;padding:14px 18px;box-shadow:0 16px 40px rgba(0,0,0,0.18)">
        ${mailLogoImage(268)}
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 32px 0;text-align:center">
      <p style="margin:0;font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.78)">
        Sem troco · Sem dinheiro físico · Sem ATM
      </p>
    </td>
  </tr>
  <tr>
    <td style="padding:0;line-height:0;font-size:0">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 48" width="100%" height="48" preserveAspectRatio="none" style="display:block">
        <path d="M0,24 C120,48 240,0 360,24 C480,48 540,32 600,24 L600,48 L0,48 Z" fill="#ffffff"/>
      </svg>
    </td>
  </tr>
</table>`;
}

export function mailBrandFooter(): string {
  const year = new Date().getFullYear();
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;background:#f1f5f9;border-radius:0 0 24px 24px;border:1px solid #e2e8f0;border-top:none">
  <tr>
    <td style="padding:24px 32px 28px;text-align:center">
      <p style="margin:0 0 10px;font-family:Inter,ui-sans-serif,system-ui,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#0066FF">
        CandongueiroPay · Angola
      </p>
      <p style="margin:0 0 6px;font-size:12px;line-height:1.7;color:#64748b">
        Carteira digital para viagens de candongueiro
      </p>
      <p style="margin:0;font-size:11px;color:#94a3b8">© ${year} CandongueiroPay</p>
    </td>
  </tr>
</table>`;
}
