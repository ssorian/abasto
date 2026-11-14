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

- T1 [S3] inline — manager dashboard on calendar periods. Status: pending. Commit: —
- T2 [S1, S2] inline — manager page rebuilt from artboard 06; old manager cards removed. Status: pending. Commit: —
- T3 [S4] inline — manager PDF report and download menu. Status: pending. Commit: —
- T4 [S5] inline — full checks, design handoff, close. Status: pending. Commit: —

## Log

- L1 (user): "Tambien seria buena idea hacer la version para el encargado de almacen"
- L2 (design): `design/reports-clarity/06-encargado-tablero.html` written; chosen artboard for this feature.
- L3 (user): "Pues esta bien el diseno asi, Pero solo es por almacen o se ven los demas?" Answered: one managed warehouse only; selector kept for managers of several.
- L4 (user): "Implementa"
