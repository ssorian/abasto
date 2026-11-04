# Design tokens

## Objective
Establish a consistent visual token foundation for Abarroteros UI using the existing HTML reference, NativeWind/Tailwind, and `src/global.css` before extracting shared UI primitives.

## Problem and rationale
Reference screens share a palette, spacing, typography, and radius scale; the application currently exposes only a subset through Tailwind, while global.css has unrelated web font aliases. Centralizing the reference values lets future primitives and screens reuse stable names without redesigning the existing UI.

## Scope
- Normalize reference-derived colors, spacing, typography, and radii in `tailwind.config.js` without removing existing `home-*` utilities.
- Define corresponding web CSS custom properties in `src/global.css` for DOM consumers, with clear NativeWind vs web ownership.
- Document usage, source of truth, font-weight constraints, and next-stage component extraction in `docs/design-tokens.md`.
- No UI component extraction, screen migration, backend work, theme switch, or redesign in this feature.
- User explicitly authorized fixing the two reported global check blockers in the web hydration hook and home icon map; no unrelated cleanup.
- Preserve all existing uncommitted changes.

## Configuration
- TDD: no explicit project/session mode established; ordinary checks, not RED/GREEN claims.
- Runner: `npm run lint`; `npx tsc --noEmit`; Tailwind token generation check with local CLI.
- Route: delegated bounded writer (three non-trivial files), with read-only exploration completed.
- Delivery: ask-on-risk; forecast about 220 authored lines, below ~400; no push/PR.
- Work-unit commits: not authorized by current user request; remain pending explicit instruction.

## Tasks
- [x] DT-1: Add reference-derived tokens to Tailwind and CSS while preserving existing classes. Acceptance: representative classes compile, token values match HTML, native static color values are available. Route: delegated writer; multi-file write trigger. Checks: Tailwind CLI, lint, typecheck.
- [x] DT-2: Document the token contract and staging for future shared primitives. Acceptance: source-of-truth, NativeWind/web distinction and typography caveat are explicit. Route: delegated writer in same bounded write; checks: readback and links/paths.
- [x] DT-3: Fix the two reported verification blockers without altering unrelated files. Acceptance: preserve SSR light fallback and client hydration behavior in `src/hooks/use-color-scheme.web.ts`; add the missing repeat-purchase icon mapping in `src/modules/home/components/home-chrome.tsx` without changing rendered intent; lint and typecheck pass; then recheck DT-1/DT-2. Route: delegated writer (multi-file write).

## Progress and evidence
- Initial: Read-only exploration mapped shared reference configuration and current NativeWind setup; repository contains extensive pre-existing uncommitted changes.
- Implementation: `tailwind.config.js`, `src/global.css`, `docs/design-tokens.md` updated by bounded worker. Independent verifier checked HTML token values; exact `cream-card` spelling subsequently aligned to `#FFFFFF` in Tailwind and CSS.
- Verification: token generation passed; parent spot check confirmed color and semantic spacing CSS mirrors. `npm run lint` failed at `src/hooks/use-color-scheme.web.ts:11` (`react-hooks/set-state-in-effect`); `npx tsc --noEmit` failed at `src/modules/home/components/home-products.tsx:8` (`sync` icon typing). Neither error points into token files, but a clean pre-change baseline is not established. Native visual inspection and browser font loading remain unverified.
- DT-3: `src/hooks/use-color-scheme.web.ts` now distinguishes SSR and client with `useSyncExternalStore`; `src/modules/home/components/home-chrome.tsx` includes sync mappings. Independent verification found no blockers. Writer, verifier, and parent spot check observed `npm run lint` and `npx tsc --noEmit` passing; CSS/Tailwind color and semantic spacing parity check passed. DT-1/DT-2/DT-3 outcomes verified. Native visual rendering and browser font loading were not checked.
- Delivery boundary: no branch, staging, or work-unit commit was made because the user did not authorize committing; commit identity remains pending. Existing uncommitted changes were preserved.

## Next step
Code/checks completed. If user requests a work-unit commit, first isolate this feature from the large pre-existing dirty worktree; future UI primitives remain a separate stage.
