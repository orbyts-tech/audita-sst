import type { FastifyInstance } from "fastify";
import { AppError, toErrorResponse } from "../lib/errors.js";

/**
 * Login legado AUDITA_API_USER/PASSWORD foi removido do fluxo normal.
 * A API eSocial exige Bearer token do Supabase Auth.
 */
export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/token", async (_req, reply) => {
    const err = new AppError(
      "Este endpoint foi descontinuado. Use o access token do Supabase Auth.",
      "AUTH_DEPRECATED",
      410,
    );
    const mapped = toErrorResponse(err);
    return reply.status(mapped.statusCode).send(mapped.body);
  });
}
