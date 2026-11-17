-- Audita SST — etapa 01 eSocial (PostgreSQL / Supabase)
-- Aplicar manualmente ou via ferramenta de migração quando DATABASE_URL estiver configurada.

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  cnpj CHAR(14) NOT NULL UNIQUE,
  razao_social TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_access (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  subject TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'operator', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, subject)
);

CREATE TABLE IF NOT EXISTS integration_settings (
  company_id TEXT PRIMARY KEY REFERENCES companies(id),
  ambiente TEXT NOT NULL CHECK (ambiente IN ('producao_restrita', 'producao')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS esocial_consultas (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  ambiente TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  cd_resposta TEXT,
  desc_resposta TEXT,
  error_code TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  UNIQUE (id)
);

CREATE TABLE IF NOT EXISTS esocial_identificadores (
  id TEXT PRIMARY KEY,
  consulta_id TEXT NOT NULL REFERENCES esocial_consultas(id),
  company_id TEXT NOT NULL REFERENCES companies(id),
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  nr_recibo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, event_id)
);

CREATE TABLE IF NOT EXISTS esocial_eventos (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  consulta_id TEXT REFERENCES esocial_consultas(id),
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

CREATE TABLE IF NOT EXISTS esocial_quota (
  company_id TEXT NOT NULL,
  day DATE NOT NULL,
  acessos INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, day)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  subject TEXT,
  action TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_company_type ON esocial_eventos (company_id, event_type);
CREATE INDEX IF NOT EXISTS idx_consultas_company ON esocial_consultas (company_id, started_at DESC);
