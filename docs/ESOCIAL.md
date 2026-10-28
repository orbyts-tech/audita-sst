# Módulo eSocial — fluxo preparado (sem API)

Plano v1.0 (24/10/2026). Código e jornada prontos; ingestão real, SOAP e parsers ficam para etapas seguintes.

## Jornada

1. **Empresas** → buscar/cadastrar CNPJ → Abrir  
2. **Empresa** → Dados do eSocial / Importar XML/ZIP  
3. **Importar** → selecionar arquivos, confirmar CNPJ, acompanhar fases  
4. **Abas** → Visão geral · Trabalhadores · Eventos SST · Auditoria · SAT/RAT · Relatórios · Extrações  
5. **Investigar** → achado → evento/XML (stub)  
6. **Exportar** → Excel/PDF stub com metadados de cobertura  

Empresa demonstração com dataset: **Indústria Alpha** (`id=1`).

## Arquitetura no código

| Peça | Caminho |
|---|---|
| Config / quotas | `src/features/esocial/config.ts` |
| Domínio | `src/features/esocial/types.ts` |
| `SourceAdapter` | `src/features/esocial/adapters/` |
| Pipeline simulado | `src/features/esocial/pipeline/simulateImport.ts` |
| Regras (E-Valide 2,23,33,34,35,38 + extras) | `src/features/esocial/rules/catalog.ts` |
| Store mock | `src/features/esocial/EsocialProvider.tsx` |
| Telas | `src/features/esocial/pages/` |

Origens: `manual_xml` · `manual_zip` (MVP) · `soap` (stub que falha com mensagem clara).

## Fora deste MVP

Transmitir eventos, SOAP real, parsers XSD, bucket, worker, Excel paritário 14 abas, cálculo SAT/RAT com bases reais.
