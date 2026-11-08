# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Store customers (primary for `/tienda`):** authorized distributors of a milk and soft-drink wholesaler. A closed, hand-picked customer base; each account is created by the owner and handed over (there is no sign-up). They use the store both to reorder quickly what they already know they need and to browse the catalog for brands and presentations, often from a phone.
- **Staff (operations console):** the owner and one manager per warehouse who run purchases, stock, prices, orders, cash and credit across four warehouses.

## Product Purpose

Abasto runs a wholesale warehouse business that buys from suppliers (Alpura, Lala, Coca-Cola…) and sells to authorized distributors who pick their orders up. The store lets a distributor see the catalog, their price and whether there is stock in a chosen warehouse, build a cart and reserve it (apartado) for pickup. Success: a distributor reserves a correct order in minutes and the warehouse has it ready when they arrive.

## Positioning

Not an e-commerce checkout: a reservation channel for a closed set of distributors. Prices, stock and rules are per warehouse; the customer's own commercial conditions apply; payment always happens at the warehouse.

## Operating Context

- Distributors used to order by phone and pick up later; the store replaces the call.
- Each order is picked up at one warehouse; the customer chooses it. A reservation freezes the price, holds stock and expires after the owner-configured hours.
- Products come in presentations (piece, box of 12/24…); prices may differ per presentation and warehouse.
- Payment is cash or credit at the warehouse. No card, transfer or payment gateway.

## Capabilities and Constraints

- Public catalog: anyone sees products, list prices and availability labels (Disponible / Pocas / Agotado), never exact quantities.
- Reserving, cart pricing with the customer's conditions, "Mis pedidos" and cancelling a Reservado order require a customer session.
- Order statuses: Reservado → Preparado → Recogido, or Cancelado / Vencido.
- UI copy is Spanish (es-MX); identifiers and code in English. Stack: TanStack Start, React 19, Tailwind 4.
- Product images are external URLs and may be missing or broken; every surface needs a graceful fallback.
- Store name is provisional and must live in one configurable place.

## Brand Commitments

- Store name: provisional and configurable; tone close and professional (trusted supplier talking to a regular customer).
- The store surface may have its own visual language; the staff console keeps its own.

## Evidence on Hand

- Real catalog of 73 Lala and Alpura products with external images (`src/db/seed/product-images.ts`).
- No testimonials, logos or marketing claims exist; do not invent them.

## Product Principles

1. Reordering must be fast: quantities adjustable without leaving the list.
2. Truth before persuasion: price, availability and pickup terms are always visible and never overstated.
3. Reservation, not payment: every step says the order is picked up and paid at the warehouse, and that it expires.
4. One warehouse at a time: the selected warehouse is always clear because it changes prices and stock.

## Accessibility & Inclusion

Phone-first use in shops and on the road: large touch targets, readable contrast in daylight, works on modest Android devices and slow connections.
