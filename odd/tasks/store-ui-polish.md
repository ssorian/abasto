# Store UI polish

Walk the customer store (`/tienda`, `/tienda/entrar`, `/tienda/pedidos`, cart) with impeccable and fix inconsistencies and things that look off, directly, on branch `polish/store-ui`. Layout changes are allowed here.
Staff console and mobile app are out of scope.

## Specs

- S1: "ahora haz lo mismo con la pagina de tienda, ahi si tienes permiso de cambiar el layout"
- S2: "lo mismo" refers to L1 of `odd/tasks/console-ui-polish.md`: "Quiero que hagas recorridos de la UI y uses impeccable para ir limpiando inconsistencias y en general cosas que se ven feas o que no terminan de encajar del todo con una UI bien hecha." Mode as before: fix directly, commit by area, report at the end.
- S3: Keep product truth from `abasto-web/PRODUCT.md` (warehouse always clear, reservation-not-payment sentence visible on ordering steps, availability words printed, phone-first touch targets) and the store palette/tokens from `abasto-web/DESIGN.md`. When layout changes, update `abasto-web/DESIGN.md` to match.

## Tasks

- [x] T1 (S1-S3): Walkthrough 1440 + 390, anonymous and signed-in customer (dev account `donpepe@tienda.local` / `tienda-2026`, created in the dev DB through Clientes › Acceso a la tienda). Findings below. Route: inline. Commit: —
- [x] T2 (S1-S3, SF1-SF6): Implement the findings. Route: gentle-ai-worker (context backstop) + parent fix for a trailing divider on orders without a deadline. Commits: see T3
- [x] T3: Re-walk 1440/390 (pick list fits content, plate one row, PED-5D6635E3, Recogido without deadline, no horizontal overflow); impeccable detect 0 defects (25 advisories); bun test src/modules/store 48 pass; eslint clean. Commits: 8d1cab6 (catalog), 1243be6 (orders)

## Findings

- SF1 Desktop pick list ("Hoja de surtido"): the panel stretches to the full viewport height, leaving a large blank white area between the last line and the total; every picked line repeats the full 44px stepper plus the 12-cell bar, so three items already look bulky.
- SF2 Desktop warehouse plate: a wide plum plate holds only the select and one helper sentence, leaving most of it empty and pushing the catalog down.
- SF3 Sold-out strips print the "Agotado" pill and, in the control column, "Sin existencias": the same fact twice.
- SF4 Mis pedidos (desktop): two narrow order cards sit in a multi-column grid and leave ~40% of the width empty; the page reads unfinished.
- SF5 Mis pedidos: a Recogido order still prints "Fecha límite era …", a deadline that no longer matters.
- SF6 Mis pedidos: the order code renders as "PED - 5D6635E3" (spaced hyphen / wide tracking) while the console prints "PED-5D6635E3".

## Log

- L1: "ahora haz lo mismo con la pagina de tienda, ahi si tienes permiso de cambiar el layout"
