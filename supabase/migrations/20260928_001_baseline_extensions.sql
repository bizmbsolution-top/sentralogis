-- ============================================================================
-- SENTRALOGIS MODULAR LAYERED BASELINE MIGRATION
-- Layer:         001 Extensions
-- Architecture:  D8-02 Option B2 / D8-30 Ratified
-- Baseline:      9bd2c04ce64b5e5c1d4b71451e4bab4a03c93999
-- Generation:    Deterministic Static Formation (Delivery Unit 2 / D8-33)
-- Total Objects: 4
-- Description:   PostgreSQL extensions
-- ============================================================================
-- ============================================================================
-- Object:        extension.ltree
-- Layer:         001 Extensions
-- Source:        supabase/schemas/_cluster/extensions/ltree.sql
-- Dependencies:  none
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "ltree" WITH SCHEMA "public";

COMMENT ON EXTENSION "ltree" IS 'data type for hierarchical tree-like structures';

-- ============================================================================
-- Object:        extension.pgcrypto
-- Layer:         001 Extensions
-- Source:        supabase/schemas/_cluster/extensions/pgcrypto.sql
-- Dependencies:  none
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

COMMENT ON EXTENSION "pgcrypto" IS 'cryptographic functions';

-- ============================================================================
-- Object:        extension.uuid-ossp
-- Layer:         001 Extensions
-- Source:        supabase/schemas/_cluster/extensions/uuid-ossp.sql
-- Dependencies:  none
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';

-- ============================================================================
-- Object:        extension.vector
-- Layer:         001 Extensions
-- Source:        supabase/schemas/_cluster/extensions/vector.sql
-- Dependencies:  none
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";

COMMENT ON EXTENSION "vector" IS 'vector data type and ivfflat and hnsw access methods';
