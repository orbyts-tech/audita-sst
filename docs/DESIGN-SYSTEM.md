# Audita SST — Design System v2

Fonte canônica dos tokens: `design-system/tokens.json`. Os valores CSS ficam em `src/styles/tokens.css` (expostos ao Tailwind via `@theme inline`).

## Princípios

- Use **apenas** classes de token nos componentes (`bg-blue-600`, `text-ink-muted`, `shadow-card`). Sem hexadecimais no JSX.
- Tipografia: **Plus Jakarta Sans** (400–800).
- Status de análise: `success-*` (completo), `warning-*` âmbar (em análise), `blue-*` (parcial), `danger-*` (pendente).
- Raio: `rounded-md` (12px) em controles; `rounded-2xl` / `rounded-lg` em cards e containers.
- Sombra: `shadow-card` em cards/sidebar; `shadow-topbar` na topbar.

## Cores principais

| Token | Uso |
|---|---|
| `navy-900` | Texto principal e títulos |
| `blue-600` / `blue-700` | Ação primária e hover |
| `blue-100` | Fundo ativo / soft |
| `surface-50` / `surface-0` | Fundo da página / cards |
| `ink-muted` | Texto secundário |
| `border` / `border-strong` | Bordas |

## Componentes base

`Button`, `SearchInput`, `StatusBadge`, `InitialsAvatar` em `src/components/ui/`.
Layout: `Sidebar`, `Topbar`, `AppLayout` em `src/components/layout/`.
