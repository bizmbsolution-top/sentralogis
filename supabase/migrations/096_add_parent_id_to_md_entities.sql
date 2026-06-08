-- Migration: Add parent_id to md_entities for hierarchical contacts
ALTER TABLE md_entities ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES md_entities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_md_entities_parent ON md_entities(parent_id);
NOTIFY pgrst, 'reload schema';
