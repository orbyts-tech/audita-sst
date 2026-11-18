-- =============================================================================
-- Audita SST — 003: autenticação real + RLS multi-tenant
-- Incremental. NÃO sobrescreve 001_schema.sql.
-- Aplicar no SQL Editor após backup / revisão.
-- Rollback: docs/supabase/003_rls_auth_hardening_rollback.sql
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Helpers de papel (SECURITY DEFINER, search_path fixo)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.org_role(org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.role
  FROM public.organization_members m
  WHERE m.organization_id = org_id
    AND m.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.org_role(org_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.org_role(org_id) IN ('owner', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.company_role(cid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.role
  FROM public.company_access a
  WHERE a.company_id = cid
    AND a.user_id = auth.uid()
  LIMIT 1;
$$;

-- Leitura: owner/admin da org OU vínculo explícito em company_access
CREATE OR REPLACE FUNCTION public.can_access_company(cid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = cid
      AND (
        public.is_org_admin(c.organization_id)
        OR public.company_role(c.id) IS NOT NULL
      )
  );
$$;

-- Escrita operacional: owner/admin da org OU company owner/operator
CREATE OR REPLACE FUNCTION public.can_write_company(cid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = cid
      AND (
        public.is_org_admin(c.organization_id)
        OR public.company_role(c.id) IN ('owner', 'operator')
      )
  );
$$;

-- Gestão de company_access: owner/admin da org OU company owner
CREATE OR REPLACE FUNCTION public.can_manage_company_access(cid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = cid
      AND (
        public.is_org_admin(c.organization_id)
        OR public.company_role(c.id) = 'owner'
      )
  );
$$;

-- handle_new_user: cria profile sem org automática
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, papel)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    'Membro'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Ao criar organização, o criador vira owner (onboarding controlado)
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    UPDATE public.profiles
    SET organization_id = COALESCE(organization_id, NEW.id),
        papel = CASE
          WHEN papel IS NULL OR papel IN ('Membro', 'Visualizador', 'Operador') THEN 'Administrador'
          ELSE papel
        END,
        updated_at = NOW()
    WHERE id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();

-- Impede escalada via profiles (papel / organization_id)
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profile id imutável';
  END IF;
  IF NEW.papel IS DISTINCT FROM OLD.papel THEN
    RAISE EXCEPTION 'papel do profile só pode ser alterado por administrador do sistema';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id do profile só pode ser alterado via membership';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- Impede self-promotion / papéis inválidos em organization_members
CREATE OR REPLACE FUNCTION public.protect_org_member_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role TEXT;
  target_org UUID;
BEGIN
  target_org := COALESCE(NEW.organization_id, OLD.organization_id);
  actor_role := public.org_role(target_org);

  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'não autenticado';
    END IF;
    -- Trigger de criação de org (mesmo transaction) permite owner inicial
    IF NEW.user_id = auth.uid() AND NEW.role = 'owner' AND actor_role IS NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.organizations o WHERE o.id = NEW.organization_id
      ) AND NOT EXISTS (
        SELECT 1 FROM public.organization_members m WHERE m.organization_id = NEW.organization_id
      ) THEN
        RETURN NEW;
      END IF;
    END IF;
    IF actor_role IS NULL OR actor_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'sem permissão para adicionar membros';
    END IF;
    IF actor_role = 'admin' AND NEW.role = 'owner' THEN
      RAISE EXCEPTION 'admin não pode promover a owner';
    END IF;
    IF NEW.user_id = auth.uid() AND NEW.role IN ('owner', 'admin') AND actor_role IS DISTINCT FROM 'owner' THEN
      RAISE EXCEPTION 'não é permitido autoatribuir papel administrativo';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF actor_role IS NULL OR actor_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'sem permissão para alterar membros';
    END IF;
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'organization_id do membership é imutável';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'user_id do membership é imutável';
    END IF;
    IF actor_role = 'admin' AND (NEW.role = 'owner' OR OLD.role = 'owner') THEN
      RAISE EXCEPTION 'admin não pode gerenciar owners';
    END IF;
    IF NEW.user_id = auth.uid() AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'não é permitido alterar o próprio papel';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    actor_role := public.org_role(OLD.organization_id);
    IF actor_role IS NULL OR actor_role NOT IN ('owner', 'admin') THEN
      RAISE EXCEPTION 'sem permissão para remover membros';
    END IF;
    IF actor_role = 'admin' AND OLD.role = 'owner' THEN
      RAISE EXCEPTION 'admin não pode remover owners';
    END IF;
    IF OLD.user_id = auth.uid() AND OLD.role = 'owner' THEN
      RAISE EXCEPTION 'owner não pode remover a si mesmo';
    END IF;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_org_member_changes ON public.organization_members;
CREATE TRIGGER trg_protect_org_member_changes
  BEFORE INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.protect_org_member_changes();

-- Impede mover empresa para outra organização via UPDATE
CREATE OR REPLACE FUNCTION public.protect_company_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id da empresa é imutável';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_company_organization ON public.companies;
CREATE TRIGGER trg_protect_company_organization
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_company_organization();

-- -----------------------------------------------------------------------------
-- Revogar EXECUTE público; conceder a authenticated
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.org_role(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.company_role(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_company(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_write_company(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_company_access(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_organization() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_org_member_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_company_organization() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.org_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_company_access(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- Remover políticas inseguras mvp_anon_*
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS mvp_anon_org_all ON public.organizations;
DROP POLICY IF EXISTS mvp_anon_companies_all ON public.companies;
DROP POLICY IF EXISTS mvp_anon_solicitacoes_all ON public.solicitacoes;
DROP POLICY IF EXISTS mvp_anon_periodos_all ON public.solicitacao_periodos;
DROP POLICY IF EXISTS mvp_anon_analises_all ON public.analises;
DROP POLICY IF EXISTS mvp_anon_notifications_all ON public.notifications;
DROP POLICY IF EXISTS mvp_anon_org_certs_all ON public.organization_certificates;
DROP POLICY IF EXISTS mvp_anon_batches_all ON public.esocial_batches;
DROP POLICY IF EXISTS mvp_anon_workers_all ON public.esocial_workers;
DROP POLICY IF EXISTS mvp_anon_raw_events_all ON public.esocial_raw_events;
DROP POLICY IF EXISTS mvp_anon_findings_all ON public.esocial_audit_findings;
DROP POLICY IF EXISTS mvp_anon_consultas_all ON public.esocial_consultas;
DROP POLICY IF EXISTS mvp_anon_identificadores_all ON public.esocial_identificadores;
DROP POLICY IF EXISTS mvp_anon_eventos_all ON public.esocial_eventos;
DROP POLICY IF EXISTS mvp_anon_quota_all ON public.esocial_quota;
DROP POLICY IF EXISTS mvp_anon_audit_logs_all ON public.audit_logs;

-- -----------------------------------------------------------------------------
-- Recriar policies autenticadas (escopo por papel)
-- -----------------------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND public.is_org_member(organization_id)
    )
  );

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- organizations
DROP POLICY IF EXISTS org_select_member ON public.organizations;
CREATE POLICY org_select_member ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_org_member(id));

DROP POLICY IF EXISTS org_insert_authenticated ON public.organizations;
CREATE POLICY org_insert_authenticated ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS org_update_member ON public.organizations;
CREATE POLICY org_update_member ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(id))
  WITH CHECK (public.is_org_admin(id));

DROP POLICY IF EXISTS org_delete_owner ON public.organizations;
CREATE POLICY org_delete_owner ON public.organizations
  FOR DELETE TO authenticated
  USING (public.org_role(id) = 'owner');

-- organization_members
DROP POLICY IF EXISTS org_members_select ON public.organization_members;
CREATE POLICY org_members_select ON public.organization_members
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS org_members_insert ON public.organization_members;
CREATE POLICY org_members_insert ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (
      -- owner inicial (org acabou de ser criada / sem membros)
      user_id = auth.uid()
      AND role = 'owner'
      AND NOT EXISTS (
        SELECT 1
        FROM public.organization_members m
        WHERE m.organization_id = organization_id
      )
    )
  );

DROP POLICY IF EXISTS org_members_update ON public.organization_members;
CREATE POLICY org_members_update ON public.organization_members
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS org_members_delete ON public.organization_members;
CREATE POLICY org_members_delete ON public.organization_members
  FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id));

-- organization_certificates
DROP POLICY IF EXISTS org_certs_all ON public.organization_certificates;
CREATE POLICY org_certs_select ON public.organization_certificates
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id));

CREATE POLICY org_certs_write ON public.organization_certificates
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY org_certs_update ON public.organization_certificates
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY org_certs_delete ON public.organization_certificates
  FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id));

-- companies
DROP POLICY IF EXISTS companies_select ON public.companies;
CREATE POLICY companies_select ON public.companies
  FOR SELECT TO authenticated
  USING (public.can_access_company(id));

DROP POLICY IF EXISTS companies_insert ON public.companies;
CREATE POLICY companies_insert ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS companies_update ON public.companies;
CREATE POLICY companies_update ON public.companies
  FOR UPDATE TO authenticated
  USING (public.can_write_company(id))
  WITH CHECK (public.can_write_company(id));

DROP POLICY IF EXISTS companies_delete ON public.companies;
CREATE POLICY companies_delete ON public.companies
  FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id));

-- company_access
DROP POLICY IF EXISTS company_access_all ON public.company_access;
CREATE POLICY company_access_select ON public.company_access
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.can_manage_company_access(company_id)
  );

CREATE POLICY company_access_insert ON public.company_access
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_company_access(company_id));

CREATE POLICY company_access_update ON public.company_access
  FOR UPDATE TO authenticated
  USING (public.can_manage_company_access(company_id))
  WITH CHECK (public.can_manage_company_access(company_id));

CREATE POLICY company_access_delete ON public.company_access
  FOR DELETE TO authenticated
  USING (public.can_manage_company_access(company_id));

-- integration_settings
DROP POLICY IF EXISTS integration_settings_all ON public.integration_settings;
CREATE POLICY integration_settings_select ON public.integration_settings
  FOR SELECT TO authenticated
  USING (public.can_access_company(company_id));

CREATE POLICY integration_settings_write ON public.integration_settings
  FOR ALL TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

-- solicitacoes
DROP POLICY IF EXISTS solicitacoes_all ON public.solicitacoes;
CREATE POLICY solicitacoes_select ON public.solicitacoes
  FOR SELECT TO authenticated
  USING (public.can_access_company(company_id));

CREATE POLICY solicitacoes_write ON public.solicitacoes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_company(company_id));

CREATE POLICY solicitacoes_update ON public.solicitacoes
  FOR UPDATE TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

CREATE POLICY solicitacoes_delete ON public.solicitacoes
  FOR DELETE TO authenticated
  USING (public.can_write_company(company_id));

-- solicitacao_periodos
DROP POLICY IF EXISTS solicitacao_periodos_all ON public.solicitacao_periodos;
CREATE POLICY solicitacao_periodos_select ON public.solicitacao_periodos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = solicitacao_id AND public.can_access_company(s.company_id)
    )
  );

CREATE POLICY solicitacao_periodos_write ON public.solicitacao_periodos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = solicitacao_id AND public.can_write_company(s.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = solicitacao_id AND public.can_write_company(s.company_id)
    )
  );

-- analises
DROP POLICY IF EXISTS analises_all ON public.analises;
CREATE POLICY analises_select ON public.analises
  FOR SELECT TO authenticated
  USING (public.can_access_company(company_id));

CREATE POLICY analises_write ON public.analises
  FOR ALL TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

-- notifications
DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  );

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  );

DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  );

-- eSocial domain (SELECT = access, mutate = write)
DROP POLICY IF EXISTS esocial_batches_all ON public.esocial_batches;
CREATE POLICY esocial_batches_select ON public.esocial_batches
  FOR SELECT TO authenticated USING (public.can_access_company(company_id));
CREATE POLICY esocial_batches_write ON public.esocial_batches
  FOR ALL TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

DROP POLICY IF EXISTS esocial_coverage_all ON public.esocial_coverage_intervals;
CREATE POLICY esocial_coverage_select ON public.esocial_coverage_intervals
  FOR SELECT TO authenticated USING (public.can_access_company(company_id));
CREATE POLICY esocial_coverage_write ON public.esocial_coverage_intervals
  FOR ALL TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

DROP POLICY IF EXISTS esocial_workers_all ON public.esocial_workers;
CREATE POLICY esocial_workers_select ON public.esocial_workers
  FOR SELECT TO authenticated USING (public.can_access_company(company_id));
CREATE POLICY esocial_workers_write ON public.esocial_workers
  FOR ALL TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

DROP POLICY IF EXISTS esocial_raw_events_all ON public.esocial_raw_events;
CREATE POLICY esocial_raw_events_select ON public.esocial_raw_events
  FOR SELECT TO authenticated USING (public.can_access_company(company_id));
CREATE POLICY esocial_raw_events_write ON public.esocial_raw_events
  FOR ALL TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

DROP POLICY IF EXISTS esocial_audit_runs_all ON public.esocial_audit_runs;
CREATE POLICY esocial_audit_runs_select ON public.esocial_audit_runs
  FOR SELECT TO authenticated USING (public.can_access_company(company_id));
CREATE POLICY esocial_audit_runs_write ON public.esocial_audit_runs
  FOR ALL TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

DROP POLICY IF EXISTS esocial_findings_all ON public.esocial_audit_findings;
CREATE POLICY esocial_findings_select ON public.esocial_audit_findings
  FOR SELECT TO authenticated USING (public.can_access_company(company_id));
CREATE POLICY esocial_findings_write ON public.esocial_audit_findings
  FOR ALL TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

DROP POLICY IF EXISTS esocial_consultas_all ON public.esocial_consultas;
CREATE POLICY esocial_consultas_select ON public.esocial_consultas
  FOR SELECT TO authenticated USING (public.can_access_company(company_id));
CREATE POLICY esocial_consultas_write ON public.esocial_consultas
  FOR ALL TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

DROP POLICY IF EXISTS esocial_identificadores_all ON public.esocial_identificadores;
CREATE POLICY esocial_identificadores_select ON public.esocial_identificadores
  FOR SELECT TO authenticated USING (public.can_access_company(company_id));
CREATE POLICY esocial_identificadores_write ON public.esocial_identificadores
  FOR ALL TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

DROP POLICY IF EXISTS esocial_eventos_all ON public.esocial_eventos;
CREATE POLICY esocial_eventos_select ON public.esocial_eventos
  FOR SELECT TO authenticated USING (public.can_access_company(company_id));
CREATE POLICY esocial_eventos_write ON public.esocial_eventos
  FOR ALL TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

DROP POLICY IF EXISTS esocial_quota_all ON public.esocial_quota;
CREATE POLICY esocial_quota_select ON public.esocial_quota
  FOR SELECT TO authenticated USING (public.can_access_company(company_id));
CREATE POLICY esocial_quota_write ON public.esocial_quota
  FOR ALL TO authenticated
  USING (public.can_write_company(company_id))
  WITH CHECK (public.can_write_company(company_id));

-- audit_logs: leitura por escopo; INSERT só via conexão privilegiada (backend)
DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    (company_id IS NOT NULL AND public.can_access_company(company_id))
    OR (organization_id IS NOT NULL AND public.is_org_admin(organization_id))
  );

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
-- sem policy de INSERT para authenticated/anon → bloqueado pela Data API
