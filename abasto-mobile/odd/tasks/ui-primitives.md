# Shared UI primitives

## Objective and constraints
Extract only genuinely repeated cross-module UI structures from the existing HTML design, without redesign, new business behavior, or premature generic APIs. User explicitly authorized all seven audited candidates after Button/Card, one scoped part at a time. Keep module icons, mock actions, quantity rules, field adornments and feature-specific geometry local. Divider requires an independently repeated separator; integrated borders alone do not justify it. Existing worktree is dirty/untracked: preserve it, no branch/stage/commit without explicit instruction.

## Configuration
TDD: not enabled by project/session evidence; ordinary checks. Exact checks per writer: `npm run lint`, `npx tsc --noEmit`; native preview when available. Route: one bounded `gentle-ai-worker` per multi-file task; independent `gentle-ai-verify` on unassessable risk. Delivery: ask-on-risk; accumulated authored change likely >400 lines, chain strategy must be resolved before any requested commit/PR. The user did not authorize committing.

## Tasks and acceptance
- [x] UP-1 Button: primary-action color/alignment shared between home/checkout, screen geometry/labels/actions retained.
- [x] UP-2 Card: shared 16px padded rounded white shadow surface in checkout/orders/account.
- [x] UP-3 Initial independent verification: lint/typecheck passed; browser unavailable.
- [x] UP-4 QuantityStepper: shared controlled structure in cart/product/catalog; mock actions remain inert, product limits 1–99/disabled.
- [x] UP-5 Badge: informative status tones shared in catalog/orders; interactive chips local.
- [x] UP-6 Field: shared rounded horizontal white input surface auth/checkout; labels/hints/input props remain local; orders multiline remains local.
- [x] UP-7 IconButton: 44x44 labeled active header actions auth/product/checkout; decorative/inert bells local.
- [x] UP-8 SectionHeading: shared 18px bold carbon title/icon row checkout/orders with local spacing and display/body font choice; home remains local.
- [x] UP-9 Selectable option: share only actual radio choice structure checkout/orders with truthful accessibility role/state, preserve per-screen selection state, action, content and layout.
- [x] UP-10 Divider: locate independently repeated separators or document why integrated borders stay local; do not create unused component.
- [x] UP-11 Final independent verification: lint/typecheck; report visual and accessibility gaps and user-facing next step.

## Evidence and decisions
- Scouts found real repetition for the above components and divergent details for chips, multiline inputs and headings. Paths in `src/components/ui/{Button,Card,QuantityStepper,Badge,Field,IconButton,SectionHeading}.tsx` and respective module callers.
- For each UP-4 through UP-8, the delegated writer and independent verifier observed `npm run lint` and `npx tsc --noEmit` passing. Corrected QuantityStepper extra cart value wrapper; Field now centralizes equivalent white aliases; product inert notification Pressable restored after verification.
- HTML reference differences in Catalog badge neutral opacity/weight and stock border were observed but not attributed to extraction: most sources are untracked in Git. Auth visible label has no explicit accessibility association; not proven introduced.
- Controlled preview at localhost:8081 returned 200 earlier, but Playwright MCP requires missing `/opt/google/chrome/chrome`; cached Chromium is not configured. Native/web visual and screen-reader parity are unverified.
- UP-9: `SelectableOption.tsx` now holds truthful radio role/checked/label for checkout Delivery and orders Product/Reason selections; selected state, geometry and callbacks remain screen-owned. Payment with nested TextInput stays local. Writer and independent verifier observed lint/typecheck passing; interaction/visual checks pending.
- UP-10: read-only scout found one standalone divider in `src/modules/product/components/product-details.tsx:9` matching `docs/ui/detalle-producto.html:109`, but no second module. Catalog/cart/account examples are borders on content/navigation containers. Deliberate no-op: no shared Divider file or forced border conversion; user request recorded, not silently omitted.
- UP-11: independent verifier and parent spot run observed `npm run lint` and `npx tsc --noEmit` passing. Cached Chromium rendered app checkout 390x844 to `/tmp/abasto-primitives-checkout.png` and reference HTML to `/tmp/abasto-primitives-reference-checkout.png`. Both render; app Delivery first day wraps onto two lines while reference stays one line, shifting following rows; exact pre-migration cause is unprovable because source is untracked. No native or screen-reader interaction check. `QuantityStepper`/`IconButton` labels exist but no explicit button role; auth field label association remains unverified.
- No commit identities: commits not authorized. Do not claim Git baseline parity for untracked source.

## Next step
Extraction work and checks complete with known visual/accessibility follow-ups. If user wants full HTML parity, investigate checkout day-wrap as a separate fidelity task with pre-change evidence where possible. Divider stays module-local until repeated. No commit without explicit user instruction.
