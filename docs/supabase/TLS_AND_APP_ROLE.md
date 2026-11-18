# TLS Postgres + role `audita_app`

## TLS recomendado

1. No painel Supabase → **Project Settings → Database → Connection string**
2. Selecione **Connection pooling** (modo Transaction, porta **6543**)
3. Host típico: `aws-0-<region>.pooler.supabase.com`
4. Defina no `server/.env`:

```env
DATABASE_URL=postgresql://audita_app:SENHA@aws-0-<region>.pooler.supabase.com:6543/postgres
DATABASE_SSL_INSECURE=false
# opcional se a cadeia ainda falhar:
# DATABASE_SSL_CA=/caminho/absoluto/supabase-ca.pem
```

O código usa `rejectUnauthorized: true` por padrão (`server/src/db/pgSsl.ts`).

`DATABASE_SSL_INSECURE=true` só funciona fora de produção (escape hatch).

## Migrações (ordem, após autorização)

1. `005_revoke_anon_grants.sql` — revoga grants/`EXECUTE` de `anon`
2. `006_app_role.sql` — cria `audita_app`
3. `ALTER ROLE audita_app PASSWORD '...';`
4. Atualizar `DATABASE_URL` para `audita_app` + pooler
5. Reiniciar API e rodar `npx tsx scripts/smoke-isolation.ts`

## Seed 004

Manter usuários/orgs de teste. Não excluir nesta etapa.
