# Operational console UI

## Objective
Recreate the operational console in `docs/design/abarroteros-demo-actualizada(4).html` inside `abasto-web`, visually faithful and componentized by the domain that owns each view, component, and form.

## Problem and decision
The web app is a TanStack starter. Its existing buyer-oriented module guide conflicts with the operational reference. The user selected **replicate the operational HTML**. Preserve its Spanish UI copy and recognizable layout; no redesign.

## Scope and constraints
- UI only, using illustrative local mock data and local interaction state. No backend/API wiring or business logic beyond visual interactions.
- Modules follow the console: overview, counter, customers, collections, catalog, promotions, inventory, warehouses, reports, settings. App-wide shell and genuinely shared components live outside modules.
- Keep unrelated repository changes intact, including existing modifications to `odd/tasks/initial-app-commits.md` and untracked reference/assets.
- Native HTML is the visual authority. The embedded bundle is not reusable TSX source; preserve its visual grammar and screen hierarchy in maintainable React.
- Existing framework entrypoints stay in `src/routes/`; do not hand-edit generated route trees.
- TDD mode: not configured/unknown; no tests runner in `abasto-web/package.json`. Root is a Bun workspace. Verification runner: `bun run --filter abasto-web lint`, `bun run --filter abasto-web check`, `bun run --filter abasto-web build`; focused local ESLint/Prettier where baseline checks fail; browser comparison desktop/mobile.
- Forecast: substantially over 400 authored diff lines (likely several thousand). Delivery strategy: user explicitly accepted one oversized commit as `size:exception` on 2026-09-26. No push or PR. Commit authorization: user requested `commitea`; stage only this operational UI and its task document, never unrelated work.

## Tasks
- [ ] **OC-1 — Shell and overview.** Responsive dark sidebar, header and Inicio implemented by delegated writers; desktop/mobile screenshots compared with reference and material color/copy/data differences corrected. Remaining logo/mobile sizing adjustments were not recaptured (two-round screenshot limit). Focused ESLint/Prettier, isolated UI TypeScript and build pass; global checks still blocked. Commit: pending authorization.
- [ ] **OC-2 — Catalog, promotions, inventory, warehouses.** Four views, filters, tabs, principal forms, presentation/code edit, inventory cross-link, lot label preview, count difference preview and transfer form implemented. Domain mock fixtures moved out of view files. Focused ESLint/Prettier, isolated UI TypeScript and build pass. Module-local changes are not shared between sections; stock transfers/counts are previews, not applied. Browser coverage of form flows remains partial. Commit: pending authorization.
- [ ] **OC-3 — Counter, customers, collections.** Sale composer, cash view/forms, searchable illustrative follow-up, customer form/detail and collection form implemented in owned modules. Focused ESLint/Prettier, isolated UI TypeScript and build pass. Browser found mobile overflow in Clientes/Cobros; CSS was corrected structurally but not recaptured. Fixtures remain independent between modules, and customer order history is empty. Commit: pending authorization.
- [ ] **OC-4 — Reports and settings.** Reports tabs/filters, demo users/audit and operational module guide implemented. Focused ESLint/Prettier, isolated UI TypeScript and build pass. Browser navigation and report tab sampled, but all form states not covered. Commit: pending authorization.
- [ ] **OC-5 — Fidelity and accessibility verification.** Two screenshot rounds captured (reference and app at desktop/mobile), all ten sections navigated, sampled dialogs/tabs tested; major visual gaps corrected after final round but not recaptured. Detector ran once; only Inter font warning, which follows pinned reference. Keyboard focus/dialog behavior and final 390px width after CSS fix unverified. No automated test runner. Commit: pending authorization.
- [ ] **OC-6 — Resolve verification environment.** `bun install --frozen-lockfile` aligned installed Better Auth packages at 1.7.5; full Bun build now passes without manifest/lock changes. Global lint still fails on generated `.output` and pre-existing Better Auth header lint; global Prettier check fails five untouched project files; full tsc includes pre-existing drizzle config optional URL. Isolated `src` tsc and focused UI lint/format pass. Do not edit backend/config outside user UI scope without authorization.

## Acceptance criteria
All ten console sections are reachable, their prominent panels and represented forms/dialogs exist, mock controls respond visually, layout remains usable on desktop and mobile, and no API/backend integration is added. Report any omitted behavior explicitly.

## Progress
2026-09-26: Operational HTML selected; all ten sections implemented as UI with module-owned views/forms. Follow-up passes added reference colors, missing UI flows and component extraction. Cached Chromium enabled two desktop/mobile screenshot rounds; port 3000 belonged to an unrelated app, so Abasto captures used verified strict port 3001. Invalid initial screenshots were preserved under incident names. Final CSS fixes were not recaptured. A pnpm invocation unexpectedly generated lock/workspace metadata; both untracked files were moved to `/tmp/abasto-pnpm-incident-20260926/`. Bun frozen install aligned node_modules to bun.lock without repo changes. Final independent Bun build, focused ESLint/Prettier, and isolated src TypeScript all pass; global lint/check and full tsc have unrelated baseline failures listed above. No test runner, no backend/API integration, no commits.

## Next step
After the authorized `size:exception` commit on `feat/operational-console-ui`, confirm mobile overflow/focus and final visual fixes in a later browser review if another round is authorized; decide whether to repair baseline global checks and whether module-local fixtures should become a shared demo model. Do not call UI-only work fully verified until blockers are resolved. Commit identity is recorded in the Engram recovery mirror after creation.
