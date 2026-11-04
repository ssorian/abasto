# Home UI

Objective: Reproduce the supplied Abarroteros mobile home HTML in the Expo application, with mock content and visual-only interactions.

Problem: The repository currently renders an Expo starter home and starter tabs, while the supplied reference specifies a complete wholesale storefront home.

Scope: Configure NativeWind v4 for Expo SDK 57, then implement home header, search, active delivery status, promotion, repeat purchases, categories, weekly deals, guarantee, toast feedback, and bottom navigation appearance against `docs/ui/home.html` (the corrected home reference). No backend, camera, cart state, or other screens. Keep module-owned UI under `src/modules/home/`; route stays thin. Use supplied remote mock imagery; system font fallback if brand font files are unavailable. Preserve pre-existing user changes to package.json and bun.lock while adding required dependencies.

Constraints: React Native + Expo Router for native and web; light palette matching reference; no unnecessary dependencies; placeholder controls must not pretend to navigate to unfinished screens. No commits without explicit user authorization.

TDD: off (no explicit project/session configuration found); runner: none. Checks: `npx tsc --noEmit`, `npm run lint` where available.

Delivery: ask-on-risk; estimated authored diff 600–900 lines across the home feature and app shell. Risk of review size noted; single coherent screen implementation rather than artificial splitting. No push/PR authorized.

## Tasks

- [ ] HOME-0 (delegated): Configure NativeWind v4 and Tailwind CSS v3 with Expo SDK 57, preserving existing package/lock changes. Verify configuration and typecheck. Route: delegated writer. Acceptance: `className` supported on native/web and tokens available for home components. `bunx tsc --noEmit` passed; `CI=1 bunx expo export --platform web --output-dir /tmp/abasto-home-export` bundled `/`; full lint blocked by existing hook. Native device runtime untested.
- [ ] HOME-1 (delegated): Replace starter shell with faithful responsive home UI, organized by home-owned sections and app-wide shell only where needed. Verify TypeScript and lint. Route: delegated writer (multi-file write and preparation triggers). Acceptance: supplied sections, prices, badges, images, navigation bar, and two feedback microinteractions render on web/native with mock data; no backend/camera.
- [ ] HOME-2 (delegated): Independently validate implementation and record limitations. Route: native assess returned unassessable for untracked files, so high-risk independent verifier used. Acceptance: reported commands observed, visual structure read back, known limitations documented. Independent verification found all 22 platform icons valid; final `bunx tsc --noEmit` and targeted `bunx eslint src/modules/home src/app/index.tsx src/app/_layout.tsx` passed; visual device/browser check pending.
- [ ] HOME-3 (blocker): Decide whether to fix the untouched starter hook lint failure separately; then rerun full `bun run lint`. Do not silently modify unrelated hook under UI-only scope.

Progress: Corrected `docs/ui/home.html` now provides the actual home reference. Static comparison and independent verification confirmed section order, exact seven image URIs and product data; focused correction aligned the red gradient promotion, action texts, category icons, header/nav details and compact heading layout. Plus Jakarta Sans / Inter still fall back to system fonts (no local font files). `bunx tsc --noEmit`, targeted `bunx eslint src/modules/home src/app/index.tsx src/app/_layout.tsx`, and `CI=1 bunx expo export --platform web --output-dir /tmp/abasto-home-export-final` passed; export caused no new Git changes. Full `bun run lint` still fails only at untouched starter `src/hooks/use-color-scheme.web.ts:11` (`react-hooks/set-state-in-effect`). No browser/device visual comparison or native runtime test; mock images require network. Expo export earlier appended harmless NativeWind declaration include to tsconfig.json (incident diagnosed). Tasks remain open pending full lint decision and visual validation. No commits were made (not authorized). Next: visually compare at mobile widths and separately decide starter lint fix.
