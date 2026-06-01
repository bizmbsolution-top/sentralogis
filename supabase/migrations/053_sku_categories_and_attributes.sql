-- Migration 053: Hierarchical Categories and Dynamic Attributes

-- 1. Create md_product_categories table
CREATE TABLE IF NOT EXISTS md_product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES md_product_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast hierarchical querying
CREATE INDEX IF NOT EXISTS idx_md_product_categories_parent ON md_product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_md_product_categories_tenant ON md_product_categories(tenant_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_md_product_categories_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_md_product_categories_modtime ON md_product_categories;
CREATE TRIGGER update_md_product_categories_modtime
    BEFORE UPDATE ON md_product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_md_product_categories_modtime();

-- Enable RLS for md_product_categories
ALTER TABLE md_product_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Enable read access for all users on categories" ON md_product_categories;
    DROP POLICY IF EXISTS "Enable write access for tenant users on categories" ON md_product_categories;
EXCEPTION WHEN OTHERS THEN END $$;

CREATE POLICY "Enable read access for all users on categories" ON md_product_categories FOR SELECT USING (true);
CREATE POLICY "Enable write access for tenant users on categories" ON md_product_categories FOR ALL USING (true) WITH CHECK (true);

-- 2. Modify md_product_skus
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES md_product_categories(id) ON DELETE SET NULL;
ALTER TABLE md_product_skus ADD COLUMN IF NOT EXISTS dynamic_attributes JSONB DEFAULT '{}'::jsonb;

-- Index for category_id
CREATE INDEX IF NOT EXISTS idx_md_product_skus_category_id ON md_product_skus(category_id);
