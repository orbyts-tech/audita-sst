import { describe, expect, it, vi } from "vitest";
import { QuotaManager } from "../src/services/quota/QuotaManager.js";
import { AppError } from "../src/lib/errors.js";
import { resetStoreForTests } from "../src/db/store.js";

describe("QuotaManager", () => {
  it("bloqueia dias 1–7", () => {
    const q = new QuotaManager();
    const d = new Date("2026-03-03T15:00:00-03:00");
    expect(() => q.assertJanelaCalendario(d)).toThrow(AppError);
  });

  it("permite fora da janela bloqueada e consome slot", async () => {
    process.env.AUDITA_API_USER = "u";
    process.env.AUDITA_API_PASSWORD = "password1";
    process.env.AUDITA_JWT_SECRET = "x".repeat(32);
    resetStoreForTests();
    const q = new QuotaManager();
    vi.spyOn(q, "assertJanelaCalendario").mockImplementation(() => undefined);
    const slot = await q.acquireSlot("1");
    await slot.consume();
    await slot.release();
    const again = await q.acquireSlot("1");
    await again.release();
  });
});
