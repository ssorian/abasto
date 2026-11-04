# Convert Abasto to a monorepo

## Objective
Establish one root Git repository and Bun workspace for the existing mobile and web apps, without relocating application source or losing uncommitted files.

## Context and constraints
- The root initially has no Git repository or package manifest.
- `abasto-mobile` has a local initial commit and many uncommitted files; `abasto-web` has no commits and its files are untracked. Neither has a remote. The user explicitly accepts discarding nested Git histories.
- Preserve every non-Git file; do not reset, clean, or overwrite source. Retain the app directories and their existing names.
- No explicit commit authorization: prepare reviewable changes, but do not create a commit until separately authorized.
- No shared package until real cross-app runtime code exists. Avoid preemptive Metro/TypeScript changes.
- TDD: mobile records say off; root mode unknown. No dedicated infrastructure test runner; use Bun installation and existing app checks. Do not assume tests enable TDD.
- Delivery: ask-on-risk; forecast small hand-authored configuration/documentation change (<400 lines); generated root lockfile excluded.

## Tasks
- [ ] MONO-1: Consolidate Git ownership at the root. Route: inline Git state operations, with read-only delegated mapping completed. Check: both nested `.git` paths gone, root `git rev-parse --show-toplevel` resolves here, existing app files remain, and root status shows apps as ordinary files. Commit: pending explicit authorization.
- [ ] MONO-2: Configure Bun workspaces, shared ignore rules, root documentation and root lockfile without changing app runtime code. Route: delegated writer (multiple non-trivial files), with independent delegated verification after native assessment returned unassessable. Check: root frozen install, mobile lint/typecheck and web build passed; web lint/check failed on app files, Metro smoke skipped; no commit authorized, so task remains unchecked.
- [ ] MONO-3: Resolve closure decision: user confirmed web lint/format failures are outside this migration scope; request explicit authorization before commits. Route: parent clarification; no app-code fixes in this feature.

## Acceptance criteria
- Exactly one Git root owns both apps, with no nested repositories and no missing pre-existing source files.
- A single root `bun.lock` resolves both unchanged app manifests; no child `bun.lock` remains after successful validation.
- README documents install and app commands; root ignores common generated output.
- No commits, pushes or PRs without explicit authorization.

## Progress
- Read-only app mapping and per-app Git state observed.
- MONO-1 Git boundary established: `git init -b main` at root; deleted only `abasto-mobile/.git` and `abasto-web/.git` after checking both were directories. Root `git rev-parse --show-toplevel` resolves here; both app manifests remain. No work-unit commit authorized yet, so task remains unchecked.
- Fresh session reconciled task file and Engram; root Git and absent nested Git verified. Previous session worktree-binding blocker resolved.
- MONO-2 writer added `package.json`, `README.md`, root `.gitignore` rules and generated `bun.lock`. `bun install`, `bun install --frozen-lockfile`, mobile lint and web build passed. Web lint failed at `abasto-web/src/integrations/better-auth/header-user.tsx:20` (unnecessary optional chain); web Prettier check reports six existing files. Child lockfiles were retained at this initial step. The web build plausibly regenerated `abasto-web/src/routeTree.gen.ts`, but no pre-build baseline exists; read-only incident diagnosis found a coherent generated tree, so leave it untouched. No app source fixes authorized in this task.
- Retired child `bun.lock` files after preserving temporary copies at `/tmp/abasto-locks.jdQato`. Independent verifier confirmed `bun install --frozen-lockfile` (1087 installs across 1247 packages, no changes), mobile lint and mobile `tsc --noEmit` all exit 0 with child locks absent; root `bun.lock` includes both workspaces. Web build had passed before removal. Metro smoke skipped to avoid Expo's known config-writing export behavior.
- Native `gentle_review assess` returned `unassessable` because this new repository's entirely untracked files require explicit declaration. Independent verifier was already run; no review transaction was started (RDD off).
- Outstanding: web lint and Prettier checks fail on app files; user explicitly excluded their repair from this migration. Generated web route tree lacks a pre-build baseline and remains untouched. No commits authorized or created; ask separately before creating work-unit commits.
