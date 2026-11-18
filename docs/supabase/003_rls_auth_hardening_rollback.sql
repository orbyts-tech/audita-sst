-- Rollback parcial de 003_rls_auth_hardening.sql
-- Restaura helpers/policies do 001 (incluindo mvp_anon_*). Preferir restaurar backup.

DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_org_member_changes ON public.organization_members;

DROP FUNCTION IF EXISTS public.handle_new_organization();
DROP FUNCTION IF EXISTS public.protect_profile_privileges();
DROP FUNCTION IF EXISTS public.protect_org_member_changes();
DROP FUNCTION IF EXISTS public.is_org_admin(UUID);
DROP FUNCTION IF EXISTS public.company_role(UUID);
DROP FUNCTION IF EXISTS public.can_write_company(UUID);
DROP FUNCTION IF EXISTS public.can_manage_company_access(UUID);
DROP FUNCTION IF EXISTS public.org_role(UUID);

-- Reaplicar docs/supabase/001_schema.sql a partir da seção de helpers/RLS
-- (ou restaurar dump). Este arquivo não recria mvp_anon_* de propósito.
