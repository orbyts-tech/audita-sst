# Supabase — Audita SST

## 1. Criar o banco

No painel Supabase → **SQL Editor**:

1. Cole e execute `001_schema.sql`
2. (Opcional) execute `002_seed.sql`

## 2. Frontend

Variáveis em `.env` na raiz:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## 3. Backend (consultas eSocial)

Em `server/.env`, cole a **Database URL** (Settings → Database → URI):

```env
DATABASE_URL=postgresql://postgres.xxxx:SENHA@...pooler.supabase.com:6543/postgres
```

Reinicie `npm run dev:server`. O health em `/api/health` deve mostrar `databaseConnected: true`.

## Segurança

As políticas `mvp_anon_*` liberam a publishable key no MVP (login demo). Remova-as quando o Auth Supabase estiver no app.
