-- =============================================================================
-- Audita SST — 005: permissões mínimas (anon / authenticated / funções)
-- Incremental. NÃO aplicar no compartilhado sem autorização.
-- Não apaga dados. Não altera políticas RLS (exceto dependência de EXECUTE).
-- Rollback: 005_revoke_anon_grants_rollback.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Funções SECURITY DEFINER — quem precisa de EXECUTE?
--
-- Usadas nas policies RLS (precisam ser executáveis por `authenticated`):
--   org_role, is_org_member, is_org_admin, company_role,
--   can_access_company, can_write_company, can_manage_company_access
--
-- Triggers / Auth hooks (NÃO precisam de EXECUTE para clientes Data API):
--   handle_new_user, handle_new_organization,
--   protect_profile_privileges, protect_org_member_changes,
--   protect_company_organization
--   → executadas como owner do trigger; revogar de PUBLIC/anon/authenticated
-- -----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.org_role(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_org_admin(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.company_role(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_company(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write_company(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_company_access(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.org_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_company_access(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_organization() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_org_member_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_company_organization() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) Revogar grants amplos de anon (defesa em profundidade; RLS já bloqueia)
-- -----------------------------------------------------------------------------
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
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.tbl);
  END LOOP;
END $$;

REVOKE USAGE ON SCHEMA public FROM anon;

-- -----------------------------------------------------------------------------
-- 3) authenticated: remover privilégios perigosos não cobertos por policies
--    Mantém SELECT/INSERT/UPDATE/DELETE onde as policies permitem.
--    Remove TRUNCATE / REFERENCES / TRIGGER de tabelas de negócio.
-- -----------------------------------------------------------------------------
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
    EXECUTE format(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM authenticated',
      r.tbl
    );
  END LOOP;
END $$;

-- audit_logs: authenticated só SELECT (policy já não permite INSERT)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.audit_logs FROM authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

-- Garantir USAGE no schema para authenticated (necessário para Data API)
GRANT USAGE ON SCHEMA public TO authenticated;

-- Tabelas de negócio: garantir DML base (RLS continua sendo a fronteira)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
-- Reafirmar audit_logs só SELECT após o ALL
REVOKE INSERT, UPDATE, DELETE ON TABLE public.audit_logs FROM authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
