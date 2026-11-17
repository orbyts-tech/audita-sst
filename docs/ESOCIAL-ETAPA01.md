# eSocial — Etapa 01 (S-1000 real)

Integração de **leitura** via webservices oficiais de consulta de identificadores e download, com certificado A1 (mTLS + XMLDSig).

## O que foi entregue

- Backend isolado em `/server` (Fastify + TypeScript + Zod)
- Auth JWT própria da API (independente do login demo do frontend)
- `CertificateService` (PFX/P12)
- XMLDSig enveloped RSA-SHA256 + C14N + EndCertOnly (Manual §6.7)
- `EsocialSoapClient` (produção / produção restrita)
- Fluxo S-1000: `ConsultarIdentificadoresEventosTabela` → `SolicitarDownloadEventosPorId`
- Quota (10/dia, bloqueio dias 1–7, sem paralelismo, máx. 50 IDs)
- Gate `ESOCIAL_ALLOW_REAL_CALLS=yes` (sem fallback silencioso para mock)
- Persistência em memória + migração SQL preparada + storage local de XML
- UI **Consultar eSocial**
- Testes unitários com transporte mock
- `npm run preflight` (diagnóstico sem rede ao governo)
- Smoke real: `npm run smoke:real` (exige confirmações explícitas)

## Homologação

| Critério | Estado |
|---|---|
| API local + health | Pronto |
| XMLDSig §6.7 | Pronto (testes assertam algoritmos + X509Certificate) |
| Certificado A1 real | **PENDENTE** — PFX + senha no `.env` |
| Chamada SOAP oficial | **PENDENTE** — `TRANSPORT_MOCK=false` + `ALLOW_REAL_CALLS=yes` + confirmação |
| S-1000 no ambiente | **PENDENTE** — produção restrita pode não ter o evento |

## Pré-homologação (sem chamar o eSocial)

```bash
cd server
cp .env.example .env   # configure sem liberar chamada real ainda
npm install
npm run preflight
npm test
```

O preflight valida env, endpoints oficiais, calendário BR, leitura do PFX (se configurado) e assinatura XML **local**. Não abre conexão com `*.esocial.gov.br` e não consome quota.

## Como executar (dev / mock)

```bash
# Frontend
npm install && npm run dev

# Backend
cd server && npm install && npm run dev
```

Credenciais API (`AUDITA_API_*`) ≠ login demonstrativo do frontend.

## Roteiro seguro — 1ª consulta real (S-1000)

1. Preferir `ESOCIAL_AMBIENTE=producao_restrita`
2. Configurar `ESOCIAL_CERT_PFX_PATH`, `ESOCIAL_CERT_PASSWORD`, `ESOCIAL_EMPREGADOR_CNPJ` (14 dígitos)
3. `ESOCIAL_ALLOWED_COMPANY_IDS` com o id da empresa no app
4. Rodar `npm run preflight` até passar
5. Confirmar dia do mês **fora de 1–7** (horário de Brasília)
6. `ESOCIAL_TRANSPORT_MOCK=false`
7. `ESOCIAL_ALLOW_REAL_CALLS=yes`
8. Somente então:
   ```bash
   CONFIRM_REAL_ESOCIAL=yes npm run smoke:real
   ```
   ou usar a UI **Consultar eSocial** com token da API

Uma consulta + um download consomem **2** dos 10 acessos diários.

## Critérios de interpretação

| Situação | Como reconhecer |
|---|---|
| Sucesso real | `transportMock=false`, `status=concluida_com_dados`, `cdResposta` 201/203, identificador + XML com `xmlSha256` |
| Sem eventos | `status=concluida_sem_registros`, mensagem “Nenhum evento encontrado…”, `cdResposta` 406 (ou 201/203 sem IDs) |
| Certificado | `CERT_*` / `CERT_EXPIRED` / `CERT_PASSWORD` / `CERT_CNPJ_MISMATCH` |
| Autorização eSocial | `ESOCIAL_AUTH`, `cdResposta` 401/407/411, `status=falha_autorizacao` |
| Gate local | `REAL_CALLS_BLOCKED` se `ALLOW_REAL_CALLS` ausente |
| Mock | `transportMock=true` — **nunca** tratar como homologação |

## Limitações oficiais

- Máx. 10 acessos/dia (consulta + download)
- Sem operação nos dias 1–7
- Sem paralelismo por empregador
- Defasagem ~1 hora
- Máx. 50 identificadores por resposta

## Referências

- Manual do Desenvolvedor v1.16 §§6.7, 7.7, 7.8
- Pacote de Comunicação eSocial v1.6
- URLs em `server/src/services/soap/endpoints.ts`
