-- ============================================================
-- VIRGINIA OFICIAL | SUPABASE SETUP
-- Ejecutar primero en Supabase SQL Editor
-- ============================================================

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
  images TEXT DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  img TEXT DEFAULT '',
  visible TEXT DEFAULT 'si',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  session_token TEXT,
  session_expires_at TIMESTAMPTZ,
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

ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;

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

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_read ON products;
DROP POLICY IF EXISTS categories_read ON categories;

CREATE POLICY products_read ON products
FOR SELECT
USING (true);

CREATE POLICY categories_read ON categories
FOR SELECT
USING (true);

INSERT INTO products (name, cat, price, oldprice, stock, status, badge, sizes, colors, img, images, description)
SELECT *
FROM (
  VALUES
    ('Over M/L Capicua', 'Remeras', 7500, 0, 24, 'activo', 'new', 'S,M,L,XL', 'Negro,Blanco,Gris', 'img/DSC06907-scaled.jpg', 'img/DSC06907-scaled.jpg', 'Remera over con estampado capicua. 100% algodon.'),
    ('Over Luna', 'Remeras', 5300, 0, 18, 'activo', 'hot', 'S,M,L', 'Negro,Bordo', 'img/DSC06925-scaled.jpg', 'img/DSC06925-scaled.jpg', 'Remera over con bordado luna.'),
    ('Frizado Nissmo', 'Buzos', 12000, 0, 9, 'activo', '', 'S,M,L,XL,XXL', 'Negro,Azul', 'img/IMG-20260408-WA0124-scaled.jpg', 'img/IMG-20260408-WA0124-scaled.jpg', 'Buzo frizado interior calido.'),
    ('Frizado Oni 2.0', 'Buzos', 13500, 15000, 14, 'activo', 'new', 'M,L,XL', 'Negro,Gris', 'img/inbound4468380888781350918-601x800.jpg', 'img/inbound4468380888781350918-601x800.jpg', 'Segunda version del Oni.'),
    ('Frizado Three 2.0', 'Buzos', 13500, 0, 6, 'activo', '', 'M,L,XL', 'Negro', 'img/inbound4849073990589537579.jpg', 'img/inbound4849073990589537579.jpg', 'Buzo frizado edicion Three 2.0.'),
    ('Buzo Combinado *7*', 'Buzos', 15000, 0, 0, 'agotado', '', 'S,M,L,XL', 'Negro/Gris', 'img/virginia-125-1-scaled.jpg', 'img/virginia-125-1-scaled.jpg', 'Buzo combinado bicolor.'),
    ('Buzo Over Seize', 'Buzos', 14000, 0, 11, 'activo', '', 'L,XL,XXL', 'Blanco,Negro', 'img/WhatsApp-Image-2025-02-19-at-08.51.17.jpeg', 'img/WhatsApp-Image-2025-02-19-at-08.51.17.jpeg', 'Buzo oversize.'),
    ('Frizado Honda 2.0', 'Buzos', 13500, 0, 3, 'activo', '', 'M,L,XL', 'Negro,Rojo', 'img/WhatsApp-Image-2025-04-03-at-12.23.29-1.jpeg', 'img/WhatsApp-Image-2025-04-03-at-12.23.29-1.jpeg', 'Frizado Honda Motorsport.')
) AS seed(name, cat, price, oldprice, stock, status, badge, sizes, colors, img, images, description)
WHERE NOT EXISTS (SELECT 1 FROM products);

INSERT INTO categories (name, img, visible)
SELECT *
FROM (
  VALUES
    ('Buzos', 'img/WhatsApp-Image-2025-06-30-at-10.16.49.jpeg', 'si'),
    ('Remeras', 'img/WhatsApp-Image-2026-04-03-at-14.45.59.jpeg', 'si'),
    ('Pantalones', 'img/WhatsApp-Image-2026-04-30-at-15.19.27-1.jpeg', 'si'),
    ('Kids', 'img/DSC06907-scaled.jpg', 'si'),
    ('Premium', 'img/DSC06925-scaled.jpg', 'si'),
    ('Rústico', 'img/IMG-20260408-WA0124-scaled.jpg', 'si'),
    ('Combos', 'img/inbound4468380888781350918-601x800.jpg', 'si')
) AS seed(name, img, visible)
WHERE NOT EXISTS (SELECT 1 FROM categories);

INSERT INTO users (username, password, name)
VALUES ('admin', 'virginia2026', 'Admin')
ON CONFLICT (username) DO NOTHING;
