-- =============================================================================
-- Audita SST — schema completo (Supabase / PostgreSQL)
-- Cole no SQL Editor do Supabase e execute.
-- Idempotente: pode rodar de novo com segurança (IF NOT EXISTS / OR REPLACE).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Organizações (escritório) e membros
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  cnpj CHAR(14),
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organizations_cnpj_digits CHECK (cnpj IS NULL OR cnpj ~ '^\d{14}$')
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  papel TEXT NOT NULL DEFAULT 'Administrador',
  organization_id UUID REFERENCES public.organizations (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  validade_ate DATE,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  storage_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Empresas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  cnpj CHAR(14) NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  segmento TEXT NOT NULL DEFAULT '',
  grupo_esocial SMALLINT NOT NULL DEFAULT 3 CHECK (grupo_esocial BETWEEN 1 AND 4),
  tipo_acesso TEXT NOT NULL DEFAULT 'procuracao'
    CHECK (tipo_acesso IN ('certificado_proprio', 'procuracao')),
  passivo_estimado NUMERIC(14, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('completo', 'em_analise', 'parcial', 'pendente')),
  cobertura_esocial TEXT NOT NULL DEFAULT 'desconhecida'
    CHECK (cobertura_esocial IN ('completa', 'parcial', 'sem_dados', 'desconhecida')),
  situacao_extracao TEXT NOT NULL DEFAULT 'nunca_importado'
    CHECK (
      situacao_extracao IN (
        'nunca_importado',
        'processando',
        'parcial',
        'concluido',
        'falhou'
      )
    ),
  ultima_importacao_em TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, cnpj),
  CONSTRAINT companies_cnpj_digits CHECK (cnpj ~ '^\d{14}$')
);

CREATE TABLE IF NOT EXISTS public.company_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'operator'
    CHECK (role IN ('owner', 'operator', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.integration_settings (
  company_id UUID PRIMARY KEY REFERENCES public.companies (id) ON DELETE CASCADE,
  ambiente TEXT NOT NULL DEFAULT 'producao_restrita'
    CHECK (ambiente IN ('producao_restrita', 'producao')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Solicitações de extração
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  modo TEXT NOT NULL DEFAULT 'automatico' CHECK (modo IN ('automatico')),
  status TEXT NOT NULL DEFAULT 'criado'
    CHECK (
      status IN (
        'criado',
        'em_execucao',
        'aguardando_liberacao',
        'aguardando_extracao',
        'baixando',
        'encerrado',
        'com_erro',
        'reiniciado',
        'cancelado'
      )
    ),
  a_partir_de CHAR(7),
  relatorio_parcial BOOLEAN NOT NULL DEFAULT FALSE,
  relatorio_disponivel BOOLEAN NOT NULL DEFAULT FALSE,
  log_erro TEXT,
  ultima_atualizacao_dados_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT solicitacoes_a_partir_de_fmt CHECK (
    a_partir_de IS NULL OR a_partir_de ~ '^\d{4}-\d{2}$'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitacoes_company_automatico
  ON public.solicitacoes (company_id)
  WHERE modo = 'automatico';

CREATE TABLE IF NOT EXISTS public.solicitacao_periodos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes (id) ON DELETE CASCADE,
  competencia CHAR(7) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'liberado', 'importado', 'erro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (solicitacao_id, competencia),
  CONSTRAINT solicitacao_periodos_competencia_fmt CHECK (competencia ~ '^\d{4}-\d{2}$')
);

-- -----------------------------------------------------------------------------
-- Análises (legado / relatórios)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('completo', 'em_analise', 'parcial', 'pendente')),
  passivo_estimado NUMERIC(14, 2) NOT NULL DEFAULT 0,
  progresso SMALLINT NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  resumo TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Notificações
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations (id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  href TEXT,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- eSocial — aquisições (importação manual / pipeline)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.esocial_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('manual_xml', 'manual_zip', 'soap')),
  status TEXT NOT NULL DEFAULT 'queued',
  phase TEXT NOT NULL DEFAULT 'enviando',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  file_names TEXT[] NOT NULL DEFAULT '{}',
  totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  coverage_label TEXT NOT NULL DEFAULT '',
  errors TEXT[] NOT NULL DEFAULT '{}',
  partial BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.esocial_coverage_intervals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.esocial_batches (id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  interval_start DATE NOT NULL,
  interval_end DATE NOT NULL,
  interval_type TEXT NOT NULL CHECK (interval_type IN ('entrega', 'competencia')),
  status TEXT NOT NULL
    CHECK (
      status IN (
        'suficiente',
        'parcial',
        'insuficiente',
        'sem_permissao',
        'nao_aplicavel'
      )
    ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.esocial_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf_masked TEXT NOT NULL DEFAULT '',
  matricula TEXT NOT NULL DEFAULT '',
  cargo_atual TEXT NOT NULL DEFAULT '',
  situacao_vinculo TEXT NOT NULL DEFAULT 'ativo'
    CHECK (situacao_vinculo IN ('ativo', 'inativo')),
  tem_s2220 BOOLEAN NOT NULL DEFAULT FALSE,
  tem_s2240 BOOLEAN NOT NULL DEFAULT FALSE,
  achados_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.esocial_raw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.esocial_batches (id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  receipt TEXT,
  original_receipt TEXT,
  schema_version TEXT NOT NULL DEFAULT '',
  event_date DATE,
  competence CHAR(7),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  worker_name TEXT,
  cpf_masked TEXT,
  matricula TEXT,
  parse_status TEXT NOT NULL DEFAULT 'ok'
    CHECK (
      parse_status IN (
        'ok',
        'reconhecido_nao_normalizado',
        'invalido',
        'duplicado',
        'erro'
      )
    ),
  delayed BOOLEAN NOT NULL DEFAULT FALSE,
  retificado BOOLEAN NOT NULL DEFAULT FALSE,
  excluido BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.esocial_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.esocial_batches (id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.esocial_audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  audit_run_id UUID NOT NULL REFERENCES public.esocial_audit_runs (id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.esocial_workers (id) ON DELETE SET NULL,
  worker_name TEXT,
  rule_key TEXT NOT NULL,
  rule_version TEXT NOT NULL DEFAULT '1',
  category TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'attention', 'high')),
  title TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  affected_interval TEXT,
  status TEXT NOT NULL DEFAULT 'needs_review'
    CHECK (
      status IN (
        'confirmed_by_rule',
        'needs_review',
        'informational',
        'insufficient_data'
      )
    ),
  source_event_ids TEXT[] NOT NULL DEFAULT '{}',
  confidence_and_limits TEXT NOT NULL DEFAULT '',
  related_rule_keys TEXT[] NOT NULL DEFAULT '{}',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- eSocial — Etapa 01 (consulta SOAP S-1000)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.esocial_consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  ambiente TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  cd_resposta TEXT,
  desc_resposta TEXT,
  error_code TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.esocial_identificadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id UUID NOT NULL REFERENCES public.esocial_consultas (id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  nr_recibo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.esocial_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  consulta_id UUID REFERENCES public.esocial_consultas (id) ON DELETE SET NULL,
  ambiente TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'soap_download',
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  nr_recibo TEXT,
  data_recepcao TIMESTAMPTZ,
  data_consulta TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  layout_version TEXT,
  situacao TEXT NOT NULL,
  xml_sha256 TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  payload_json JSONB,
  retificacao_de TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, event_id, xml_sha256)
);

CREATE TABLE IF NOT EXISTS public.esocial_quota (
  company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  day DATE NOT NULL,
  acessos INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, day)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies (id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations (id) ON DELETE SET NULL,
  subject TEXT,
  action TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_companies_org ON public.companies (organization_id);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies (cnpj);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_company ON public.solicitacoes (company_id, atualizado_em DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacao_periodos_sol ON public.solicitacao_periodos (solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_analises_company ON public.analises (company_id, atualizado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, criada_em DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications (organization_id, criada_em DESC);
CREATE INDEX IF NOT EXISTS idx_batches_company ON public.esocial_batches (company_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_events_company_type ON public.esocial_raw_events (company_id, event_type);
CREATE INDEX IF NOT EXISTS idx_workers_company ON public.esocial_workers (company_id);
CREATE INDEX IF NOT EXISTS idx_findings_company ON public.esocial_audit_findings (company_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultas_company ON public.esocial_consultas (company_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_company_type ON public.esocial_eventos (company_id, event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON public.audit_logs (company_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Triggers updated_at
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_esocial_workers_updated_at ON public.esocial_workers;
CREATE TRIGGER trg_esocial_workers_updated_at
  BEFORE UPDATE ON public.esocial_workers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auth helper: cria profile + vínculo ao criar usuário
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS helpers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = org_id
      AND m.user_id = auth.uid()
  );
$$;

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
        public.is_org_member(c.organization_id)
        OR EXISTS (
          SELECT 1
          FROM public.company_access a
          WHERE a.company_id = c.id
            AND a.user_id = auth.uid()
        )
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacao_periodos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_coverage_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_raw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_identificadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esocial_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- organizations
DROP POLICY IF EXISTS org_select_member ON public.organizations;
CREATE POLICY org_select_member ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_org_member(id));

DROP POLICY IF EXISTS org_insert_authenticated ON public.organizations;
CREATE POLICY org_insert_authenticated ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS org_update_member ON public.organizations;
CREATE POLICY org_update_member ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_member(id))
  WITH CHECK (public.is_org_member(id));

-- organization_members
DROP POLICY IF EXISTS org_members_select ON public.organization_members;
CREATE POLICY org_members_select ON public.organization_members
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS org_members_insert ON public.organization_members;
CREATE POLICY org_members_insert ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_org_member(organization_id));

-- organization_certificates
DROP POLICY IF EXISTS org_certs_all ON public.organization_certificates;
CREATE POLICY org_certs_all ON public.organization_certificates
  FOR ALL TO authenticated
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- companies
DROP POLICY IF EXISTS companies_select ON public.companies;
CREATE POLICY companies_select ON public.companies
  FOR SELECT TO authenticated
  USING (public.can_access_company(id));

DROP POLICY IF EXISTS companies_insert ON public.companies;
CREATE POLICY companies_insert ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS companies_update ON public.companies;
CREATE POLICY companies_update ON public.companies
  FOR UPDATE TO authenticated
  USING (public.can_access_company(id))
  WITH CHECK (public.can_access_company(id));

DROP POLICY IF EXISTS companies_delete ON public.companies;
CREATE POLICY companies_delete ON public.companies
  FOR DELETE TO authenticated
  USING (public.is_org_member(organization_id));

-- company_access
DROP POLICY IF EXISTS company_access_all ON public.company_access;
CREATE POLICY company_access_all ON public.company_access
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

-- integration_settings
DROP POLICY IF EXISTS integration_settings_all ON public.integration_settings;
CREATE POLICY integration_settings_all ON public.integration_settings
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

-- solicitacoes
DROP POLICY IF EXISTS solicitacoes_all ON public.solicitacoes;
CREATE POLICY solicitacoes_all ON public.solicitacoes
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

-- solicitacao_periodos
DROP POLICY IF EXISTS solicitacao_periodos_all ON public.solicitacao_periodos;
CREATE POLICY solicitacao_periodos_all ON public.solicitacao_periodos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = solicitacao_id AND public.can_access_company(s.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.solicitacoes s
      WHERE s.id = solicitacao_id AND public.can_access_company(s.company_id)
    )
  );

-- analises
DROP POLICY IF EXISTS analises_all ON public.analises;
CREATE POLICY analises_all ON public.analises
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

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
  USING (user_id = auth.uid() OR public.is_org_member(organization_id))
  WITH CHECK (user_id = auth.uid() OR public.is_org_member(organization_id));

DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  );

-- eSocial domain tables (company-scoped)
DROP POLICY IF EXISTS esocial_batches_all ON public.esocial_batches;
CREATE POLICY esocial_batches_all ON public.esocial_batches
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

DROP POLICY IF EXISTS esocial_coverage_all ON public.esocial_coverage_intervals;
CREATE POLICY esocial_coverage_all ON public.esocial_coverage_intervals
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

DROP POLICY IF EXISTS esocial_workers_all ON public.esocial_workers;
CREATE POLICY esocial_workers_all ON public.esocial_workers
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

DROP POLICY IF EXISTS esocial_raw_events_all ON public.esocial_raw_events;
CREATE POLICY esocial_raw_events_all ON public.esocial_raw_events
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

DROP POLICY IF EXISTS esocial_audit_runs_all ON public.esocial_audit_runs;
CREATE POLICY esocial_audit_runs_all ON public.esocial_audit_runs
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

DROP POLICY IF EXISTS esocial_findings_all ON public.esocial_audit_findings;
CREATE POLICY esocial_findings_all ON public.esocial_audit_findings
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

DROP POLICY IF EXISTS esocial_consultas_all ON public.esocial_consultas;
CREATE POLICY esocial_consultas_all ON public.esocial_consultas
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

DROP POLICY IF EXISTS esocial_identificadores_all ON public.esocial_identificadores;
CREATE POLICY esocial_identificadores_all ON public.esocial_identificadores
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

DROP POLICY IF EXISTS esocial_eventos_all ON public.esocial_eventos;
CREATE POLICY esocial_eventos_all ON public.esocial_eventos
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

DROP POLICY IF EXISTS esocial_quota_all ON public.esocial_quota;
CREATE POLICY esocial_quota_all ON public.esocial_quota
  FOR ALL TO authenticated
  USING (public.can_access_company(company_id))
  WITH CHECK (public.can_access_company(company_id));

DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    (company_id IS NOT NULL AND public.can_access_company(company_id))
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
  );

DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (company_id IS NOT NULL AND public.can_access_company(company_id))
    OR (organization_id IS NOT NULL AND public.is_org_member(organization_id))
    OR (company_id IS NULL AND organization_id IS NULL)
  );

-- -----------------------------------------------------------------------------
-- MVP bootstrap (anon) — remover quando Auth Supabase estiver 100% no app
-- Permite o frontend demo usar a publishable key antes do login real.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS mvp_anon_org_all ON public.organizations;
CREATE POLICY mvp_anon_org_all ON public.organizations
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_companies_all ON public.companies;
CREATE POLICY mvp_anon_companies_all ON public.companies
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_solicitacoes_all ON public.solicitacoes;
CREATE POLICY mvp_anon_solicitacoes_all ON public.solicitacoes
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_periodos_all ON public.solicitacao_periodos;
CREATE POLICY mvp_anon_periodos_all ON public.solicitacao_periodos
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_analises_all ON public.analises;
CREATE POLICY mvp_anon_analises_all ON public.analises
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_notifications_all ON public.notifications;
CREATE POLICY mvp_anon_notifications_all ON public.notifications
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_org_certs_all ON public.organization_certificates;
CREATE POLICY mvp_anon_org_certs_all ON public.organization_certificates
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_batches_all ON public.esocial_batches;
CREATE POLICY mvp_anon_batches_all ON public.esocial_batches
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_workers_all ON public.esocial_workers;
CREATE POLICY mvp_anon_workers_all ON public.esocial_workers
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_raw_events_all ON public.esocial_raw_events;
CREATE POLICY mvp_anon_raw_events_all ON public.esocial_raw_events
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_findings_all ON public.esocial_audit_findings;
CREATE POLICY mvp_anon_findings_all ON public.esocial_audit_findings
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_consultas_all ON public.esocial_consultas;
CREATE POLICY mvp_anon_consultas_all ON public.esocial_consultas
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_identificadores_all ON public.esocial_identificadores;
CREATE POLICY mvp_anon_identificadores_all ON public.esocial_identificadores
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_eventos_all ON public.esocial_eventos;
CREATE POLICY mvp_anon_eventos_all ON public.esocial_eventos
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_quota_all ON public.esocial_quota;
CREATE POLICY mvp_anon_quota_all ON public.esocial_quota
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mvp_anon_audit_logs_all ON public.audit_logs;
CREATE POLICY mvp_anon_audit_logs_all ON public.audit_logs
  FOR ALL TO anon USING (true) WITH CHECK (true);
