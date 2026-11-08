---
version: 1
slug: "src-routes-tienda-tsx"
primary_target: "src/routes/tienda.tsx"
related_targets: ["src/modules/store/components/catalog-page.tsx","src/modules/store/components/store-shell.tsx","src/modules/store/components/cart-sheet.tsx","src/modules/store/components/orders-page.tsx","src/modules/store/components/store-login-page.tsx"]
---

# Surface brief: customer store (/tienda)

Scope: customer store surface only (catalog, cart, confirmation, orders, login). Staff console untouched. Mode: Operate.
Audience and job: distributors reordering fast from a phone and browsing brands/presentations; reserve a correct order in minutes. Constraints: availability labels only, reservation not payment, one warehouse at a time, customer-only reserve, broken images need fallback, Spanish copy, store name configurable in one place.
Unresolved: "lo que pides seguido" block (needs new data), not in scope.

## Direction contract

THESIS: The store reads like the rack your order is picked from. Every presentation is a label strip with a quantity set by thumb. Refuses the photo-card e-commerce grid and the dense admin table.
OWN-WORLD: Concrete off-white ground, graphite, white label stock, signal yellow as the one voice, beam orange and upright cobalt as rails. Stencil-like black alphanumerics, tabular numerals. Disponible = solid strip, Pocas = hazard hatch (the only hatching anywhere), Agotado = struck and dimmed; the word is always printed. Square-cornered steel plates and hard 2px rules, no soft shadows.
STORY: The distributor sees which warehouse they pick up from, finds a product by brand or search, sets quantities in place, and watches a pick list grow. They understand it is a reservation: pay and collect at the warehouse, it expires.
FIRST VIEWPORT: Phone: slim graphite bar, yellow dock plate naming the pickup warehouse (native select), brand tabs sized by product count plus search, then ~72px label-strip rows (photo mat left, name and presentation, tabular price, inline pick-face stepper) and a pinned pick-list bar at the bottom with count and total. Desktop: cobalt brand rail left, two columns of strips, permanent pick-list panel right. Signature: the pick-face stepper, quantity drawn as a growing bar of cells with a ticking total, hard-stepped about 120ms, static under reduced motion.
FORM: Rack-Bay Labels, the dealt direction (kind assigned), seed key b6e025a5.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
