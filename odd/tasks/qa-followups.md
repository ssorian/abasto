# QA follow-ups: B5, B4 measurement, M3, M2

Objective: close the remaining items of `docs/qa/2026-11-10-web-exploratory-qa.md` that the user approved: B5, measure B4, M3, M2. Branch `feat/qa-followups` (from `main` 5408811).
Test runner: `bun test` in `abasto-web` against the isolated test database (`bun run db:up`). Workers load the `code-organization` skill first (AGENTS.md).

## Specs

- S1: B5 — "Clicks during slow hydration are lost (tabs and buttons do nothing). Inventario tabs needed a second click after load." Interactive controls (tabs and buttons) must not silently drop clicks before hydration: they render disabled until the client hydrates, so the user sees they are not ready yet.
- S2: B4 — "SSR is very slow with a warm server. … Still to compare against a production build." Measure SSR time of `/`, `/inventario`, `/almacenes`, `/repartos`, `/reportes`, `/direccion` on a production build (`bun run build`, `node .output/server/index.mjs`) with a logged-in owner session; record the numbers in the QA doc. Fix only if a page stays clearly slow.
- S3: M3 — "Confirm before removing a warehouse from a user and before a count that sets stock to 0." Removing a warehouse from a user asks for confirmation first; cancelling keeps the assignment. A count of 0 asks for confirmation first; cancelling records nothing.
- S4: M2 — "Blind count and blind cash close: do not show the system quantity or expected cash before the user enters it." The count dialog does not show the system quantity or a live difference before submitting; the cash close dialog does not show the expected cash or a live difference before closing. The result (difference) is shown only after the count or close is recorded.
- S5: M2 — "Add a note field to explain a cash difference." The cash close dialog has an optional note; it is stored with the closed cash session and shown in the cash history.
- S6: Checks — `bun test` green; tsc, eslint, prettier clean on changed files; `bun run build` OK.

## Tasks

- T1 [S1] parent inline — `src/hooks/use-hydrated.ts`; ui `Button` and `TabsTrigger` disabled until hydrated. Risk: item 3 (shared UI primitives used app-wide). Status: pending.
- T2 [S3 unassign] parent inline — confirm dialog before removing a warehouse from a user. Status: pending.
- T3 [S3 count-to-0, S4, S5] worker — blind count + count-to-0 confirm; blind cash close + note column (migration 0030), history shows note. Risk: item 1 (cash session schema, migration). Status: pending.
- T4 [S2] parent inline — production build timing, record in QA doc. Status: pending.
- T5 [S1-S6] verify — independent verification (risk items 1 and 3). Status: pending.

## Log

- L1 (user): "Ya ni recuerdo, que trabajamos y commiteamos? …" → "que no trabajamos del documento?" → recommendation "arrancar por B5, después medir B4, y seguir con M3 y M2" → "Aplica".
- L2 (evidence, explore): tabs are client `useState` Radix Tabs (`inventory-page.tsx:118,228-248`); no `useHydrated` hook; count dialog shows "El sistema tiene … Diferencia" at `count-dialog.tsx:131-137`; cash close shows expected at `cash-close-dialog.tsx:65` and live difference `:77-87`; `cash_sessions` has no note column (`cash/db/schema.ts:21-43`), immutability triggers in `drizzle/0009`, `0010`; latest migration 0029; unassign `×` calls directly at `users-section.tsx:72-77`; `src/components/ui/alert-dialog.tsx` exists.
- L3 (parent decisions): B5 fixed app-wide by disabling Button/TabsTrigger until hydrated (not by moving tabs to the URL); count result toast may still show the difference after recording; the cash note is optional.
