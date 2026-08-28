import { UnauthorizedException } from "../../../../shared/domain/exceptions/domain.exception";
import { Role } from "../../../../shared/domain/types/enums";
import type { OtpChallengeRepository } from "../../domain/repositories/otp-challenge.repository";
import type { UserRepository } from "../../domain/repositories/user.repository";
import type { TokenServicePort } from "../ports/token.port";
import { VerifyOtpUseCase } from "./verify-otp.use-case";
import { makeUser } from "../../../../test/fixtures/user.fixture";
import type { MailService } from "../../../mail/application/mail.service";
import type { WelcomeBonusService } from "../../../promotions/welcome-bonus.service";

describe("VerifyOtpUseCase", () => {
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

  const tokens: jest.Mocked<TokenServicePort> = {
    sign: jest.fn(),
  };

  const mail = {
    sendWelcomePassenger: jest.fn(),
    sendWelcomeDriver: jest.fn(),
    sendWelcomeBonus: jest.fn(),
    sendSecurityNewLogin: jest.fn(),
  } as unknown as MailService;

  const welcomeBonus = {
    tryGrantPassengerBonus: jest.fn(),
  } as unknown as WelcomeBonusService;

  const useCase = new VerifyOtpUseCase(otpChallenges, users, tokens, mail, welcomeBonus);

  beforeEach(() => {
    jest.clearAllMocks();
    (welcomeBonus.tryGrantPassengerBonus as jest.Mock).mockResolvedValue({ granted: false });
  });

  it("rejeita OTP inválido", async () => {
    otpChallenges.findValid.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: "anderson@email.com",
        code: "000000",
        flow: "login",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("autentica login existente", async () => {
    const user = makeUser();
    otpChallenges.findValid.mockResolvedValue({ id: "otp_1" });
    users.findByEmail.mockResolvedValue(user);
    tokens.sign.mockResolvedValue("jwt-token");

    const result = await useCase.execute({
      email: "anderson@email.com",
      code: "123456",
      flow: "login",
    });

    expect(otpChallenges.consume).toHaveBeenCalledWith("otp_1");
    expect(result.accessToken).toBe("jwt-token");
    expect(result.user.email).toBe("anderson@email.com");
    expect(mail.sendSecurityNewLogin).toHaveBeenCalled();
  });

  it("regista novo utilizador com PIN", async () => {
    const created = makeUser({ id: "usr_new", role: Role.DRIVER });
    otpChallenges.findValid.mockResolvedValue({ id: "otp_2" });
    users.findByEmail.mockResolvedValueOnce(null);
    users.create.mockResolvedValue(created);
    users.findById.mockResolvedValue(created);
    tokens.sign.mockResolvedValue("jwt-new");

    const result = await useCase.execute({
      email: "novo@email.com",
      code: "123456",
      flow: "register",
      name: "João Manuel",
      phone: "+244 912 000 000",
      role: Role.DRIVER,
      pin: "654321",
    });

    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "novo@email.com",
        role: Role.DRIVER,
        pinHash: expect.any(String),
      }),
    );
    expect(mail.sendWelcomeDriver).toHaveBeenCalled();
    expect(result.user.role).toBe(Role.DRIVER);
  });

  it("concede bónus aos primeiros passageiros", async () => {
    const created = makeUser({ id: "usr_pass", role: Role.PASSENGER, balance: 1000 });
    otpChallenges.findValid.mockResolvedValue({ id: "otp_3" });
    users.findByEmail.mockResolvedValueOnce(null);
    users.create.mockResolvedValue(makeUser({ id: "usr_pass", role: Role.PASSENGER, balance: 0 }));
    users.findById.mockResolvedValue(created);
    tokens.sign.mockResolvedValue("jwt-pass");
    (welcomeBonus.tryGrantPassengerBonus as jest.Mock).mockResolvedValue({
      granted: true,
      amount: 1000,
      rank: 1,
      balanceAfter: 1000,
      notificationId: "ntf_1",
      reference: "BONUS-WELCOME-001",
    });

    const result = await useCase.execute({
      email: "pass@email.com",
      code: "123456",
      flow: "register",
      name: "Maria",
      phone: "+244 912 111 111",
      role: Role.PASSENGER,
      pin: "654321",
    });

    expect(welcomeBonus.tryGrantPassengerBonus).toHaveBeenCalledWith("usr_pass");
    expect(mail.sendWelcomeBonus).toHaveBeenCalled();
    expect(result.welcomeBonus).toEqual({ amount: 1000, rank: 1, notificationId: "ntf_1" });
    expect(result.user.balance).toBe(1000);
  });
});
