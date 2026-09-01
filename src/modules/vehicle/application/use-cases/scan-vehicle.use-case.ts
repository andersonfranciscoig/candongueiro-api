import { Inject, Injectable } from "@nestjs/common";
import { BadRequestException, NotFoundException } from "../../../../shared/domain/exceptions/domain.exception";
import { formatPlate } from "../../../../shared/domain/utils/reference";
import {
  VEHICLE_REPOSITORY,
  type VehicleRepository,
} from "../../domain/repositories/vehicle.repository";
import type { ScanVehicleDto } from "../dto/vehicle.dto";

@Injectable()
export class ScanVehicleUseCase {
  constructor(@Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository) {}

  async execute(dto: ScanVehicleDto) {
    if (!dto.qrCode?.trim() && !dto.plate?.trim()) {
      throw new BadRequestException("Informe o QR Code ou a matrícula do candongueiro.");
    }

    const vehicle = dto.qrCode?.trim()
      ? await this.vehicles.findByQrCode(dto.qrCode.trim())
      : await this.vehicles.findByPlate(formatPlate(dto.plate!.trim()));

    if (!vehicle) {
      throw new NotFoundException(
        dto.plate
          ? "Candongueiro não encontrado para esta matrícula."
          : "Veículo não encontrado para este QR Code.",
      );
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
