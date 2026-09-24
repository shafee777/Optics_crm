-- Preserve existing quantities; negative legacy balances must be reconciled by the owner.
-- NOT VALID avoids rewriting old stock while enforcing the rule on new writes.
ALTER TABLE products ADD CONSTRAINT products_stock_nonnegative CHECK (stock_quantity >= 0) NOT VALID;
CREATE TABLE inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity_change INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX inventory_movements_product ON inventory_movements(store_id, product_id, id DESC);
INSERT INTO inventory_movements(store_id, product_id, quantity_change, balance_after, reason)
SELECT store_id, id, stock_quantity, stock_quantity, 'OPENING_BALANCE' FROM products;
CREATE FUNCTION record_inventory_movement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE delta INTEGER;
BEGIN
  delta := CASE WHEN TG_OP = 'INSERT' THEN NEW.stock_quantity ELSE NEW.stock_quantity - OLD.stock_quantity END;
  IF delta <> 0 OR TG_OP = 'INSERT' THEN
    INSERT INTO inventory_movements(store_id, product_id, quantity_change, balance_after, reason)
    VALUES (NEW.store_id, NEW.id, delta, NEW.stock_quantity,
      COALESCE(NULLIF(current_setting('app.stock_reason', true), ''), CASE WHEN TG_OP = 'INSERT' THEN 'INITIAL_STOCK' ELSE 'STOCK_ADJUSTMENT' END));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER products_inventory_history AFTER INSERT OR UPDATE OF stock_quantity ON products
FOR EACH ROW EXECUTE FUNCTION record_inventory_movement();

-- Distinguish new discount allocation from historical invoices without rewriting them.
ALTER TABLE orders ADD COLUMN discount_allocated BOOLEAN NOT NULL DEFAULT false;
