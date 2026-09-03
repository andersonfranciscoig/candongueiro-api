import { Inject, Injectable } from "@nestjs/common";
import { WorkSessionStatus } from "@prisma/client";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "../../../../shared/domain/exceptions/domain.exception";
import { Phone } from "../../../../shared/domain/value-objects/phone.vo";
import { Role as DomainRole } from "../../../../shared/domain/types/enums";
import { PrismaService } from "../../../../shared/infrastructure/persistence/prisma/prisma.service";
import { USER_REPOSITORY, type UserRepository } from "../../domain/repositories/user.repository";
import { TOKEN_SERVICE, type TokenServicePort } from "../ports/token.port";
import { MailService } from "../../../mail/application/mail.service";
import type { SwitchRoleDto, UpdateProfileDto } from "../dto/profile.dto";
import type { UserEntity } from "../../domain/entities/user.entity";

function mapUser(user: UserEntity) {
  return {
    id: user.id,
    name: user.name,
    email: user.email.value,
    phone: user.phone.value,
    role: user.role,
    homeRole: user.homeRole,
    balance: user.balance,
    createdAt: user.createdAt.toISOString(),
    switchableRoles: user.switchableRoles(),
  };
}

@Injectable()
export class GetProfileUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async execute(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Utilizador");
    return mapUser(user);
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

    return mapUser(saved);
  }
}

@Injectable()
export class SwitchRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokens: TokenServicePort,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userId: string, dto: SwitchRoleDto) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Utilizador");

    const target = dto.role as DomainRole;

    if (target === user.role) {
      const accessToken = await this.tokens.sign({
        sub: user.id,
        email: user.email.value,
        role: user.role,
      });
      return { accessToken, user: mapUser(user) };
    }

    if (!user.canSwitchTo(target)) {
      throw new ForbiddenException(
        "Esta conta não pode activar esse perfil. O perfil de registo define as opções disponíveis.",
      );
    }

    if (
      (user.role === DomainRole.DRIVER || user.role === DomainRole.CONDUCTOR) &&
      target === DomainRole.PASSENGER
    ) {
      const active = await this.prisma.dailyWorkSession.findFirst({
        where: {
          status: { in: [WorkSessionStatus.ACTIVE, WorkSessionStatus.AWAITING_CONDUCTOR] },
          OR: [
            { ownerDriverId: userId },
            { effectiveDriverId: userId },
            { conductorId: userId },
          ],
        },
        select: { id: true },
      });
      if (active) {
        throw new BadRequestException(
          "Tem um turno activo. Encerre o turno antes de mudar para passageiro.",
        );
      }
    }

    user.setActiveRole(target);
    const saved = await this.users.save(user);

    const accessToken = await this.tokens.sign({
      sub: saved.id,
      email: saved.email.value,
      role: saved.role,
    });

    return { accessToken, user: mapUser(saved) };
  }
}
