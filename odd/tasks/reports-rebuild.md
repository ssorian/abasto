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
- T1 status: done. Commit: f5ea518 (5 artboards + design system).
- T1b [S3] inline — shadcn Chart (recharts 3.8.0) at `components/ui/chart.tsx`. Risk: item 5 (new dependency). Status: done. Commits: 3fcc943, 54e62f1 (stray `cn` package removed, import fixed).
- T2 [S1,S3-S6] worker — owner view from `01-kpi-hero-breakdown.html` + B sentences; owns `routes/reportes.tsx` wiring and `/direccion` removal. Status: done. Commit: 87ca7d7 (RED: missing owner-series/owner-narrative modules; 36 lib tests; parent: `/direccion` kept as a redirect to `/reportes`, 5 orphan old report components deleted; integrated checks: build OK, tsc clean, eslint 0 errors (3 pre-existing warnings), prettier clean, bun test 785/785; not checked in a browser)
- T3 [S2,S3,S5,S6] worker — manager view from `04-manager-operational.html` + E selector; exports the agreed `ManagerReportsPage` / `loadManagerReports`. Status: done. Commit: d9d5c8f. Evidence: RED seen for libs and service; full bun test 785/785; tsc errors only in T2's in-progress files; dropped: today-partial cards, product days without sale, cross-page links. Commit: —

Verification (independent, Risk items 2 and 3): S1-S5 pass, S6 partial for the verifier (parent ran the full set: build OK, tsc clean, eslint 0 errors, prettier clean, bun test 785/785). Gap fixed: customer refusal test for the manager dashboard (pins existing behavior, passed on first run). Follow-ups: `previousRange` and `dailySeries` exist in both owner and manager libs; owner previous totals (ranking) and previous daily chart (sales report) come from two queries. Not checked in a browser.

## Log

- L1 (user): "Sabes que creo? Que la vista de direccion bastaba ponerla en reportes, ademas siento que le hacen falta muchas graficas"
- L2 (user): "No seria una pestana mas, reportes tiene que recoinstruirse y tener una sola vista especifica para el dueno"
- L3 (user): "Sabes que rehaz las dos vistas, la exlcusiva para el dueno y la exclusiva para el encargado"
- L4 (user): "Bueno antes de, cale una vuelta con mobbin a interfaces de reportes y ganancias que tengan graficas" → references: Shopify Analytics (KPI + sparkline, hero chart with dashed previous period, breakdown table, ranked product bars), Xero Business snapshot (plain-language sentence per figure), Wix (comparison period next to the picker), 7shifts (location selector over sales chart), Mercury (chart over period table). Avoid many-slice donuts and blank cards without data.
- L5 (user): "Implementa" (before choosing an artboard) → parent decision: owner = direction A (KPI strip + hero chart + breakdown) with B's one-sentence explanations per figure; manager = direction D (operational, alerts first) with E's selector for managers covering two warehouses.
- L6 (T1 worker): design written to `design/reports-rebuild/` (design system synced first: `design/system.md`, `design/system.html`). Owner: `01-kpi-hero-breakdown.html` (A), `02-narrative-snapshot.html` (B), `03-warehouse-comparison-grid.html` (C). Manager: `04-manager-operational.html` (D), `05-manager-sales-first.html` (E, with two-warehouse selector). No artboard handed off by the worker; the choice is recorded in L5.
