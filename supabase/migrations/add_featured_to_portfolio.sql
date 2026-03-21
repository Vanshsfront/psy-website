-- Add featured column to portfolio_items
ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Create an index for efficient featured queries
CREATE INDEX IF NOT EXISTS idx_portfolio_items_featured ON portfolio_items(featured) WHERE featured = true;
