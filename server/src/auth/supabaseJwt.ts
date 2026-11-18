import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { getEnv } from "../config/env.js";
import { AppError } from "../lib/errors.js";

export type SupabaseAuthSubject = {
  sub: string;
  email?: string;
  role?: string;
  raw: JWTPayload;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  const env = getEnv();
  if (!env.SUPABASE_URL) {
    throw new AppError(
      "SUPABASE_URL não configurada no servidor.",
      "AUTH_MISCONFIGURED",
      500,
    );
  }
  if (!jwks) {
    const url = new URL("/auth/v1/.well-known/jwks.json", env.SUPABASE_URL);
    jwks = createRemoteJWKSet(url);
  }
  return jwks;
}

export async function verifySupabaseAccessToken(
  token: string,
): Promise<SupabaseAuthSubject> {
  const env = getEnv();
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      algorithms: ["ES256", "RS256"],
      audience: "authenticated",
    });

    if (!payload.sub || typeof payload.sub !== "string") {
      throw new Error("missing sub");
    }

    // issuer opcional: projetos novos usam https://<ref>.supabase.co/auth/v1
    if (env.SUPABASE_URL && payload.iss) {
      const expected = new URL("/auth/v1", env.SUPABASE_URL).href.replace(/\/$/, "");
      const iss = String(payload.iss).replace(/\/$/, "");
      if (iss !== expected && !iss.startsWith(expected)) {
        // aceita também issuer sem path inconsistente entre versões
        if (!iss.includes(new URL(env.SUPABASE_URL).hostname)) {
          throw new Error("invalid issuer");
        }
      }
    }

    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      role: typeof payload.role === "string" ? payload.role : undefined,
      raw: payload,
    };
  } catch {
    throw new AppError("Token inválido ou expirado.", "AUTH_INVALID", 401);
  }
}

/** Apenas para testes unitários. */
export function resetJwksCache() {
  jwks = null;
}
