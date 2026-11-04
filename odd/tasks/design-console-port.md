# Design console port

Port the operational console in `docs/design/abarroteros-demo-actualizada(4).html` into `abasto-web` faithfully.
Source of truth: the unminified app regions embedded in the HTML bundle (`app/*`, `components/ui/*`, `hooks/*`, `lib/*`), its CSS and its image assets.

## Specs

- S1: "Necesito que copies fielmente el documento de diseno que esta en docs a la aplicacion web" — same screens, copy, data, interactions and styling as the reference HTML.
- S2: "utilizando la skill de code organization" — app-wide code under `src/components`, `src/components/ui`, `src/lib`, `src/lib/utils`, `src/hooks`, `src/shared`, `src/routes`, `src/config`; feature-owned code under `src/modules/<module>/`; framework entrypoints stay in `src/routes/`.

- S3: "Mostrador" — same screens, copy, data and interactions as the reference Mostrador section.
- S4: "clientes" — same screens, copy, data and interactions as the reference Clientes section.

## Tasks

- T1 (S1, S2) — Stage 1: design tokens, shadcn/ui primitives, app shell (sidebar + header), Inicio overview with mock data, `/` route. Route: inline. Done: geometry identical to reference at 1440/1100/390 px; mobile sheet opens. Commit: see git log `feat(web): add console shell and overview`.
- T2 (S1, S2, S3) — Shared foundation: shadcn dialog/tabs/table/textarea/label/select/alert-dialog/sonner; `src/shared/demo/` seed data (warehouses, products with presentations/barcodes/images, stock and lots per warehouse, customers, pending orders) copied from the reference; product images extracted to `src/assets/products/`; routes `/mostrador` and `/clientes` with stub pages in their modules; nav items linked. Route: gentle-ai-worker mw2anasi-1-ovq2 (done; tsc/eslint/prettier/build pass). Commit: `feat(web): add shared demo data and console routes`.
- T3 (S1, S2, S3) — Mostrador module `src/modules/counter/`: page heading + "Ventas y entregas" action, tabs "Venta en mostrador" / "Caja y turnos", sale composer, cash panel, follow-up dialog. Route: gentle-ai-worker mw2atukd-2-2uvh (done: composer, scan, cart with lots, payment, ticket, Caja y turnos with movements/close/history, Ventas y entregas with pick/dispatch/delivery/cancel/pay/return, reason dialog; 0 geometry diffs at 1440/390 except pick-form quantity label 10-15px; omitted: internal AB lot labels, promotions/commercial rules, legacy price orders, profile switching, audit/persistence). Commit: `feat(web): add counter module`.
- T4 (S1, S2, S4) — Clientes module `src/modules/customers/`: "Cartera de clientes" list, search, "Nuevo cliente" form, "Ver cliente" detail. Route: gentle-ai-worker mw2atukg-3-fi6e (done: list, search, new/edit form with commercial rules, sensitive-change reason dialog, detail + order history; geometry matched at 1440/390; omitted: persistence, audit log, supervisor PIN branch; search lowercases only, as reference). Commit: `feat(web): add customers module`.
- T5 (S1) — Browser comparison of Mostrador and Clientes vs reference at 1440/390; checks; one commit per module. Route: inline. Commit: pending.
- Tn (S1) — Type-check, lint, build; browser comparison with the reference at desktop and mobile. Route: inline. Commit: pending.

## Log

- L1: "Necesito que copies fielmente el documento de diseno que esta en docs a la aplicacion web, utilizando la skill de code organization"
- L2: Repository was re-initialized (single commit `00f84d1`); earlier `odd/tasks/operational-console-ui.md` work is not present in the tree. Starting fresh on `feat/design-console-port`.
- L3: Reference bundle is not minified and keeps `//#region <path>` markers for ~10.7k lines of app code (shadcn/ui + Radix + lucide-react + sonner + tailwind-merge + cva). Decision: mechanically decompile `jsx()` calls back to JSX for fidelity instead of hand-recreating screens.
- L4: "Espera no necesito que descompiles el bundle, queria hacer una integracion de 0" — L3 decompile strategy dropped. Rebuild from scratch, using the reference HTML as visual/functional authority.
- L5: User decisions: "shadcn/ui + Radix + lucide"; "Por etapas, empezando por el shell"; "Datos mock locales" (same products and copy as the design, per-module fixtures, local state, no backend).
- L6: "No es mejor instalar directamente shadcn?" — hand-written primitives dropped; shadcn CLI `add` used with a hand-written `components.json` (interactive `init` hangs without a TTY). CLI mis-resolved the `utils` alias to npm package `cn`; package removed and imports rewritten to `#/lib/utils/cn`.
- L7: Placement: app-wide `src/config` (navigation, workspace), `src/components/layout` (shell), `src/components` (page-heading, status-badge), `src/components/ui` (shadcn); Inicio in `src/modules/overview/{components,lib}`. Sections other than Inicio render as inert nav items until their routes exist. Avatar "Cambiar perfil de demo", Configuración, Guía rápida and panel links are visual only in stage 1.
- L8: "Mostrador, y clientes" — next modules chosen by the user.
- L9: Decisions: module dirs `counter` (Mostrador) and `customers` (Clientes); URLs `/mostrador`, `/clientes`. Cross-module seed data lives in `src/shared/demo/` (read-only seeds); each module keeps its own local React state seeded from it, so a sale in Mostrador does not update Clientes in this stage. Reference behavior/copy may be read from the running reference HTML and the read-only extracted regions in `/.design-extract/src/` (gitignored), but code is written from scratch, never transcribed from the bundle (L4).
- L10: Customers worker findings: reference search is case-only (not accent-insensitive) and was reproduced as-is; app renders Inter while reference falls back to an Arial-like font in headless Chromium (3-6% wider text, global); suggested shared extractions: dialog overlay, console modal shell, form fields, 44px buttons, table styling, money formatter, sensitive-operation dialog (duplicated with counter).
- L11: Font check: in the same headless Chromium both reference and app compute `Inter, "Segoe UI", Arial, sans-serif` and render Liberation Sans (Inter not installed). The width difference reported in L10 is a browser-environment artifact, not a code difference. No change.
- L12: Inter in dev comes from TanStack Devtools, which registers a global `@font-face` Inter (plus Bricolage Grotesque); the app's `font-family: Inter, ...` picks it up in dev only. Devtools are stripped from production builds, where the system fallback applies like the reference. Not a code defect.
