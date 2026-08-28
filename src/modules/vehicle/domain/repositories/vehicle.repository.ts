import type { VehicleStatus } from "../../../../shared/domain/types/enums";

export const VEHICLE_REPOSITORY = Symbol("VEHICLE_REPOSITORY");

export interface VehicleRecord {
  id: string;
  ownerId: string;
  plate: string;
  model: string | null;
  driverName: string;
  status: VehicleStatus;
  ownershipType?: "OWNER" | "FLEET";
  qrCode: string;
  createdAt: Date;
}

export interface VehicleRepository {
  findByOwner(ownerId: string): Promise<VehicleRecord[]>;
  findByQrCode(qrCode: string): Promise<VehicleRecord | null>;
  findByPlate(plate: string): Promise<VehicleRecord | null>;
  create(input: {
    ownerId: string;
    plate: string;
    model?: string | null;
    driverName: string;
    qrCode: string;
    ownershipType?: "OWNER" | "FLEET";
  }): Promise<VehicleRecord>;
}
