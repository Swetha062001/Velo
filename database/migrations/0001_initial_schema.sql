-- VELO — initial schema
--
-- Conventions
--   * UUID primary keys via gen_random_uuid() (built into PostgreSQL 13+, no extension needed).
--   * Money is stored as INTEGER paise (₹1 = 100 paise). Never floats.
--   * timestamptz everywhere; updated_at maintained by trigger.
--   * Only standard PostgreSQL features, so this runs unchanged on Supabase.

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE user_role      AS ENUM ('USER', 'ADMIN');
CREATE TYPE product_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE product_gender AS ENUM ('MEN', 'WOMEN', 'UNISEX');
CREATE TYPE order_status   AS ENUM ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Users & addresses
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  email          text        NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  password_hash  text        NOT NULL,
  role           user_role   NOT NULL DEFAULT 'USER',
  -- Incremented to invalidate every issued JWT (logout everywhere, role change).
  token_version  integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Emails are unique case-insensitively (no citext extension required).
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TABLE addresses (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  full_name    text        NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 100),
  phone        text        NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 20),
  line1        text        NOT NULL CHECK (char_length(line1) BETWEEN 1 AND 200),
  line2        text        CHECK (char_length(line2) <= 200),
  city         text        NOT NULL CHECK (char_length(city) BETWEEN 1 AND 100),
  state        text        NOT NULL CHECK (char_length(state) BETWEEN 1 AND 100),
  postal_code  text        NOT NULL CHECK (char_length(postal_code) BETWEEN 3 AND 12),
  country      char(2)     NOT NULL DEFAULT 'IN',
  is_default   boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX addresses_user_id_idx ON addresses (user_id);
-- At most one default address per user.
CREATE UNIQUE INDEX addresses_one_default_per_user ON addresses (user_id) WHERE is_default;

-- ─────────────────────────────────────────────────────────────────────────────
-- Catalogue
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  slug         text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text,
  image_url    text,
  sort_order   integer     NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id                      uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id             uuid           NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  name                    text           NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  slug                    text           NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description             text           NOT NULL,
  brand                   text           NOT NULL DEFAULT 'VELO',
  material                text,
  gender                  product_gender NOT NULL DEFAULT 'UNISEX',
  -- Normalised colour family used for filtering and the AI assistant (e.g. 'white').
  color                   text           NOT NULL CHECK (color ~ '^[a-z]+$'),
  -- Marketing colourway name shown to shoppers (e.g. 'Triple White').
  colorway                text           NOT NULL,
  tags                    text[]         NOT NULL DEFAULT '{}',
  price_paise             integer        NOT NULL CHECK (price_paise > 0),
  compare_at_price_paise  integer        CHECK (compare_at_price_paise IS NULL OR compare_at_price_paise > price_paise),
  status                  product_status NOT NULL DEFAULT 'DRAFT',
  is_featured             boolean        NOT NULL DEFAULT false,
  search_vector           tsvector       GENERATED ALWAYS AS (
                            setweight(to_tsvector('english', name), 'A') ||
                            setweight(to_tsvector('english', colorway || ' ' || color), 'B') ||
                            setweight(to_tsvector('english', coalesce(material, '')), 'C') ||
                            setweight(to_tsvector('english', description), 'D')
                          ) STORED,
  created_at              timestamptz    NOT NULL DEFAULT now(),
  updated_at              timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX products_category_id_idx ON products (category_id);
CREATE INDEX products_status_idx      ON products (status);
CREATE INDEX products_price_idx       ON products (price_paise);
CREATE INDEX products_created_at_idx  ON products (created_at DESC);
CREATE INDEX products_search_idx      ON products USING gin (search_vector);
CREATE INDEX products_tags_idx        ON products USING gin (tags);

CREATE TABLE product_variants (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  size_label            text        NOT NULL CHECK (char_length(size_label) BETWEEN 1 AND 20),
  sort_order            integer     NOT NULL DEFAULT 0,
  sku                   text        NOT NULL UNIQUE,
  price_override_paise  integer     CHECK (price_override_paise IS NULL OR price_override_paise > 0),
  is_active             boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, size_label)
);

CREATE INDEX product_variants_product_id_idx ON product_variants (product_id);

-- One row per variant. Availability is derived: variant.is_active AND quantity > 0.
CREATE TABLE inventory (
  variant_id           uuid        PRIMARY KEY REFERENCES product_variants (id) ON DELETE CASCADE,
  quantity             integer     NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold  integer     NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE product_images (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  url         text        NOT NULL,
  alt_text    text        NOT NULL CHECK (char_length(alt_text) BETWEEN 1 AND 200),
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_images_product_id_idx ON product_images (product_id, sort_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- Wishlist & cart
-- ─────────────────────────────────────────────────────────────────────────────

-- One wishlist per user, so no parent table is needed.
CREATE TABLE wishlist_items (
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id  uuid        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX wishlist_items_product_id_idx ON wishlist_items (product_id);

-- Parent table kept so session-based guest carts can be added server-side later.
CREATE TABLE carts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     uuid        NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  variant_id  uuid        NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
  quantity    integer     NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, variant_id)
);

CREATE INDEX cart_items_variant_id_idx ON cart_items (variant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SEQUENCE order_number_seq;

CREATE TABLE orders (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Human-friendly reference, e.g. VELO-2026-000123.
  order_number      text           NOT NULL UNIQUE
                                   DEFAULT ('VELO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 6, '0')),
  user_id           uuid           NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  status            order_status   NOT NULL DEFAULT 'CONFIRMED',
  payment_status    payment_status NOT NULL DEFAULT 'PENDING',
  payment_method    text           NOT NULL DEFAULT 'MOCK',
  -- Snapshot of the address at purchase time; later address edits never change past orders.
  shipping_address  jsonb          NOT NULL,
  subtotal_paise    integer        NOT NULL CHECK (subtotal_paise >= 0),
  shipping_paise    integer        NOT NULL CHECK (shipping_paise >= 0),
  total_paise       integer        NOT NULL,
  -- Client-generated key that makes "place order" safe to retry (no duplicate orders).
  idempotency_key   text,
  placed_at         timestamptz    NOT NULL DEFAULT now(),
  created_at        timestamptz    NOT NULL DEFAULT now(),
  updated_at        timestamptz    NOT NULL DEFAULT now(),
  CHECK (total_paise = subtotal_paise + shipping_paise),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX orders_user_id_idx    ON orders (user_id, placed_at DESC);
CREATE INDEX orders_status_idx     ON orders (status);
CREATE INDEX orders_placed_at_idx  ON orders (placed_at DESC);

-- Historical line items: name, size, SKU and price are copied at purchase time,
-- so order history never depends on the current catalogue.
CREATE TABLE order_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id        uuid        REFERENCES products (id) ON DELETE SET NULL,
  variant_id        uuid        REFERENCES product_variants (id) ON DELETE SET NULL,
  product_name      text        NOT NULL,
  product_slug      text,
  colorway          text,
  size_label        text        NOT NULL,
  sku               text        NOT NULL,
  image_url         text,
  unit_price_paise  integer     NOT NULL CHECK (unit_price_paise >= 0),
  quantity          integer     NOT NULL CHECK (quantity > 0),
  line_total_paise  integer     NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (line_total_paise = unit_price_paise * quantity)
);

CREATE INDEX order_items_order_id_idx   ON order_items (order_id);
CREATE INDEX order_items_product_id_idx ON order_items (product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TRIGGER users_set_updated_at            BEFORE UPDATE ON users            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER addresses_set_updated_at        BEFORE UPDATE ON addresses        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER categories_set_updated_at       BEFORE UPDATE ON categories       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER products_set_updated_at         BEFORE UPDATE ON products         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_variants_set_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER inventory_set_updated_at        BEFORE UPDATE ON inventory        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER carts_set_updated_at            BEFORE UPDATE ON carts            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER cart_items_set_updated_at       BEFORE UPDATE ON cart_items       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_set_updated_at           BEFORE UPDATE ON orders           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
