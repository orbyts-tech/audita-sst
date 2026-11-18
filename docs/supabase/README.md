# Supabase — Audita SST

Antes de aplicar SQL no projeto compartilhado, use o checklist:
[`REVIEW_CHECKLIST.md`](./REVIEW_CHECKLIST.md).

TLS + role de app: [`TLS_AND_APP_ROLE.md`](./TLS_AND_APP_ROLE.md).

## 1. Criar / atualizar o banco

No painel Supabase → **SQL Editor** (somente após revisão/autorização):

1. Se banco novo: execute `001_schema.sql`
2. (Opcional legado) `002_seed.sql`
3. Auth/RLS: `003_rls_auth_hardening.sql` (já aplicada no projeto atual)
4. Seed teste: `004_seed_isolation_test.sql` (já aplicada; **manter dados**)
5. Grants mínimos: `005_revoke_anon_grants.sql` — **pendente de autorização**
6. Role API: `006_app_role.sql` — **pendente de autorização**

Rollbacks: `003_*_rollback.sql`, `005_*_rollback.sql`, `006_*_rollback.sql` (preferir backup).

## 2. Auth (Dashboard)

- Authentication → Providers → Email: habilitado
- **Desabilitar** sign-up público / “Enable sign ups” (cadastro só por admin/convite)
- Criar usuários em Authentication → Users (ou seed 004)

Usuários de isolamento (senha `IsolamentoA1!`):

| E-mail | Papel |
|--------|--------|
| admin-a@audita.test | Admin org A |
| operador-a@audita.test | Operador (só Empresa A1) |
| viewer-a@audita.test | Visualizador (só Empresa A1) |
| admin-b@audita.test | Admin org B |

## 3. Frontend

Variáveis em `.env` na raiz:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_API_BASE_URL=http://127.0.0.1:8787
```

## 4. Backend (API eSocial)

Em `server/.env`:

```env
SUPABASE_URL=https://SEU_PROJETO.supabase.co
DATABASE_URL=postgresql://postgres:...@db....supabase.co:5432/postgres
# Se o certificado intermediário falhar na cadeia local:
DATABASE_SSL_REJECT_UNAUTHORIZED=false
```

A API valida o **access token do Supabase Auth** (JWKS ES256).  
`/api/auth/token` legado retorna **410**.

**Risco:** `DATABASE_URL` com usuário `postgres` bypassa RLS. Toda rota privada faz checagem explícita em `authorization.ts`.

## 5. Matriz de permissões (resumo)

| Operação | owner/admin org | member | viewer org | company owner/operator | company viewer |
|----------|-----------------|--------|------------|------------------------|----------------|
| Ver empresas autorizadas | todas da org | via `company_access` | via `company_access` | sim | sim |
| Criar/excluir empresas | sim | não | não | não | não |
| Atualizar empresa / consultas | sim | se operator+ | não | sim | não |
| Gerenciar membros / access | sim | não | não | access: company owner | não |
| Inserir `audit_logs` via Data API | não | não | não | não | não |

## 6. Segurança

- Políticas `mvp_anon_*` **removidas** pela migração 003.
- Sem fallback para mocks quando autenticado e Supabase falha.
- MemoryStore **proibido** em produção se o Postgres falhar.
