import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { jwtFromCookieOrHeader } from "./jwt-cookie.extractor";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: jwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET") ?? "dev",
    });
  }

  validate(payload: { sub: string; email: string; role: string }) {
    return payload;
  }
}
