-- =============================================================================
-- Audita SST — 006: role de aplicação `audita_app` (privilégios mínimos)
-- Incremental. NÃO aplicar no compartilhado sem autorização.
-- Não apaga dados de seed 004.
--
-- Por que BYPASSRLS?
-- O backend Fastify valida JWT + checa organization_members/company_access em
-- código. Sem claim auth.uid() na sessão Postgres, RLS bloquearia 100% das
-- queries do servidor. BYPASSRLS + grants estreitos é o meio-termo seguro
-- (melhor que `postgres` superuser). Autorização de endpoint permanece obrigatória.
--
-- Após aplicar:
--   1. ALTER ROLE audita_app PASSWORD '<senha-forte>';
--   2. DATABASE_URL=postgresql://audita_app:...@aws-0-<region>.pooler.supabase.com:6543/postgres
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'audita_app') THEN
    CREATE ROLE audita_app WITH
      LOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      NOBYPASSRLS;
  END IF;
END $$;

-- BYPASSRLS: necessário para o backend sem impersonar JWT no pool
ALTER ROLE audita_app WITH BYPASSRLS;

GRANT CONNECT ON DATABASE postgres TO audita_app;
GRANT USAGE ON SCHEMA public TO audita_app;

-- Começa sem privilégios em tabelas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM audita_app', r.tbl);
  END LOOP;
END $$;

-- Autorização (somente leitura de vínculos)
GRANT SELECT ON TABLE
  public.organizations,
  public.profiles,
  public.organization_members,
  public.companies,
  public.company_access
TO audita_app;

-- Persistência eSocial / auditoria do servidor
GRANT SELECT, INSERT, UPDATE ON TABLE
  public.esocial_consultas,
  public.esocial_identificadores,
  public.esocial_eventos,
  public.esocial_quota,
  public.audit_logs
TO audita_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO audita_app;

COMMENT ON ROLE audita_app IS
  'Role da API Audita SST: BYPASSRLS + grants mínimos. Autorização no Fastify é obrigatória.';
