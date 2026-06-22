-- Editable tattoo portfolio styles. Previously the style list was hardcoded in two
-- React components; this makes it admin-managed. portfolio_items.style_tag stays a
-- plain TEXT name, so no data migration is needed.

CREATE TABLE IF NOT EXISTS portfolio_styles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with the styles that were previously hardcoded.
INSERT INTO portfolio_styles (name, sort_order) VALUES
  ('Traditional', 1),
  ('Neo-trad',    2),
  ('Blackwork',   3),
  ('Fine-line',   4),
  ('Geometric',   5),
  ('Custom',      6)
ON CONFLICT (name) DO NOTHING;

-- Public read; writes go through the admin API (service role bypasses RLS).
ALTER TABLE portfolio_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access to portfolio_styles"
  ON portfolio_styles FOR SELECT USING (true);
