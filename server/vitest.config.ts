import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      AUDITA_API_USER: "test-user",
      AUDITA_API_PASSWORD: "test-password",
      AUDITA_JWT_SECRET: "test-jwt-secret-min-32-characters!!",
      ESOCIAL_TRANSPORT_MOCK: "true",
      ESOCIAL_EMPREGADOR_CNPJ: "12345678000190",
      ESOCIAL_ALLOWED_COMPANY_IDS: "1",
    },
  },
});
