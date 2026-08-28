import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../../../shared/infrastructure/persistence/prisma/prisma.service";
import type {
  VehicleRecord,
  VehicleRepository,
} from "../../../domain/repositories/vehicle.repository";
import { VehicleStatus as DomainVehicleStatus } from "../../../../../shared/domain/types/enums";

@Injectable()
export class PrismaVehicleRepository implements VehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: {
    id: string;
    ownerId: string;
    plate: string;
    model: string | null;
    driverName: string;
    status: string;
    ownershipType?: string;
    qrCode: string;
    createdAt: Date;
  }): VehicleRecord {
    return {
      id: row.id,
      ownerId: row.ownerId,
      plate: row.plate,
      model: row.model,
      driverName: row.driverName,
      status: row.status as DomainVehicleStatus,
      ownershipType: (row.ownershipType as "OWNER" | "FLEET" | undefined) ?? "OWNER",
      qrCode: row.qrCode,
      createdAt: row.createdAt,
    };
  }

  async findByOwner(ownerId: string): Promise<VehicleRecord[]> {
    const rows = await this.prisma.vehicle.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.map(row));
  }

  async findByQrCode(qrCode: string): Promise<VehicleRecord | null> {
    const row = await this.prisma.vehicle.findUnique({ where: { qrCode } });
    return row ? this.map(row) : null;
  }

  async findByPlate(plate: string): Promise<VehicleRecord | null> {
    const row = await this.prisma.vehicle.findUnique({ where: { plate } });
    return row ? this.map(row) : null;
  }

  async create(input: {
    ownerId: string;
    plate: string;
    model?: string | null;
    driverName: string;
    qrCode: string;
    ownershipType?: "OWNER" | "FLEET";
  }): Promise<VehicleRecord> {
    const row = await this.prisma.vehicle.create({
      data: {
        ownerId: input.ownerId,
        plate: input.plate,
        model: input.model ?? null,
        driverName: input.driverName,
        qrCode: input.qrCode,
        ownershipType: input.ownershipType ?? "OWNER",
      },
    });
    return this.map(row);
  }
}
