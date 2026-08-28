import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "../../../../shared/domain/exceptions/domain.exception";
import { MailService } from "../../../mail/application/mail.service";
import { BrevoOtpSender } from "./brevo-otp.sender";
import type { ConsoleOtpSender } from "./console-otp.sender";

describe("BrevoOtpSender", () => {
  const mailService = { sendOtp: jest.fn() };
  const consoleSender = { send: jest.fn() };
  const config = {
    get: jest.fn((key: string) => {
      if (key === "OTP_TTL_SECONDS") return "300";
      if (key === "NODE_ENV") return "development";
      return undefined;
    }),
  } as unknown as ConfigService;

  const sender = new BrevoOtpSender(
    mailService as unknown as MailService,
    config,
    consoleSender as unknown as ConsoleOtpSender,
  );

  beforeEach(() => jest.clearAllMocks());

  it("envia email OTP via MailService", async () => {
    await sender.send("user@email.com", "123456", "login");

    expect(mailService.sendOtp).toHaveBeenCalledWith({
      email: "user@email.com",
      otp: "123456",
      expiresMinutes: 5,
      flow: "login",
    });
  });

  it("em desenvolvimento, faz fallback para console se a rede falhar", async () => {
    const networkError = Object.assign(new TypeError("fetch failed"), {
      cause: { code: "UND_ERR_CONNECT_TIMEOUT" },
    });
    mailService.sendOtp.mockRejectedValue(networkError);

    await sender.send("user@email.com", "123456", "register");

    expect(consoleSender.send).toHaveBeenCalledWith(
      "user@email.com",
      "123456",
      "register",
    );
  });

  it("mapeia falha de envio para BadRequestException em produção", async () => {
    const prodConfig = {
      get: jest.fn((key: string) => {
        if (key === "OTP_TTL_SECONDS") return "300";
        if (key === "NODE_ENV") return "production";
        return undefined;
      }),
    } as unknown as ConfigService;

    const prodSender = new BrevoOtpSender(
      mailService as unknown as MailService,
      prodConfig,
      consoleSender as unknown as ConsoleOtpSender,
    );

    mailService.sendOtp.mockRejectedValue(new Error("Brevo down"));

    await expect(prodSender.send("user@email.com", "123456", "register")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
