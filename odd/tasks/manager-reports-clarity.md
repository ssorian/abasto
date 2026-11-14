# manager-reports-clarity

Give the warehouse manager's Reportes view the same treatment the owner's got in `odd/tasks/reports-clarity.md`:
one screen, less noise, calendar periods and PDF download. Visual spec: `design/reports-clarity/06-encargado-tablero.html`.

## Specs

- S1 "Tambien seria buena idea hacer la version para el encargado de almacen": rebuild the manager page from artboard 06: period on the left (three figures, sales by day, breakdown by product / by channel, Control with cash cuts and deliveries, detail closed until asked), "Tu almacén hoy" rail on the right (open cash, what needs attention, supplier orders to receive).
- S2 "Pero solo es por almacen o se ven los demas?": the manager sees one warehouse they manage, never the others; someone who manages several keeps the selector, shown only with more than one. No permission change.
- S3 Calendar periods as drawn (Hoy, Semana, Mes, Personalizado; default Semana), compared with the same stretch of the previous week or month.
- S4 "Descargar PDF" as drawn: day, week and month reports of that warehouse only, without the owner's supplier-recovery and whole-inventory sections.
- S5 Checks: `bun test` green; tsc, eslint, prettier clean; `bun run build` OK.

## Tasks

- T1 [S3] inline — manager dashboard on calendar periods. Status: done. Commit: 0f30dfd
- T2 [S1, S2] inline — manager page rebuilt from artboard 06; old manager cards removed. Status: done. Commits: d87390b (owner pieces made reusable), f5f4712 (page).
- T3 [S4] inline — manager PDF report and download menu. Status: done. Commit: dc443db
- T4 [S5] inline — full checks, design handoff, close. Status: done. Commit: this docs commit.

## Log

- L1 (user): "Tambien seria buena idea hacer la version para el encargado de almacen"
- L2 (design): `design/reports-clarity/06-encargado-tablero.html` written; chosen artboard for this feature.
- L3 (user): "Pues esta bien el diseno asi, Pero solo es por almacen o se ven los demas?" Answered: one managed warehouse only; selector kept for managers of several.
- L4 (user): "Implementa"
- L5 (evidence): browser as Miguel (Arcelia), week by default: three figures, bars, breakdown by product and by channel, Control with two cells and cash detail without a warehouse column, rail with open drawer (Abierta 08:41, $2,368.66), one low-stock product and no pending orders. Day, week and month PDFs downloaded and read with pdftotext: only Arcelia, no supplier or whole-inventory sections.
- L6 (slice): the page commit is over the ~400-line slice (about 550 authored lines plus 1,700 deleted lines of the old cards); it is one behavior that cannot ship half-built, so it is split only into: owner pieces made reusable, manager PDF builder, manager page. The narrow-viewport horizontal overflow (≈416 px at 390 px) also happens on Inicio and the owner page: it comes from the app shell, out of scope.
- L7 (evidence): `bun test` 1322 pass, 2 skip, 0 fail; tsc clean; eslint 0 errors (4 old warnings elsewhere); prettier clean; `bun run build` OK. Slice boundary: the feature closes at 4 code commits (~3,000 changed lines, mostly deleted cards); no more code goes on this branch.
