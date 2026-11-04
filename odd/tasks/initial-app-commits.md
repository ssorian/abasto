# Commit the initial applications

## Objective
Create two reviewable initial commits: the existing Expo mobile UI demo, then the TanStack web app initialization and shared Bun workspace foundation.

## Context and constraints
- The root repository is unborn on `main`; all application files are untracked. The user authorized commits and proposed two units, not a push or PR.
- Preserve source as-is. Stage only enumerated work-unit directories/files; exclude local tooling (`.agents`, `.pi`, `.codegraph`, `skills-lock.json`), ignored environment files and unrelated migration history.
- The mobile commit must stand alone before the workspace manifest exists. The second commit establishes the shared root lockfile and both-workspace configuration alongside web initialization.
- TDD: not applicable to staging existing code; no tests are declared. Validation runner: `bun run mobile:lint`, `bun run --cwd abasto-mobile tsc --noEmit`, `bun run web:lint`, `bun run web:check`, `bun run web:build`, `bun install --frozen-lockfile` where applicable.
- Delivery: two initial baseline commits as requested; their existing authored source exceeds the 400-line review heuristic. No PR requested; call out review workload before any PR.

## Tasks
- [x] INIT-1: Create a feature branch and commit the existing mobile UI demo with its app-specific assets and docs. Route: parent Git state and narrow path staging; delegated verification for commands. Check: staged path/secret scan, mobile lint and TypeScript passed. Commit: `97f4d02` (`feat(mobile): add storefront UI demo`).
- [ ] INIT-2: Commit web initialization and root workspace foundation (`abasto-web/`, `.gitignore`, `package.json`, `bun.lock`, `README.md`). Route: parent Git state and narrow path staging; delegated verification for commands. Check: staged path/secret scan, frozen install and web build passed; web lint and format check failed on existing starter files. Commit: `297fbc4` (`chore(web): initialize app and Bun workspace`); validation blocker remains.

## Acceptance criteria
- Exactly two conventional commits on a feature branch, in mobile then web/foundation order; no push or PR.
- Staged changes contain no local secrets or tool state; each commit has a coherent purpose.
- Record the outcomes of every check, including known web failures and skipped checks.

## Progress
- Read-only mapping found mobile Expo UI prototype and web TanStack starter; root Bun lockfile spans both workspaces. `abasto-web/.env.local` is ignored.
- Branch `feat/initial-app-commits` created. Mobile staging has 134 app files, 6,567 added lines; root design reference (`docs/design/abarroteros-demo.html`, 32,969 lines) and app `.codegraph` state excluded to avoid an unrelated oversized artifact and local tooling. These remain untracked.
- Mobile lint passed; TypeScript passed with `bun run --cwd abasto-mobile tsc --noEmit`. The initial `bun --filter abasto-mobile exec tsc --noEmit` failed because Bun treated `exec` as a script; corrected invocation passed. `git diff --cached --check` reports pre-existing whitespace in font license, HTML references and AGENTS.md; source not reformatted for a baseline commit. Filename and staged-content secret scan found no candidate private keys or env files.
- Mobile baseline committed as root commit `97f4d02` (134 files, 6,567 added lines). Staged whitespace check failed on pre-existing reference HTML/license/AGENTS lines; no code rewrite.
- Web/foundation staging has 33 files (including this task record); filename and staged-content secret scan found no env files or candidate private keys. `git diff --cached --check` reports pre-existing README/CSS/tsconfig whitespace.
- `bun install --frozen-lockfile` and `bun run web:build` passed. `bun run web:lint` failed: generated `.output/public/assets` is linted and `abasto-web/src/integrations/better-auth/header-user.tsx:20` has unnecessary optional chaining. `bun run web:check` failed: seven web files need Prettier. Status unchanged after checks. These web starter failures predate the commit; no repair was authorized in this commit scope.
- Web/foundation baseline committed as `297fbc4` (33 files, 3,828 added lines). No source changes were made; task remains unchecked while lint and format checks fail.
- [ ] INIT-3 (blocker): Decide whether to authorize a separate web lint/format cleanup, including generated `.output` lint scope; do not silently expand the initial commit scope. No fix or third commit authorized yet.
- Next: report the two commit IDs and the remaining web validation blocker. Leave unrelated local tooling and root design reference untracked.
