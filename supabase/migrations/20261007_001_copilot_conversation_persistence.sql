-- ============================================================================
-- Migration: 20261007_001_copilot_conversation_persistence.sql
-- Description: D-COPILOT-CONVERSATION-05: Copilot Conversation Persistence Schema
-- Author: Sentralogis Architecture Authority (Human Architect: Likas Sonada)
-- Gate: D-COPILOT-CONVERSATION-05
-- Invariants:
--   - Tenant isolation via public.get_my_tenant_id()
--   - Private-by-actor via auth.uid()
--   - Soft deletion (deleted_at) for conversations
--   - Immutable messages (no UPDATE / DELETE for authenticated)
--   - Monotonic sequence_no per conversation
--   - User idempotency via idempotency_key UUID
-- ============================================================================

BEGIN;

-- 1. Create public.copilot_conversations
CREATE TABLE IF NOT EXISTS public.copilot_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
    owner_actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NULL DEFAULT 'Percakapan Baru',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    context_summary TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ NULL
);

-- Indexes for public.copilot_conversations
CREATE INDEX IF NOT EXISTS idx_copilot_conversations_tenant_actor 
    ON public.copilot_conversations (tenant_id, owner_actor_id, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_copilot_conversations_retention 
    ON public.copilot_conversations (last_activity_at) 
    WHERE deleted_at IS NULL;

-- 2. Create public.copilot_messages
CREATE TABLE IF NOT EXISTS public.copilot_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.copilot_conversations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
    sender_actor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    sequence_no BIGINT NOT NULL,
    content_original TEXT NOT NULL,
    language TEXT NULL,
    idempotency_key UUID NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_copilot_messages_sequence UNIQUE (conversation_id, sequence_no),
    CONSTRAINT chk_copilot_messages_user_idempotency CHECK (role != 'user' OR idempotency_key IS NOT NULL)
);

-- Indexes for public.copilot_messages
CREATE INDEX IF NOT EXISTS idx_copilot_messages_conv_seq 
    ON public.copilot_messages (conversation_id, sequence_no ASC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_copilot_messages_conversation_idempotency 
    ON public.copilot_messages (tenant_id, conversation_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- 3. Row Level Security (RLS)
ALTER TABLE public.copilot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;

-- 3.1 RLS Policies for public.copilot_conversations
DROP POLICY IF EXISTS copilot_conversations_select_policy ON public.copilot_conversations;
CREATE POLICY copilot_conversations_select_policy ON public.copilot_conversations
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND owner_actor_id = auth.uid()
        AND deleted_at IS NULL
    );

DROP POLICY IF EXISTS copilot_conversations_insert_policy ON public.copilot_conversations;
CREATE POLICY copilot_conversations_insert_policy ON public.copilot_conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND owner_actor_id = auth.uid()
    );

DROP POLICY IF EXISTS copilot_conversations_update_policy ON public.copilot_conversations;
CREATE POLICY copilot_conversations_update_policy ON public.copilot_conversations
    FOR UPDATE
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND owner_actor_id = auth.uid()
        AND deleted_at IS NULL
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND owner_actor_id = auth.uid()
    );

-- Authenticated DELETE is intentionally forbidden (soft-delete via UPDATE deleted_at only)
DROP POLICY IF EXISTS copilot_conversations_delete_policy ON public.copilot_conversations;
CREATE POLICY copilot_conversations_delete_policy ON public.copilot_conversations
    FOR DELETE
    TO authenticated
    USING (false);

-- 3.2 RLS Policies for public.copilot_messages
DROP POLICY IF EXISTS copilot_messages_select_policy ON public.copilot_messages;
CREATE POLICY copilot_messages_select_policy ON public.copilot_messages
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = public.get_my_tenant_id()
        AND EXISTS (
            SELECT 1 FROM public.copilot_conversations c
            WHERE c.id = copilot_messages.conversation_id
            AND c.tenant_id = public.get_my_tenant_id()
            AND c.owner_actor_id = auth.uid()
            AND c.deleted_at IS NULL
        )
    );

-- Authenticated clients may only insert 'user' messages with sender_actor_id = auth.uid()
-- assistant and system messages are inserted only by trusted server-side service_role
DROP POLICY IF EXISTS copilot_messages_insert_policy ON public.copilot_messages;
CREATE POLICY copilot_messages_insert_policy ON public.copilot_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND role = 'user'
        AND sender_actor_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.copilot_conversations c
            WHERE c.id = copilot_messages.conversation_id
            AND c.tenant_id = copilot_messages.tenant_id
            AND c.owner_actor_id = auth.uid()
            AND c.deleted_at IS NULL
        )
    );

-- Messages are immutable: UPDATE and DELETE are strictly forbidden for authenticated
DROP POLICY IF EXISTS copilot_messages_update_policy ON public.copilot_messages;
CREATE POLICY copilot_messages_update_policy ON public.copilot_messages
    FOR UPDATE
    TO authenticated
    USING (false);

DROP POLICY IF EXISTS copilot_messages_delete_policy ON public.copilot_messages;
CREATE POLICY copilot_messages_delete_policy ON public.copilot_messages
    FOR DELETE
    TO authenticated
    USING (false);

-- Grants
GRANT SELECT, INSERT, UPDATE ON TABLE public.copilot_conversations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.copilot_messages TO authenticated;
GRANT ALL ON TABLE public.copilot_conversations TO service_role;
GRANT ALL ON TABLE public.copilot_messages TO service_role;

-- 4. Purge Function (for 365-day retention lifecycle enforcement)
CREATE OR REPLACE FUNCTION public.purge_expired_copilot_conversations(
    p_retention_days INT DEFAULT 365,
    p_batch_size INT DEFAULT 500
)
RETURNS TABLE (
    purged_conversations INT,
    purged_messages INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purged_convs INT := 0;
    v_purged_msgs INT := 0;
    v_cutoff TIMESTAMPTZ;
BEGIN
    v_cutoff := now() - (p_retention_days || ' days')::INTERVAL;

    WITH target_convs AS (
        SELECT id, tenant_id, owner_actor_id FROM public.copilot_conversations
        WHERE last_activity_at < v_cutoff
        LIMIT p_batch_size
    ),
    deleted_msgs AS (
        DELETE FROM public.copilot_messages m
        USING target_convs t
        WHERE m.conversation_id = t.id
        RETURNING m.id
    ),
    audited_purges AS (
        INSERT INTO public.audit_logs (
            tenant_id,
            entity_type,
            entity_id,
            operation,
            performed_by,
            new_data,
            changed_fields,
            performed_at
        )
        SELECT 
            t.tenant_id,
            'copilot_conversation',
            t.id,
            'COPILOT_CONVERSATION_PURGED',
            t.owner_actor_id,
            jsonb_build_object('retention_days', p_retention_days, 'purged_at', now()),
            ARRAY['deleted_at'],
            now()
        FROM target_convs t
        RETURNING entity_id
    ),
    deleted_convs AS (
        DELETE FROM public.copilot_conversations c
        USING target_convs t
        WHERE c.id = t.id
        RETURNING c.id
    )
    SELECT 
        (SELECT count(*)::INT FROM deleted_convs),
        (SELECT count(*)::INT FROM deleted_msgs)
    INTO v_purged_convs, v_purged_msgs;

    RETURN QUERY SELECT v_purged_convs, v_purged_msgs;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_expired_copilot_conversations(INT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_expired_copilot_conversations(INT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_copilot_conversations(INT, INT) TO service_role;

-- 5. Atomic Message Append Procedure (FOR UPDATE lock on parent conversation)
CREATE OR REPLACE FUNCTION public.append_copilot_message(
    p_conversation_id UUID,
    p_tenant_id UUID,
    p_sender_actor_id UUID,
    p_role TEXT,
    p_content_original TEXT,
    p_language TEXT DEFAULT 'id',
    p_idempotency_key UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    id UUID,
    conversation_id UUID,
    tenant_id UUID,
    sender_actor_id UUID,
    role TEXT,
    sequence_no BIGINT,
    content_original TEXT,
    language TEXT,
    idempotency_key UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_seq BIGINT;
    v_conv_owner UUID;
    v_new_id UUID;
    v_created_at TIMESTAMPTZ := now();
    v_existing_id UUID;
BEGIN
    -- 1. Lock parent conversation row for concurrency serialization
    SELECT owner_actor_id INTO v_conv_owner
    FROM public.copilot_conversations
    WHERE id = p_conversation_id
      AND tenant_id = p_tenant_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'CONVERSATION_NOT_FOUND_OR_DELETED: %', p_conversation_id;
    END IF;

    -- 2. Idempotency check if key provided
    IF p_idempotency_key IS NOT NULL THEN
        SELECT m.id INTO v_existing_id
        FROM public.copilot_messages m
        WHERE m.tenant_id = p_tenant_id
          AND m.conversation_id = p_conversation_id
          AND m.idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN QUERY 
            SELECT m.id, m.conversation_id, m.tenant_id, m.sender_actor_id, m.role, 
                   m.sequence_no, m.content_original, m.language, m.idempotency_key, 
                   m.metadata, m.created_at
            FROM public.copilot_messages m
            WHERE m.id = v_existing_id;
            RETURN;
        END IF;
    END IF;

    -- 3. Calculate next monotonic sequence_no safely under row lock
    SELECT COALESCE(MAX(m.sequence_no), 0) + 1 INTO v_next_seq
    FROM public.copilot_messages m
    WHERE m.conversation_id = p_conversation_id;

    -- 4. Insert message
    INSERT INTO public.copilot_messages (
        conversation_id,
        tenant_id,
        sender_actor_id,
        role,
        sequence_no,
        content_original,
        language,
        idempotency_key,
        metadata,
        created_at
    ) VALUES (
        p_conversation_id,
        p_tenant_id,
        p_sender_actor_id,
        p_role,
        v_next_seq,
        p_content_original,
        p_language,
        p_idempotency_key,
        p_metadata,
        v_created_at
    )
    RETURNING public.copilot_messages.id INTO v_new_id;

    -- 5. Touch last_activity_at only on successful assistant message completing a valid user turn
    -- Pairing invariant: The assistant message must resolve an unanswered user turn.
    -- An unanswered user turn exists when the latest user message in the conversation has a higher sequence_no
    -- than the latest successful assistant message (or if no successful assistant message exists yet).
    IF p_role = 'assistant' AND (p_metadata->>'status') IS DISTINCT FROM 'ERROR' THEN
        IF EXISTS (
            SELECT 1
            FROM public.copilot_messages u
            WHERE u.conversation_id = p_conversation_id
              AND u.sequence_no < v_next_seq
              AND u.role = 'user'
              AND u.sequence_no > COALESCE(
                  (SELECT MAX(a.sequence_no)
                   FROM public.copilot_messages a
                   WHERE a.conversation_id = p_conversation_id
                     AND a.sequence_no < v_next_seq
                     AND a.role = 'assistant'
                     AND (a.metadata->>'status') IS DISTINCT FROM 'ERROR'),
                  0
              )
        ) THEN
            UPDATE public.copilot_conversations
            SET last_activity_at = v_created_at,
                updated_at = v_created_at
            WHERE id = p_conversation_id;
        END IF;
    END IF;

    RETURN QUERY 
    SELECT m.id, m.conversation_id, m.tenant_id, m.sender_actor_id, m.role, 
           m.sequence_no, m.content_original, m.language, m.idempotency_key, 
           m.metadata, m.created_at
    FROM public.copilot_messages m
    WHERE m.id = v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_copilot_message(UUID, UUID, UUID, TEXT, TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_copilot_message(UUID, UUID, UUID, TEXT, TEXT, TEXT, UUID, JSONB) TO service_role;

COMMIT;
