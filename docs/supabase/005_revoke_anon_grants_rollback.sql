-- Rollback parcial de 005 — reabre grants amplos (não recomendado).
-- Preferir restaurar backup.

GRANT USAGE ON SCHEMA public TO anon;

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
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I TO anon, authenticated',
      r.tbl
    );
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.org_role(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_role(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_company(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_write_company(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_company_access(UUID) TO PUBLIC;
