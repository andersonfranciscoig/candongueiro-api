import { ForbiddenException, UnauthorizedException } from "../../../../shared/domain/exceptions/domain.exception";
import { Role } from "../../../../shared/domain/types/enums";
import { hashPin } from "../../../../shared/domain/utils/pin-hash";
import type { UserRepository } from "../../domain/repositories/user.repository";
import type { TokenServicePort } from "../ports/token.port";
import { LoginWithPinUseCase } from "./login-with-pin.use-case";
import { makeUser } from "../../../../test/fixtures/user.fixture";
import type { MailService } from "../../../mail/application/mail.service";

describe("LoginWithPinUseCase", () => {
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

  const tokens: jest.Mocked<TokenServicePort> = {
    sign: jest.fn(),
  };

  const mail = {
    sendSecurityNewLogin: jest.fn(),
  } as unknown as MailService;

  const useCase = new LoginWithPinUseCase(users, tokens, mail);

  beforeEach(() => jest.clearAllMocks());

  it("autentica com telefone e PIN válidos", async () => {
    const user = makeUser();
    users.findAuthByPhone.mockResolvedValue({
      user,
      pinHash: hashPin("123456"),
    });
    tokens.sign.mockResolvedValue("jwt-token");

    const result = await useCase.execute({
      phone: "+244 923 000 000",
      pin: "123456",
    });

    expect(result.accessToken).toBe("jwt-token");
    expect(result.user.phone).toBe("+244 923 000 000");
    expect(mail.sendSecurityNewLogin).toHaveBeenCalled();
  });

  it("rejeita PIN incorrecto", async () => {
    const user = makeUser();
    users.findAuthByPhone.mockResolvedValue({
      user,
      pinHash: hashPin("123456"),
    });

    await expect(
      useCase.execute({ phone: "+244 923 000 000", pin: "000000" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejeita conta sem PIN definido", async () => {
    users.findAuthByPhone.mockResolvedValue({
      user: makeUser(),
      pinHash: null,
    });

    await expect(
      useCase.execute({ phone: "+244 923 000 000", pin: "123456" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
