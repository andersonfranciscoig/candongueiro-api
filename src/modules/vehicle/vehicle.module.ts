import { Module } from "@nestjs/common";
import { IdentityModule } from "../identity/identity.module";
import { MailModule } from "../mail/mail.module";
import { VEHICLE_REPOSITORY } from "./domain/repositories/vehicle.repository";
import { VehicleController } from "./infrastructure/http/controllers/vehicle.controller";
import { PrismaVehicleRepository } from "./infrastructure/persistence/prisma/prisma-vehicle.repository";
import { GetMyVehiclesUseCase } from "./application/use-cases/get-my-vehicles.use-case";
import { RegisterVehicleUseCase } from "./application/use-cases/register-vehicle.use-case";
import { ScanVehicleUseCase } from "./application/use-cases/scan-vehicle.use-case";

@Module({
  imports: [IdentityModule, MailModule],
  controllers: [VehicleController],
  providers: [
    GetMyVehiclesUseCase,
    RegisterVehicleUseCase,
    ScanVehicleUseCase,
    { provide: VEHICLE_REPOSITORY, useClass: PrismaVehicleRepository },
  ],
})
export class VehicleModule {}
