# Checklist de revisão — ETAPA 02A (antes de aplicar em produção)

**Não aplicar** `003_rls_auth_hardening.sql` / `004_seed_isolation_test.sql` no banco compartilhado até este checklist ser aprovado.

## Arquivos a revisar

1. `docs/supabase/003_rls_auth_hardening.sql` — helpers, triggers, DROP `mvp_anon_*`, policies novas
2. `docs/supabase/003_rls_auth_hardening_rollback.sql` — rollback parcial
3. `docs/supabase/004_seed_isolation_test.sql` — seed A/B **somente** em ambiente de teste
4. `server/src/db/migrations/002_rls_auth_hardening.sql` — espelho da 003

## Políticas antigas removidas (003)

Todas as `mvp_anon_*` com `USING (true) WITH CHECK (true)`.

Também substituídas/restringidas:

- `org_insert_authenticated` (antes `WITH CHECK (true)` livre)
- `org_update_member` (agora só `is_org_admin`)
- `org_members_insert` (self-join / escalada bloqueados)
- `org_certs_all` → select/write separados
- `company_access_all` → só gestores
- `companies_*` → read via `can_access_company`, write via `can_write_company`
- `profiles_update_own` + trigger impede mudar `papel` / `organization_id`
- `audit_logs_insert` removida para `authenticated`

## Como validar o código sem tocar no banco compartilhado

```bash
# Unitários API (mocks JWT) — não precisam do Postgres remoto
cd server && npm test -- tests/access.test.ts tests/realGate.test.ts

# Build
cd .. && npm run build && npm run build:server
```

Os testes `tests/rls-isolation.test.ts` **só** rodam com `DATABASE_URL` apontando para um banco onde a 003+004 já tenham sido aplicadas (ex.: projeto local/staging). Em CI sem DB, ficam skipped.

## Depois da aprovação — ordem de aplicação

1. Backup / snapshot do projeto Supabase
2. SQL Editor → `003_rls_auth_hardening.sql`
3. (Opcional, só staging) `004_seed_isolation_test.sql`
4. Dashboard Auth: desabilitar sign-up público; criar usuários por convite
5. Preencher `.env` (raiz + `server/`)
6. `npm run test:server` e smoke manual de login A/B
