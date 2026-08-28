import { Request } from "express";
import { ExtractJwt } from "passport-jwt";
import { AUTH_COOKIE_NAME } from "./auth-cookie.service";

export function jwtFromCookieOrHeader(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
  if (cookieToken) return cookieToken;

  const bearer = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  return bearer ?? null;
}
