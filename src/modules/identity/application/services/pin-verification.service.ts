import { Inject, Injectable } from "@nestjs/common";
import { UnauthorizedException } from "../../../../shared/domain/exceptions/domain.exception";
import { isValidPinFormat, verifyPinHash } from "../../../../shared/domain/utils/pin-hash";
import { USER_REPOSITORY, type UserRepository } from "../../../identity/domain/repositories/user.repository";

@Injectable()
export class PinVerificationService {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async assertValidPin(userId: string, pin: string): Promise<void> {
    if (!isValidPinFormat(pin)) {
      throw new UnauthorizedException("Código secreto inválido.");
    }

    const auth = await this.users.findAuthById(userId);
    if (!auth?.pinHash || !verifyPinHash(pin, auth.pinHash)) {
      throw new UnauthorizedException("Código secreto incorrecto.");
    }
  }
}
