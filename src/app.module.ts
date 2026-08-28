import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./shared/infrastructure/persistence/prisma/prisma.module";
import { AuthModule } from "./shared/infrastructure/auth/auth.module";
import { HealthController } from "./shared/infrastructure/http/health.controller";
import { IdentityModule } from "./modules/identity/identity.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { VehicleModule } from "./modules/vehicle/vehicle.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ConductorModule } from "./modules/conductor/conductor.module";
import { RefundModule } from "./modules/refund/refund.module";
import { WorkSessionModule } from "./modules/work-session/work-session.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    IdentityModule,
    WalletModule,
    VehicleModule,
    NotificationsModule,
    ConductorModule,
    RefundModule,
    WorkSessionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
