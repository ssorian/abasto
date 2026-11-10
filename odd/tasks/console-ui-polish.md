# Console UI polish

Walk the staff console (web) with impeccable polish and fix inconsistencies and things that look off, directly, on branch `polish/console-ui`, committing by area.
Store (`/tienda`) and mobile are out of scope.

## Specs

- S1: "Quiero que hagas recorridos de la UI y uses impeccable para ir limpiando inconsistencias y en general cosas que se ven feas o que no terminan de encajar del todo con una UI bien hecha."
- S2: Scope chosen by the user: "Consola de staff (web)".
- S3: Mode chosen by the user: "Corregir directo" — fix polish inconsistencies (spacing, typography, alignment, states) on a branch, commit by area, report at the end.
- S4: Polish is refinement: preserve the incumbent console look (`design/system.md`), copy, and behavior.

## Tasks

- [x] T1 (S1-S4): Walkthrough desktop 1440 + mobile 390 of every console route; findings below. Route: inline (playwright). Commit: —
- [x] T2 (S1-S4, F1): Count copy: pluralization and zero-padding. Route: inline. Commit: 90ca4a2 (+ Clientes copy in 14c1209)
- [x] T3 (S1-S4, F2, F6): Tables: right-aligned numbers/actions; Configuración table matches console table. F6 dropped: measured, both buttons are 44px (primary has no visible border). Route: inline. Commit: 14c1209
- [x] T4 (S1-S4, F3): Reportes tables clipped inside narrow cards (also Cortes de caja). Route: inline. Commit: 52e49fb
- [x] T5 (S1-S4, F4, F5): Catálogo card actions and link colour; Mostrador reservation form alignment. Route: inline. Commit: 6173035
- [x] T6: Re-walk 1440/390: no clipped tables on desktop, "6 cajas", "1 abierto", "1 Stock bajo"; impeccable detect: 0 defects, 17 font-size advisories (checked against store DESIGN.md, console sizes come from design/system.md); eslint clean on changed files (repo-wide lint already fails on main); bun test src/modules 931 pass. Commit: this doc

## Findings

- F1 Count copy: "1 abiertos" (Inicio, Pedidos y entregas); "1 condiciones comerciales" (Clientes); "6 Caja" / "5 Caja" / "2 Caja" next to "0 piezas" (Inventario, Existencias/Mínimo); "01 Stock bajo" zero-padded beside "73" and "67" (Inventario summary).
- F2 Tables: action buttons sit mid-column instead of right edge (Clientes "Ver cliente", Mostrador "Ver pedido"); Mostrador "Total" money left-aligned; Configuración users table uses a different header/cell style and smaller buttons than every other console table.
- F3 Reportes: "De ventas a utilidad" and "Almacenes: actual contra anterior" tables clip their last column ("Cambio", "Ticket promedio") at 1440px.
- F4 Catálogo cards: "Precios"/"Editar" buttons are smaller (12px, ~32px) than console buttons; "Consultar inventario" link is plum while equivalent links ("Ver inventario" in Almacenes) are raspberry.
- F5 Mostrador: reservation-hours input and "Guardar" separated by an irregular gap (mobile: button floats right of the input).
- F6 Mostrador caja card: "Abrir caja" and "Historial" render at different heights.
- Not changed (out of polish scope, noted only): reservation-duration setting lives on Mostrador rather than Configuración; Almacenes cards' decorative "01" numerals.

## Log

- L1: "Quiero que hagas recorridos de la UI y uses impeccable para ir limpiando inconsistencias y en general cosas que se ven feas o que no terminan de encajar del todo con una UI bien hecha."
- L2: User answers: scope "Consola de staff (web)"; mode "Corregir directo".
