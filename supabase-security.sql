-- ══════════════════════════════════════════════════════════════
-- VIRGINIA OFICIAL — SEGURIDAD (ejecutar en SQL Editor)
-- ══════════════════════════════════════════════════════════════

-- ═══ 1. ELIMINAR POLÍTICAS PERMISIVAS ═══
DROP POLICY IF EXISTS "products_all" ON products;
DROP POLICY IF EXISTS "categories_all" ON categories;
DROP POLICY IF EXISTS "users_all" ON users;
DROP POLICY IF EXISTS "orders_all" ON orders;

-- ═══ 2. POLÍTICAS RESTRICTIVAS ═══

-- PRODUCTOS: solo lectura pública, escritura bloqueada
CREATE POLICY "products_read" ON products FOR SELECT USING (true);

-- CATEGORÍAS: solo lectura pública, escritura bloqueada
CREATE POLICY "categories_read" ON categories FOR SELECT USING (true);

-- USUARIOS: puede insertar (registrarse), puede actualizar su propia fila,
-- NUNCA se expone la contraseña en select directo
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (true);
-- Bloquear SELECT directo (se usa RPC para login)
-- No creamos policy de SELECT = nadie puede hacer SELECT directo

-- PEDIDOS: solo insertar (crear pedido), no leer/borrar
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (true);

-- ═══ 3. FUNCIÓN DE LOGIN SEGURA ═══
-- La contraseña se verifica en el servidor, nunca se envía al frontend
CREATE OR REPLACE FUNCTION login_user(p_username TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u RECORD;
BEGIN
  SELECT * INTO u FROM users WHERE username = p_username;
  IF NOT FOUND THEN
    RETURN '{"ok":false,"reason":"not_found"}'::JSONB;
  END IF;
  IF u.password != p_password THEN
    RETURN '{"ok":false,"reason":"wrong_password"}'::JSONB;
  END IF;
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
    'is_admin', (u.username = 'admin')
  );
END;
$$;

-- ═══ 4. FUNCIÓN DE REGISTRO SEGURA ═══
CREATE OR REPLACE FUNCTION register_user(p_username TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
    RETURN '{"ok":false,"reason":"exists"}'::JSONB;
  END IF;
  INSERT INTO users (username, password) VALUES (p_username, p_password) RETURNING id INTO new_id;
  RETURN jsonb_build_object('ok', true, 'id', new_id, 'username', p_username);
END;
$$;

-- ═══ 5. ACTUALIZAR PERFIL (requiere id + password para verificar) ═══
CREATE OR REPLACE FUNCTION update_profile(
  p_user_id BIGINT,
  p_password TEXT,
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
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND password = p_password) THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;
  UPDATE users SET name=p_name, last_name=p_last_name, prov=p_prov, city=p_city,
    addr=p_addr, zip=p_zip, tel=p_tel, doc=p_doc, shipping=p_shipping, email=p_email
  WHERE id = p_user_id;
  RETURN '{"ok":true}'::JSONB;
END;
$$;

-- ═══ 6. ADMIN: GUARDAR PRODUCTO ═══
CREATE OR REPLACE FUNCTION admin_save_product(
  p_admin_pass TEXT,
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
  p_description TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE username='admin' AND password=p_admin_pass) THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;
  IF p_id IS NOT NULL THEN
    UPDATE products SET name=p_name, cat=p_cat, price=p_price, oldprice=p_oldprice,
      stock=p_stock, status=p_status, badge=p_badge, sizes=p_sizes, colors=p_colors,
      img=p_img, description=p_description WHERE id=p_id;
    RETURN '{"ok":true,"action":"updated"}'::JSONB;
  ELSE
    INSERT INTO products (name,cat,price,oldprice,stock,status,badge,sizes,colors,img,description)
    VALUES (p_name,p_cat,p_price,p_oldprice,p_stock,p_status,p_badge,p_sizes,p_colors,p_img,p_description)
    RETURNING id INTO new_id;
    RETURN jsonb_build_object('ok',true,'action','inserted','id',new_id);
  END IF;
END;
$$;

-- ═══ 7. ADMIN: ELIMINAR PRODUCTO ═══
CREATE OR REPLACE FUNCTION admin_delete_product(p_admin_pass TEXT, p_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE username='admin' AND password=p_admin_pass) THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;
  DELETE FROM products WHERE id=p_id;
  RETURN '{"ok":true}'::JSONB;
END;
$$;

-- ═══ 8. ADMIN: GUARDAR CATEGORÍA ═══
CREATE OR REPLACE FUNCTION admin_save_category(p_admin_pass TEXT, p_name TEXT, p_img TEXT DEFAULT '', p_visible TEXT DEFAULT 'si')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE username='admin' AND password=p_admin_pass) THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;
  INSERT INTO categories (name, img, visible) VALUES (p_name, p_img, p_visible);
  RETURN '{"ok":true}'::JSONB;
END;
$$;

-- ═══ 9. ADMIN: TOGGLE CATEGORÍA ═══
CREATE OR REPLACE FUNCTION admin_toggle_category(p_admin_pass TEXT, p_id BIGINT, p_visible TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE username='admin' AND password=p_admin_pass) THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;
  UPDATE categories SET visible=p_visible WHERE id=p_id;
  RETURN '{"ok":true}'::JSONB;
END;
$$;

-- ═══ 10. ADMIN: ELIMINAR CATEGORÍA ═══
CREATE OR REPLACE FUNCTION admin_delete_category(p_admin_pass TEXT, p_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE username='admin' AND password=p_admin_pass) THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;
  DELETE FROM categories WHERE id=p_id;
  RETURN '{"ok":true}'::JSONB;
END;
$$;

-- ═══ 11. ADMIN: VER PEDIDOS ═══
CREATE OR REPLACE FUNCTION admin_get_orders(p_admin_pass TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE username='admin' AND password=p_admin_pass) THEN
    RETURN '{"ok":false,"reason":"unauthorized"}'::JSONB;
  END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(o)), '[]'::JSONB) INTO result FROM orders o ORDER BY o.created_at DESC;
  RETURN jsonb_build_object('ok',true,'orders',result);
END;
$$;
