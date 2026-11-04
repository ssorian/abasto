# Storefront header consistency

Objective: Replace five independently implemented storefront headers with one reusable component while preserving the actual reference variants and existing navigation.

Problem: Home, Catalog, Cart, Orders and Account currently render divergent copies of the logo/store/actions header; Account substitutes a generic icon for the brand logo. References share storefront composition while Catalog intentionally uses a tile-style logo. Contextual stack headers (Product, Checkout, Registration, Incident, Confirmation) are not part of this consolidation.

Scope: Create one cross-module `src/components/storefront-header.tsx` and migrate the five storefront screens. Reuse existing brand assets and NativeWind tokens; keep page-specific label, wordmark/tile variant and any reference-required border/shadow differences. No redesign, backend, new features, new dependencies or navigation changes. Preserve current user changes. No Playwright or tests, no pixel-perfect refinements. Structural readback after screens are migrated; runtime appearance remains unverified unless separately authorized.

TDD: off from prior UI work; runner none. Verification: structural source inspection of migrated headers, logo variant and action navigation; no test suite per user preference. Route: delegated writer (multi-file); read-only independent structure verifier if risk assessment requires. No commit authorized; no push/PR. Forecast ~150–300 authored lines; delivery strategy ask-on-risk.

## Tasks

- [x] HDR-1 (delegated): Created `src/components/storefront-header.tsx` with `section` and `logoVariant` (`wordmark`/`tile`) props, storefront brand/actions and existing cart/account routes. Writer structural readback found feature-neutral shared source.
- [x] HDR-2 (delegated): Migrated Home, Catalog, Cart, Orders and Account to the shared header. Catalog uses tile; other four wordmark. Writer readback confirmed five imports/renders, then removed a residual unused Home logo constant. Contextual headers and bottom navigation untouched.
- [x] HDR-3: Independent static readback confirmed all five screens import/render the shared header, correct section and logo variant, retained cart/account routes and bottom nav; contextual headers untouched. Verifier questioned fixed 32×32 wordmark, but fetched exact reference asset is square 512×512, matching HTML h-8 w-auto. Translucent blur remains a reference-only visual treatment; runtime appearance and checks unverified per user preference.

Progress: Five storefront pages now share `src/components/storefront-header.tsx` with Catalog's tile variant and wordmark elsewhere. Independent static readback found no blocking structure/route gap; reference wordmark asset confirmed square, so 32×32 is appropriate. Native translucent backdrop blur not attempted, and no runtime/browser/typecheck/lint/tests were run per scope. No commit made. Next: optional manual visual preview if requested.
