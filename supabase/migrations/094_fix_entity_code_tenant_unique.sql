-- 094_fix_entity_code_tenant_unique.sql
ALTER TABLE md_entities DROP CONSTRAINT IF EXISTS md_entities_entity_code_key;
ALTER TABLE md_entities DROP CONSTRAINT IF EXISTS md_entities_tenant_id_entity_code_key;

ALTER TABLE md_entities ADD CONSTRAINT md_entities_tenant_id_entity_code_key UNIQUE (tenant_id, entity_code);

NOTIFY pgrst, 'reload schema';
