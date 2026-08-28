import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthCookieService } from "./auth-cookie.service";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  providers: [JwtStrategy, AuthCookieService],
  exports: [PassportModule, AuthCookieService],
})
export class AuthModule {}
