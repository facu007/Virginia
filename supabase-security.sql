-- ============================================================
-- VIRGINIA OFICIAL | SEGURIDAD + SESIONES
-- Ejecutar despues de supabase-setup.sql
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;

DROP POLICY IF EXISTS products_all ON products;
DROP POLICY IF EXISTS categories_all ON categories;
DROP POLICY IF EXISTS users_all ON users;
DROP POLICY IF EXISTS orders_all ON orders;
DROP POLICY IF EXISTS products_read ON products;
DROP POLICY IF EXISTS categories_read ON categories;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS orders_insert ON orders;

CREATE POLICY products_read ON products
FOR SELECT
USING (true);

CREATE POLICY categories_read ON categories
FOR SELECT
USING (true);

DROP FUNCTION IF EXISTS session_user_id(TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION session_user_id(p_session_token TEXT, p_require_admin BOOLEAN DEFAULT FALSE)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id BIGINT;
BEGIN
  SELECT id
  INTO v_user_id
  FROM users
  WHERE session_token = p_session_token
    AND session_expires_at IS NOT NULL
    AND session_expires_at > NOW()
    AND (NOT p_require_admin OR username = 'admin')
  LIMIT 1;

  RETURN v_user_id;
END;
$function$;

DROP FUNCTION IF EXISTS login_user(TEXT, TEXT);
CREATE OR REPLACE FUNCTION login_user(p_username TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  u RECORD;
  v_token TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  SELECT *
  INTO u
  FROM users
  WHERE username = p_username;

  IF NOT FOUND THEN
    RETURN '{"ok":false,"reason":"not_found"}'::JSONB;
  END IF;

  IF u.password != p_password THEN
    RETURN '{"ok":false,"reason":"wrong_password"}'::JSONB;
  END IF;

  v_token := md5(random()::text || clock_timestamp()::text || u.id::text) ||
             md5(clock_timestamp()::text || random()::text || u.id::text);
  v_expires := NOW() + INTERVAL '30 days';

  UPDATE users
  SET session_token = v_token,
      session_expires_at = v_expires
  WHERE id = u.id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', u.id,
    'username', u.username,
    'name', u.name,
    'last_name', u.last_name,
    'prov', u.prov,
    'city', u.city,
    'addr', u.addr,
    'zip', u.zip,
    'tel', u.tel,
    'doc', u.doc,
    'shipping', u.shipping,
    'email', u.email,
    'is_admin', (u.username = 'admin'),
    'session_token', v_token,
    'session_expires_at', v_expires
  );
END;
$function$;

DROP FUNCTION IF EXISTS register_user(TEXT, TEXT);
CREATE OR REPLACE FUNCTION register_user(p_username TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id BIGINT;
  v_token TEXT;
  v_expires TIMESTAMPTZ;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
    RETURN '{"ok":false,"reason":"exists"}'::JSONB;
  END IF;

  INSERT INTO users (username, password)
  VALUES (p_username, p_password)
  RETURNING id INTO v_user_id;

  v_token := md5(random()::text || clock_timestamp()::text || v_user_id::text) ||
             md5(clock_timestamp()::text || random()::text || v_user_id::text);
  v_expires := NOW() + INTERVAL '30 days';

  UPDATE users
  SET session_token = v_token,
      session_expires_at = v_expires
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_user_id,
    'username', p_username,
    'session_token', v_token,
    'session_expires_at', v_expires
  );
END;
$function$;

DROP FUNCTION IF EXISTS update_profile(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS update_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION update_profile(
  p_session_token TEXT,
  p_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT '',
  p_prov TEXT DEFAULT '',
  p_city TEXT DEFAULT '',
  p_addr TEXT DEFAULT '',
  p_zip TEXT DEFAULT '',
  p_tel TEXT DEFAULT '',
  p_doc TEXT DEFAULT '',
  p_shipping TEXT DEFAULT '',
  p_email TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id BIGINT;
BEGIN
  v_user_id := session_user_id(p_session_token, FALSE);
  IF v_user_id IS NULL THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;

  UPDATE users
  SET name = p_name,
      last_name = p_last_name,
      prov = p_prov,
      city = p_city,
      addr = p_addr,
      zip = p_zip,
      tel = p_tel,
      doc = p_doc,
      shipping = p_shipping,
      email = p_email
  WHERE id = v_user_id;

  RETURN jsonb_build_object('ok', true, 'id', v_user_id);
END;
$function$;

DROP FUNCTION IF EXISTS admin_save_product(TEXT, BIGINT, TEXT, TEXT, NUMERIC, NUMERIC, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS admin_save_product(TEXT, BIGINT, TEXT, TEXT, NUMERIC, NUMERIC, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION admin_save_product(
  p_session_token TEXT,
  p_id BIGINT DEFAULT NULL,
  p_name TEXT DEFAULT '',
  p_cat TEXT DEFAULT '',
  p_price NUMERIC DEFAULT 0,
  p_oldprice NUMERIC DEFAULT 0,
  p_stock INT DEFAULT 0,
  p_status TEXT DEFAULT 'activo',
  p_badge TEXT DEFAULT '',
  p_sizes TEXT DEFAULT '',
  p_colors TEXT DEFAULT '',
  p_img TEXT DEFAULT '',
  p_images TEXT DEFAULT '',
  p_description TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id BIGINT;
  v_new_id BIGINT;
BEGIN
  v_admin_id := session_user_id(p_session_token, TRUE);
  IF v_admin_id IS NULL THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;

  IF p_id IS NOT NULL THEN
    UPDATE products
    SET name = p_name,
        cat = p_cat,
        price = p_price,
        oldprice = p_oldprice,
        stock = p_stock,
        status = p_status,
        badge = p_badge,
        sizes = p_sizes,
        colors = p_colors,
        img = p_img,
        images = p_images,
        description = p_description
    WHERE id = p_id;

    RETURN '{"ok":true,"action":"updated"}'::JSONB;
  END IF;

  INSERT INTO products (name, cat, price, oldprice, stock, status, badge, sizes, colors, img, images, description)
  VALUES (p_name, p_cat, p_price, p_oldprice, p_stock, p_status, p_badge, p_sizes, p_colors, p_img, p_images, p_description)
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('ok', true, 'action', 'inserted', 'id', v_new_id);
END;
$function$;

DROP FUNCTION IF EXISTS admin_delete_product(TEXT, BIGINT);
CREATE OR REPLACE FUNCTION admin_delete_product(p_session_token TEXT, p_id BIGINT)
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

  DELETE FROM products WHERE id = p_id;
  RETURN '{"ok":true}'::JSONB;
END;
$function$;

DROP FUNCTION IF EXISTS admin_save_category(TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION admin_save_category(
  p_session_token TEXT,
  p_name TEXT,
  p_img TEXT DEFAULT '',
  p_visible TEXT DEFAULT 'si'
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

  INSERT INTO categories (name, img, visible)
  VALUES (p_name, p_img, p_visible);

  RETURN '{"ok":true}'::JSONB;
END;
$function$;

DROP FUNCTION IF EXISTS admin_toggle_category(TEXT, BIGINT, TEXT);
CREATE OR REPLACE FUNCTION admin_toggle_category(p_session_token TEXT, p_id BIGINT, p_visible TEXT)
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

  UPDATE categories
  SET visible = p_visible
  WHERE id = p_id;

  RETURN '{"ok":true}'::JSONB;
END;
$function$;

DROP FUNCTION IF EXISTS admin_delete_category(TEXT, BIGINT);
CREATE OR REPLACE FUNCTION admin_delete_category(p_session_token TEXT, p_id BIGINT)
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

  DELETE FROM categories WHERE id = p_id;
  RETURN '{"ok":true}'::JSONB;
END;
$function$;

DROP FUNCTION IF EXISTS admin_get_orders(TEXT);
CREATE OR REPLACE FUNCTION admin_get_orders(p_session_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_id BIGINT;
  v_orders JSONB;
BEGIN
  v_admin_id := session_user_id(p_session_token, TRUE);
  IF v_admin_id IS NULL THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;

  SELECT COALESCE(
    jsonb_agg(row_to_json(o) ORDER BY o.created_at DESC),
    '[]'::JSONB
  )
  INTO v_orders
  FROM orders o;

  RETURN jsonb_build_object('ok', true, 'orders', v_orders);
END;
$function$;

REVOKE EXECUTE ON FUNCTION session_user_id(TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION login_user(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION register_user(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_save_product(TEXT, BIGINT, TEXT, TEXT, NUMERIC, NUMERIC, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_product(TEXT, BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_save_category(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_toggle_category(TEXT, BIGINT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_category(TEXT, BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_orders(TEXT) TO anon, authenticated;
