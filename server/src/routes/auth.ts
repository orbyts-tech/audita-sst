import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticateApiUser, issueToken } from "../auth/jwt.js";
import { toErrorResponse } from "../lib/errors.js";

const bodySchema = z.object({
  username: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/token", async (req, reply) => {
    try {
      const body = bodySchema.parse(req.body);
      authenticateApiUser(body.username, body.password);
      const token = await issueToken(body.username);
      return { token, tokenType: "Bearer" };
    } catch (err) {
      const mapped = toErrorResponse(err);
      return reply.status(mapped.statusCode).send(mapped.body);
    }
  });
}
