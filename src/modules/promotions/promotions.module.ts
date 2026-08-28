import { Module } from "@nestjs/common";
import { WelcomeBonusService } from "./welcome-bonus.service";

@Module({
  providers: [WelcomeBonusService],
  exports: [WelcomeBonusService],
})
export class PromotionsModule {}
