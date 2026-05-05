-- ══════════════════════════════════════════════════════════════
-- VIRGINIA OFICIAL — MEJORAS (ejecutar en SQL Editor)
-- Stock auto-decrease + Admin orders management
-- ══════════════════════════════════════════════════════════════

-- ═══ 1. CREAR PEDIDO + DESCONTAR STOCK ═══
CREATE OR REPLACE FUNCTION place_order(
  p_user_id BIGINT DEFAULT NULL,
  p_items JSONB DEFAULT '[]',
  p_total NUMERIC DEFAULT 0,
  p_customer_name TEXT DEFAULT '',
  p_customer_tel TEXT DEFAULT '',
  p_customer_addr TEXT DEFAULT '',
  p_customer_prov TEXT DEFAULT '',
  p_customer_city TEXT DEFAULT '',
  p_customer_zip TEXT DEFAULT '',
  p_customer_doc TEXT DEFAULT '',
  p_customer_email TEXT DEFAULT '',
  p_shipping_company TEXT DEFAULT '',
  p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item JSONB;
  order_id BIGINT;
BEGIN
  -- Decrease stock for each item
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    UPDATE products 
    SET stock = GREATEST(stock - (item->>'qty')::INT, 0),
        status = CASE WHEN stock - (item->>'qty')::INT <= 0 THEN 'agotado' ELSE status END
    WHERE id = (item->>'id')::BIGINT;
  END LOOP;
  
  -- Insert order
  INSERT INTO orders (user_id, items, total, status, customer_name, customer_tel, customer_addr, customer_prov, customer_city, customer_zip, customer_doc, customer_email, shipping_company, notes)
  VALUES (p_user_id, p_items, p_total, 'pendiente', p_customer_name, p_customer_tel, p_customer_addr, p_customer_prov, p_customer_city, p_customer_zip, p_customer_doc, p_customer_email, p_shipping_company, p_notes)
  RETURNING id INTO order_id;
  
  RETURN jsonb_build_object('ok', true, 'order_id', order_id);
END;
$$;

-- ═══ 2. ADMIN: CAMBIAR ESTADO DE PEDIDO ═══
CREATE OR REPLACE FUNCTION admin_update_order_status(p_admin_pass TEXT, p_order_id BIGINT, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE username='admin' AND password=p_admin_pass) THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;
  UPDATE orders SET status = p_status WHERE id = p_order_id;
  RETURN '{"ok":true}'::JSONB;
END;
$$;
