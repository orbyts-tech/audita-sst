import { timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "../config/env.js";
import { AppError } from "../lib/errors.js";

export type AuthSubject = {
  sub: string;
  role: "api_operator";
};

function secretKey() {
  return new TextEncoder().encode(getEnv().AUDITA_JWT_SECRET);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

export async function issueToken(subject: string): Promise<string> {
  const env = getEnv();
  return new SignJWT({ role: "api_operator" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(`${env.AUDITA_JWT_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<AuthSubject> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) throw new Error("missing sub");
    return { sub: payload.sub, role: "api_operator" };
  } catch {
    throw new AppError("Token inválido ou expirado.", "AUTH_INVALID", 401);
  }
}

/** Credenciais da API eSocial — independentes do login demonstrativo do frontend. */
export function authenticateApiUser(username: string, password: string): void {
  const env = getEnv();
  const userOk = safeEqual(username, env.AUDITA_API_USER);
  const passOk = safeEqual(password, env.AUDITA_API_PASSWORD);
  if (!userOk || !passOk) {
    throw new AppError("Credenciais da API inválidas.", "AUTH_FAILED", 401);
  }
}
