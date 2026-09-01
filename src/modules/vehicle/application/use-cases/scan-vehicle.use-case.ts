import { Inject, Injectable } from "@nestjs/common";
import { NotFoundException } from "../../../../shared/domain/exceptions/domain.exception";
import {
  VEHICLE_REPOSITORY,
  type VehicleRepository,
} from "../../domain/repositories/vehicle.repository";
import type { ScanVehicleDto } from "../dto/vehicle.dto";

@Injectable()
export class ScanVehicleUseCase {
  constructor(@Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository) {}

  async execute(dto: ScanVehicleDto) {
    const qrCode = dto.qrCode.trim();
    const vehicle = await this.vehicles.findByQrCode(qrCode);
    if (!vehicle) {
      throw new NotFoundException("Veículo não encontrado para este QR Code.");
    }

    return {
      id: vehicle.id,
      plate: vehicle.plate,
      model: vehicle.model,
      driverName: vehicle.driverName,
      status: vehicle.status,
      qrCode: vehicle.qrCode,
    };
  }
}
