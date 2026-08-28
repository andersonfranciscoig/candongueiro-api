import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";

export const AUTH_COOKIE_NAME = "cpay_session";

@Injectable()
export class AuthCookieService {
  constructor(private readonly config: ConfigService) {}

  setSession(res: Response, token: string): void {
    const maxAge = this.parseMaxAge(this.config.get<string>("JWT_EXPIRES_IN") ?? "7d");
    const isProd = this.config.get("NODE_ENV") === "production";

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      // Frontend (Vercel) e API (Render) em domínios distintos exigem SameSite=None.
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge,
    });
  }

  clearSession(res: Response): void {
    const isProd = this.config.get("NODE_ENV") === "production";
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    });
  }

  private parseMaxAge(expiresIn: string): number {
    const match = /^(\d+)([dhms])$/.exec(expiresIn.trim());
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      d: 86_400_000,
      h: 3_600_000,
      m: 60_000,
      s: 1_000,
    };
    return value * (multipliers[unit] ?? 86_400_000);
  }
}
