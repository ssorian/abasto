---
name: Soft Rack-Bay (customer store)
description: The /tienda store keeps the rack-bay layout (label strips, pick list) in the company palette: raspberry, plum and warm cream, soft radii, light borders.
colors:
  cream: "#fff8f0"
  cream-deep: "#f6efe6"
  card: "#ffffff"
  ink: "#2a1d33"
  ink-soft: "#503f45"
  muted: "#6f6366"
  raspberry: "#c81d4e"
  raspberry-hover: "#a8173f"
  raspberry-tint: "#f8e8ee"
  plum: "#5b2a86"
  plum-ink: "#4a2670"
  plum-tint: "#f1eaf6"
  line: "#ede3d6"
  line-strong: "#e4d8ca"
  control: "#9c8f92"
  danger: "#a3173f"
  danger-tint: "#fbeae7"
  ok: "#2f6b5a"
  ok-tint: "#e9f4ef"
  low: "#7d5a14"
  low-tint: "#fff0d1"
typography:
  title:
    fontFamily: "Inter, 'Segoe UI', Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
  name:
    fontFamily: "Inter, 'Segoe UI', Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.35
  price:
    fontFamily: "Inter, 'Segoe UI', Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1
    fontFeature: "tabular-nums lining-nums"
  body:
    fontFamily: "Inter, 'Segoe UI', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, 'Segoe UI', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 600
rounded:
  control: "10px"
  panel: "16px"
  pill: "999px"
spacing:
  cell: "8px"
  strip-x: "12px"
  gutter: "16px"
components:
  button-primary:
    backgroundColor: "{colors.raspberry}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.raspberry-hover}"
  button-outline:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.control}"
    height: "48px"
  button-danger:
    backgroundColor: "{colors.card}"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    height: "48px"
  warehouse-plate:
    backgroundColor: "{colors.plum-tint}"
    textColor: "{colors.ink}"
    rounded: "14px"
    padding: "10px"
  label-block:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  availability-ok:
    backgroundColor: "{colors.ok-tint}"
    textColor: "{colors.ok}"
    rounded: "{rounded.pill}"
    height: "24px"
  availability-low:
    backgroundColor: "{colors.low-tint}"
    textColor: "{colors.low}"
    rounded: "{rounded.pill}"
    height: "24px"
  availability-out:
    backgroundColor: "{colors.cream-deep}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    height: "24px"
  stepper:
    backgroundColor: "#ffffff"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.control}"
    height: "44px"
  field:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
---

# Design System: Soft Rack-Bay

**Scope: this file covers the customer store surface only (`/tienda`, `/tienda/pedidos`, `/tienda/entrar`, the cart sheet and the cancel dialog). The store reads the company palette from the staff console tokens in `src/styles.css` but does not change them or the console look.**

## Overview

**Creative North Star: "The Rack Label, softened"**

The layout is still the rack the order is picked from: every presentation is a strip inside a product block, the pickup warehouse sits on a plate at the top, the cart is a pick list ("hoja de surtido") that is always in view, a reservation is a tag with a code and a deadline. The look is the company's: raspberry for the next action, plum for structure and headings, warm cream for the ground, white blocks with light borders and rounded corners. It is a little lighter and friendlier than the staff console but clearly the same company.

Density is high on the phone (strips about 70px tall) and relaxed on desktop (two columns of blocks beside a permanent pick list).

**Key Characteristics:**

- White blocks on cream, 1px warm borders, 10-16px radii. Elevation is declared once: a border on blocks and panels, a soft shadow only on things that float (pinned pick-list bar, login card).
- Raspberry for the one thing to touch next (add, apply, reserve) and for picked quantities; plum for headings, tabs, selection and focus.
- Semibold sentence case in the console font stack; no uppercase stencil.
- The availability word is always printed inside a tinted pill.
- Quantity is still drawn as length: a bar of rounded cells grows under the stepper.

## Colors

Restrained. Cream and white carry the page, plum gives the headings and rails, raspberry is the single action colour. All values come from the console tokens (`--background`, `--primary`, `--color-ink-heading`, `--border`, `--color-status-*`) with the status tones darkened for text contrast on their tints.

### Primary

- **Raspberry** (#c81d4e, hover #a8173f): primary buttons, the add plate, picked quantity cells, the selected tab's extent bar, current nav underline. **Raspberry Tint** (#f8e8ee): picked strips, picked quantity cell, the pickup deadline plate.

### Secondary

- **Plum** (#5b2a86) and **Plum Ink** (#4a2670): headings, nav, quiet buttons, brand tab text and extent tracks, focus ring. **Plum Tint** (#f1eaf6): the warehouse plate, the brand rail, pick-list header, selected category chip.

### Neutral

- **Cream** (#fff8f0): page ground. **Cream Deep** (#f6efe6): hover, disabled, Agotado pill.
- **Card** (#ffffff): blocks, panels, header, sheet footer. **Ink** (#2a1d33): text. **Ink Soft** (#503f45): outline button text. **Muted** (#6f6366): secondary text (5.6:1 on cream).
- **Line** (#ede3d6) and **Line Strong** (#e4d8ca): borders and dividers. **Control** (#9c8f92): input and stepper borders (3:1).

### Status

- **Ok** (#2f6b5a on #e9f4ef) Disponible; **Low** (#7d5a14 on #fff0d1) Pocas; **Muted on Cream Deep** Agotado; **Danger** (#a3173f on #fbeae7) errors and cancel.

### Named Rules

**The One Action Rule.** Raspberry marks only what the customer should touch or what is already theirs (picked). If everything is raspberry, nothing is.
**The Word Always Printed Rule.** Availability and order status are words first, tints second; colour never carries meaning alone.

## Typography

**Font:** the console stack (Inter, Segoe UI, Arial, sans-serif); no webfont ships. Display and body are the same family; hierarchy comes from weight and size.

### Hierarchy

- **Page title** (700, 28px, 1.2): "Mis pedidos", sheet and login headings (22-26px).
- **Name** (650, 16px, 1.35): product names, empty-state titles (18px), dialog titles (18px).
- **Price** (650, 17px, tabular lining numerals): one numeric column per strip; totals 22-28px; reservation code 36px.
- **Body** (400, 15px, 1.5; 13-14px for help): sentences, kept under 65ch.
- **Label** (600, 14px): field labels, counts, pills (12.5px), tab text (15px).

## Layout

Unchanged from the rack-bay layout. Phone-first, one column: header (name and session, then Catálogo / Mis pedidos), warehouse plate, brand tabs, search, category chips, product blocks, pinned pick-list bar. From 1024px: 1360px max container; 208px brand rail on the left, two columns of blocks (from 1280px), 352px sticky pick-list panel on the right. Spacing follows an 8px cell (strip padding 8px 12px, gutters 16px, block gaps 12px). Grid tracks use `minmax(0, 1fr)`.

## Elevation & Depth

Border or shadow, never both. Blocks, panels, the sheet edge and the dialog use a 1px Line border. The pinned phone bar and the login card float with one soft shadow (`0 -6px 20px` / `0 8px 28px`, ink at 9-10%). The sheet and dialog overlay is a plain 40% plum-ink dim (the shared blur is dropped in store scope).

## Shapes

Controls (buttons, fields, stepper, tabs, mat) use 10px, product blocks and panels 16px, the login card 20px; chips and availability pills are fully round. Cells of the quantity bar and the tab extent bar have 2-3px rounding.

## Components

### Buttons

- **Primary:** raspberry, white 15px semibold label, 48px high, 10px radius, console-style faint shadow that deepens on hover (hover #a8173f). Disabled goes Cream Deep with muted text.
- **Outline / Danger / Quiet:** white with Line Strong border; danger uses Danger text and a 35% Danger border; quiet is plum text that tints on hover.

### Stepper

Minus, typed quantity, plus in one 1px Control border (44px high, 10px radius; the desktop pick list uses a compact 36px variant without the bar); the quantity cell takes Raspberry Tint with raspberry text once above zero; under it (default size) a 12-cell bar of rounded cells fills raspberry per unit (twelfth cell plum past 12). Collapsed to a single raspberry plus plate at zero. Changes ease in 160ms (exponential ease-out), static under reduced motion; the total fades in over 200ms the same way.

### Product block and strip

One white block per product: photo mat (56px, white, 12px radius, plum-tint monogram when the image is missing or broken), name and brand, then one strip per presentation: name and availability pill, price, stepper. Picked strips take a faint raspberry tint; sold-out strips go muted, keep the "Agotado" pill as the only statement of the fact and leave the control column empty at the same 140px width so prices stay aligned.

### Availability pill

Disponible: green tint with a dot. Pocas: amber tint with a dot. Agotado: Cream Deep, muted text, hollow dot. The word is always printed.

### Brand tabs

Rounded tabs with a count; a 4px rounded extent bar inside a visible track, filled to the brand's share of the whole catalog (phone tab width proportional to the largest brand). The rail is a plum-tint rounded panel (phone: a strip with a right fade to show more tabs); selected tab is a white card with a raspberry bar; focus is drawn inside the tab.

### Warehouse plate, pick list, reservation tag, status strip, login card

The warehouse plate is plum tint with the native select; from 640px it is one compact row (the real label, the select, the helper sentence; 8px vertical padding, 44px select), stacked on the phone. The desktop pick list is a white panel with a plum-tint header that is as tall as its content (sticky, capped to the viewport; the lines scroll inside while the total and the reservation sentence stay visible) and picked lines use the compact 36px stepper with no cell bar; on the phone it is a pinned white bar with a soft top shadow that opens the cart sheet (44px touch targets), list-price total and the reservation sentence. Orders (Mis pedidos) are one left-aligned column, 760px at most, of wide order tags: code and warehouse on the left with the status strip beside them from 768px, ruled lines, then the deadline ("Recoge antes de" for Reservado and Preparado, "Venció el" for Vencido, omitted for Recogido and Cancelado). Order codes print as a plain token ("PED-5D6635E3", no tabular numerals or tracking), exactly like the console. The reservation tag is a bordered card with the code at 36px and a raspberry-tint deadline plate. The status strip is three rounded bars (Reservado, Preparado, Recogido: done plum, current raspberry); Cancelado and Vencido grey the strip, strike the labels and print the word. The login card is a floating white card with a plum-tint heading band.

### Inputs

White, 1px Control border, 10px radius, 48px high, 16px text; focus is a 3px plum outline with a 2px offset.

## Do's and Don'ts

### Do:

- **Do** print the availability word and the order status every time.
- **Do** keep prices in tabular numerals, right-aligned in one column.
- **Do** build colours from the console tokens; add store names for them in `store.css` rather than new hexes.
- **Do** keep the pickup warehouse and the "reserve, not pay" sentence visible on every ordering step.

### Don't:

- **Don't** reintroduce hard plates: 2px dark borders, hatching, uppercase stencil, stepped motion.
- **Don't** stack a border under a wide shadow, or add gradients or glass.
- **Don't** present catalog index letters as physical rack locations.
- **Don't** change global tokens or carry store-only classes into the staff console.

## Not canonized (build defects)

Raspberry as a large fill covers the add plates and the primary button on every strip; if the catalog feels loud with many rows, the add plate could drop to a tinted outline. The label above the warehouse select ("Recoges tu pedido en") reads as a small eyebrow; it is the control's real label and should be revisited if a heading replaces it. `#fdf4f7` (picked strip tint) is the one literal not in the token list.
