-- ============================================================================
-- Migration: 20261028_036_copilot_conversation_scope.sql
-- Description: Segment Copilot Conversations by Role/Workspace Scope (CS vs SBU)
-- Author: Sentralogis Architecture Authority
-- Invariants:
--   - Tenant isolation preserved: tenant_id = public.get_my_tenant_id()
--   - Actor private isolation preserved: owner_actor_id = auth.uid()
--   - Workspace separation: CS (Commercial/HQ) chats strictly separated from SBU (Operations) chats
-- ============================================================================

BEGIN;

-- 1. Add scope column to public.copilot_conversations if not exists
ALTER TABLE IF EXISTS public.copilot_conversations 
ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'cs' CHECK (scope IN ('cs', 'sbu', 'general'));

-- 2. Index by tenant, actor, scope, and activity
CREATE INDEX IF NOT EXISTS idx_copilot_conversations_tenant_actor_scope 
ON public.copilot_conversations (tenant_id, owner_actor_id, scope, last_activity_at DESC);

COMMIT;
