import { Inject, Injectable } from "@nestjs/common";
import { NotFoundException, ConflictException } from "../../../../shared/domain/exceptions/domain.exception";
import { Phone } from "../../../../shared/domain/value-objects/phone.vo";
import { USER_REPOSITORY, type UserRepository } from "../../domain/repositories/user.repository";
import { MailService } from "../../../mail/application/mail.service";
import type { UpdateProfileDto } from "../dto/profile.dto";

@Injectable()
export class GetProfileUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Utilizador");

    return {
      id: user.id,
      name: user.name,
      email: user.email.value,
      phone: user.phone.value,
      role: user.role,
      balance: user.balance,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    private readonly mail: MailService,
  ) {}

  async execute(userId: string, dto: UpdateProfileDto) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Utilizador");

    const changedFields: string[] = [];

    if (dto.phone) {
      const phone = new Phone(dto.phone).value;
      const existing = await this.users.findByPhone(phone);
      if (existing && existing.id !== userId) {
        throw new ConflictException("Já existe uma conta com este telefone.");
      }
      if (phone !== user.phone.value) {
        changedFields.push("telefone");
        user.updatePhone(phone);
      }
    }

    if (dto.name?.trim()) {
      const nextName = dto.name.trim();
      if (nextName !== user.name) {
        changedFields.push("nome");
        user.updateName(nextName);
      }
    }

    const saved = await this.users.save(user);

    if (changedFields.length > 0) {
      this.mail.sendProfileUpdated({
        email: saved.email.value,
        name: saved.name,
        changedFields,
        occurredAt: new Date().toISOString(),
      });
    }

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email.value,
      phone: saved.phone.value,
      role: saved.role,
      balance: saved.balance,
      createdAt: saved.createdAt.toISOString(),
    };
  }
}
