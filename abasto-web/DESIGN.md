---
name: Rack-Bay Labels (customer store)
description: The /tienda store reads like the rack an order is picked from: label strips, a dock plate, a pick list.
colors:
  concrete: "#e9e6df"
  concrete-deep: "#dad6cb"
  label-stock: "#fbfaf6"
  graphite: "#22252b"
  graphite-soft: "#3a3e46"
  muted-steel: "#5a5d65"
  signal-yellow: "#f4c20d"
  beam-orange: "#e8531d"
  beam-text: "#b23a0c"
  upright-cobalt: "#1f4aa8"
  upright-cobalt-deep: "#173a86"
  rack-rule: "#b9b4a6"
typography:
  stencil:
    fontFamily: "'Arial Narrow', 'Nimbus Sans Narrow', 'Roboto Condensed', 'Liberation Sans Narrow', 'Avenir Next Condensed', 'sans-serif-condensed', 'Helvetica Neue', Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.04em"
  price:
    fontFamily: "'Arial Narrow', 'Nimbus Sans Narrow', 'Roboto Condensed', Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
    fontFeature: "tabular-nums lining-nums"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Arial Narrow', 'Nimbus Sans Narrow', 'Roboto Condensed', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  plate: "2px"
spacing:
  cell: "8px"
  strip-x: "10px"
  gutter: "16px"
components:
  button-signal:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.plate}"
    padding: "0 18px"
    height: "48px"
  button-signal-pressed:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.signal-yellow}"
  button-outline:
    backgroundColor: "{colors.label-stock}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.plate}"
    height: "48px"
  button-danger:
    backgroundColor: "{colors.label-stock}"
    textColor: "{colors.beam-text}"
    rounded: "{rounded.plate}"
    height: "48px"
  dock-plate:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.plate}"
    padding: "10px"
  label-block:
    backgroundColor: "{colors.label-stock}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.plate}"
  availability-ok:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.label-stock}"
    height: "22px"
  stepper:
    backgroundColor: "#ffffff"
    textColor: "{colors.graphite}"
    rounded: "{rounded.plate}"
    height: "44px"
  field:
    backgroundColor: "#ffffff"
    textColor: "{colors.graphite}"
    rounded: "{rounded.plate}"
    height: "48px"
---

# Design System: Rack-Bay Labels

**Scope: this file covers the customer store surface only (`/tienda`, `/tienda/pedidos`, `/tienda/entrar`, the cart sheet and the cancel dialog). The staff console keeps its own raspberry and plum look and is not described here.**

## Overview

**Creative North Star: "The Rack Label"**

The store looks like the rack the order is picked from. Every presentation is a label strip stuck on a beam; the pickup warehouse is a yellow dock plate; the cart is a pick list ("hoja de surtido") that is always in view; a reservation is a hang tag with a code and a deadline. It was chosen from the warehouse world the customers already work in, over the photo-card e-commerce grid and the dense admin table.

Light, daylight-readable concrete ground with graphite for structure and one voice, signal yellow, for the thing to touch next. Density is high on the phone (strips about 70px tall) and relaxed on desktop (two columns of strips beside a permanent pick list). Corners are square, rules are hard, nothing floats.

**Key Characteristics:**

- Label stock on concrete; graphite frames; yellow only for the next action, the picked state and the pickup plate.
- Condensed stencilled caps for names, prices and actions; plain system sans for sentences.
- The availability word is always printed; only the plate around it changes.
- Quantity is drawn as length: a bar of whole cells grows under the stepper.

## Colors

Restrained with one voice. Neutrals carry the page, signal yellow is the single accent, cobalt and beam orange are structural rails.

### Primary

- **Signal Yellow** (#f4c20d): the action plate (Apartar, Ver hoja), the dock plate, the picked quantity cell, the pressed tab.

### Secondary

- **Upright Cobalt** (#1f4aa8, deep #173a86): the brand rail and phone brand tabs only.
- **Beam Orange** (#e8531d): the extent bar of the selected tab. Large marks only. As text on label stock use **Beam Text** (#b23a0c, 5:1) for errors and cancel.

### Neutral

- **Concrete** (#e9e6df): page ground. **Concrete Deep** (#dad6cb): hover and empty mats.
- **Label Stock** (#fbfaf6): every strip, panel, plate body. **Graphite** (#22252b): top bar, text, frames. **Graphite Soft** (#3a3e46): hover on graphite.
- **Muted Steel** (#5a5d65): secondary text (5:1 on concrete). **Rack Rule** (#b9b4a6): hairlines between strips.

### Named Rules

**The One Voice Rule.** Yellow marks only what the customer should touch or what is already theirs (picked, pickup). If everything is yellow, nothing is.
**The Hazard Hatch Rule.** Diagonal graphite/yellow hatching exists only on the "Pocas" tag. It never decorates anything else.

## Typography

**Display / label font:** system condensed stack (Arial Narrow, Nimbus Sans Narrow, Roboto Condensed, sans-serif-condensed, Helvetica Neue, Arial); no webfont ships.
**Body font:** system-ui stack.

**Character:** stencilled rack alphanumerics for anything that names or counts; calm system text for explanations. Layouts tolerate the Arial fallback width (verified at 390px).

### Hierarchy

- **Page title** (700, 32-40px, 1, caps): "Mis pedidos", reservation code.
- **Stencil name** (700, 18px, 1.15, caps, +0.04em): product names, sheet titles, buttons (17px).
- **Price** (700, 19px, tabular lining numerals): every price registers to one numeric column.
- **Body** (400, 15px, 1.5; 13-14px for help): sentences, kept under 65ch.
- **Label** (700, 14px, +0.06em, caps): field labels, tags (12px), counts.

### Named Rules

**The Word Always Printed Rule.** Availability and order status are words first, plates second; colour never carries meaning alone.

## Layout

Phone-first, one column. Graphite bar (two rows on the phone: name and session, then Catálogo / Mis pedidos), dock plate with the pickup warehouse, brand tabs, search, category toggles, then label blocks, with the pick-list bar pinned at the bottom. From 1024px: 1360px max container; a 208px cobalt brand rail on the left, two columns of blocks (from 1280px), and a 352px sticky pick-list panel on the right. Spacing follows an 8px cell (strip padding 8px 10px, gutters 16px, block gaps 12px). Grid tracks use `minmax(0, 1fr)` so scrolling rows never widen the page.

## Elevation & Depth

Flat by contract. Depth is a 2px graphite frame and 1px rack rules; there are no shadows or blur on the store. The only layering is the sheet over a dimmed page (flat 45% graphite overlay, store scope overrides the shared blur).

### Named Rules

**The Flat-Plate Rule.** Surfaces are steel and paper, not floating cards: frame them with graphite, never shade them.

## Shapes

Square plates with a 2px radius, 2px graphite borders, 1px rules inside. Circles appear only as screws on the login door plate and the punched hole of the reservation tag. The tab extent bar and the quantity cells are the system's only data-driven shapes.

## Components

### Buttons

- **Signal (primary):** yellow plate, graphite 2px frame, stencil caps 17px, 48px high; hover lightens, pressed inverts to graphite with yellow text; disabled goes concrete-deep with grey text.
- **Outline / Danger / Quiet:** label-stock plate; danger uses beam text and frame; quiet is underlined text with a yellow underline.

### Pick-face stepper

Minus, typed quantity, plus in one 2px frame (44px high); the quantity cell turns yellow once above zero; under it a 12-cell bar fills graphite per unit (twelfth cell yellow past 12). Collapsed to a single yellow plus plate at zero. Steps change in 120ms hard steps, static under reduced motion. The total beside it ticks the same way.

### Label block and strip

A product is one framed block: photo mat (56px, white, 2px frame, dashed monogram fallback when the image is missing or broken), name and brand, then one strip per presentation: name and availability tag, price, stepper. Picked strips tint pale yellow; sold-out strips strike the name and price, dim, and print "Sin existencias".

### Availability tag

Disponible: solid graphite. Pocas: hazard-hatch frame around a label-stock chip. Agotado: dashed outline, muted.

### Brand tabs

Tabs with a count; a 4px extent bar inside a visible track, inset 12px from the tab edge and filled to the brand's share of the whole catalog (the phone tab width is proportional to the largest brand). The phone strip fades at the right edge to show more tabs; focus is drawn inside the tab. Selected: yellow plate and beam-orange bar. Rail version on cobalt from 1024px.

### Dock plate, pick list, reservation tag, status strip, door plate

Yellow dock plate holds the native warehouse select. Pick list is a graphite-headed panel (desktop) or pinned bar (phone) with list-price total and the reservation sentence. Reservation tag: framed hang tag with punched hole, code at 40px, yellow deadline plate. Status strip: three bars (Reservado, Preparado, Recogido); Cancelado and Vencido strike the strip and print the word. Door plate: yellow header band with the heading, screws in the corners.

### Inputs

White, 2px graphite frame, 48px high, 16px text; focus is a 3px cobalt outline (yellow on graphite).

## Do's and Don'ts

### Do:

- **Do** print the availability word and the order status every time.
- **Do** keep prices in tabular condensed numerals, right-aligned in one column.
- **Do** frame with 2px graphite and 1px rules; keep radii at 2px.
- **Do** keep the pickup warehouse and the "reserve, not pay" sentence visible on every ordering step.

### Don't:

- **Don't** use hatching anywhere except the Pocas tag.
- **Don't** add shadows, gradients, glass or photo-card grids to the store.
- **Don't** present catalog index letters as physical rack locations.
- **Don't** carry this look into the staff console.

## Not canonized (build defects)

The display voice is a system condensed stack, which the craft floor discourages for own-world pages; it stays only because the task forbids new dependencies. The label above the warehouse select ("Recoges tu pedido en") reads as a small eyebrow; it is the control's real label and should be revisited if a heading replaces it.
