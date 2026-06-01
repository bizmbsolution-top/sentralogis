-- Migration 054: Master UOM and Product Images Storage

-- 1. Create Product Images Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for product-images
-- Allow public access to view images
DROP POLICY IF EXISTS "product_images_public_access" ON storage.objects;
CREATE POLICY "product_images_public_access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "product_images_auth_upload" ON storage.objects;
CREATE POLICY "product_images_auth_upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update/delete their own images
DROP POLICY IF EXISTS "product_images_auth_update_delete" ON storage.objects;
CREATE POLICY "product_images_auth_update_delete" 
ON storage.objects FOR ALL
USING (
    bucket_id = 'product-images' 
    AND auth.role() = 'authenticated'
);

-- 2. Create Master UOM Table
CREATE TABLE IF NOT EXISTS md_uoms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_md_uoms_tenant ON md_uoms(tenant_id);

-- (Optional) Enable RLS and set policies if needed later
-- ALTER TABLE md_uoms ENABLE ROW LEVEL SECURITY;

-- Insert standard defaults (optional, but helpful for new tenants)
-- These will be tied to specific tenants later, or you can make them global if tenant_id is NULL.
-- In Sentralogis, usually master data is per tenant. But we can leave it empty to let users create their own.
