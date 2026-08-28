import * as T from "./index";

describe("mail templates", () => {
  it("authVerifyOtp inclui código no subject", () => {
    const email = T.authVerifyOtp({ otp: "123456", expiresMinutes: 5, flow: "login" });
    expect(email.subject).toContain("123456");
    expect(email.html).toContain("123456");
    expect(email.html).toContain("CandongueiroPay");
  });

  it("walletTopUpConfirmed formata valores", () => {
    const email = T.walletTopUpConfirmed({
      name: "Anderson",
      amount: 5000,
      balanceAfter: 17500,
      reference: "EXP-123456",
      occurredAt: "2026-01-01T10:00:00.000Z",
    });
    expect(email.subject).toContain("5");
    expect(email.html).toContain("Anderson");
    expect(email.text).toContain("Anderson");
  });

  it("walletPaymentReceived inclui matrícula", () => {
    const email = T.walletPaymentReceived({
      name: "João",
      amount: 500,
      balanceAfter: 19000,
      vehiclePlate: "LD-45-23-AB",
      reference: "CP-000124",
      occurredAt: "2026-01-01T11:00:00.000Z",
    });
    expect(email.html).toContain("LD-45-23-AB");
  });

  it("vehicleRegistered inclui QR", () => {
    const email = T.vehicleRegistered({
      name: "João",
      plate: "LD-45-23-AB",
      qrCode: "CPAY:VEH:LD-45-23-AB",
      dashboardUrl: "https://app.test/motorista/qr",
      occurredAt: "2026-01-01T12:00:00.000Z",
    });
    expect(email.html).toContain("CPAY:VEH:LD-45-23-AB");
  });

  it("authWelcomeDriver inclui CTA", () => {
    const email = T.authWelcomeDriver({
      name: "João",
      dashboardUrl: "https://app.test/motorista",
      vehiclePlate: "LD-45-23-AB",
    });
    expect(email.html).toContain("https://app.test/motorista");
  });

  it("promoWelcomeBonus inclui valor e posição", () => {
    const email = T.promoWelcomeBonus({
      name: "Maria",
      amount: 1000,
      rank: 3,
      balanceAfter: 1000,
      limit: 15,
      dashboardUrl: "https://app.test/app",
      occurredAt: "2026-01-01T10:00:00.000Z",
    });
    expect(email.subject).toContain("1");
    expect(email.html).toContain("Maria");
    expect(email.html).toContain("#3");
  });
});
