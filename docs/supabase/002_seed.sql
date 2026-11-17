-- =============================================================================
-- Audita SST — seed inicial (opcional)
-- Rode DEPOIS de 001_schema.sql
-- =============================================================================

INSERT INTO public.organizations (id, razao_social, cnpj, email)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'GSO Saúde Ocupacional Ltda.',
  '11222333000181',
  'comercial@gso.example'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.companies (
  id,
  organization_id,
  razao_social,
  cnpj,
  email,
  segmento,
  grupo_esocial,
  tipo_acesso,
  passivo_estimado,
  status,
  cobertura_esocial,
  situacao_extracao
)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Indústria Alpha Ltda.',
  '12345678000195',
  'contato@alpha.example',
  'Indústria',
  2,
  'procuracao',
  0,
  'pendente',
  'desconhecida',
  'nunca_importado'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.integration_settings (company_id, ambiente)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'producao_restrita'
)
ON CONFLICT (company_id) DO NOTHING;
