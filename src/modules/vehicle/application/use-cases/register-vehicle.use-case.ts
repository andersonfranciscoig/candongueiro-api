import { Inject, Injectable } from "@nestjs/common";
import { Role } from "../../../../shared/domain/types/enums";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "../../../../shared/domain/exceptions/domain.exception";
import {
  buildVehicleQrCode,
  formatPlate,
} from "../../../../shared/domain/utils/reference";
import {
  VEHICLE_REPOSITORY,
  type VehicleRepository,
} from "../../domain/repositories/vehicle.repository";
import { USER_REPOSITORY, type UserRepository } from "../../../identity/domain/repositories/user.repository";
import { MailService } from "../../../mail/application/mail.service";
import type { RegisterVehicleDto } from "../dto/vehicle.dto";

@Injectable()
export class RegisterVehicleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository,
    private readonly mail: MailService,
  ) {}

  async execute(userId: string, dto: RegisterVehicleDto) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException("Utilizador");
    if (user.role !== Role.DRIVER) {
      throw new UnauthorizedException("Apenas motoristas podem registar veículos.");
    }

    const plate = formatPlate(dto.plate);
    const cleaned = plate.replace(/[^A-Z0-9]/g, "");
    if (cleaned.length < 6 || !/[A-Z]/.test(cleaned) || !/\d/.test(cleaned)) {
      throw new BadRequestException("Matrícula inválida.");
    }

    const existing = await this.vehicles.findByPlate(plate);
    if (existing) throw new ConflictException("Já existe um veículo com esta matrícula.");

    const qrCode = buildVehicleQrCode(plate, dto.model);
    const vehicle = await this.vehicles.create({
      ownerId: userId,
      plate,
      model: dto.model?.trim() || null,
      driverName: dto.driverName?.trim() || user.name,
      qrCode,
      ownershipType: dto.isOwner === false ? "FLEET" : "OWNER",
    });

    this.mail.sendVehicleRegistered({
      email: user.email.value,
      name: user.name,
      plate: vehicle.plate,
      model: vehicle.model ?? undefined,
      qrCode: vehicle.qrCode,
      occurredAt: vehicle.createdAt.toISOString(),
    });

    return {
      id: vehicle.id,
      plate: vehicle.plate,
      model: vehicle.model,
      driverName: vehicle.driverName,
      status: vehicle.status,
      qrCode: vehicle.qrCode,
      ownershipType: dto.isOwner === false ? "FLEET" : "OWNER",
      createdAt: vehicle.createdAt.toISOString(),
    };
  }
}
