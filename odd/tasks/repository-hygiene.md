# Repository hygiene

## Objective
Commit the existing project documentation and visual reference, while excluding local skill installation and generated review/tool artifacts from Git.

## Scope and constraints
- Authorized: commit `AGENTS.md`, `docs/design/abarroteros-demo-actualizada(4).html`, `odd/tasks/convert-to-monorepo.md`, and the existing edit to `odd/tasks/initial-app-commits.md`; update `.gitignore` to exclude the local skill installation and local artifacts. No push or PR.
- Do not include unrelated files or alter application source. Preserve ignored files on disk.
- The initial-app task's validation blocker remains open; do not claim its checks passed.

## Tasks
- [x] RH-1: Reviewed and committed named documentation/reference and this progress record. Check: exact staged paths and bounded credential scan passed; initial whitespace check found two spaces on a blank HTML line, removed before successful staged whitespace recheck. Commit: `dfbbd3d` (`docs: preserve project context and console reference`).
- [x] RH-2: Ignored the local skill installation (`.agents/skills/impeccable/`, `.pi/skills/impeccable`, `skills-lock.json`) and generated artifacts (`.impeccable/review/`, `.pi/generated-images/`, root and mobile `.codegraph/`). Check: all seven sample paths matched, reference files remained tracked, `git diff --check` passed. Commit: `faaef9c` (`chore: ignore local skill and generated artifacts`).

## Acceptance criteria
- Only explicitly named documentation/progress and `.gitignore` are committed; local files remain present and disappear from ordinary status.
- Historical validation failures stay documented, and no push or PR occurs.

## Progress
- Existing branch: `feat/operational-console-ui`; latest commit `19abf9b`. Reviewed current status and document references before writing.

## Next step
- No further hygiene work pending. Application tests/build/lint were skipped because only documentation and ignore rules changed; existing web lint/format blockers remain outside this scope. Rights/provenance of the bundled HTML were not independently verified.
