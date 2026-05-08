-- ============================================================
-- VIRGINIA OFICIAL | CHECKOUT + STOCK + PEDIDOS
-- Ejecutar despues de supabase-security.sql
-- ============================================================

DROP FUNCTION IF EXISTS place_order(BIGINT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS place_order(TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION place_order(
  p_session_token TEXT DEFAULT NULL,
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
AS $function$
DECLARE
  v_user_id BIGINT;
  v_order_id BIGINT;
  v_item JSONB;
  v_product RECORD;
  v_qty INT;
  v_found_products INT;
  v_requested_products INT;
BEGIN
  IF p_session_token IS NOT NULL AND LENGTH(TRIM(p_session_token)) > 0 THEN
    v_user_id := session_user_id(p_session_token, FALSE);
  ELSE
    v_user_id := NULL;
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN '{"ok":false,"reason":"empty_cart"}'::JSONB;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((v_item ->> 'qty')::INT, 0);

    IF v_qty <= 0 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'invalid_quantity',
        'product_name', COALESCE(v_item ->> 'name', 'Producto')
      );
    END IF;
  END LOOP;

  SELECT COUNT(DISTINCT (value ->> 'id')::BIGINT)
  INTO v_requested_products
  FROM jsonb_array_elements(p_items);

  SELECT COUNT(*)
  INTO v_found_products
  FROM (
    SELECT p.id
    FROM products p
    JOIN (
      SELECT (value ->> 'id')::BIGINT AS product_id
      FROM jsonb_array_elements(p_items)
      GROUP BY 1
    ) requested ON requested.product_id = p.id
  ) locked_products;

  IF v_found_products <> v_requested_products THEN
    RETURN '{"ok":false,"reason":"product_not_found"}'::JSONB;
  END IF;

  FOR v_product IN
    SELECT p.id, p.name, p.stock, requested.requested_qty
    FROM products p
    JOIN (
      SELECT
        (value ->> 'id')::BIGINT AS product_id,
        SUM((value ->> 'qty')::INT) AS requested_qty
      FROM jsonb_array_elements(p_items)
      GROUP BY 1
    ) requested ON requested.product_id = p.id
    FOR UPDATE OF p
  LOOP
    IF v_product.requested_qty <= 0 THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'invalid_quantity',
        'product_name', v_product.name
      );
    END IF;

    IF v_product.stock < v_product.requested_qty THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'insufficient_stock',
        'product_name', v_product.name,
        'available_stock', v_product.stock
      );
    END IF;
  END LOOP;

  UPDATE products p
  SET stock = p.stock - requested.requested_qty,
      status = CASE WHEN p.stock - requested.requested_qty <= 0 THEN 'agotado' ELSE p.status END
  FROM (
    SELECT
      (value ->> 'id')::BIGINT AS product_id,
      SUM((value ->> 'qty')::INT) AS requested_qty
    FROM jsonb_array_elements(p_items)
    GROUP BY 1
  ) requested
  WHERE p.id = requested.product_id;

  INSERT INTO orders (
    user_id,
    items,
    total,
    status,
    customer_name,
    customer_tel,
    customer_addr,
    customer_prov,
    customer_city,
    customer_zip,
    customer_doc,
    customer_email,
    shipping_company,
    notes
  )
  VALUES (
    v_user_id,
    p_items,
    p_total,
    'pendiente',
    p_customer_name,
    p_customer_tel,
    p_customer_addr,
    p_customer_prov,
    p_customer_city,
    p_customer_zip,
    p_customer_doc,
    p_customer_email,
    p_shipping_company,
    p_notes
  )
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object('ok', true, 'order_id', v_order_id);
END;
$function$;

DROP FUNCTION IF EXISTS admin_update_order_status(TEXT, BIGINT, TEXT);
CREATE OR REPLACE FUNCTION admin_update_order_status(
  p_session_token TEXT,
  p_order_id BIGINT,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id BIGINT;
BEGIN
  v_admin_id := session_user_id(p_session_token, TRUE);
  IF v_admin_id IS NULL THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;

  UPDATE orders
  SET status = p_status
  WHERE id = p_order_id;

  RETURN '{"ok":true}'::JSONB;
END;
$function$;

GRANT EXECUTE ON FUNCTION place_order(TEXT, JSONB, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_order_status(TEXT, BIGINT, TEXT) TO anon, authenticated;
