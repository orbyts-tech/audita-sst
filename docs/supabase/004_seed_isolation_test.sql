-- =============================================================================
-- Seed de isolamento (orgs A/B) — ambiente de desenvolvimento / testes
-- Cria usuários em auth.users + memberships + empresas.
-- NÃO rodar em produção sem revisão.
-- Senha de todos: IsolamentoA1!  (bcrypt abaixo)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- UUIDs fixos
-- Admin A:   aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1
-- Operador A:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2
-- Viewer A:  aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3
-- Admin B:   bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1
-- Org A:     a1111111-1111-1111-1111-111111111111
-- Org B:     b1111111-1111-1111-1111-111111111111
-- Emp A1:    a2222222-2222-2222-2222-222222222221
-- Emp A2:    a2222222-2222-2222-2222-222222222222
-- Emp B1:    b2222222-2222-2222-2222-222222222221

DO $$
DECLARE
  pwd TEXT := crypt('IsolamentoA1!', gen_salt('bf'));
BEGIN
  -- usuários
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  VALUES
    ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
     'authenticated', 'authenticated', 'admin-a@audita.test', pwd, NOW(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Admin A"}', NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
     'authenticated', 'authenticated', 'operador-a@audita.test', pwd, NOW(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Operador A"}', NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
     'authenticated', 'authenticated', 'viewer-a@audita.test', pwd, NOW(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Viewer A"}', NOW(), NOW(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
     'authenticated', 'authenticated', 'admin-b@audita.test', pwd, NOW(),
     '{"provider":"email","providers":["email"]}', '{"full_name":"Admin B"}', NOW(), NOW(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  SELECT
    u.id, u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email', u.id::text, NOW(), NOW(), NOW()
  FROM auth.users u
  WHERE u.id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
  )
  ON CONFLICT DO NOTHING;
END $$;

-- Desabilita triggers de proteção durante seed privilegiado
ALTER TABLE public.organization_members DISABLE TRIGGER trg_protect_org_member_changes;
ALTER TABLE public.profiles DISABLE TRIGGER trg_protect_profile_privileges;

INSERT INTO public.organizations (id, razao_social, cnpj, email)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Organização A Teste', '11111111000191', 'org-a@audita.test'),
  ('b1111111-1111-1111-1111-111111111111', 'Organização B Teste', '22222222000191', 'org-b@audita.test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, papel, organization_id)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'admin-a@audita.test', 'Admin A', 'Administrador', 'a1111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'operador-a@audita.test', 'Operador A', 'Operador', 'a1111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'viewer-a@audita.test', 'Viewer A', 'Visualizador', 'a1111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'admin-b@audita.test', 'Admin B', 'Administrador', 'b1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET full_name = EXCLUDED.full_name,
    papel = EXCLUDED.papel,
    organization_id = EXCLUDED.organization_id;

INSERT INTO public.organization_members (organization_id, user_id, role)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'admin'),
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'member'),
  ('a1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'viewer'),
  ('b1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'admin')
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.companies (
  id, organization_id, razao_social, cnpj, email, segmento, grupo_esocial, tipo_acesso
)
VALUES
  ('a2222222-2222-2222-2222-222222222221', 'a1111111-1111-1111-1111-111111111111',
   'Empresa A1', '33333333000191', 'a1@audita.test', 'Indústria', 2, 'procuracao'),
  ('a2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111',
   'Empresa A2', '44444444000191', 'a2@audita.test', 'Serviços', 3, 'procuracao'),
  ('b2222222-2222-2222-2222-222222222221', 'b1111111-1111-1111-1111-111111111111',
   'Empresa B1', '55555555000191', 'b1@audita.test', 'Comércio', 3, 'procuracao')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.company_access (company_id, user_id, role)
VALUES
  ('a2222222-2222-2222-2222-222222222221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'operator'),
  ('a2222222-2222-2222-2222-222222222221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'viewer')
ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role;

ALTER TABLE public.organization_members ENABLE TRIGGER trg_protect_org_member_changes;
ALTER TABLE public.profiles ENABLE TRIGGER trg_protect_profile_privileges;
