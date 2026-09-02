import { Request } from "express";
import { ExtractJwt } from "passport-jwt";
import { AUTH_COOKIE_NAME } from "./auth-cookie.service";

export function jwtFromCookieOrHeader(req: Request): string | null {
  // Bearer tem prioridade: evita cookie antigo (outra conta/role) sobrepor o token actual.
  const bearer = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (bearer) return bearer;

  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
  return cookieToken ?? null;
}
