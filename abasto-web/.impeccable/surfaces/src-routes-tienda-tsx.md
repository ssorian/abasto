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
OWN-WORLD (restyled, T3/S6): the Rack-Bay layout in the company palette taken from the staff console tokens: warm cream ground, white blocks with light 1px warm borders and 10-16px radii, plum ink for headings and rails, raspberry as the one action colour, console font stack in semibold sentence case with tabular numerals. Disponible = green-tint pill, Pocas = amber-tint pill, Agotado = muted pill with a hollow dot; the word is always printed. No hatching, no hard plates, no stencil caps. Gentle elevation only where something floats (pinned bar, login card).
STORY: The distributor sees which warehouse they pick up from, finds a product by brand or search, sets quantities in place, and watches a pick list grow. They understand it is a reservation: pay and collect at the warehouse, it expires.
FIRST VIEWPORT: Phone (unchanged layout): slim white header, plum-tint plate naming the pickup warehouse (native select), brand tabs on a plum-tint rail sized by product count plus search, then ~72px label-strip rows (photo mat left, name and presentation, tabular price, inline stepper) and a pinned white pick-list bar at the bottom with count and total. Desktop: plum-tint brand rail left, two columns of strips, permanent pick-list panel right. Signature: the stepper, quantity drawn as a growing bar of rounded cells with a total that fades in, 160-200ms ease-out, static under reduced motion.
FORM: Rack-Bay Labels layout (dealt direction, kind assigned, seed key b6e025a5), restyled soft on the company palette after the user asked for "más suave y acorde a la paleta de colores de la empresa" while keeping the layout.
FINISH: DESIGN.md describes the soft look (store only); screenshots in .impeccable/review/soft-*.png; detect reports advisory token notes only.
