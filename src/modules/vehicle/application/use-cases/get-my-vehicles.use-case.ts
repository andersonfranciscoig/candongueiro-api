import { Inject, Injectable } from "@nestjs/common";
import {
  VEHICLE_REPOSITORY,
  type VehicleRepository,
} from "../../domain/repositories/vehicle.repository";

@Injectable()
export class GetMyVehiclesUseCase {
  constructor(@Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository) {}

  async execute(userId: string) {
    const vehicles = await this.vehicles.findByOwner(userId);
    return vehicles.map((v) => ({
      id: v.id,
      plate: v.plate,
      model: v.model,
      driverName: v.driverName,
      status: v.status,
      ownershipType: v.ownershipType ?? "OWNER",
      qrCode: v.qrCode,
      createdAt: v.createdAt.toISOString(),
    }));
  }
}
