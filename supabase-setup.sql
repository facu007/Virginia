-- ══════════════════════════════════════════════════════════════
-- VIRGINIA OFICIAL — SUPABASE SETUP
-- Ejecutar esto en: Supabase → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════

-- ═══ PRODUCTOS ═══
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  cat TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  oldprice NUMERIC DEFAULT 0,
  stock INT DEFAULT 0,
  status TEXT DEFAULT 'activo',
  badge TEXT DEFAULT '',
  sizes TEXT DEFAULT '',
  colors TEXT DEFAULT '',
  img TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ CATEGORÍAS ═══
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  img TEXT DEFAULT '',
  visible TEXT DEFAULT 'si',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ USUARIOS ═══
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  prov TEXT DEFAULT '',
  city TEXT DEFAULT '',
  addr TEXT DEFAULT '',
  zip TEXT DEFAULT '',
  tel TEXT DEFAULT '',
  doc TEXT DEFAULT '',
  shipping TEXT DEFAULT '',
  email TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ PEDIDOS ═══
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pendiente',
  customer_name TEXT DEFAULT '',
  customer_tel TEXT DEFAULT '',
  customer_addr TEXT DEFAULT '',
  customer_prov TEXT DEFAULT '',
  customer_city TEXT DEFAULT '',
  customer_zip TEXT DEFAULT '',
  customer_doc TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  shipping_company TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ RLS (Row Level Security) ═══
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Políticas: permitir lectura y escritura pública (anon key)
CREATE POLICY "products_all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "categories_all" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "users_all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "orders_all" ON orders FOR ALL USING (true) WITH CHECK (true);

-- ═══ DATOS INICIALES: PRODUCTOS ═══
INSERT INTO products (name, cat, price, oldprice, stock, status, badge, sizes, colors, description, img) VALUES
('Over M/L Capicua', 'Remeras', 7500, 0, 24, 'activo', 'new', 'S,M,L,XL', 'Negro,Blanco,Gris', 'Remera over con estampado capicúa. 100% algodón.', 'img/DSC06907-scaled.jpg'),
('Over Luna', 'Remeras', 5300, 0, 18, 'activo', 'hot', 'S,M,L', 'Negro,Bordó', 'Remera over con bordado luna.', 'img/DSC06925-scaled.jpg'),
('Frizado Nissmo', 'Buzos', 12000, 0, 9, 'activo', '', 'S,M,L,XL,XXL', 'Negro,Azul', 'Buzo frizado interior cálido.', 'img/IMG-20260408-WA0124-scaled.jpg'),
('Frizado Oni 2.0', 'Buzos', 13500, 15000, 14, 'activo', 'new', 'M,L,XL', 'Negro,Gris', 'Segunda versión del Oni.', 'img/inbound4468380888781350918-601x800.jpg'),
('Frizado Three 2.0', 'Buzos', 13500, 0, 6, 'activo', '', 'M,L,XL', 'Negro', 'Buzo frizado edición Three 2.0.', 'img/inbound4849073990589537579.jpg'),
('Buzo Combinado *7*', 'Buzos', 15000, 0, 0, 'agotado', '', 'S,M,L,XL', 'Negro/Gris', 'Buzo combinado bicolor.', 'img/virginia-125-1-scaled.jpg'),
('Buzo Over Seize', 'Buzos', 14000, 0, 11, 'activo', '', 'L,XL,XXL', 'Blanco,Negro', 'Buzo oversize.', 'img/WhatsApp-Image-2025-02-19-at-08.51.17.jpeg'),
('Frizado Honda 2.0', 'Buzos', 13500, 0, 3, 'activo', '', 'M,L,XL', 'Negro,Rojo', 'Frizado Honda Motorsport.', 'img/WhatsApp-Image-2025-04-03-at-12.23.29-1.jpeg');

-- ═══ DATOS INICIALES: CATEGORÍAS ═══
INSERT INTO categories (name, img, visible) VALUES
('Buzos', 'img/WhatsApp-Image-2025-06-30-at-10.16.49.jpeg', 'si'),
('Remeras', 'img/WhatsApp-Image-2026-04-03-at-14.45.59.jpeg', 'si'),
('Pantalones', 'img/WhatsApp-Image-2026-04-30-at-15.19.27-1.jpeg', 'si'),
('Kids', 'img/DSC06907-scaled.jpg', 'si'),
('Premium', 'img/DSC06925-scaled.jpg', 'si'),
('Rústico', 'img/IMG-20260408-WA0124-scaled.jpg', 'si'),
('Combos', 'img/inbound4468380888781350918-601x800.jpg', 'si');

-- ═══ ADMIN USER ═══
INSERT INTO users (username, password, name) VALUES ('admin', 'virginia2026', 'Admin');
