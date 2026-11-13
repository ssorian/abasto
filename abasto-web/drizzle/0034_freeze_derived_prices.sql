-- Prices no longer derive from the default presentation. Before that rule
-- goes away, every active presentation that was selling at a derived price
-- gets that same price as its own (default price × factor / default factor,
-- rounded half up to the cent), credited to whoever set the default price.
-- Presentations that already have an own price are left alone, so running
-- this again inserts nothing.
WITH current_prices AS (
  SELECT DISTINCT ON (warehouse_id, presentation_id)
    warehouse_id, presentation_id, price_cents, created_by
  FROM presentation_prices
  WHERE effective_from <= clock_timestamp()
  ORDER BY warehouse_id, presentation_id, effective_from DESC, created_at DESC
),
frozen AS (
  SELECT
    base_price.warehouse_id,
    item.id AS presentation_id,
    (2::bigint * base_price.price_cents * item.factor + base.factor)
      / (2::bigint * base.factor) AS price_cents,
    base_price.created_by
  FROM presentations item
  JOIN presentations base
    ON base.product_id = item.product_id AND base.is_default
  JOIN current_prices base_price ON base_price.presentation_id = base.id
  WHERE item.active
    AND item.id <> base.id
    AND NOT EXISTS (
      SELECT 1 FROM current_prices own
      WHERE own.presentation_id = item.id
        AND own.warehouse_id = base_price.warehouse_id
    )
)
INSERT INTO presentation_prices
  (warehouse_id, presentation_id, price_cents, created_by, reason, source)
SELECT
  warehouse_id, presentation_id, price_cents::integer, created_by,
  'Precio fijado al dejar de derivar precios', 'manual'
FROM frozen
WHERE price_cents > 0;
