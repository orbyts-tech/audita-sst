import { describe, expect, it } from "vitest";
import { resetStoreForTests, getStore } from "../src/db/store.js";

describe("idempotência de eventos", () => {
  it("não duplica mesmo eventId+sha256", async () => {
    process.env.AUDITA_API_USER = "u";
    process.env.AUDITA_API_PASSWORD = "password1";
    process.env.AUDITA_JWT_SECRET = "x".repeat(32);
    resetStoreForTests();
    const store = getStore();
    const base = {
      companyId: "1",
      ambiente: "producao_restrita",
      origem: "soap_download",
      eventType: "S-1000",
      eventId: "ID1",
      dataConsulta: new Date().toISOString(),
      situacao: "disponivel",
      xmlSha256: "abc",
      storagePath: "/tmp/a.xml",
    };
    const a = await store.upsertEvento(base);
    const b = await store.upsertEvento(base);
    expect(a.id).toBe(b.id);
    expect((await store.listEventos("1")).length).toBe(1);
  });
});
