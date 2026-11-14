# Reports clarity: calmer owner page and PDF reports

Objective: rebuild the owner Reportes page from artboard `design/reports-clarity/05-tablero-dos-columnas.html` (period on the left, today's inventory on a right rail) with calendar periods, and add PDF downloads of the day, the week and the month following artboards `02-pdf-dia.html`, `03-pdf-semana.html`, `04-pdf-mes.html`. The manager view is out of scope.
Test runner: `bun test` in `abasto-web` (isolated test database, `bun run db:up`). Branch: `feat/reports-clarity`.

## Specs

- S1: Less noise — "aparte de ser fea y horrible esta sobrecargada y havce mucho ruido visual ademas de no dejar claro que es que, necesito bastante menos y mas claridad de datos". The owner page shows only: three figures (Ventas, Utilidad bruta with margin, Tickets with average), one chart (ventas por día), one breakdown table (por almacén / por proveedor / por producto), a three-cell control summary (Caja, Repartos, Proveedores) with detail on demand, and the inventory rail (valor a costo por almacén, requiere atención, sin venta top 5). Period data and today's snapshot are visibly separate.
- S2: Layout — "Me gusta, implementa" on artboard `05-tablero-dos-columnas.html`. The page follows that artboard, mapped to project components and tokens.
- S3: Calendar periods — "Son calendario, una sola pagina, luego arreglamos la de encargado". Owner presets are Hoy, Semana (Monday to today), Mes (the 1st to today) and Personalizado; default Semana. The comparison is the same stretch of the previous week or month. Manager presets (today / 7 / 30 / custom) keep their behavior.
- S4: PDF — "tambien una opcion para descargar reportes en pdf del dia, semana y me[s]"; "Los reportes en pdf me gustaron mucho"; generation choice: "Archivo PDF directo (recomendado)". One menu "Descargar PDF" downloads a real `.pdf` file for the day, the week or the month, tables only, Letter size, with the content of the PDF artboards. Sections whose data does not exist in the services are left out, not invented.
- S5: Checks — `bun test` green; tsc, eslint, prettier clean on changed files; `bun run build` OK.

Decisions (parent): PDF with jsPDF + jspdf-autotable loaded on demand (new dependencies, chosen by the user). The menu also offers Ayer, Semana pasada and Mes pasado, because a weekly or monthly report is normally downloaded after the period closes (parent addition, flagged to the user). UI is written inline by the parent — "para hacer la UI no delegues, hazlo directamente tu".

## Tasks

- T1 [S3] inline — calendar presets `week` / `month`, optional `anchor`, preset-aware comparison range; owner search defaults to week. Risk: item 3 (shared period code used by manager and executive services). Status: pending. Commit: —
- T2 [S1,S2] inline — owner page rebuilt from artboard 05; unused owner components removed. Status: pending. Commit: —
- T3 [S4] inline — PDF report model + jsPDF renderer + download menu. Risk: item 5 (new dependencies). Status: pending. Commit: —
- T4 [S5] inline — full checks, design handoff, close. Status: pending. Commit: —

## Log

- L1 (user): "Esta es la vista de reportes, aparte de ser fea y horrible esta sobrecargada y havce mucho ruido visual ademas de no dejar claro que es que, necesito bastante menos y mas claridad de datos, tambien una opcion para descargar reportes en pdf del dia, semana y me [Image#2] [Image#3] [Image#4] Necesito que definamos bien que se tiene que mostrar y proponer un buen layout ademas de que cosas se deben incluir en los pdf."
- L2 (user): "Son calendario, una sola pagina, luego arreglamos la de encargado"
- L3 (user): "Los reportes en pdf me gustaron mucho pero lo que es el layout y diseno de la pagina de reportes absolutamente no [Image#5], para hacer la UI no delegues, hazlo directamente tu" → parent wrote artboard `05-tablero-dos-columnas.html`; `01-reportes-una-pagina.html` is the rejected alternative.
- L4 (user): "Me gusta, implementa" → chosen artboard: `design/reports-clarity/05-tablero-dos-columnas.html`; PDF artboards 02-04 are the content spec.
- L5 (user, choice): PDF generation = "Archivo PDF directo (recomendado)".
