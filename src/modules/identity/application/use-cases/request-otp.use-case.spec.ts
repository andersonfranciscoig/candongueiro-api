import { ConfigService } from "@nestjs/config";
import {
  ConflictException,
  NotFoundException,
} from "../../../../shared/domain/exceptions/domain.exception";
import { Role } from "../../../../shared/domain/types/enums";
import type { OtpChallengeRepository } from "../../domain/repositories/otp-challenge.repository";
import type { UserRepository } from "../../domain/repositories/user.repository";
import type { OtpSenderPort } from "../ports/otp-sender.port";
import { RequestOtpUseCase } from "./request-otp.use-case";
import { makeUser } from "../../../../test/fixtures/user.fixture";

describe("RequestOtpUseCase", () => {
  const users: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByPhone: jest.fn(),
    findAuthByPhone: jest.fn(),
    findAuthById: jest.fn(),
    save: jest.fn(),
    setPinHash: jest.fn(),
    create: jest.fn(),
  };

  const otpChallenges: jest.Mocked<OtpChallengeRepository> = {
    create: jest.fn(),
    findValid: jest.fn(),
    consume: jest.fn(),
  };

  const otpSender: jest.Mocked<OtpSenderPort> = {
    send: jest.fn(),
  };

  const config = {
    get: jest.fn((key: string) => {
      if (key === "OTP_TTL_SECONDS") return "300";
      if (key === "OTP_DEV_CODE") return "123456";
      if (key === "NODE_ENV") return "development";
      return undefined;
    }),
  } as unknown as ConfigService;

  const useCase = new RequestOtpUseCase(config, users, otpChallenges, otpSender);

  beforeEach(() => jest.clearAllMocks());

  it("rejeita registo quando email já existe", async () => {
    users.findByEmail.mockResolvedValue(makeUser());

    await expect(
      useCase.execute({ email: "anderson@email.com", flow: "register" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejeita login quando conta não existe", async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: "novo@email.com", flow: "login" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("cria challenge e envia OTP no login", async () => {
    users.findByEmail.mockResolvedValue(makeUser());

    const result = await useCase.execute({
      email: "anderson@email.com",
      flow: "login",
    });

    expect(otpChallenges.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "anderson@email.com",
        purpose: "login",
      }),
    );
    expect(otpSender.send).toHaveBeenCalledWith(
      "anderson@email.com",
      "123456",
      "login",
    );
    expect(result.email).toBe("anderson@email.com");
    expect(result.expiresIn).toBe(300);
    expect(result.devCode).toBe("123456");
  });
});
