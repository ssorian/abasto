# Reference UI screens

Objective: Implement the UI references in `docs/ui/` incrementally in Expo Router, reusing the existing NativeWind setup and existing Home implementation.

Scope: UI only, mock data, visually faithful structure without pixel-perfect refinement. Preserve existing uncommitted work. Feature-owned components/data under `src/modules/<feature>/`; thin route files under `src/app/`. Reuse only demonstrated cross-module patterns. Do not add backend or unsupported behaviors. No Playwright, tests, or sweeping checks; review the agreed structure once when each screen is complete. No commits, push or PR requested.

TDD: off per earlier home work; runner none. Verification: per screen, a concise structural readback only (ownership, sections, route), no test suite. Pre-existing Home technical checks documented separately in `odd/tasks/home-ui.md` remain historical and are not repeated.

Route: bounded delegated writer per screen (multi-file writes), parent owns navigation and scope. About 400 authored lines per unit is advisory, not a cap. Delivery: ask-on-risk; no delivery requested.

## Tasks

- [x] UI-1 Catalog (`abarrotes.html`): `src/modules/catalog/` page/components/mock data and thin `src/app/abarrotes.tsx` route created. Writer structural command passed; independent static inspection confirmed sections/ownership. Badge position differs slightly from HTML; no runtime/visual verification requested.
- [x] UI-2 Product (`detalle-producto.html`): `src/modules/product/` page/components and thin `src/app/detalle-producto.tsx` route created. Writer file-structure command passed and independent static readback confirmed principal reference sections and ownership; runtime unverified.
- [x] UI-3 Cart (`carrito.html`): `src/modules/cart/` page/components and thin `src/app/carrito.tsx` route created. Writer command passed and independent structural inspection confirmed main blocks/ownership; runtime unverified.
- [x] UI-4 Checkout (`checkout.html`): `src/modules/checkout/pages/checkout-page.tsx` and thin `src/app/checkout.tsx` created; writer structural command passed and independent readback found no substantial missing block.
- [x] UI-5 Confirmation (`pedidos-confirmados.html`): checkout-owned `order-confirmation-page.tsx` and thin `src/app/pedidos-confirmados.tsx` created; writer structural command passed and independent readback found no substantial missing block.
- [x] UI-6 Orders (`pedidos.html`): orders-owned page and thin `src/app/pedidos.tsx` route, including three-option merchandise-help sheet; structural readback confirmed principal sections. Footer indicators differ slightly.
- [x] UI-7 Incident (`reporte-incidencias.html`): orders-owned report page and thin `src/app/reporte-incidencias.tsx` route with local visual form state and confirmation; structural readback confirmed four steps. Simulated evidence and inline rather than transient toast.
- [x] UI-8 Account (`cuenta.html`): account-owned page and thin `src/app/cuenta.tsx` created; structural readback confirmed major sections. Footer ownership awaits navigation task.
- [x] UI-9 Business registration (`registro-negocio.html`): auth-owned registration page and thin `src/app/registro-negocio.tsx` created; structural readback confirmed major sections.
- [x] UI-10 Navigation: linked five bottom tabs, Home catalog action, Coca-Cola catalog card, product → cart → checkout → confirmation → orders → incident and represented return actions. Other catalog cards remain demo because detail is fixed to Coca-Cola; registration has no explicit account entry. Static readback confirmed handlers and target strings; runtime unverified. One writer interruption left partial edits, diagnosed read-only and completed with scoped follow-ups.

Progress: All ten reference screens are represented: Home plus nine new pages in feature-owned modules with thin routes. Navigation now connects represented destinations; only the Coca-Cola card links to its fixed-detail mock, and registration stays standalone without an explicit account link. Static structural readbacks found major sections/route handlers; minor indicators/toast/layout variations were not refined per user request. Native risk assessments unassessable due to untracked files; independent static readbacks used. No tests/build/lint/browser/typecheck/runtime checks per user request. Existing uncommitted changes were preserved; no commits made. Next: optional manual app preview when user wants it; no further validation in this scope.
