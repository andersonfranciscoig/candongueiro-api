import { Inject, Injectable } from "@nestjs/common";
import {
  ForbiddenException,
  UnauthorizedException,
} from "../../../../shared/domain/exceptions/domain.exception";
import { Phone } from "../../../../shared/domain/value-objects/phone.vo";
import { isValidPinFormat, verifyPinHash } from "../../../../shared/domain/utils/pin-hash";
import { USER_REPOSITORY, type UserRepository } from "../../domain/repositories/user.repository";
import { TOKEN_SERVICE, type TokenServicePort } from "../ports/token.port";
import { MailService } from "../../../mail/application/mail.service";
import type { LoginWithPinDto } from "../dto/auth.dto";

@Injectable()
export class LoginWithPinUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    private readonly mail: MailService,
  ) {}

  async execute(dto: LoginWithPinDto) {
    if (!isValidPinFormat(dto.pin)) {
      throw new UnauthorizedException("Telefone ou código secreto incorrectos.");
    }

    const phone = new Phone(dto.phone).value;
    const auth = await this.users.findAuthByPhone(phone);

    if (!auth) {
      throw new UnauthorizedException("Telefone ou código secreto incorrectos.");
    }

    if (!auth.pinHash) {
      throw new ForbiddenException(
        "Ainda não definiu um código secreto. Conclua o registo ou recupere o acesso.",
      );
    }

    if (!verifyPinHash(dto.pin, auth.pinHash)) {
      throw new UnauthorizedException("Telefone ou código secreto incorrectos.");
    }

    const { user } = auth;
    const accessToken = await this.tokens.sign({
      sub: user.id,
      email: user.email.value,
      role: user.role,
    });

    this.mail.sendSecurityNewLogin({
      email: user.email.value,
      name: user.name,
      occurredAt: new Date().toISOString(),
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email.value,
        phone: user.phone.value,
        role: user.role,
        homeRole: user.homeRole,
        balance: user.balance,
        createdAt: user.createdAt.toISOString(),
        switchableRoles: user.switchableRoles(),
      },
    };
  }
}
