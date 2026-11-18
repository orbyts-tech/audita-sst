import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { beforeAll, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!fs.existsSync(envPath)) return "";
  const m = fs.readFileSync(envPath, "utf8").match(/^DATABASE_URL=(.*)$/m);
  return m?.[1]?.trim() ?? "";
}

const DATABASE_URL = loadDatabaseUrl();
const hasDb = Boolean(DATABASE_URL);

const ADMIN_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const OPER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2";
const VIEW_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3";
const ADMIN_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const ORG_A = "a1111111-1111-1111-1111-111111111111";
const ORG_B = "b1111111-1111-1111-1111-111111111111";
const EMP_A1 = "a2222222-2222-2222-2222-222222222221";
const EMP_A2 = "a2222222-2222-2222-2222-222222222222";
const EMP_B1 = "b2222222-2222-2222-2222-222222222221";

async function asUser(client: pg.Client, userId: string | null, fn: () => Promise<void>) {
  await client.query("BEGIN");
  try {
    if (userId) {
      await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);
      await client.query(`SELECT set_config('request.jwt.claim.role', 'authenticated', true)`);
      await client.query(`SET LOCAL ROLE authenticated`);
    } else {
      await client.query(`SELECT set_config('request.jwt.claim.sub', '', true)`);
      await client.query(`SET LOCAL ROLE anon`);
    }
    await fn();
  } finally {
    await client.query("ROLLBACK");
  }
}

describe.skipIf(!hasDb)("RLS isolamento multiempresa (Postgres real)", () => {
  let client: pg.Client;

  beforeAll(async () => {
    client = new pg.Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
  });

  it("1. anônimo não lê empresas privadas", async () => {
    await asUser(client, null, async () => {
      const { rows } = await client.query(`SELECT id FROM companies`);
      expect(rows.length).toBe(0);
    });
  });

  it("2. usuário sem organização não acessa empresas", async () => {
    const orphan = "cccccccc-cccc-cccc-cccc-cccccccccccc";
    await asUser(client, orphan, async () => {
      const { rows } = await client.query(`SELECT id FROM companies`);
      expect(rows.length).toBe(0);
    });
  });

  it("3. Admin A acessa empresas da org A", async () => {
    await asUser(client, ADMIN_A, async () => {
      const { rows } = await client.query(`SELECT id FROM companies ORDER BY id`);
      const ids = rows.map((r) => r.id);
      expect(ids).toContain(EMP_A1);
      expect(ids).toContain(EMP_A2);
    });
  });

  it("4. Admin A não acessa empresa B1", async () => {
    await asUser(client, ADMIN_A, async () => {
      const { rows } = await client.query(`SELECT id FROM companies WHERE id = $1`, [EMP_B1]);
      expect(rows.length).toBe(0);
    });
  });

  it("5. Operador A acessa somente empresas atribuídas", async () => {
    await asUser(client, OPER_A, async () => {
      const { rows } = await client.query(`SELECT id FROM companies ORDER BY id`);
      const ids = rows.map((r) => r.id);
      expect(ids).toEqual([EMP_A1]);
    });
  });

  it("6. Visualizador A não altera empresas", async () => {
    await asUser(client, VIEW_A, async () => {
      const result = await client.query(
        `UPDATE companies SET email = 'x@test' WHERE id = $1 RETURNING id`,
        [EMP_A1],
      );
      // RLS filtra silenciosamente: 0 linhas afetadas
      expect(result.rowCount).toBe(0);
    });
  });

  it("7. usuário não consegue adicionar-se como owner em org alheia", async () => {
    await asUser(client, OPER_A, async () => {
      await expect(
        client.query(
          `INSERT INTO organization_members (organization_id, user_id, role)
           VALUES ($1, $2, 'owner')`,
          [ORG_B, OPER_A],
        ),
      ).rejects.toThrow();
    });
  });

  it("8. usuário não altera papel diretamente em profiles", async () => {
    await asUser(client, OPER_A, async () => {
      await expect(
        client.query(`UPDATE profiles SET papel = 'Administrador' WHERE id = $1`, [OPER_A]),
      ).rejects.toThrow();
    });
  });

  it("9. operador não vincula outro usuário a empresa", async () => {
    await asUser(client, OPER_A, async () => {
      await expect(
        client.query(
          `INSERT INTO company_access (company_id, user_id, role)
           VALUES ($1, $2, 'viewer')`,
          [EMP_A2, OPER_A],
        ),
      ).rejects.toThrow();
    });
  });

  it("10/11/12. trocar UUID / company_id / organization_id não concede acesso", async () => {
    await asUser(client, OPER_A, async () => {
      const { rows: cross } = await client.query(
        `SELECT id FROM companies WHERE id = $1`,
        [EMP_B1],
      );
      expect(cross.length).toBe(0);

      await expect(
        client.query(
          `UPDATE companies SET organization_id = $1 WHERE id = $2`,
          [ORG_B, EMP_A1],
        ),
      ).rejects.toThrow(/imutável/);

      await expect(
        client.query(
          `INSERT INTO solicitacoes (company_id, status) VALUES ($1, 'criado')`,
          [EMP_B1],
        ),
      ).rejects.toThrow();
    });
  });

  it("19. nenhum usuário lê audit_logs de outra organização", async () => {
    // seed log privilegiado
    await client.query(
      `INSERT INTO audit_logs (organization_id, action, subject)
       VALUES ($1, 'test-isolation', $2)`,
      [ORG_B, ADMIN_B],
    );
    await asUser(client, ADMIN_A, async () => {
      const { rows } = await client.query(
        `SELECT id FROM audit_logs WHERE organization_id = $1`,
        [ORG_B],
      );
      expect(rows.length).toBe(0);
    });
    await asUser(client, ADMIN_A, async () => {
      await expect(
        client.query(
          `INSERT INTO audit_logs (organization_id, action) VALUES ($1, 'spoof')`,
          [ORG_B],
        ),
      ).rejects.toThrow();
    });
  });

  it("Admin B não vê empresas da org A", async () => {
    await asUser(client, ADMIN_B, async () => {
      const { rows } = await client.query(`SELECT id FROM companies`);
      const ids = rows.map((r) => r.id);
      expect(ids).toEqual([EMP_B1]);
    });
  });
});
