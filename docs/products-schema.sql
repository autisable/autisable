-- Products + ad-event tracking schema.
--
-- Adds inline product showcases (Bookshop / Special-Learning / Amazon) and
-- impression+click metrics for both products and affiliate banners.
-- Apply via the Supabase SQL editor; idempotent and safe to re-run.

CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storefront TEXT NOT NULL CHECK (storefront IN ('bookshop', 'special_learning', 'amazon')),
  title TEXT NOT NULL,
  image_url TEXT,
  click_url TEXT NOT NULL,
  price_label TEXT,
  category_filter TEXT[],
  tag_filter TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  position INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, position);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products are publicly readable" ON products;
CREATE POLICY "Products are publicly readable" ON products
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can read all products" ON products;
CREATE POLICY "Admins can read all products" ON products
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
  );

-- Single events table for both products and affiliate banners so we can
-- compare RPM/CTR side-by-side. ad_id is unconstrained UUID so we don't
-- pay a polymorphic-FK cost; integrity is enforced at the application
-- layer via the tracking endpoint.
CREATE TABLE IF NOT EXISTS ad_events (
  id BIGSERIAL PRIMARY KEY,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('product', 'affiliate')),
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  ad_id UUID NOT NULL,
  page_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_events_ad ON ad_events(ad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_events_type_created ON ad_events(ad_type, event_type, created_at DESC);

ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert ad events" ON ad_events;
CREATE POLICY "Anyone can insert ad events" ON ad_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read ad events" ON ad_events;
CREATE POLICY "Admins can read ad events" ON ad_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin')
  );
