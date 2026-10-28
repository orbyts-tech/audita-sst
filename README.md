# Audita SST

Sistema de acompanhamento de passivo de SST. Stack: React + TypeScript + Vite + Tailwind CSS v4.

## Desenvolvimento

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. A rota inicial exige login (`/login`).

**Demo:** qualquer e-mail com senha de 4+ caracteres (pré-preenchido).

## Fluxo do sistema

1. **Login** → autenticação local (sessionStorage)
2. **Empresas** → lista, busca, filtros, nova empresa
3. **Detalhe da empresa** → passivo, status e análises vinculadas
4. **Análises** → lista e detalhe com progresso
5. **Relatórios** → download das análises concluídas
6. **Configurações** → perfil e sair
7. **Notificações** → painel no sino da topbar

## Estrutura

- `src/app` — estado global (empresas, análises, notificações, auth)
- `src/features/*` — telas por domínio
- `src/components/ui` — design system
- `src/styles/tokens.css` — tokens v2

## Paginação e responsividade

- Listas com **20 itens por página** (Empresas, Análises, Relatórios).
- **≥ 1024px:** sidebar fixa + tabela.
- **&lt; 1024px:** menu hambúrguer (sidebar em gaveta) + lista de cards em Empresas.

## Módulo eSocial

Ver `docs/ESOCIAL.md`. Fluxo: Empresas → empresa → `/empresas/:id/esocial/*` (importação mock, abas, auditoria, export stubs). Sem API/SOAP reais.

## Fora do escopo (ainda)

API real, parsers XSD, worker/fila, tema escuro.
