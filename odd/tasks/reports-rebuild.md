# Reports rebuild: owner view and manager view

Objective: rebuild Reportes as two role-specific dashboards with charts — one exclusive to the owner (whole business, profitability), one exclusive to the manager (their warehouse) — replacing the tabbed tables and the separate `/direccion` console. Design first on the canvas, then implement the chosen artboards. Branch `feat/reports-rebuild` (from `main` 89dfdbb).
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`).

## Specs

- S1: Rebuild, not a tab — "No seria una pestana mas, reportes tiene que recoinstruirse y tener una sola vista especifica para el dueno". The owner opening Reportes sees one dashboard built for them, not the current tabs.
- S2: Two exclusive views — "Sabes que rehaz las dos vistas, la exlcusiva para el dueno y la exclusiva para el encargado". The manager opening Reportes sees a dashboard of their warehouse(s) only; a manager covering two warehouses keeps a selector limited to theirs (prior rule, `hasWarehouseChoice`).
- S3: Charts — "siento que le hacen falta muchas graficas". Trends and comparisons are shown as charts, with tables only where detail is needed.
- S4: `/direccion` folds into Reportes — "Que la vista de direccion bastaba ponerla en reportes". The `/direccion` route and its nav item are removed once the owner view ships; its services (`modules/executive`, owner-only `requireOwner`) are reused unchanged.
- S5: Permissions unchanged — the owner view calls only owner-guarded services; the manager view shows only what managers can read today for their warehouses (reports scope `reportWarehouses`). No new data exposure.
- S6: Checks — `bun test` green; tsc, eslint, prettier clean on changed files; `bun run web:build` OK.

Decisions (parent): charts with shadcn/ui Chart (Recharts) — new dependency, stated to the user; design directions on the gentle-design canvas before any code.

## Tasks

- T1 [S1-S3] worker — design system sync (`design/system.md`, `design/system.html`) and design `design/reports-rebuild/`: 3 owner directions + 2 manager directions. Status: pending. Commit: —
- T2 [S1,S3-S6] — implement the chosen owner artboard. Status: blocked (waits for the user's choice). Commit: —
- T3 [S2,S3,S5,S6] — implement the chosen manager artboard. Status: blocked (waits for the user's choice). Commit: —

## Log

- L1 (user): "Sabes que creo? Que la vista de direccion bastaba ponerla en reportes, ademas siento que le hacen falta muchas graficas"
- L2 (user): "No seria una pestana mas, reportes tiene que recoinstruirse y tener una sola vista especifica para el dueno"
- L3 (user): "Sabes que rehaz las dos vistas, la exlcusiva para el dueno y la exclusiva para el encargado"
- L4 (user): "Bueno antes de, cale una vuelta con mobbin a interfaces de reportes y ganancias que tengan graficas" → references: Shopify Analytics (KPI + sparkline, hero chart with dashed previous period, breakdown table, ranked product bars), Xero Business snapshot (plain-language sentence per figure), Wix (comparison period next to the picker), 7shifts (location selector over sales chart), Mercury (chart over period table). Avoid many-slice donuts and blank cards without data.
- L5 (user): "Implementa" (before choosing an artboard) → parent decision: owner = direction A (KPI strip + hero chart + breakdown) with B's one-sentence explanations per figure; manager = direction D (operational, alerts first) with E's selector for managers covering two warehouses.
- L6 (T1 worker): design written to `design/reports-rebuild/` (design system synced first: `design/system.md`, `design/system.html`). Owner: `01-kpi-hero-breakdown.html` (A), `02-narrative-snapshot.html` (B), `03-warehouse-comparison-grid.html` (C). Manager: `04-manager-operational.html` (D), `05-manager-sales-first.html` (E, with two-warehouse selector). No artboard handed off by the worker; the choice is recorded in L5.
