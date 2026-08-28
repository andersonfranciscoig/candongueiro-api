import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { TokenPayload, TokenServicePort } from "../../application/ports/token.port";

@Injectable()
export class JwtTokenService implements TokenServicePort {
  constructor(private readonly jwt: JwtService) {}

  sign(payload: TokenPayload) {
    return this.jwt.signAsync(payload);
  }
}
