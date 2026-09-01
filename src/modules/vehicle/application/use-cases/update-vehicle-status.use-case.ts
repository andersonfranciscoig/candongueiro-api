import { Inject, Injectable } from "@nestjs/common";
import { ForbiddenException, NotFoundException } from "../../../../shared/domain/exceptions/domain.exception";
import { VehicleStatus } from "../../../../shared/domain/types/enums";
import {
  VEHICLE_REPOSITORY,
  type VehicleRepository,
} from "../../domain/repositories/vehicle.repository";
import type { UpdateVehicleStatusDto } from "../dto/vehicle.dto";

@Injectable()
export class UpdateVehicleStatusUseCase {
  constructor(@Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository) {}

  async execute(userId: string, vehicleId: string, dto: UpdateVehicleStatusDto) {
    const vehicle = await this.vehicles.findById(vehicleId);
    if (!vehicle) throw new NotFoundException("Veículo");
    if (vehicle.ownerId !== userId) {
      throw new ForbiddenException("Não pode alterar este veículo.");
    }

    const updated = await this.vehicles.updateStatus(vehicleId, dto.status as VehicleStatus);
    return {
      id: updated.id,
      plate: updated.plate,
      model: updated.model,
      driverName: updated.driverName,
      status: updated.status,
      qrCode: updated.qrCode,
      ownershipType: updated.ownershipType ?? "OWNER",
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
