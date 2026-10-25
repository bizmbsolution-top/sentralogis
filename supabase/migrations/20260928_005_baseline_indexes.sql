-- ============================================================================
-- SENTRALOGIS MODULAR LAYERED BASELINE MIGRATION
-- Layer:         005 Explicit Indexes
-- Architecture:  D8-02 Option B2 / D8-30 Ratified
-- Baseline:      9bd2c04ce64b5e5c1d4b71451e4bab4a03c93999
-- Generation:    Deterministic Static Formation (Delivery Unit 2 / D8-33)
-- Total Objects: 520
-- Description:   Standalone performance and secondary indexes
-- ============================================================================
-- ============================================================================
-- Object:        public.idx_accounting_lines_event
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/accounting_event_lines.sql
-- Dependencies:  accounting_event_lines
-- ============================================================================
CREATE INDEX idx_accounting_lines_event ON public.accounting_event_lines USING btree (accounting_event_id);

-- ============================================================================
-- Object:        public.idx_accounting_lines_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/accounting_event_lines.sql
-- Dependencies:  accounting_event_lines
-- ============================================================================
CREATE INDEX idx_accounting_lines_tenant ON public.accounting_event_lines USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_accounting_events_date
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/accounting_events.sql
-- Dependencies:  accounting_events
-- ============================================================================
CREATE INDEX idx_accounting_events_date ON public.accounting_events USING btree (accounting_date);

-- ============================================================================
-- Object:        public.idx_accounting_events_source
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/accounting_events.sql
-- Dependencies:  accounting_events
-- ============================================================================
CREATE INDEX idx_accounting_events_source ON public.accounting_events USING btree (source_entity_type, source_entity_id);

-- ============================================================================
-- Object:        public.idx_accounting_events_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/accounting_events.sql
-- Dependencies:  accounting_events
-- ============================================================================
CREATE INDEX idx_accounting_events_status ON public.accounting_events USING btree (status);

-- ============================================================================
-- Object:        public.idx_accounting_events_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/accounting_events.sql
-- Dependencies:  accounting_events
-- ============================================================================
CREATE INDEX idx_accounting_events_tenant ON public.accounting_events USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_accounting_providers_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/accounting_providers.sql
-- Dependencies:  accounting_providers
-- ============================================================================
CREATE INDEX idx_accounting_providers_tenant ON public.accounting_providers USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_chat_attachments_message
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/chat_attachments.sql
-- Dependencies:  chat_attachments
-- ============================================================================
CREATE INDEX idx_chat_attachments_message ON public.chat_attachments USING btree (message_id);

-- ============================================================================
-- Object:        public.idx_chat_channel_unique
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/chat_channels.sql
-- Dependencies:  chat_channels
-- ============================================================================
CREATE UNIQUE INDEX idx_chat_channel_unique ON public.chat_channels USING btree (channel_type, channel_id);

-- ============================================================================
-- Object:        public.idx_chat_group_members_user
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  chat_group_members
-- ============================================================================
CREATE INDEX idx_chat_group_members_user ON public.chat_group_members USING btree (user_id);

-- ============================================================================
-- Object:        public.idx_chat_groups_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/chat_groups.sql
-- Dependencies:  chat_groups
-- ============================================================================
CREATE INDEX idx_chat_groups_tenant ON public.chat_groups USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_chat_groups_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/chat_groups.sql
-- Dependencies:  chat_groups
-- ============================================================================
CREATE INDEX idx_chat_groups_type ON public.chat_groups USING btree (group_type);

-- ============================================================================
-- Object:        public.idx_chat_messages_channel
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
CREATE INDEX idx_chat_messages_channel ON public.chat_messages USING btree (channel_id, created_at);

-- ============================================================================
-- Object:        public.idx_chat_messages_context
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
CREATE INDEX idx_chat_messages_context ON public.chat_messages USING btree (context_type, context_id);

-- ============================================================================
-- Object:        public.idx_chat_messages_parent
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
CREATE INDEX idx_chat_messages_parent ON public.chat_messages USING btree (parent_id);

-- ============================================================================
-- Object:        public.idx_chat_messages_pinned
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
CREATE INDEX idx_chat_messages_pinned ON public.chat_messages USING btree (is_pinned)
  WHERE (is_pinned = true);

-- ============================================================================
-- Object:        public.idx_chat_participants_user
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/chat_participants.sql
-- Dependencies:  chat_participants
-- ============================================================================
CREATE INDEX idx_chat_participants_user ON public.chat_participants USING btree (user_id);

-- ============================================================================
-- Object:        public.idx_com_cap_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/commercial_capability_bindings.sql
-- Dependencies:  commercial_capability_bindings
-- ============================================================================
CREATE INDEX idx_com_cap_status ON public.commercial_capability_bindings USING btree (tenant_id, status);

-- ============================================================================
-- Object:        public.idx_com_cap_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/commercial_capability_bindings.sql
-- Dependencies:  commercial_capability_bindings
-- ============================================================================
CREATE INDEX idx_com_cap_tenant ON public.commercial_capability_bindings USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_com_cap_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/commercial_capability_bindings.sql
-- Dependencies:  commercial_capability_bindings
-- ============================================================================
CREATE INDEX idx_com_cap_type ON public.commercial_capability_bindings USING btree (tenant_id, capability_type);

-- ============================================================================
-- Object:        public.idx_com_cap_wo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/commercial_capability_bindings.sql
-- Dependencies:  commercial_capability_bindings
-- ============================================================================
CREATE INDEX idx_com_cap_wo ON public.commercial_capability_bindings USING btree (work_order_id);

-- ============================================================================
-- Object:        public.idx_com_lines_wo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/commercial_line_items.sql
-- Dependencies:  commercial_line_items
-- ============================================================================
CREATE INDEX idx_com_lines_wo ON public.commercial_line_items USING btree (work_order_id);

-- ============================================================================
-- Object:        public.idx_com_scopes_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/commercial_service_scopes.sql
-- Dependencies:  commercial_service_scopes
-- ============================================================================
CREATE INDEX idx_com_scopes_tenant ON public.commercial_service_scopes USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_com_wo_customer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/commercial_work_orders.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
CREATE INDEX idx_com_wo_customer ON public.commercial_work_orders USING btree (customer_id);

-- ============================================================================
-- Object:        public.idx_com_wo_scope
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/commercial_work_orders.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
CREATE INDEX idx_com_wo_scope ON public.commercial_work_orders USING btree (service_scope_id);

-- ============================================================================
-- Object:        public.idx_com_wo_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/commercial_work_orders.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
CREATE INDEX idx_com_wo_status ON public.commercial_work_orders USING btree (status);

-- ============================================================================
-- Object:        public.idx_com_wo_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/commercial_work_orders.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
CREATE INDEX idx_com_wo_tenant ON public.commercial_work_orders USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_crm_guest_links_token
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/crm_guest_links.sql
-- Dependencies:  crm_guest_links
-- ============================================================================
CREATE INDEX idx_crm_guest_links_token ON public.crm_guest_links USING btree (token);

-- ============================================================================
-- Object:        public.idx_quotation_sections
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/crm_quotation_sections.sql
-- Dependencies:  crm_quotation_sections
-- ============================================================================
CREATE INDEX idx_quotation_sections ON public.crm_quotation_sections USING btree (quotation_id);

-- ============================================================================
-- Object:        public.idx_sbu_rates_customer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/crm_sbu_customer_rates.sql
-- Dependencies:  crm_sbu_customer_rates
-- ============================================================================
CREATE INDEX idx_sbu_rates_customer ON public.crm_sbu_customer_rates USING btree (customer_id, sbu_type);

-- ============================================================================
-- Object:        public.idx_sbu_rates_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/crm_sbu_customer_rates.sql
-- Dependencies:  crm_sbu_customer_rates
-- ============================================================================
CREATE INDEX idx_sbu_rates_tenant ON public.crm_sbu_customer_rates USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_cus_ceisa_prep_dec
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_ceisa_preparations.sql
-- Dependencies:  cus_ceisa_preparations
-- ============================================================================
CREATE INDEX idx_cus_ceisa_prep_dec ON public.cus_ceisa_preparations USING btree (declaration_id, version_no DESC);

-- ============================================================================
-- Object:        public.idx_cus_ceisa_prep_tenant_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_ceisa_preparations.sql
-- Dependencies:  cus_ceisa_preparations
-- ============================================================================
CREATE INDEX idx_cus_ceisa_prep_tenant_status ON public.cus_ceisa_preparations USING btree (tenant_id, status);

-- ============================================================================
-- Object:        public.idx_cus_ceisa_val_prep
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_ceisa_validation_results.sql
-- Dependencies:  cus_ceisa_validation_results
-- ============================================================================
CREATE INDEX idx_cus_ceisa_val_prep ON public.cus_ceisa_validation_results USING btree (preparation_id, layer);

-- ============================================================================
-- Object:        public.idx_cus_ceisa_val_rule
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_ceisa_validation_results.sql
-- Dependencies:  cus_ceisa_validation_results
-- ============================================================================
CREATE INDEX idx_cus_ceisa_val_rule ON public.cus_ceisa_validation_results USING btree (rule_code, severity);

-- ============================================================================
-- Object:        public.idx_cus_class_dec
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_classification_lines.sql
-- Dependencies:  cus_classification_lines
-- ============================================================================
CREATE INDEX idx_cus_class_dec ON public.cus_classification_lines USING btree (declaration_id);

-- ============================================================================
-- Object:        public.idx_cus_class_dec_seq
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_classification_lines.sql
-- Dependencies:  cus_classification_lines
-- ============================================================================
CREATE INDEX idx_cus_class_dec_seq ON public.cus_classification_lines USING btree (declaration_id, item_sequence);

-- ============================================================================
-- Object:        public.idx_cus_decision_dec
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_customs_decisions.sql
-- Dependencies:  cus_customs_decisions
-- ============================================================================
CREATE INDEX idx_cus_decision_dec ON public.cus_customs_decisions USING btree (declaration_id, created_at DESC);

-- ============================================================================
-- Object:        public.idx_cus_decision_item
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_customs_decisions.sql
-- Dependencies:  cus_customs_decisions
-- ============================================================================
CREATE INDEX idx_cus_decision_item ON public.cus_customs_decisions USING btree (related_item_id);

-- ============================================================================
-- Object:        public.idx_cus_decision_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_customs_decisions.sql
-- Dependencies:  cus_customs_decisions
-- ============================================================================
CREATE INDEX idx_cus_decision_type ON public.cus_customs_decisions USING btree (tenant_id, decision_type);

-- ============================================================================
-- Object:        public.idx_cus_audit_dec_seq
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_audit_events.sql
-- Dependencies:  cus_declaration_audit_events
-- ============================================================================
CREATE INDEX idx_cus_audit_dec_seq ON public.cus_declaration_audit_events USING btree (declaration_id, sequence_no);

-- ============================================================================
-- Object:        public.idx_cus_audit_event_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_audit_events.sql
-- Dependencies:  cus_declaration_audit_events
-- ============================================================================
CREATE INDEX idx_cus_audit_event_type ON public.cus_declaration_audit_events USING btree (declaration_id, event_type);

-- ============================================================================
-- Object:        public.idx_cus_audit_tenant_cat
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_audit_events.sql
-- Dependencies:  cus_declaration_audit_events
-- ============================================================================
CREATE INDEX idx_cus_audit_tenant_cat ON public.cus_declaration_audit_events USING btree (tenant_id, event_category, created_at);

-- ============================================================================
-- Object:        public.idx_cus_doc_declaration
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_documents.sql
-- Dependencies:  cus_declaration_documents
-- ============================================================================
CREATE INDEX idx_cus_doc_declaration ON public.cus_declaration_documents USING btree (declaration_id);

-- ============================================================================
-- Object:        public.idx_cus_doc_line
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_documents.sql
-- Dependencies:  cus_declaration_documents
-- ============================================================================
CREATE INDEX idx_cus_doc_line ON public.cus_declaration_documents USING btree (classification_line_id);

-- ============================================================================
-- Object:        public.idx_cus_doc_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_documents.sql
-- Dependencies:  cus_declaration_documents
-- ============================================================================
CREATE INDEX idx_cus_doc_status ON public.cus_declaration_documents USING btree (tenant_id, verification_status);

-- ============================================================================
-- Object:        public.idx_cus_doc_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_documents.sql
-- Dependencies:  cus_declaration_documents
-- ============================================================================
CREATE INDEX idx_cus_doc_type ON public.cus_declaration_documents USING btree (declaration_id, document_type);

-- ============================================================================
-- Object:        public.idx_cus_exc_category
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  cus_declaration_exceptions
-- ============================================================================
CREATE INDEX idx_cus_exc_category ON public.cus_declaration_exceptions USING btree (declaration_id, category);

-- ============================================================================
-- Object:        public.idx_cus_exc_dec
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  cus_declaration_exceptions
-- ============================================================================
CREATE INDEX idx_cus_exc_dec ON public.cus_declaration_exceptions USING btree (declaration_id);

-- ============================================================================
-- Object:        public.idx_cus_exc_fingerprint
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  cus_declaration_exceptions
-- ============================================================================
CREATE INDEX idx_cus_exc_fingerprint ON public.cus_declaration_exceptions USING btree (tenant_id, declaration_id, fingerprint);

-- ============================================================================
-- Object:        public.idx_cus_exc_line
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  cus_declaration_exceptions
-- ============================================================================
CREATE INDEX idx_cus_exc_line ON public.cus_declaration_exceptions USING btree (classification_line_id);

-- ============================================================================
-- Object:        public.idx_cus_exc_severity
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  cus_declaration_exceptions
-- ============================================================================
CREATE INDEX idx_cus_exc_severity ON public.cus_declaration_exceptions USING btree (declaration_id, severity);

-- ============================================================================
-- Object:        public.idx_cus_exc_tenant_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  cus_declaration_exceptions
-- ============================================================================
CREATE INDEX idx_cus_exc_tenant_status ON public.cus_declaration_exceptions USING btree (tenant_id, status);

-- ============================================================================
-- Object:        public.idx_cus_val_run_dec
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_validation_runs.sql
-- Dependencies:  cus_declaration_validation_runs
-- ============================================================================
CREATE INDEX idx_cus_val_run_dec ON public.cus_declaration_validation_runs USING btree (declaration_id);

-- ============================================================================
-- Object:        public.idx_cus_val_run_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declaration_validation_runs.sql
-- Dependencies:  cus_declaration_validation_runs
-- ============================================================================
CREATE INDEX idx_cus_val_run_tenant ON public.cus_declaration_validation_runs USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_cus_dec_channel
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  cus_declarations
-- ============================================================================
CREATE INDEX idx_cus_dec_channel ON public.cus_declarations USING btree (channel);

-- ============================================================================
-- Object:        public.idx_cus_dec_exec_leg
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  cus_declarations
-- ============================================================================
CREATE INDEX idx_cus_dec_exec_leg ON public.cus_declarations USING btree (execution_leg_id);

-- ============================================================================
-- Object:        public.idx_cus_dec_importer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  cus_declarations
-- ============================================================================
CREATE INDEX idx_cus_dec_importer ON public.cus_declarations USING btree (importer_id);

-- ============================================================================
-- Object:        public.idx_cus_dec_jo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  cus_declarations
-- ============================================================================
CREATE INDEX idx_cus_dec_jo ON public.cus_declarations USING btree (job_order_id);

-- ============================================================================
-- Object:        public.idx_cus_dec_req
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  cus_declarations
-- ============================================================================
CREATE INDEX idx_cus_dec_req ON public.cus_declarations USING btree (service_request_id);

-- ============================================================================
-- Object:        public.idx_cus_dec_shipment
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  cus_declarations
-- ============================================================================
CREATE INDEX idx_cus_dec_shipment ON public.cus_declarations USING btree (shipment_id);

-- ============================================================================
-- Object:        public.idx_cus_dec_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  cus_declarations
-- ============================================================================
CREATE INDEX idx_cus_dec_tenant ON public.cus_declarations USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_cus_dec_wo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  cus_declarations
-- ============================================================================
CREATE INDEX idx_cus_dec_wo ON public.cus_declarations USING btree (work_order_id);

-- ============================================================================
-- Object:        public.idx_cus_item_audit_dec
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_item_audit_logs.sql
-- Dependencies:  cus_item_audit_logs
-- ============================================================================
CREATE INDEX idx_cus_item_audit_dec ON public.cus_item_audit_logs USING btree (declaration_id);

-- ============================================================================
-- Object:        public.idx_cus_item_audit_line
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_item_audit_logs.sql
-- Dependencies:  cus_item_audit_logs
-- ============================================================================
CREATE INDEX idx_cus_item_audit_line ON public.cus_item_audit_logs USING btree (classification_line_id);

-- ============================================================================
-- Object:        public.idx_cus_sku_hist
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_sku_classification_history.sql
-- Dependencies:  cus_sku_classification_history
-- ============================================================================
CREATE INDEX idx_cus_sku_hist ON public.cus_sku_classification_history USING btree (tenant_id, importer_id, sku_code);

-- ============================================================================
-- Object:        public.idx_cus_sku_lookup
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_sku_intelligence.sql
-- Dependencies:  cus_sku_intelligence
-- ============================================================================
CREATE INDEX idx_cus_sku_lookup ON public.cus_sku_intelligence USING btree (tenant_id, importer_id, sku_code);

-- ============================================================================
-- Object:        public.idx_cus_sku_tenant_importer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/cus_sku_intelligence.sql
-- Dependencies:  cus_sku_intelligence
-- ============================================================================
CREATE INDEX idx_cus_sku_tenant_importer ON public.cus_sku_intelligence USING btree (tenant_id, importer_id);

-- ============================================================================
-- Object:        public.idx_trace_request
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/debug_traces.sql
-- Dependencies:  debug_traces
-- ============================================================================
CREATE INDEX idx_trace_request ON public.debug_traces USING btree (request_id);

-- ============================================================================
-- Object:        public.idx_documents_job_route_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/documents.sql
-- Dependencies:  documents
-- ============================================================================
CREATE INDEX idx_documents_job_route_id ON public.documents USING btree (job_route_id);

-- ============================================================================
-- Object:        public.idx_driver_attendance_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/driver_attendance.sql
-- Dependencies:  driver_attendance
-- ============================================================================
CREATE INDEX idx_driver_attendance_tenant ON public.driver_attendance USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_driver_perf_driver
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/driver_performance_logs.sql
-- Dependencies:  driver_performance_logs
-- ============================================================================
CREATE INDEX idx_driver_perf_driver ON public.driver_performance_logs USING btree (driver_id);

-- ============================================================================
-- Object:        public.idx_driver_perf_job
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/driver_performance_logs.sql
-- Dependencies:  driver_performance_logs
-- ============================================================================
CREATE INDEX idx_driver_perf_job ON public.driver_performance_logs USING btree (job_order_id);

-- ============================================================================
-- Object:        public.idx_driver_perf_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/driver_performance_logs.sql
-- Dependencies:  driver_performance_logs
-- ============================================================================
CREATE INDEX idx_driver_perf_type ON public.driver_performance_logs USING btree (TYPE);

-- ============================================================================
-- Object:        public.uq_driver_profiles_phone
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/driver_profiles.sql
-- Dependencies:  driver_profiles
-- ============================================================================
CREATE UNIQUE INDEX uq_driver_profiles_phone ON public.driver_profiles USING btree (public.normalize_phone(phone));

-- ============================================================================
-- Object:        public.idx_driver_requests_job_order
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/driver_requests.sql
-- Dependencies:  driver_requests
-- ============================================================================
CREATE INDEX idx_driver_requests_job_order ON public.driver_requests USING btree (job_order_id);

-- ============================================================================
-- Object:        public.idx_driver_requests_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/driver_requests.sql
-- Dependencies:  driver_requests
-- ============================================================================
CREATE INDEX idx_driver_requests_status ON public.driver_requests USING btree (status);

-- ============================================================================
-- Object:        public.idx_driver_tenant_links_driver_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/driver_tenant_links.sql
-- Dependencies:  driver_tenant_links
-- ============================================================================
CREATE INDEX idx_driver_tenant_links_driver_id ON public.driver_tenant_links USING btree (driver_id);

-- ============================================================================
-- Object:        public.idx_driver_tenant_links_profile_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/driver_tenant_links.sql
-- Dependencies:  driver_tenant_links
-- ============================================================================
CREATE INDEX idx_driver_tenant_links_profile_id ON public.driver_tenant_links USING btree (profile_id);

-- ============================================================================
-- Object:        public.idx_driver_tenant_links_tenant_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/driver_tenant_links.sql
-- Dependencies:  driver_tenant_links
-- ============================================================================
CREATE INDEX idx_driver_tenant_links_tenant_id ON public.driver_tenant_links USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_event_consume_event
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/event_consumption_log.sql
-- Dependencies:  event_consumption_log
-- ============================================================================
CREATE INDEX idx_event_consume_event ON public.event_consumption_log USING btree (event_id);

-- ============================================================================
-- Object:        public.idx_event_outbox_corr
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/event_outbox.sql
-- Dependencies:  event_outbox
-- ============================================================================
CREATE INDEX idx_event_outbox_corr ON public.event_outbox USING btree (correlation_id);

-- ============================================================================
-- Object:        public.idx_event_outbox_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/event_outbox.sql
-- Dependencies:  event_outbox
-- ============================================================================
CREATE INDEX idx_event_outbox_tenant ON public.event_outbox USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_event_outbox_unpub
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/event_outbox.sql
-- Dependencies:  event_outbox
-- ============================================================================
CREATE INDEX idx_event_outbox_unpub ON public.event_outbox USING btree (is_published)
  WHERE (is_published = false);

-- ============================================================================
-- Object:        public.idx_extra_costs_cost_account
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  extra_costs
-- ============================================================================
CREATE INDEX idx_extra_costs_cost_account ON public.extra_costs USING btree (cost_account_id);

-- ============================================================================
-- Object:        public.idx_extra_costs_jo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  extra_costs
-- ============================================================================
CREATE INDEX idx_extra_costs_jo ON public.extra_costs USING btree (jo_id);

-- ============================================================================
-- Object:        public.idx_extra_costs_jo_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  extra_costs
-- ============================================================================
CREATE INDEX idx_extra_costs_jo_status ON public.extra_costs USING btree (jo_id, status);

-- ============================================================================
-- Object:        public.idx_extra_costs_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  extra_costs
-- ============================================================================
CREATE INDEX idx_extra_costs_status ON public.extra_costs USING btree (status);

-- ============================================================================
-- Object:        public.idx_fin_adjustments_invoice
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_adjustments.sql
-- Dependencies:  fin_adjustments
-- ============================================================================
CREATE INDEX idx_fin_adjustments_invoice ON public.fin_adjustments USING btree (invoice_id);

-- ============================================================================
-- Object:        public.idx_fin_adjustments_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_adjustments.sql
-- Dependencies:  fin_adjustments
-- ============================================================================
CREATE INDEX idx_fin_adjustments_tenant ON public.fin_adjustments USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fin_ar_ap_invoice
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_ar_ap.sql
-- Dependencies:  fin_ar_ap
-- ============================================================================
CREATE INDEX idx_fin_ar_ap_invoice ON public.fin_ar_ap USING btree (invoice_id);

-- ============================================================================
-- Object:        public.idx_fin_ar_ap_side
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_ar_ap.sql
-- Dependencies:  fin_ar_ap
-- ============================================================================
CREATE INDEX idx_fin_ar_ap_side ON public.fin_ar_ap USING btree (side);

-- ============================================================================
-- Object:        public.idx_fin_ar_ap_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_ar_ap.sql
-- Dependencies:  fin_ar_ap
-- ============================================================================
CREATE INDEX idx_fin_ar_ap_status ON public.fin_ar_ap USING btree (status);

-- ============================================================================
-- Object:        public.idx_fin_ar_ap_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_ar_ap.sql
-- Dependencies:  fin_ar_ap
-- ============================================================================
CREATE INDEX idx_fin_ar_ap_tenant ON public.fin_ar_ap USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_billable_events_line
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_billable_events.sql
-- Dependencies:  fin_billable_events
-- ============================================================================
CREATE INDEX idx_billable_events_line ON public.fin_billable_events USING btree (so_line_item_id);

-- ============================================================================
-- Object:        public.idx_billable_events_so
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_billable_events.sql
-- Dependencies:  fin_billable_events
-- ============================================================================
CREATE INDEX idx_billable_events_so ON public.fin_billable_events USING btree (sales_order_id);

-- ============================================================================
-- Object:        public.idx_billable_events_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_billable_events.sql
-- Dependencies:  fin_billable_events
-- ============================================================================
CREATE INDEX idx_billable_events_status ON public.fin_billable_events USING btree (status);

-- ============================================================================
-- Object:        public.idx_billable_events_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_billable_events.sql
-- Dependencies:  fin_billable_events
-- ============================================================================
CREATE INDEX idx_billable_events_tenant ON public.fin_billable_events USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fin_ledger_shp
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_financial_ledger_entries.sql
-- Dependencies:  fin_financial_ledger_entries
-- ============================================================================
CREATE INDEX idx_fin_ledger_shp ON public.fin_financial_ledger_entries USING btree (shipment_id);

-- ============================================================================
-- Object:        public.idx_fin_ledger_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_financial_ledger_entries.sql
-- Dependencies:  fin_financial_ledger_entries
-- ============================================================================
CREATE INDEX idx_fin_ledger_tenant ON public.fin_financial_ledger_entries USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fin_ledger_wo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_financial_ledger_entries.sql
-- Dependencies:  fin_financial_ledger_entries
-- ============================================================================
CREATE INDEX idx_fin_ledger_wo ON public.fin_financial_ledger_entries USING btree (work_order_id);

-- ============================================================================
-- Object:        public.idx_fin_invoice_lines_event
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_invoice_lines.sql
-- Dependencies:  fin_invoice_lines
-- ============================================================================
CREATE INDEX idx_fin_invoice_lines_event ON public.fin_invoice_lines USING btree (billable_event_id);

-- ============================================================================
-- Object:        public.idx_fin_invoice_lines_event_null
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_invoice_lines.sql
-- Dependencies:  fin_invoice_lines
-- ============================================================================
CREATE INDEX idx_fin_invoice_lines_event_null ON public.fin_invoice_lines USING btree (billable_event_id)
  WHERE (billable_event_id IS NULL);

-- ============================================================================
-- Object:        public.idx_fin_invoice_lines_invoice
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_invoice_lines.sql
-- Dependencies:  fin_invoice_lines
-- ============================================================================
CREATE INDEX idx_fin_invoice_lines_invoice ON public.fin_invoice_lines USING btree (invoice_id);

-- ============================================================================
-- Object:        public.uq_fin_invoice_lines_billable_event
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_invoice_lines.sql
-- Dependencies:  fin_invoice_lines
-- ============================================================================
CREATE UNIQUE INDEX uq_fin_invoice_lines_billable_event ON public.fin_invoice_lines USING btree (billable_event_id)
  WHERE (billable_event_id IS NOT NULL);

-- ============================================================================
-- Object:        public.idx_fin_invoices_customer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_invoices.sql
-- Dependencies:  fin_invoices
-- ============================================================================
CREATE INDEX idx_fin_invoices_customer ON public.fin_invoices USING btree (customer_id);

-- ============================================================================
-- Object:        public.idx_fin_invoices_so
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_invoices.sql
-- Dependencies:  fin_invoices
-- ============================================================================
CREATE INDEX idx_fin_invoices_so ON public.fin_invoices USING btree (sales_order_id);

-- ============================================================================
-- Object:        public.idx_fin_invoices_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_invoices.sql
-- Dependencies:  fin_invoices
-- ============================================================================
CREATE INDEX idx_fin_invoices_status ON public.fin_invoices USING btree (status);

-- ============================================================================
-- Object:        public.idx_fin_invoices_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_invoices.sql
-- Dependencies:  fin_invoices
-- ============================================================================
CREATE INDEX idx_fin_invoices_tenant ON public.fin_invoices USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fin_allocations_invoice
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_payment_allocations.sql
-- Dependencies:  fin_payment_allocations
-- ============================================================================
CREATE INDEX idx_fin_allocations_invoice ON public.fin_payment_allocations USING btree (invoice_id);

-- ============================================================================
-- Object:        public.idx_fin_allocations_payment
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_payment_allocations.sql
-- Dependencies:  fin_payment_allocations
-- ============================================================================
CREATE INDEX idx_fin_allocations_payment ON public.fin_payment_allocations USING btree (payment_id);

-- ============================================================================
-- Object:        public.idx_fin_allocations_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_payment_allocations.sql
-- Dependencies:  fin_payment_allocations
-- ============================================================================
CREATE INDEX idx_fin_allocations_status ON public.fin_payment_allocations USING btree (status);

-- ============================================================================
-- Object:        public.idx_fin_allocations_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_payment_allocations.sql
-- Dependencies:  fin_payment_allocations
-- ============================================================================
CREATE INDEX idx_fin_allocations_tenant ON public.fin_payment_allocations USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fin_payments_date
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_payments.sql
-- Dependencies:  fin_payments
-- ============================================================================
CREATE INDEX idx_fin_payments_date ON public.fin_payments USING btree (payment_date);

-- ============================================================================
-- Object:        public.idx_fin_payments_direction
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_payments.sql
-- Dependencies:  fin_payments
-- ============================================================================
CREATE INDEX idx_fin_payments_direction ON public.fin_payments USING btree (direction);

-- ============================================================================
-- Object:        public.idx_fin_payments_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_payments.sql
-- Dependencies:  fin_payments
-- ============================================================================
CREATE INDEX idx_fin_payments_status ON public.fin_payments USING btree (status);

-- ============================================================================
-- Object:        public.idx_fin_payments_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_payments.sql
-- Dependencies:  fin_payments
-- ============================================================================
CREATE INDEX idx_fin_payments_tenant ON public.fin_payments USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fin_recon_external
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_reconciliation_records.sql
-- Dependencies:  fin_reconciliation_records
-- ============================================================================
CREATE INDEX idx_fin_recon_external ON public.fin_reconciliation_records USING btree (external_reference);

-- ============================================================================
-- Object:        public.idx_fin_recon_payment
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_reconciliation_records.sql
-- Dependencies:  fin_reconciliation_records
-- ============================================================================
CREATE INDEX idx_fin_recon_payment ON public.fin_reconciliation_records USING btree (payment_id);

-- ============================================================================
-- Object:        public.idx_fin_recon_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_reconciliation_records.sql
-- Dependencies:  fin_reconciliation_records
-- ============================================================================
CREATE INDEX idx_fin_recon_status ON public.fin_reconciliation_records USING btree (status);

-- ============================================================================
-- Object:        public.idx_fin_recon_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_reconciliation_records.sql
-- Dependencies:  fin_reconciliation_records
-- ============================================================================
CREATE INDEX idx_fin_recon_tenant ON public.fin_reconciliation_records USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fin_settlements_allocation
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_settlements.sql
-- Dependencies:  fin_settlements
-- ============================================================================
CREATE INDEX idx_fin_settlements_allocation ON public.fin_settlements USING btree (allocation_id);

-- ============================================================================
-- Object:        public.idx_fin_settlements_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_settlements.sql
-- Dependencies:  fin_settlements
-- ============================================================================
CREATE INDEX idx_fin_settlements_status ON public.fin_settlements USING btree (status);

-- ============================================================================
-- Object:        public.idx_fin_settlements_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fin_settlements.sql
-- Dependencies:  fin_settlements
-- ============================================================================
CREATE INDEX idx_fin_settlements_tenant ON public.fin_settlements USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_finance_journals_wo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/finance_journals.sql
-- Dependencies:  finance_journals
-- ============================================================================
CREATE INDEX idx_finance_journals_wo ON public.finance_journals USING btree (wo_id);

-- ============================================================================
-- Object:        public.idx_fleet_gps_status_fleet
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fleet_gps_status.sql
-- Dependencies:  fleet_gps_status
-- ============================================================================
CREATE INDEX idx_fleet_gps_status_fleet ON public.fleet_gps_status USING btree (fleet_id);

-- ============================================================================
-- Object:        public.idx_fleet_gps_status_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fleet_gps_status.sql
-- Dependencies:  fleet_gps_status
-- ============================================================================
CREATE INDEX idx_fleet_gps_status_tenant ON public.fleet_gps_status USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fleet_gps_status_tenant_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fleet_gps_status.sql
-- Dependencies:  fleet_gps_status
-- ============================================================================
CREATE INDEX idx_fleet_gps_status_tenant_id ON public.fleet_gps_status USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fleet_inspections_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fleet_inspections.sql
-- Dependencies:  fleet_inspections
-- ============================================================================
CREATE INDEX idx_fleet_inspections_tenant ON public.fleet_inspections USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fw_consolidations_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_consolidations.sql
-- Dependencies:  fw_consolidations
-- ============================================================================
CREATE INDEX idx_fw_consolidations_tenant ON public.fw_consolidations USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fw_container_assignments_consol
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_container_assignments.sql
-- Dependencies:  fw_container_assignments
-- ============================================================================
CREATE INDEX idx_fw_container_assignments_consol ON public.fw_container_assignments USING btree (consolidation_id);

-- ============================================================================
-- Object:        public.idx_fw_container_items_assignment
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  fw_container_items
-- ============================================================================
CREATE INDEX idx_fw_container_items_assignment ON public.fw_container_items USING btree (container_assignment_id);

-- ============================================================================
-- Object:        public.idx_fw_container_items_wo_item
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  fw_container_items
-- ============================================================================
CREATE INDEX idx_fw_container_items_wo_item ON public.fw_container_items USING btree (wo_item_id);

-- ============================================================================
-- Object:        public.idx_fw_legs_leg_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_legs.sql
-- Dependencies:  fw_legs
-- ============================================================================
CREATE INDEX idx_fw_legs_leg_type ON public.fw_legs USING btree (leg_type);

-- ============================================================================
-- Object:        public.idx_fw_legs_order
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_legs.sql
-- Dependencies:  fw_legs
-- ============================================================================
CREATE INDEX idx_fw_legs_order ON public.fw_legs USING btree (order_id);

-- ============================================================================
-- Object:        public.idx_fw_legs_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_legs.sql
-- Dependencies:  fw_legs
-- ============================================================================
CREATE INDEX idx_fw_legs_status ON public.fw_legs USING btree (status);

-- ============================================================================
-- Object:        public.idx_fw_legs_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_legs.sql
-- Dependencies:  fw_legs
-- ============================================================================
CREATE INDEX idx_fw_legs_tenant ON public.fw_legs USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fw_order_headers_customer_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_order_headers.sql
-- Dependencies:  fw_order_headers
-- ============================================================================
CREATE INDEX idx_fw_order_headers_customer_id ON public.fw_order_headers USING btree (customer_id);

-- ============================================================================
-- Object:        public.idx_fw_order_headers_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_order_headers.sql
-- Dependencies:  fw_order_headers
-- ============================================================================
CREATE INDEX idx_fw_order_headers_status ON public.fw_order_headers USING btree (status);

-- ============================================================================
-- Object:        public.idx_fw_order_headers_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_order_headers.sql
-- Dependencies:  fw_order_headers
-- ============================================================================
CREATE INDEX idx_fw_order_headers_tenant ON public.fw_order_headers USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_fw_order_headers_work_order_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_order_headers.sql
-- Dependencies:  fw_order_headers
-- ============================================================================
CREATE INDEX idx_fw_order_headers_work_order_id ON public.fw_order_headers USING btree (work_order_id);

-- ============================================================================
-- Object:        public.idx_fw_price_master_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/fw_price_master.sql
-- Dependencies:  fw_price_master
-- ============================================================================
CREATE INDEX idx_fw_price_master_tenant ON public.fw_price_master USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_geofence_events_session
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/geofence_events.sql
-- Dependencies:  geofence_events
-- ============================================================================
CREATE INDEX idx_geofence_events_session ON public.geofence_events USING btree (session_id, recorded_at);

-- ============================================================================
-- Object:        public.idx_gps_provider_configs_active
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/gps_provider_configs.sql
-- Dependencies:  gps_provider_configs
-- ============================================================================
CREATE INDEX idx_gps_provider_configs_active ON public.gps_provider_configs USING btree (tenant_id, is_active)
  WHERE (is_active = true);

-- ============================================================================
-- Object:        public.idx_gps_provider_configs_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/gps_provider_configs.sql
-- Dependencies:  gps_provider_configs
-- ============================================================================
CREATE INDEX idx_gps_provider_configs_tenant ON public.gps_provider_configs USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_ground_documents_event
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/ground_documents.sql
-- Dependencies:  ground_documents
-- ============================================================================
CREATE INDEX idx_ground_documents_event ON public.ground_documents USING btree (ground_event_id);

-- ============================================================================
-- Object:        public.idx_ground_events_created
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/ground_events.sql
-- Dependencies:  ground_events
-- ============================================================================
CREATE INDEX idx_ground_events_created ON public.ground_events USING btree (created_at);

-- ============================================================================
-- Object:        public.idx_ground_events_jo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/ground_events.sql
-- Dependencies:  ground_events
-- ============================================================================
CREATE INDEX idx_ground_events_jo ON public.ground_events USING btree (job_order_id);

-- ============================================================================
-- Object:        public.idx_ground_events_site
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/ground_events.sql
-- Dependencies:  ground_events
-- ============================================================================
CREATE INDEX idx_ground_events_site ON public.ground_events USING btree (site_id);

-- ============================================================================
-- Object:        public.idx_ground_events_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/ground_events.sql
-- Dependencies:  ground_events
-- ============================================================================
CREATE INDEX idx_ground_events_type ON public.ground_events USING btree (event_type);

-- ============================================================================
-- Object:        public.idx_ground_sites_location
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/ground_sites.sql
-- Dependencies:  ground_sites
-- ============================================================================
CREATE INDEX idx_ground_sites_location ON public.ground_sites USING btree (latitude, longitude);

-- ============================================================================
-- Object:        public.idx_ground_sites_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/ground_sites.sql
-- Dependencies:  ground_sites
-- ============================================================================
CREATE INDEX idx_ground_sites_tenant ON public.ground_sites USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_ground_staff_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/ground_staff_profiles.sql
-- Dependencies:  ground_staff_profiles
-- ============================================================================
CREATE INDEX idx_ground_staff_tenant ON public.ground_staff_profiles USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_hs_edges_from
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/hs_edges.sql
-- Dependencies:  hs_edges
-- ============================================================================
CREATE INDEX idx_hs_edges_from ON public.hs_edges USING btree (from_node);

-- ============================================================================
-- Object:        public.idx_hs_edges_to
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/hs_edges.sql
-- Dependencies:  hs_edges
-- ============================================================================
CREATE INDEX idx_hs_edges_to ON public.hs_edges USING btree (to_node);

-- ============================================================================
-- Object:        public.idx_hs_embeddings_vector
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/hs_embeddings.sql
-- Dependencies:  hs_embeddings
-- ============================================================================
CREATE INDEX idx_hs_embeddings_vector ON public.hs_embeddings USING hnsw (embedding public.vector_cosine_ops);

-- ============================================================================
-- Object:        public.idx_hs_job_tracking_job_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/hs_job_tracking.sql
-- Dependencies:  hs_job_tracking
-- ============================================================================
CREATE INDEX idx_hs_job_tracking_job_id ON public.hs_job_tracking USING btree (job_id);

-- ============================================================================
-- Object:        public.idx_hs_nodes_name
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/hs_nodes.sql
-- Dependencies:  hs_nodes
-- ============================================================================
CREATE INDEX idx_hs_nodes_name ON public.hs_nodes USING btree (name);

-- ============================================================================
-- Object:        public.idx_hs_nodes_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/hs_nodes.sql
-- Dependencies:  hs_nodes
-- ============================================================================
CREATE INDEX idx_hs_nodes_type ON public.hs_nodes USING btree (TYPE);

-- ============================================================================
-- Object:        public.idx_hs_requests_log_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/hs_requests_log.sql
-- Dependencies:  hs_requests_log
-- ============================================================================
CREATE INDEX idx_hs_requests_log_tenant ON public.hs_requests_log USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_intr_country_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/intr_rules.sql
-- Dependencies:  intr_rules
-- ============================================================================
CREATE INDEX idx_intr_country_status ON public.intr_rules USING btree (country_code, status);

-- ============================================================================
-- Object:        public.idx_intr_hs_country
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/intr_rules.sql
-- Dependencies:  intr_rules
-- ============================================================================
CREATE INDEX idx_intr_hs_country ON public.intr_rules USING btree (hs_code, country_code);

-- ============================================================================
-- Object:        public.idx_inventory_unique_stock
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/inventory.sql
-- Dependencies:  inventory
-- ============================================================================
CREATE UNIQUE INDEX idx_inventory_unique_stock ON public.inventory USING btree (product_id, warehouse_id, customer_id, location_barcode, status, COALESCE(lot_number, ''::text));

-- ============================================================================
-- Object:        public.idx_inventory_movement_changed
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/inventory_movement_history.sql
-- Dependencies:  inventory_movement_history
-- ============================================================================
CREATE INDEX idx_inventory_movement_changed ON public.inventory_movement_history USING btree (changed_at DESC);

-- ============================================================================
-- Object:        public.idx_inventory_movement_item
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/inventory_movement_history.sql
-- Dependencies:  inventory_movement_history
-- ============================================================================
CREATE INDEX idx_inventory_movement_item ON public.inventory_movement_history USING btree (item_id);

-- ============================================================================
-- Object:        public.idx_invoice_line_items_invoice
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/invoice_line_items.sql
-- Dependencies:  invoice_line_items
-- ============================================================================
CREATE INDEX idx_invoice_line_items_invoice ON public.invoice_line_items USING btree (invoice_id);

-- ============================================================================
-- Object:        public.idx_invoice_line_items_jo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/invoice_line_items.sql
-- Dependencies:  invoice_line_items
-- ============================================================================
CREATE INDEX idx_invoice_line_items_jo ON public.invoice_line_items USING btree (jo_id);

-- ============================================================================
-- Object:        public.idx_invoice_lines_extra_cost
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/invoice_lines.sql
-- Dependencies:  invoice_lines
-- ============================================================================
CREATE INDEX idx_invoice_lines_extra_cost ON public.invoice_lines USING btree (extra_cost_id);

-- ============================================================================
-- Object:        public.idx_invoice_lines_invoice
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/invoice_lines.sql
-- Dependencies:  invoice_lines
-- ============================================================================
CREATE INDEX idx_invoice_lines_invoice ON public.invoice_lines USING btree (invoice_id);

-- ============================================================================
-- Object:        public.idx_invoice_lines_jo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/invoice_lines.sql
-- Dependencies:  invoice_lines
-- ============================================================================
CREATE INDEX idx_invoice_lines_jo ON public.invoice_lines USING btree (job_order_id);

-- ============================================================================
-- Object:        public.idx_invoices_created_at
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  invoices
-- ============================================================================
CREATE INDEX idx_invoices_created_at ON public.invoices USING btree (created_at);

-- ============================================================================
-- Object:        public.idx_invoices_customer_accepted
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  invoices
-- ============================================================================
CREATE INDEX idx_invoices_customer_accepted ON public.invoices USING btree (customer_accepted_invoice_at)
  WHERE (customer_accepted_invoice_at IS NOT NULL);

-- ============================================================================
-- Object:        public.idx_invoices_due_date
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  invoices
-- ============================================================================
CREATE INDEX idx_invoices_due_date ON public.invoices USING btree (due_date);

-- ============================================================================
-- Object:        public.idx_invoices_paid
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  invoices
-- ============================================================================
CREATE INDEX idx_invoices_paid ON public.invoices USING btree (paid_at)
  WHERE (paid_at IS NOT NULL);

-- ============================================================================
-- Object:        public.idx_invoices_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  invoices
-- ============================================================================
CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);

-- ============================================================================
-- Object:        public.idx_invoices_wo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  invoices
-- ============================================================================
CREATE INDEX idx_invoices_wo ON public.invoices USING btree (wo_id);

-- ============================================================================
-- Object:        public.idx_jo_payments_job_order
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_order_payments.sql
-- Dependencies:  job_order_payments
-- ============================================================================
CREATE INDEX idx_jo_payments_job_order ON public.job_order_payments USING btree (job_order_id);

-- ============================================================================
-- Object:        public.idx_jo_payments_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_order_payments.sql
-- Dependencies:  job_order_payments
-- ============================================================================
CREATE INDEX idx_jo_payments_status ON public.job_order_payments USING btree (status);

-- ============================================================================
-- Object:        public.idx_jo_payments_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_order_payments.sql
-- Dependencies:  job_order_payments
-- ============================================================================
CREATE INDEX idx_jo_payments_type ON public.job_order_payments USING btree (payment_type);

-- ============================================================================
-- Object:        public.idx_job_orders_assigned_warehouse
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_job_orders_assigned_warehouse ON public.job_orders USING btree (assigned_warehouse_id);

-- ============================================================================
-- Object:        public.idx_job_orders_autocomplete
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_job_orders_autocomplete ON public.job_orders USING btree (status, departure_detected_at)
  WHERE ((status = 'MENUNGGU SELESAI'::text) AND (departure_detected_at IS NOT NULL));

-- ============================================================================
-- Object:        public.idx_job_orders_autostart
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_job_orders_autostart ON public.job_orders USING btree (status, assigned_at)
  WHERE ((status = 'ASSIGNED'::text) AND (assigned_at IS NOT NULL));

-- ============================================================================
-- Object:        public.idx_job_orders_container_number
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_job_orders_container_number ON public.job_orders USING btree (container_number);

-- ============================================================================
-- Object:        public.idx_job_orders_cost_account
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_job_orders_cost_account ON public.job_orders USING btree (cost_account_id);

-- ============================================================================
-- Object:        public.idx_job_orders_dispatch_ready
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_job_orders_dispatch_ready ON public.job_orders USING btree (dispatch_ready)
  WHERE (dispatch_ready = true);

-- ============================================================================
-- Object:        public.idx_job_orders_sbu_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_job_orders_sbu_type ON public.job_orders USING btree (sbu_type);

-- ============================================================================
-- Object:        public.idx_job_orders_tenant_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_job_orders_tenant_id ON public.job_orders USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_job_orders_vendor_tenant_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_job_orders_vendor_tenant_id ON public.job_orders USING btree (vendor_tenant_id);

-- ============================================================================
-- Object:        public.idx_job_orders_warehouse
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_job_orders_warehouse ON public.job_orders USING btree (warehouse_id);

-- ============================================================================
-- Object:        public.idx_truck_jo_driver
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_truck_jo_driver ON public.job_orders USING btree (driver_id);

-- ============================================================================
-- Object:        public.idx_truck_jo_fleet
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_truck_jo_fleet ON public.job_orders USING btree (fleet_id);

-- ============================================================================
-- Object:        public.idx_truck_jo_item
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_truck_jo_item ON public.job_orders USING btree (wo_item_id);

-- ============================================================================
-- Object:        public.idx_truck_jo_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE INDEX idx_truck_jo_status ON public.job_orders USING btree (status);

-- ============================================================================
-- Object:        public.idx_job_routes_jo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_routes.sql
-- Dependencies:  job_routes
-- ============================================================================
CREATE INDEX idx_job_routes_jo ON public.job_routes USING btree (job_order_id);

-- ============================================================================
-- Object:        public.idx_job_routes_job_order
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_routes.sql
-- Dependencies:  job_routes
-- ============================================================================
CREATE INDEX idx_job_routes_job_order ON public.job_routes USING btree (job_order_id);

-- ============================================================================
-- Object:        public.idx_job_routes_sequence
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_routes.sql
-- Dependencies:  job_routes
-- ============================================================================
CREATE INDEX idx_job_routes_sequence ON public.job_routes USING btree (job_order_id, SEQUENCE);

-- ============================================================================
-- Object:        public.idx_job_routes_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_routes.sql
-- Dependencies:  job_routes
-- ============================================================================
CREATE INDEX idx_job_routes_status ON public.job_routes USING btree (status);

-- ============================================================================
-- Object:        public.idx_job_status_history_changed
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_status_history.sql
-- Dependencies:  job_status_history
-- ============================================================================
CREATE INDEX idx_job_status_history_changed ON public.job_status_history USING btree (changed_at DESC);

-- ============================================================================
-- Object:        public.idx_job_status_history_job
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_status_history.sql
-- Dependencies:  job_status_history
-- ============================================================================
CREATE INDEX idx_job_status_history_job ON public.job_status_history USING btree (job_order_id);

-- ============================================================================
-- Object:        public.idx_job_tracking_recorded_at
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_tracking.sql
-- Dependencies:  job_tracking
-- ============================================================================
CREATE INDEX idx_job_tracking_recorded_at ON public.job_tracking USING btree (job_order_id, recorded_at);

-- ============================================================================
-- Object:        public.idx_job_tracking_unique_ping
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/job_tracking.sql
-- Dependencies:  job_tracking
-- ============================================================================
CREATE UNIQUE INDEX idx_job_tracking_unique_ping ON public.job_tracking USING btree (job_order_id, client_ping_id);

-- ============================================================================
-- Object:        public.idx_md_billing_rates_contract
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_billing_rates.sql
-- Dependencies:  md_billing_rates
-- ============================================================================
CREATE INDEX idx_md_billing_rates_contract ON public.md_billing_rates USING btree (contract_id);

-- ============================================================================
-- Object:        public.idx_md_billing_rates_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_billing_rates.sql
-- Dependencies:  md_billing_rates
-- ============================================================================
CREATE INDEX idx_md_billing_rates_tenant ON public.md_billing_rates USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_contract_warehouses_contract
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_contract_warehouses.sql
-- Dependencies:  md_contract_warehouses
-- ============================================================================
CREATE INDEX idx_md_contract_warehouses_contract ON public.md_contract_warehouses USING btree (contract_id);

-- ============================================================================
-- Object:        public.idx_md_contract_warehouses_warehouse
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_contract_warehouses.sql
-- Dependencies:  md_contract_warehouses
-- ============================================================================
CREATE INDEX idx_md_contract_warehouses_warehouse ON public.md_contract_warehouses USING btree (warehouse_id);

-- ============================================================================
-- Object:        public.idx_md_customer_users_email
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_customer_users.sql
-- Dependencies:  md_customer_users
-- ============================================================================
CREATE INDEX idx_md_customer_users_email ON public.md_customer_users USING btree (email);

-- ============================================================================
-- Object:        public.idx_md_customer_users_tenant_customer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_customer_users.sql
-- Dependencies:  md_customer_users
-- ============================================================================
CREATE INDEX idx_md_customer_users_tenant_customer ON public.md_customer_users USING btree (tenant_id, customer_id);

-- ============================================================================
-- Object:        public.idx_md_customer_users_user_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_customer_users.sql
-- Dependencies:  md_customer_users
-- ============================================================================
CREATE INDEX idx_md_customer_users_user_id ON public.md_customer_users USING btree (user_id);

-- ============================================================================
-- Object:        public.idx_cus_hs_chapter
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_customs_hs_codes.sql
-- Dependencies:  md_customs_hs_codes
-- ============================================================================
CREATE INDEX idx_cus_hs_chapter ON public.md_customs_hs_codes USING btree (chapter);

-- ============================================================================
-- Object:        public.idx_cus_hs_code_search
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_customs_hs_codes.sql
-- Dependencies:  md_customs_hs_codes
-- ============================================================================
CREATE INDEX idx_cus_hs_code_search ON public.md_customs_hs_codes USING btree (hs_code);

-- ============================================================================
-- Object:        public.idx_driver_allowances_lookup
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_driver_allowances.sql
-- Dependencies:  md_driver_allowances
-- ============================================================================
CREATE INDEX idx_driver_allowances_lookup ON public.md_driver_allowances USING btree (tenant_id, origin_city, destination_city, fleet_type_id);

-- ============================================================================
-- Object:        public.idx_md_drivers_entity
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  md_drivers
-- ============================================================================
CREATE INDEX idx_md_drivers_entity ON public.md_drivers USING btree (entity_id);

-- ============================================================================
-- Object:        public.idx_md_drivers_has_native_app
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  md_drivers
-- ============================================================================
CREATE INDEX idx_md_drivers_has_native_app ON public.md_drivers USING btree (has_native_app);

-- ============================================================================
-- Object:        public.idx_md_drivers_is_working
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  md_drivers
-- ============================================================================
CREATE INDEX idx_md_drivers_is_working ON public.md_drivers USING btree (is_working);

-- ============================================================================
-- Object:        public.idx_md_drivers_phone
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  md_drivers
-- ============================================================================
CREATE INDEX idx_md_drivers_phone ON public.md_drivers USING btree (phone);

-- ============================================================================
-- Object:        public.idx_md_drivers_push_subscription
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  md_drivers
-- ============================================================================
CREATE INDEX idx_md_drivers_push_subscription ON public.md_drivers USING gin (push_subscription)
  WHERE (push_subscription IS NOT NULL);

-- ============================================================================
-- Object:        public.idx_md_drivers_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  md_drivers
-- ============================================================================
CREATE INDEX idx_md_drivers_status ON public.md_drivers USING btree (status);

-- ============================================================================
-- Object:        public.idx_md_drivers_tenant_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  md_drivers
-- ============================================================================
CREATE INDEX idx_md_drivers_tenant_id ON public.md_drivers USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_drivers_tenant_working
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  md_drivers
-- ============================================================================
CREATE INDEX idx_md_drivers_tenant_working ON public.md_drivers USING btree (tenant_id, is_working)
  WHERE (is_working = true);

-- ============================================================================
-- Object:        public.md_drivers_tenant_whatsapp_unique
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  md_drivers
-- ============================================================================
CREATE UNIQUE INDEX md_drivers_tenant_whatsapp_unique ON public.md_drivers USING btree (tenant_id, public.normalize_phone((whatsapp)::text))
  WHERE ((whatsapp IS NOT NULL) AND (public.normalize_phone((whatsapp)::text) <> ''::text));

-- ============================================================================
-- Object:        public.idx_md_entities_name
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  md_entities
-- ============================================================================
CREATE INDEX idx_md_entities_name ON public.md_entities USING btree (name);

-- ============================================================================
-- Object:        public.idx_md_entities_name_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  md_entities
-- ============================================================================
CREATE INDEX idx_md_entities_name_tenant ON public.md_entities USING btree (tenant_id, name);

-- ============================================================================
-- Object:        public.idx_md_entities_sales_rep
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  md_entities
-- ============================================================================
CREATE INDEX idx_md_entities_sales_rep ON public.md_entities USING btree (sales_rep_id);

-- ============================================================================
-- Object:        public.idx_md_entities_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  md_entities
-- ============================================================================
CREATE INDEX idx_md_entities_tenant ON public.md_entities USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_entities_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  md_entities
-- ============================================================================
CREATE INDEX idx_md_entities_type ON public.md_entities USING btree (is_customer, is_supplier, is_vendor, is_broker);

-- ============================================================================
-- Object:        public.idx_md_entity_addresses_entity
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_entity_addresses.sql
-- Dependencies:  md_entity_addresses
-- ============================================================================
CREATE INDEX idx_md_entity_addresses_entity ON public.md_entity_addresses USING btree (entity_id);

-- ============================================================================
-- Object:        public.idx_fleets_easygo_vehicle_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  md_fleets
-- ============================================================================
CREATE INDEX idx_fleets_easygo_vehicle_id ON public.md_fleets USING btree (easygo_vehicle_id);

-- ============================================================================
-- Object:        public.idx_md_fleets_entity
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  md_fleets
-- ============================================================================
CREATE INDEX idx_md_fleets_entity ON public.md_fleets USING btree (entity_id);

-- ============================================================================
-- Object:        public.idx_md_fleets_plate
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  md_fleets
-- ============================================================================
CREATE INDEX idx_md_fleets_plate ON public.md_fleets USING btree (plate_number);

-- ============================================================================
-- Object:        public.idx_md_fleets_tenant_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  md_fleets
-- ============================================================================
CREATE INDEX idx_md_fleets_tenant_id ON public.md_fleets USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_fleets_vendor_tenant_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  md_fleets
-- ============================================================================
CREATE INDEX idx_md_fleets_vendor_tenant_id ON public.md_fleets USING btree (vendor_tenant_id);

-- ============================================================================
-- Object:        public.idx_md_locations_code
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_locations.sql
-- Dependencies:  md_locations
-- ============================================================================
CREATE INDEX idx_md_locations_code ON public.md_locations USING btree (location_code);

-- ============================================================================
-- Object:        public.idx_md_locations_tenant_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_locations.sql
-- Dependencies:  md_locations
-- ============================================================================
CREATE INDEX idx_md_locations_tenant_id ON public.md_locations USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_product_categories_parent
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_product_categories.sql
-- Dependencies:  md_product_categories
-- ============================================================================
CREATE INDEX idx_md_product_categories_parent ON public.md_product_categories USING btree (parent_id);

-- ============================================================================
-- Object:        public.idx_md_product_categories_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_product_categories.sql
-- Dependencies:  md_product_categories
-- ============================================================================
CREATE INDEX idx_md_product_categories_tenant ON public.md_product_categories USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_product_skus_category
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  md_product_skus
-- ============================================================================
CREATE INDEX idx_md_product_skus_category ON public.md_product_skus USING btree (category);

-- ============================================================================
-- Object:        public.idx_md_product_skus_category_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  md_product_skus
-- ============================================================================
CREATE INDEX idx_md_product_skus_category_id ON public.md_product_skus USING btree (category_id);

-- ============================================================================
-- Object:        public.idx_md_product_skus_code
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  md_product_skus
-- ============================================================================
CREATE INDEX idx_md_product_skus_code ON public.md_product_skus USING btree (sku_code);

-- ============================================================================
-- Object:        public.idx_md_product_skus_customer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  md_product_skus
-- ============================================================================
CREATE INDEX idx_md_product_skus_customer ON public.md_product_skus USING btree (customer_id);

-- ============================================================================
-- Object:        public.idx_md_product_skus_ean
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  md_product_skus
-- ============================================================================
CREATE INDEX idx_md_product_skus_ean ON public.md_product_skus USING btree (ean_code);

-- ============================================================================
-- Object:        public.idx_md_product_skus_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  md_product_skus
-- ============================================================================
CREATE INDEX idx_md_product_skus_tenant ON public.md_product_skus USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_product_skus_upc
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  md_product_skus
-- ============================================================================
CREATE INDEX idx_md_product_skus_upc ON public.md_product_skus USING btree (upc_code);

-- ============================================================================
-- Object:        public.idx_md_storage_contracts_customer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_storage_contracts.sql
-- Dependencies:  md_storage_contracts
-- ============================================================================
CREATE INDEX idx_md_storage_contracts_customer ON public.md_storage_contracts USING btree (customer_id);

-- ============================================================================
-- Object:        public.idx_md_storage_contracts_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_storage_contracts.sql
-- Dependencies:  md_storage_contracts
-- ============================================================================
CREATE INDEX idx_md_storage_contracts_status ON public.md_storage_contracts USING btree (status);

-- ============================================================================
-- Object:        public.idx_md_storage_contracts_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_storage_contracts.sql
-- Dependencies:  md_storage_contracts
-- ============================================================================
CREATE INDEX idx_md_storage_contracts_tenant ON public.md_storage_contracts USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_storage_contracts_wh
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_storage_contracts.sql
-- Dependencies:  md_storage_contracts
-- ============================================================================
CREATE INDEX idx_md_storage_contracts_wh ON public.md_storage_contracts USING btree (warehouse_id);

-- ============================================================================
-- Object:        public.idx_md_taxes_active
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_taxes.sql
-- Dependencies:  md_taxes
-- ============================================================================
CREATE INDEX idx_md_taxes_active ON public.md_taxes USING btree (is_active);

-- ============================================================================
-- Object:        public.idx_md_taxes_code
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_taxes.sql
-- Dependencies:  md_taxes
-- ============================================================================
CREATE INDEX idx_md_taxes_code ON public.md_taxes USING btree (code);

-- ============================================================================
-- Object:        public.idx_md_tenants_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_tenants.sql
-- Dependencies:  md_tenants
-- ============================================================================
CREATE INDEX idx_md_tenants_status ON public.md_tenants USING btree (status);

-- ============================================================================
-- Object:        public.uq_md_tenant_code
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_tenants.sql
-- Dependencies:  md_tenants
-- ============================================================================
CREATE UNIQUE INDEX uq_md_tenant_code ON public.md_tenants USING btree (tenant_code)
  WHERE (tenant_code IS NOT NULL);

-- ============================================================================
-- Object:        public.idx_trucking_regions_level
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_trucking_regions.sql
-- Dependencies:  md_trucking_regions
-- ============================================================================
CREATE INDEX idx_trucking_regions_level ON public.md_trucking_regions USING btree (tenant_id, level);

-- ============================================================================
-- Object:        public.idx_trucking_regions_parent
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_trucking_regions.sql
-- Dependencies:  md_trucking_regions
-- ============================================================================
CREATE INDEX idx_trucking_regions_parent ON public.md_trucking_regions USING btree (parent_id);

-- ============================================================================
-- Object:        public.idx_trucking_regions_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_trucking_regions.sql
-- Dependencies:  md_trucking_regions
-- ============================================================================
CREATE INDEX idx_trucking_regions_tenant ON public.md_trucking_regions USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_uoms_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_uoms.sql
-- Dependencies:  md_uoms
-- ============================================================================
CREATE INDEX idx_md_uoms_tenant ON public.md_uoms USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_warehouse_areas_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouse_areas.sql
-- Dependencies:  md_warehouse_areas
-- ============================================================================
CREATE INDEX idx_md_warehouse_areas_tenant ON public.md_warehouse_areas USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_warehouse_areas_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouse_areas.sql
-- Dependencies:  md_warehouse_areas
-- ============================================================================
CREATE INDEX idx_md_warehouse_areas_type ON public.md_warehouse_areas USING btree (area_type);

-- ============================================================================
-- Object:        public.idx_md_warehouse_areas_wh
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouse_areas.sql
-- Dependencies:  md_warehouse_areas
-- ============================================================================
CREATE INDEX idx_md_warehouse_areas_wh ON public.md_warehouse_areas USING btree (warehouse_id);

-- ============================================================================
-- Object:        public.idx_md_warehouse_locations_code
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouse_locations.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
CREATE INDEX idx_md_warehouse_locations_code ON public.md_warehouse_locations USING btree (code);

-- ============================================================================
-- Object:        public.idx_md_warehouse_locations_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouse_locations.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
CREATE INDEX idx_md_warehouse_locations_tenant ON public.md_warehouse_locations USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_warehouse_locations_wh
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouse_locations.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
CREATE INDEX idx_md_warehouse_locations_wh ON public.md_warehouse_locations USING btree (warehouse_id);

-- ============================================================================
-- Object:        public.idx_md_wh_staff_sbu
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouse_staff.sql
-- Dependencies:  md_warehouse_staff
-- ============================================================================
CREATE INDEX idx_md_wh_staff_sbu ON public.md_warehouse_staff USING btree (sbu_id);

-- ============================================================================
-- Object:        public.idx_md_wh_staff_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouse_staff.sql
-- Dependencies:  md_warehouse_staff
-- ============================================================================
CREATE INDEX idx_md_wh_staff_tenant ON public.md_warehouse_staff USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_wh_staff_wa
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouse_staff.sql
-- Dependencies:  md_warehouse_staff
-- ============================================================================
CREATE INDEX idx_md_wh_staff_wa ON public.md_warehouse_staff USING btree (whatsapp);

-- ============================================================================
-- Object:        public.idx_md_warehouse_zones_area
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouse_zones.sql
-- Dependencies:  md_warehouse_zones
-- ============================================================================
CREATE INDEX idx_md_warehouse_zones_area ON public.md_warehouse_zones USING btree (area_id);

-- ============================================================================
-- Object:        public.idx_md_warehouse_zones_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouse_zones.sql
-- Dependencies:  md_warehouse_zones
-- ============================================================================
CREATE INDEX idx_md_warehouse_zones_tenant ON public.md_warehouse_zones USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_md_warehouses_code
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouses.sql
-- Dependencies:  md_warehouses
-- ============================================================================
CREATE INDEX idx_md_warehouses_code ON public.md_warehouses USING btree (code);

-- ============================================================================
-- Object:        public.idx_md_warehouses_org
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouses.sql
-- Dependencies:  md_warehouses
-- ============================================================================
CREATE INDEX idx_md_warehouses_org ON public.md_warehouses USING btree (organization_id);

-- ============================================================================
-- Object:        public.idx_md_warehouses_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/md_warehouses.sql
-- Dependencies:  md_warehouses
-- ============================================================================
CREATE INDEX idx_md_warehouses_tenant ON public.md_warehouses USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_monitoring_checks_checked
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/monitoring_checks.sql
-- Dependencies:  monitoring_checks
-- ============================================================================
CREATE INDEX idx_monitoring_checks_checked ON public.monitoring_checks USING btree (checked_at DESC);

-- ============================================================================
-- Object:        public.idx_monitoring_checks_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/monitoring_checks.sql
-- Dependencies:  monitoring_checks
-- ============================================================================
CREATE INDEX idx_monitoring_checks_status ON public.monitoring_checks USING btree (status);

-- ============================================================================
-- Object:        public.idx_monitoring_checks_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/monitoring_checks.sql
-- Dependencies:  monitoring_checks
-- ============================================================================
CREATE INDEX idx_monitoring_checks_type ON public.monitoring_checks USING btree (check_type);

-- ============================================================================
-- Object:        public.idx_notifications_created
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/notifications.sql
-- Dependencies:  notifications
-- ============================================================================
CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);

-- ============================================================================
-- Object:        public.idx_notifications_is_read
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/notifications.sql
-- Dependencies:  notifications
-- ============================================================================
CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);

-- ============================================================================
-- Object:        public.idx_notifications_role
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/notifications.sql
-- Dependencies:  notifications
-- ============================================================================
CREATE INDEX idx_notifications_role ON public.notifications USING btree (ROLE);

-- ============================================================================
-- Object:        public.idx_notifications_user
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/notifications.sql
-- Dependencies:  notifications
-- ============================================================================
CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);

-- ============================================================================
-- Object:        public.idx_party_contacts_active
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_contacts.sql
-- Dependencies:  party_contacts
-- ============================================================================
CREATE INDEX idx_party_contacts_active ON public.party_contacts USING btree (tenant_id, party_id, is_active)
  WHERE (is_active = true);

-- ============================================================================
-- Object:        public.idx_party_contacts_party
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_contacts.sql
-- Dependencies:  party_contacts
-- ============================================================================
CREATE INDEX idx_party_contacts_party ON public.party_contacts USING btree (party_id);

-- ============================================================================
-- Object:        public.idx_party_contacts_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_contacts.sql
-- Dependencies:  party_contacts
-- ============================================================================
CREATE INDEX idx_party_contacts_tenant ON public.party_contacts USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_party_locations_location
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_locations.sql
-- Dependencies:  party_locations
-- ============================================================================
CREATE INDEX idx_party_locations_location ON public.party_locations USING btree (location_id);

-- ============================================================================
-- Object:        public.idx_party_locations_party
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_locations.sql
-- Dependencies:  party_locations
-- ============================================================================
CREATE INDEX idx_party_locations_party ON public.party_locations USING btree (party_id);

-- ============================================================================
-- Object:        public.idx_party_locations_rel_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_locations.sql
-- Dependencies:  party_locations
-- ============================================================================
CREATE INDEX idx_party_locations_rel_type ON public.party_locations USING btree (relationship_type);

-- ============================================================================
-- Object:        public.idx_party_locations_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_locations.sql
-- Dependencies:  party_locations
-- ============================================================================
CREATE INDEX idx_party_locations_tenant ON public.party_locations USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_party_rel_from
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_relationships.sql
-- Dependencies:  party_relationships
-- ============================================================================
CREATE INDEX idx_party_rel_from ON public.party_relationships USING btree (from_party_id);

-- ============================================================================
-- Object:        public.idx_party_rel_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_relationships.sql
-- Dependencies:  party_relationships
-- ============================================================================
CREATE INDEX idx_party_rel_tenant ON public.party_relationships USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_party_rel_to
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_relationships.sql
-- Dependencies:  party_relationships
-- ============================================================================
CREATE INDEX idx_party_rel_to ON public.party_relationships USING btree (to_party_id);

-- ============================================================================
-- Object:        public.idx_party_rel_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_relationships.sql
-- Dependencies:  party_relationships
-- ============================================================================
CREATE INDEX idx_party_rel_type ON public.party_relationships USING btree (relationship_type);

-- ============================================================================
-- Object:        public.idx_party_roles_active
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  party_roles
-- ============================================================================
CREATE INDEX idx_party_roles_active ON public.party_roles USING btree (tenant_id, party_id, is_active)
  WHERE (is_active = true);

-- ============================================================================
-- Object:        public.idx_party_roles_context
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  party_roles
-- ============================================================================
CREATE INDEX idx_party_roles_context ON public.party_roles USING btree (context_type, context_id);

-- ============================================================================
-- Object:        public.idx_party_roles_global_unique
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  party_roles
-- ============================================================================
CREATE UNIQUE INDEX idx_party_roles_global_unique ON public.party_roles USING btree (tenant_id, party_id, role_type)
  WHERE ((context_type = 'GLOBAL'::text) AND (context_id IS NULL));

-- ============================================================================
-- Object:        public.idx_party_roles_party
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  party_roles
-- ============================================================================
CREATE INDEX idx_party_roles_party ON public.party_roles USING btree (party_id);

-- ============================================================================
-- Object:        public.idx_party_roles_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  party_roles
-- ============================================================================
CREATE INDEX idx_party_roles_tenant ON public.party_roles USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_party_roles_tenant_party
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  party_roles
-- ============================================================================
CREATE INDEX idx_party_roles_tenant_party ON public.party_roles USING btree (tenant_id, party_id);

-- ============================================================================
-- Object:        public.idx_party_roles_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  party_roles
-- ============================================================================
CREATE INDEX idx_party_roles_type ON public.party_roles USING btree (role_type);

-- ============================================================================
-- Object:        public.idx_pricing_rate_items_side
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/pricing_rate_items.sql
-- Dependencies:  pricing_rate_items
-- ============================================================================
CREATE INDEX idx_pricing_rate_items_side ON public.pricing_rate_items USING btree (side);

-- ============================================================================
-- Object:        public.idx_pricing_rate_items_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/pricing_rate_items.sql
-- Dependencies:  pricing_rate_items
-- ============================================================================
CREATE INDEX idx_pricing_rate_items_tenant ON public.pricing_rate_items USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_pricing_rate_items_version
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/pricing_rate_items.sql
-- Dependencies:  pricing_rate_items
-- ============================================================================
CREATE INDEX idx_pricing_rate_items_version ON public.pricing_rate_items USING btree (rate_version_id);

-- ============================================================================
-- Object:        public.idx_pricing_rate_versions_effective
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/pricing_rate_versions.sql
-- Dependencies:  pricing_rate_versions
-- ============================================================================
CREATE INDEX idx_pricing_rate_versions_effective ON public.pricing_rate_versions USING btree (effective_from, effective_to);

-- ============================================================================
-- Object:        public.idx_pricing_rate_versions_rate
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/pricing_rate_versions.sql
-- Dependencies:  pricing_rate_versions
-- ============================================================================
CREATE INDEX idx_pricing_rate_versions_rate ON public.pricing_rate_versions USING btree (rate_id);

-- ============================================================================
-- Object:        public.idx_pricing_rate_versions_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/pricing_rate_versions.sql
-- Dependencies:  pricing_rate_versions
-- ============================================================================
CREATE INDEX idx_pricing_rate_versions_status ON public.pricing_rate_versions USING btree (status);

-- ============================================================================
-- Object:        public.idx_pricing_rate_versions_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/pricing_rate_versions.sql
-- Dependencies:  pricing_rate_versions
-- ============================================================================
CREATE INDEX idx_pricing_rate_versions_tenant ON public.pricing_rate_versions USING btree (tenant_id);

-- ============================================================================
-- Object:        public.uq_pricing_rate_versions_active
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/pricing_rate_versions.sql
-- Dependencies:  pricing_rate_versions
-- ============================================================================
CREATE UNIQUE INDEX uq_pricing_rate_versions_active ON public.pricing_rate_versions USING btree (rate_id, tenant_id)
  WHERE (status = 'ACTIVE'::public.com_pricing_rate_status);

-- ============================================================================
-- Object:        public.idx_pricing_rates_capability
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/pricing_rates.sql
-- Dependencies:  pricing_rates
-- ============================================================================
CREATE INDEX idx_pricing_rates_capability ON public.pricing_rates USING btree (capability_type);

-- ============================================================================
-- Object:        public.idx_pricing_rates_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/pricing_rates.sql
-- Dependencies:  pricing_rates
-- ============================================================================
CREATE INDEX idx_pricing_rates_status ON public.pricing_rates USING btree (status);

-- ============================================================================
-- Object:        public.idx_pricing_rates_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/pricing_rates.sql
-- Dependencies:  pricing_rates
-- ============================================================================
CREATE INDEX idx_pricing_rates_tenant ON public.pricing_rates USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_batches_expiry
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/product_batches.sql
-- Dependencies:  product_batches
-- ============================================================================
CREATE INDEX idx_batches_expiry ON public.product_batches USING btree (expiry_date);

-- ============================================================================
-- Object:        public.idx_batches_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/product_batches.sql
-- Dependencies:  product_batches
-- ============================================================================
CREATE INDEX idx_batches_status ON public.product_batches USING btree (status);

-- ============================================================================
-- Object:        public.idx_categories_parent
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/product_categories.sql
-- Dependencies:  product_categories
-- ============================================================================
CREATE INDEX idx_categories_parent ON public.product_categories USING btree (parent_id);

-- ============================================================================
-- Object:        public.idx_products_customer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/products.sql
-- Dependencies:  products
-- ============================================================================
CREATE INDEX idx_products_customer ON public.products USING btree (customer_id);

-- ============================================================================
-- Object:        public.idx_products_sku
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/products.sql
-- Dependencies:  products
-- ============================================================================
CREATE INDEX idx_products_sku ON public.products USING btree (sku);

-- ============================================================================
-- Object:        public.idx_products_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/products.sql
-- Dependencies:  products
-- ============================================================================
CREATE INDEX idx_products_tenant ON public.products USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_so_line_items_quote_item
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/sales_order_line_items.sql
-- Dependencies:  sales_order_line_items
-- ============================================================================
CREATE INDEX idx_so_line_items_quote_item ON public.sales_order_line_items USING btree (source_quote_item_id);

-- ============================================================================
-- Object:        public.idx_so_line_items_so
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/sales_order_line_items.sql
-- Dependencies:  sales_order_line_items
-- ============================================================================
CREATE INDEX idx_so_line_items_so ON public.sales_order_line_items USING btree (sales_order_id);

-- ============================================================================
-- Object:        public.idx_so_line_items_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/sales_order_line_items.sql
-- Dependencies:  sales_order_line_items
-- ============================================================================
CREATE INDEX idx_so_line_items_status ON public.sales_order_line_items USING btree (status);

-- ============================================================================
-- Object:        public.idx_so_line_items_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/sales_order_line_items.sql
-- Dependencies:  sales_order_line_items
-- ============================================================================
CREATE INDEX idx_so_line_items_tenant ON public.sales_order_line_items USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_sales_orders_engagement
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/sales_orders.sql
-- Dependencies:  sales_orders
-- ============================================================================
CREATE INDEX idx_sales_orders_engagement ON public.sales_orders USING btree (engagement_id);

-- ============================================================================
-- Object:        public.idx_sales_orders_quote
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/sales_orders.sql
-- Dependencies:  sales_orders
-- ============================================================================
CREATE INDEX idx_sales_orders_quote ON public.sales_orders USING btree (quote_id);

-- ============================================================================
-- Object:        public.idx_sales_orders_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/sales_orders.sql
-- Dependencies:  sales_orders
-- ============================================================================
CREATE INDEX idx_sales_orders_status ON public.sales_orders USING btree (tenant_id, status);

-- ============================================================================
-- Object:        public.idx_sales_orders_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/sales_orders.sql
-- Dependencies:  sales_orders
-- ============================================================================
CREATE INDEX idx_sales_orders_tenant ON public.sales_orders USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_serial_numbers_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/serial_numbers.sql
-- Dependencies:  serial_numbers
-- ============================================================================
CREATE INDEX idx_serial_numbers_status ON public.serial_numbers USING btree (status);

-- ============================================================================
-- Object:        public.idx_shipment_status_history_changed
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shipment_status_history.sql
-- Dependencies:  shipment_status_history
-- ============================================================================
CREATE INDEX idx_shipment_status_history_changed ON public.shipment_status_history USING btree (changed_at DESC);

-- ============================================================================
-- Object:        public.idx_shipment_status_history_shipment
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shipment_status_history.sql
-- Dependencies:  shipment_status_history
-- ============================================================================
CREATE INDEX idx_shipment_status_history_shipment ON public.shipment_status_history USING btree (shipment_id);

-- ============================================================================
-- Object:        public.idx_shp_exceptions_shipment
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_exceptions.sql
-- Dependencies:  shp_exceptions
-- ============================================================================
CREATE INDEX idx_shp_exceptions_shipment ON public.shp_exceptions USING btree (shipment_id);

-- ============================================================================
-- Object:        public.idx_shp_legs_plan
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_execution_legs.sql
-- Dependencies:  shp_execution_legs
-- ============================================================================
CREATE INDEX idx_shp_legs_plan ON public.shp_execution_legs USING btree (execution_plan_id);

-- ============================================================================
-- Object:        public.idx_shp_legs_shipment
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_execution_legs.sql
-- Dependencies:  shp_execution_legs
-- ============================================================================
CREATE INDEX idx_shp_legs_shipment ON public.shp_execution_legs USING btree (shipment_id);

-- ============================================================================
-- Object:        public.idx_shp_leg_units_leg
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_leg_units.sql
-- Dependencies:  shp_leg_units
-- ============================================================================
CREATE INDEX idx_shp_leg_units_leg ON public.shp_leg_units USING btree (execution_leg_id);

-- ============================================================================
-- Object:        public.idx_shp_manifest_shipment
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_manifest_items.sql
-- Dependencies:  shp_manifest_items
-- ============================================================================
CREATE INDEX idx_shp_manifest_shipment ON public.shp_manifest_items USING btree (shipment_id);

-- ============================================================================
-- Object:        public.idx_shp_milestones_shipment
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_milestones.sql
-- Dependencies:  shp_milestones
-- ============================================================================
CREATE INDEX idx_shp_milestones_shipment ON public.shp_milestones USING btree (shipment_id);

-- ============================================================================
-- Object:        public.idx_shp_shipments_sales_order
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  shp_shipments
-- ============================================================================
CREATE INDEX idx_shp_shipments_sales_order ON public.shp_shipments USING btree (sales_order_id);

-- ============================================================================
-- Object:        public.idx_shp_shipments_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  shp_shipments
-- ============================================================================
CREATE INDEX idx_shp_shipments_status ON public.shp_shipments USING btree (global_status);

-- ============================================================================
-- Object:        public.idx_shp_shipments_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  shp_shipments
-- ============================================================================
CREATE INDEX idx_shp_shipments_tenant ON public.shp_shipments USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_shp_shipments_token
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  shp_shipments
-- ============================================================================
CREATE INDEX idx_shp_shipments_token ON public.shp_shipments USING btree (tracking_token);

-- ============================================================================
-- Object:        public.idx_shp_shipments_wo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  shp_shipments
-- ============================================================================
CREATE INDEX idx_shp_shipments_wo ON public.shp_shipments USING btree (work_order_id);

-- ============================================================================
-- Object:        public.idx_shp_units_shipment
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_units.sql
-- Dependencies:  shp_units
-- ============================================================================
CREATE INDEX idx_shp_units_shipment ON public.shp_units USING btree (shipment_id);

-- ============================================================================
-- Object:        public.idx_shp_units_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/shp_units.sql
-- Dependencies:  shp_units
-- ============================================================================
CREATE INDEX idx_shp_units_tenant ON public.shp_units USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_sla_snapshots_tenant_date
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/sla_daily_snapshots.sql
-- Dependencies:  sla_daily_snapshots
-- ============================================================================
CREATE INDEX idx_sla_snapshots_tenant_date ON public.sla_daily_snapshots USING btree (tenant_id, snapshot_date);

-- ============================================================================
-- Object:        public.idx_sla_escalations_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/sla_escalations.sql
-- Dependencies:  sla_escalations
-- ============================================================================
CREATE INDEX idx_sla_escalations_tenant ON public.sla_escalations USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_sla_escalations_unresolved
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/sla_escalations.sql
-- Dependencies:  sla_escalations
-- ============================================================================
CREATE INDEX idx_sla_escalations_unresolved ON public.sla_escalations USING btree (tenant_id, resolved_at)
  WHERE (resolved_at IS NULL);

-- ============================================================================
-- Object:        public.idx_svc_requests_correlation
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/svc_service_requests.sql
-- Dependencies:  svc_service_requests
-- ============================================================================
CREATE INDEX idx_svc_requests_correlation ON public.svc_service_requests USING btree (correlation_id);

-- ============================================================================
-- Object:        public.idx_svc_requests_leg
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/svc_service_requests.sql
-- Dependencies:  svc_service_requests
-- ============================================================================
CREATE INDEX idx_svc_requests_leg ON public.svc_service_requests USING btree (execution_leg_id);

-- ============================================================================
-- Object:        public.idx_svc_requests_shipment
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/svc_service_requests.sql
-- Dependencies:  svc_service_requests
-- ============================================================================
CREATE INDEX idx_svc_requests_shipment ON public.svc_service_requests USING btree (shipment_id);

-- ============================================================================
-- Object:        public.idx_svc_requests_target
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/svc_service_requests.sql
-- Dependencies:  svc_service_requests
-- ============================================================================
CREATE INDEX idx_svc_requests_target ON public.svc_service_requests USING btree (target_domain, status);

-- ============================================================================
-- Object:        public.idx_svc_requests_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/svc_service_requests.sql
-- Dependencies:  svc_service_requests
-- ============================================================================
CREATE INDEX idx_svc_requests_tenant ON public.svc_service_requests USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_tax_hs_country
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/tax_rates.sql
-- Dependencies:  tax_rates
-- ============================================================================
CREATE INDEX idx_tax_hs_country ON public.tax_rates USING btree (hs_code, country_code);

-- ============================================================================
-- Object:        public.idx_tenant_sbus_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/tenant_sbus.sql
-- Dependencies:  tenant_sbus
-- ============================================================================
CREATE INDEX idx_tenant_sbus_tenant ON public.tenant_sbus USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_tenant_sbus_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/tenant_sbus.sql
-- Dependencies:  tenant_sbus
-- ============================================================================
CREATE INDEX idx_tenant_sbus_type ON public.tenant_sbus USING btree (sbu_type);

-- ============================================================================
-- Object:        public.idx_tenant_users_role
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  tenant_users
-- ============================================================================
CREATE INDEX idx_tenant_users_role ON public.tenant_users USING btree (role_code);

-- ============================================================================
-- Object:        public.idx_tenant_users_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  tenant_users
-- ============================================================================
CREATE INDEX idx_tenant_users_tenant ON public.tenant_users USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_tenant_users_tenant_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  tenant_users
-- ============================================================================
CREATE INDEX idx_tenant_users_tenant_id ON public.tenant_users USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_tenant_users_user
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  tenant_users
-- ============================================================================
CREATE INDEX idx_tenant_users_user ON public.tenant_users USING btree (user_id);

-- ============================================================================
-- Object:        public.idx_tenant_users_user_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  tenant_users
-- ============================================================================
CREATE INDEX idx_tenant_users_user_id ON public.tenant_users USING btree (user_id);

-- ============================================================================
-- Object:        public.idx_tu_region
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  tenant_users
-- ============================================================================
CREATE INDEX idx_tu_region ON public.tenant_users USING btree (tenant_id, region_id);

-- ============================================================================
-- Object:        public.idx_tenants_user_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  tenants
-- ============================================================================
CREATE INDEX idx_tenants_user_id ON public.tenants USING btree (user_id);

-- ============================================================================
-- Object:        public.idx_token_price_history_created
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/token_price_history.sql
-- Dependencies:  token_price_history
-- ============================================================================
CREATE INDEX idx_token_price_history_created ON public.token_price_history USING btree (created_at DESC);

-- ============================================================================
-- Object:        public.idx_token_prices_effective
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/token_prices.sql
-- Dependencies:  token_prices
-- ============================================================================
CREATE INDEX idx_token_prices_effective ON public.token_prices USING btree (effective_from DESC);

-- ============================================================================
-- Object:        public.idx_tracking_points_session_recorded
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/tracking_points.sql
-- Dependencies:  tracking_points
-- ============================================================================
CREATE INDEX idx_tracking_points_session_recorded ON public.tracking_points USING btree (session_id, recorded_at);

-- ============================================================================
-- Object:        public.idx_tracking_updates_recorded_at
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/tracking_updates.sql
-- Dependencies:  tracking_updates
-- ============================================================================
CREATE INDEX idx_tracking_updates_recorded_at ON public.tracking_updates USING btree (job_order_id, recorded_at);

-- ============================================================================
-- Object:        public.idx_variant_values_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/variant_values.sql
-- Dependencies:  variant_values
-- ============================================================================
CREATE INDEX idx_variant_values_type ON public.variant_values USING btree (variant_type_id);

-- ============================================================================
-- Object:        public.idx_wsa_date
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/warehouse_staff_attendance.sql
-- Dependencies:  warehouse_staff_attendance
-- ============================================================================
CREATE INDEX idx_wsa_date ON public.warehouse_staff_attendance USING btree (check_in_time DESC);

-- ============================================================================
-- Object:        public.idx_wsa_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/warehouse_staff_attendance.sql
-- Dependencies:  warehouse_staff_attendance
-- ============================================================================
CREATE INDEX idx_wsa_tenant ON public.warehouse_staff_attendance USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wsa_user
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/warehouse_staff_attendance.sql
-- Dependencies:  warehouse_staff_attendance
-- ============================================================================
CREATE INDEX idx_wsa_user ON public.warehouse_staff_attendance USING btree (user_id);

-- ============================================================================
-- Object:        public.idx_wsa_warehouse
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/warehouse_staff_attendance.sql
-- Dependencies:  warehouse_staff_attendance
-- ============================================================================
CREATE INDEX idx_wsa_warehouse ON public.warehouse_staff_attendance USING btree (warehouse_id);

-- ============================================================================
-- Object:        public.idx_staff_active_assignment_v2
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/warehouse_users.sql
-- Dependencies:  warehouse_users
-- ============================================================================
CREATE UNIQUE INDEX idx_staff_active_assignment_v2 ON public.warehouse_users USING btree (staff_id)
  WHERE (is_active = true);

-- ============================================================================
-- Object:        public.idx_wh_billing_invoice_details_inv
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_billing_invoice_details.sql
-- Dependencies:  wh_billing_invoice_details
-- ============================================================================
CREATE INDEX idx_wh_billing_invoice_details_inv ON public.wh_billing_invoice_details USING btree (invoice_id);

-- ============================================================================
-- Object:        public.idx_wh_billing_invoices_contract
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_billing_invoices.sql
-- Dependencies:  wh_billing_invoices
-- ============================================================================
CREATE INDEX idx_wh_billing_invoices_contract ON public.wh_billing_invoices USING btree (contract_id);

-- ============================================================================
-- Object:        public.idx_wh_billing_invoices_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_billing_invoices.sql
-- Dependencies:  wh_billing_invoices
-- ============================================================================
CREATE INDEX idx_wh_billing_invoices_status ON public.wh_billing_invoices USING btree (status);

-- ============================================================================
-- Object:        public.idx_wh_billing_invoices_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_billing_invoices.sql
-- Dependencies:  wh_billing_invoices
-- ============================================================================
CREATE INDEX idx_wh_billing_invoices_tenant ON public.wh_billing_invoices USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_daily_snapshot_contract
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_daily_stock_snapshots.sql
-- Dependencies:  wh_daily_stock_snapshots
-- ============================================================================
CREATE INDEX idx_wh_daily_snapshot_contract ON public.wh_daily_stock_snapshots USING btree (contract_id);

-- ============================================================================
-- Object:        public.idx_wh_daily_snapshot_date
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_daily_stock_snapshots.sql
-- Dependencies:  wh_daily_stock_snapshots
-- ============================================================================
CREATE INDEX idx_wh_daily_snapshot_date ON public.wh_daily_stock_snapshots USING btree (snapshot_date);

-- ============================================================================
-- Object:        public.idx_wh_daily_snapshot_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_daily_stock_snapshots.sql
-- Dependencies:  wh_daily_stock_snapshots
-- ============================================================================
CREATE INDEX idx_wh_daily_snapshot_tenant ON public.wh_daily_stock_snapshots USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_damage_records_item
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inbound_damage_records.sql
-- Dependencies:  wh_inbound_damage_records
-- ============================================================================
CREATE INDEX idx_wh_damage_records_item ON public.wh_inbound_damage_records USING btree (receipt_item_id);

-- ============================================================================
-- Object:        public.idx_wh_damage_records_receipt
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inbound_damage_records.sql
-- Dependencies:  wh_inbound_damage_records
-- ============================================================================
CREATE INDEX idx_wh_damage_records_receipt ON public.wh_inbound_damage_records USING btree (receipt_id);

-- ============================================================================
-- Object:        public.idx_wh_inbound_receipts_customer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  wh_inbound_receipts
-- ============================================================================
CREATE INDEX idx_wh_inbound_receipts_customer ON public.wh_inbound_receipts USING btree (customer_id);

-- ============================================================================
-- Object:        public.idx_wh_inbound_receipts_shipper
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  wh_inbound_receipts
-- ============================================================================
CREATE INDEX idx_wh_inbound_receipts_shipper ON public.wh_inbound_receipts USING btree (shipper_id);

-- ============================================================================
-- Object:        public.idx_wh_inbound_transfer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  wh_inbound_receipts
-- ============================================================================
CREATE INDEX idx_wh_inbound_transfer ON public.wh_inbound_receipts USING btree (transfer_id);

-- ============================================================================
-- Object:        public.idx_wh_internal_movements_from
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  wh_internal_movements
-- ============================================================================
CREATE INDEX idx_wh_internal_movements_from ON public.wh_internal_movements USING btree (from_location_id);

-- ============================================================================
-- Object:        public.idx_wh_internal_movements_sku
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  wh_internal_movements
-- ============================================================================
CREATE INDEX idx_wh_internal_movements_sku ON public.wh_internal_movements USING btree (product_sku_id);

-- ============================================================================
-- Object:        public.idx_wh_internal_movements_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  wh_internal_movements
-- ============================================================================
CREATE INDEX idx_wh_internal_movements_tenant ON public.wh_internal_movements USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_internal_movements_to
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  wh_internal_movements
-- ============================================================================
CREATE INDEX idx_wh_internal_movements_to ON public.wh_internal_movements USING btree (to_location_id);

-- ============================================================================
-- Object:        public.idx_wh_inventory_batch
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
CREATE INDEX idx_wh_inventory_batch ON public.wh_inventory USING btree (batch_number);

-- ============================================================================
-- Object:        public.idx_wh_inventory_code
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
CREATE INDEX idx_wh_inventory_code ON public.wh_inventory USING btree (inventory_code);

-- ============================================================================
-- Object:        public.idx_wh_inventory_expiry
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
CREATE INDEX idx_wh_inventory_expiry ON public.wh_inventory USING btree (expiry_date);

-- ============================================================================
-- Object:        public.idx_wh_inventory_location
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
CREATE INDEX idx_wh_inventory_location ON public.wh_inventory USING btree (location_id);

-- ============================================================================
-- Object:        public.idx_wh_inventory_lpn
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
CREATE INDEX idx_wh_inventory_lpn ON public.wh_inventory USING btree (lpn_code);

-- ============================================================================
-- Object:        public.idx_wh_inventory_product
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
CREATE INDEX idx_wh_inventory_product ON public.wh_inventory USING btree (product_sku_id);

-- ============================================================================
-- Object:        public.idx_wh_inventory_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
CREATE INDEX idx_wh_inventory_status ON public.wh_inventory USING btree (status);

-- ============================================================================
-- Object:        public.idx_wh_inventory_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
CREATE INDEX idx_wh_inventory_tenant ON public.wh_inventory USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_inventory_warehouse
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
CREATE INDEX idx_wh_inventory_warehouse ON public.wh_inventory USING btree (warehouse_id);

-- ============================================================================
-- Object:        public.idx_wh_inventory_movements_created
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory_movements.sql
-- Dependencies:  wh_inventory_movements
-- ============================================================================
CREATE INDEX idx_wh_inventory_movements_created ON public.wh_inventory_movements USING btree (created_at);

-- ============================================================================
-- Object:        public.idx_wh_inventory_movements_inv
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory_movements.sql
-- Dependencies:  wh_inventory_movements
-- ============================================================================
CREATE INDEX idx_wh_inventory_movements_inv ON public.wh_inventory_movements USING btree (inventory_id);

-- ============================================================================
-- Object:        public.idx_wh_inventory_movements_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory_movements.sql
-- Dependencies:  wh_inventory_movements
-- ============================================================================
CREATE INDEX idx_wh_inventory_movements_tenant ON public.wh_inventory_movements USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_inventory_movements_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_inventory_movements.sql
-- Dependencies:  wh_inventory_movements
-- ============================================================================
CREATE INDEX idx_wh_inventory_movements_type ON public.wh_inventory_movements USING btree (movement_type);

-- ============================================================================
-- Object:        public.idx_wh_jo_assign_jo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_jo_staff_assignments.sql
-- Dependencies:  wh_jo_staff_assignments
-- ============================================================================
CREATE INDEX idx_wh_jo_assign_jo ON public.wh_jo_staff_assignments USING btree (jo_id);

-- ============================================================================
-- Object:        public.idx_wh_jo_assign_staff
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_jo_staff_assignments.sql
-- Dependencies:  wh_jo_staff_assignments
-- ============================================================================
CREATE INDEX idx_wh_jo_assign_staff ON public.wh_jo_staff_assignments USING btree (staff_id);

-- ============================================================================
-- Object:        public.idx_wh_jo_assign_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_jo_staff_assignments.sql
-- Dependencies:  wh_jo_staff_assignments
-- ============================================================================
CREATE INDEX idx_wh_jo_assign_tenant ON public.wh_jo_staff_assignments USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_loading_sessions_shipment_session
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_loading_sessions.sql
-- Dependencies:  wh_loading_sessions
-- ============================================================================
CREATE UNIQUE INDEX idx_loading_sessions_shipment_session ON public.wh_loading_sessions USING btree (shipment_id, session_number);

-- ============================================================================
-- Object:        public.idx_master_boxes_warehouse
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_master_boxes.sql
-- Dependencies:  wh_master_boxes
-- ============================================================================
CREATE INDEX idx_master_boxes_warehouse ON public.wh_master_boxes USING btree (warehouse_id);

-- ============================================================================
-- Object:        public.idx_wh_master_boxes_location
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_master_boxes.sql
-- Dependencies:  wh_master_boxes
-- ============================================================================
CREATE INDEX idx_wh_master_boxes_location ON public.wh_master_boxes USING btree (location_id);

-- ============================================================================
-- Object:        public.idx_wh_outbound_shipments_consignee
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  wh_outbound_shipments
-- ============================================================================
CREATE INDEX idx_wh_outbound_shipments_consignee ON public.wh_outbound_shipments USING btree (consignee_id);

-- ============================================================================
-- Object:        public.idx_wh_outbound_shipments_customer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  wh_outbound_shipments
-- ============================================================================
CREATE INDEX idx_wh_outbound_shipments_customer ON public.wh_outbound_shipments USING btree (customer_id);

-- ============================================================================
-- Object:        public.idx_wh_outbound_transfer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  wh_outbound_shipments
-- ============================================================================
CREATE INDEX idx_wh_outbound_transfer ON public.wh_outbound_shipments USING btree (transfer_id);

-- ============================================================================
-- Object:        public.idx_parcel_inbound_city
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_parcel_inbound.sql
-- Dependencies:  wh_parcel_inbound
-- ============================================================================
CREATE INDEX idx_parcel_inbound_city ON public.wh_parcel_inbound USING btree (destination_city, status);

-- ============================================================================
-- Object:        public.idx_parcel_inbound_master_box
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_parcel_inbound.sql
-- Dependencies:  wh_parcel_inbound
-- ============================================================================
CREATE INDEX idx_parcel_inbound_master_box ON public.wh_parcel_inbound USING btree (master_box_id);

-- ============================================================================
-- Object:        public.idx_wh_picking_details_inv
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_picking_details.sql
-- Dependencies:  wh_picking_details
-- ============================================================================
CREATE INDEX idx_wh_picking_details_inv ON public.wh_picking_details USING btree (inventory_id);

-- ============================================================================
-- Object:        public.idx_wh_picking_details_list
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_picking_details.sql
-- Dependencies:  wh_picking_details
-- ============================================================================
CREATE INDEX idx_wh_picking_details_list ON public.wh_picking_details USING btree (picking_list_id);

-- ============================================================================
-- Object:        public.idx_wh_picking_details_sku
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_picking_details.sql
-- Dependencies:  wh_picking_details
-- ============================================================================
CREATE INDEX idx_wh_picking_details_sku ON public.wh_picking_details USING btree (product_sku_id);

-- ============================================================================
-- Object:        public.idx_wh_picking_lists_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_picking_lists.sql
-- Dependencies:  wh_picking_lists
-- ============================================================================
CREATE INDEX idx_wh_picking_lists_status ON public.wh_picking_lists USING btree (status);

-- ============================================================================
-- Object:        public.idx_wh_picking_lists_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_picking_lists.sql
-- Dependencies:  wh_picking_lists
-- ============================================================================
CREATE INDEX idx_wh_picking_lists_tenant ON public.wh_picking_lists USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_picking_lists_wh
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_picking_lists.sql
-- Dependencies:  wh_picking_lists
-- ============================================================================
CREATE INDEX idx_wh_picking_lists_wh ON public.wh_picking_lists USING btree (warehouse_id);

-- ============================================================================
-- Object:        public.idx_wh_receipt_details_receipt
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_receipt_details.sql
-- Dependencies:  wh_receipt_details
-- ============================================================================
CREATE INDEX idx_wh_receipt_details_receipt ON public.wh_receipt_details USING btree (receipt_id);

-- ============================================================================
-- Object:        public.idx_wh_receipt_details_sku
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_receipt_details.sql
-- Dependencies:  wh_receipt_details
-- ============================================================================
CREATE INDEX idx_wh_receipt_details_sku ON public.wh_receipt_details USING btree (product_sku_id);

-- ============================================================================
-- Object:        public.idx_wh_receipt_orders_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_receipt_orders.sql
-- Dependencies:  wh_receipt_orders
-- ============================================================================
CREATE INDEX idx_wh_receipt_orders_status ON public.wh_receipt_orders USING btree (status);

-- ============================================================================
-- Object:        public.idx_wh_receipt_orders_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_receipt_orders.sql
-- Dependencies:  wh_receipt_orders
-- ============================================================================
CREATE INDEX idx_wh_receipt_orders_tenant ON public.wh_receipt_orders USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_receipt_orders_wh
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_receipt_orders.sql
-- Dependencies:  wh_receipt_orders
-- ============================================================================
CREATE INDEX idx_wh_receipt_orders_wh ON public.wh_receipt_orders USING btree (warehouse_id);

-- ============================================================================
-- Object:        public.idx_wh_repacking_conversions_customer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  wh_repacking_conversions
-- ============================================================================
CREATE INDEX idx_wh_repacking_conversions_customer ON public.wh_repacking_conversions USING btree (customer_id);

-- ============================================================================
-- Object:        public.idx_wh_repacking_conversions_source
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  wh_repacking_conversions
-- ============================================================================
CREATE INDEX idx_wh_repacking_conversions_source ON public.wh_repacking_conversions USING btree (source_product_id);

-- ============================================================================
-- Object:        public.idx_wh_repacking_conversions_target
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  wh_repacking_conversions
-- ============================================================================
CREATE INDEX idx_wh_repacking_conversions_target ON public.wh_repacking_conversions USING btree (target_product_id);

-- ============================================================================
-- Object:        public.idx_wh_repacking_conversions_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  wh_repacking_conversions
-- ============================================================================
CREATE INDEX idx_wh_repacking_conversions_tenant ON public.wh_repacking_conversions USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_repacking_items_order
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  wh_repacking_items
-- ============================================================================
CREATE INDEX idx_wh_repacking_items_order ON public.wh_repacking_items USING btree (repacking_order_id);

-- ============================================================================
-- Object:        public.idx_wh_repacking_items_product
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  wh_repacking_items
-- ============================================================================
CREATE INDEX idx_wh_repacking_items_product ON public.wh_repacking_items USING btree (product_sku_id);

-- ============================================================================
-- Object:        public.idx_wh_repacking_items_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  wh_repacking_items
-- ============================================================================
CREATE INDEX idx_wh_repacking_items_type ON public.wh_repacking_items USING btree (item_type);

-- ============================================================================
-- Object:        public.idx_wh_repacking_orders_customer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
CREATE INDEX idx_wh_repacking_orders_customer ON public.wh_repacking_orders USING btree (customer_id);

-- ============================================================================
-- Object:        public.idx_wh_repacking_orders_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
CREATE INDEX idx_wh_repacking_orders_status ON public.wh_repacking_orders USING btree (status);

-- ============================================================================
-- Object:        public.idx_wh_repacking_orders_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
CREATE INDEX idx_wh_repacking_orders_tenant ON public.wh_repacking_orders USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_repacking_orders_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
CREATE INDEX idx_wh_repacking_orders_type ON public.wh_repacking_orders USING btree (order_type);

-- ============================================================================
-- Object:        public.idx_wh_repacking_orders_warehouse
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
CREATE INDEX idx_wh_repacking_orders_warehouse ON public.wh_repacking_orders USING btree (warehouse_id);

-- ============================================================================
-- Object:        public.idx_wh_staff_att_staff
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_staff_attendance.sql
-- Dependencies:  wh_staff_attendance
-- ============================================================================
CREATE INDEX idx_wh_staff_att_staff ON public.wh_staff_attendance USING btree (staff_id);

-- ============================================================================
-- Object:        public.idx_wh_staff_att_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_staff_attendance.sql
-- Dependencies:  wh_staff_attendance
-- ============================================================================
CREATE INDEX idx_wh_staff_att_tenant ON public.wh_staff_attendance USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_task_items_product
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_task_items.sql
-- Dependencies:  wh_task_items
-- ============================================================================
CREATE INDEX idx_wh_task_items_product ON public.wh_task_items USING btree (product_sku_id);

-- ============================================================================
-- Object:        public.idx_wh_task_items_task
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_task_items.sql
-- Dependencies:  wh_task_items
-- ============================================================================
CREATE INDEX idx_wh_task_items_task ON public.wh_task_items USING btree (task_id);

-- ============================================================================
-- Object:        public.idx_wh_tasks_assigned
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_tasks.sql
-- Dependencies:  wh_tasks
-- ============================================================================
CREATE INDEX idx_wh_tasks_assigned ON public.wh_tasks USING btree (assigned_to);

-- ============================================================================
-- Object:        public.idx_wh_tasks_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_tasks.sql
-- Dependencies:  wh_tasks
-- ============================================================================
CREATE INDEX idx_wh_tasks_status ON public.wh_tasks USING btree (status);

-- ============================================================================
-- Object:        public.idx_wh_tasks_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_tasks.sql
-- Dependencies:  wh_tasks
-- ============================================================================
CREATE INDEX idx_wh_tasks_tenant ON public.wh_tasks USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_tasks_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_tasks.sql
-- Dependencies:  wh_tasks
-- ============================================================================
CREATE INDEX idx_wh_tasks_type ON public.wh_tasks USING btree (task_type);

-- ============================================================================
-- Object:        public.idx_wh_tasks_warehouse
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_tasks.sql
-- Dependencies:  wh_tasks
-- ============================================================================
CREATE INDEX idx_wh_tasks_warehouse ON public.wh_tasks USING btree (warehouse_id);

-- ============================================================================
-- Object:        public.idx_wh_temperature_alerts_resolved
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_temperature_alerts.sql
-- Dependencies:  wh_temperature_alerts
-- ============================================================================
CREATE INDEX idx_wh_temperature_alerts_resolved ON public.wh_temperature_alerts USING btree (is_resolved);

-- ============================================================================
-- Object:        public.idx_wh_temperature_alerts_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_temperature_alerts.sql
-- Dependencies:  wh_temperature_alerts
-- ============================================================================
CREATE INDEX idx_wh_temperature_alerts_tenant ON public.wh_temperature_alerts USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_temperature_alerts_zone
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_temperature_alerts.sql
-- Dependencies:  wh_temperature_alerts
-- ============================================================================
CREATE INDEX idx_wh_temperature_alerts_zone ON public.wh_temperature_alerts USING btree (zone_id);

-- ============================================================================
-- Object:        public.idx_wh_temperature_logs_recorded
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_temperature_logs.sql
-- Dependencies:  wh_temperature_logs
-- ============================================================================
CREATE INDEX idx_wh_temperature_logs_recorded ON public.wh_temperature_logs USING btree (recorded_at);

-- ============================================================================
-- Object:        public.idx_wh_temperature_logs_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_temperature_logs.sql
-- Dependencies:  wh_temperature_logs
-- ============================================================================
CREATE INDEX idx_wh_temperature_logs_status ON public.wh_temperature_logs USING btree (status);

-- ============================================================================
-- Object:        public.idx_wh_temperature_logs_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_temperature_logs.sql
-- Dependencies:  wh_temperature_logs
-- ============================================================================
CREATE INDEX idx_wh_temperature_logs_tenant ON public.wh_temperature_logs USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_temperature_logs_zone
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_temperature_logs.sql
-- Dependencies:  wh_temperature_logs
-- ============================================================================
CREATE INDEX idx_wh_temperature_logs_zone ON public.wh_temperature_logs USING btree (zone_id);

-- ============================================================================
-- Object:        public.idx_wh_transfer_details_inv
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transfer_details.sql
-- Dependencies:  wh_transfer_details
-- ============================================================================
CREATE INDEX idx_wh_transfer_details_inv ON public.wh_transfer_details USING btree (inventory_id);

-- ============================================================================
-- Object:        public.idx_wh_transfer_details_transfer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transfer_details.sql
-- Dependencies:  wh_transfer_details
-- ============================================================================
CREATE INDEX idx_wh_transfer_details_transfer ON public.wh_transfer_details USING btree (transfer_id);

-- ============================================================================
-- Object:        public.idx_wh_transfer_orders_consignee
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transfer_orders.sql
-- Dependencies:  wh_transfer_orders
-- ============================================================================
CREATE INDEX idx_wh_transfer_orders_consignee ON public.wh_transfer_orders USING btree (consignee_id);

-- ============================================================================
-- Object:        public.idx_wh_transfer_orders_from
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transfer_orders.sql
-- Dependencies:  wh_transfer_orders
-- ============================================================================
CREATE INDEX idx_wh_transfer_orders_from ON public.wh_transfer_orders USING btree (from_warehouse_id);

-- ============================================================================
-- Object:        public.idx_wh_transfer_orders_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transfer_orders.sql
-- Dependencies:  wh_transfer_orders
-- ============================================================================
CREATE INDEX idx_wh_transfer_orders_tenant ON public.wh_transfer_orders USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_transfer_orders_to
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transfer_orders.sql
-- Dependencies:  wh_transfer_orders
-- ============================================================================
CREATE INDEX idx_wh_transfer_orders_to ON public.wh_transfer_orders USING btree (to_warehouse_id);

-- ============================================================================
-- Object:        public.idx_wh_transformation_comp_inv
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transformation_components.sql
-- Dependencies:  wh_transformation_components
-- ============================================================================
CREATE INDEX idx_wh_transformation_comp_inv ON public.wh_transformation_components USING btree (inventory_id);

-- ============================================================================
-- Object:        public.idx_wh_transformation_comp_order
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transformation_components.sql
-- Dependencies:  wh_transformation_components
-- ============================================================================
CREATE INDEX idx_wh_transformation_comp_order ON public.wh_transformation_components USING btree (transformation_order_id);

-- ============================================================================
-- Object:        public.idx_wh_transformation_orders_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transformation_orders.sql
-- Dependencies:  wh_transformation_orders
-- ============================================================================
CREATE INDEX idx_wh_transformation_orders_status ON public.wh_transformation_orders USING btree (status);

-- ============================================================================
-- Object:        public.idx_wh_transformation_orders_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transformation_orders.sql
-- Dependencies:  wh_transformation_orders
-- ============================================================================
CREATE INDEX idx_wh_transformation_orders_tenant ON public.wh_transformation_orders USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wh_transformation_orders_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transformation_orders.sql
-- Dependencies:  wh_transformation_orders
-- ============================================================================
CREATE INDEX idx_wh_transformation_orders_type ON public.wh_transformation_orders USING btree (to_type);

-- ============================================================================
-- Object:        public.idx_wh_transformation_out_inv
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transformation_outputs.sql
-- Dependencies:  wh_transformation_outputs
-- ============================================================================
CREATE INDEX idx_wh_transformation_out_inv ON public.wh_transformation_outputs USING btree (generated_inventory_id);

-- ============================================================================
-- Object:        public.idx_wh_transformation_out_order
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_transformation_outputs.sql
-- Dependencies:  wh_transformation_outputs
-- ============================================================================
CREATE INDEX idx_wh_transformation_out_order ON public.wh_transformation_outputs USING btree (transformation_order_id);

-- ============================================================================
-- Object:        public.idx_unloading_sessions_receipt
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_unloading_sessions.sql
-- Dependencies:  wh_unloading_sessions
-- ============================================================================
CREATE INDEX idx_unloading_sessions_receipt ON public.wh_unloading_sessions USING btree (receipt_id);

-- ============================================================================
-- Object:        public.idx_unloading_sessions_receipt_session
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_unloading_sessions.sql
-- Dependencies:  wh_unloading_sessions
-- ============================================================================
CREATE UNIQUE INDEX idx_unloading_sessions_receipt_session ON public.wh_unloading_sessions USING btree (receipt_id, session_number);

-- ============================================================================
-- Object:        public.idx_wh_wa_notifications_receipt
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_wa_notifications.sql
-- Dependencies:  wh_wa_notifications
-- ============================================================================
CREATE INDEX idx_wh_wa_notifications_receipt ON public.wh_wa_notifications USING btree (receipt_id);

-- ============================================================================
-- Object:        public.idx_wh_wa_notifications_sent_at
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wh_wa_notifications.sql
-- Dependencies:  wh_wa_notifications
-- ============================================================================
CREATE INDEX idx_wh_wa_notifications_sent_at ON public.wh_wa_notifications USING btree (sent_at DESC);

-- ============================================================================
-- Object:        public.idx_wo2_audit_correlation
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_audit_logs.sql
-- Dependencies:  wo_audit_logs
-- ============================================================================
CREATE INDEX idx_wo2_audit_correlation ON public.wo_audit_logs USING btree (correlation_id);

-- ============================================================================
-- Object:        public.idx_wo2_audit_entity
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_audit_logs.sql
-- Dependencies:  wo_audit_logs
-- ============================================================================
CREATE INDEX idx_wo2_audit_entity ON public.wo_audit_logs USING btree (entity_type, entity_id, performed_at DESC);

-- ============================================================================
-- Object:        public.idx_wo2_audit_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_audit_logs.sql
-- Dependencies:  wo_audit_logs
-- ============================================================================
CREATE INDEX idx_wo2_audit_tenant ON public.wo_audit_logs USING btree (tenant_id, performed_at DESC);

-- ============================================================================
-- Object:        public.idx_wo2_ledger_bin
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_inventory_ledger.sql
-- Dependencies:  wo_inventory_ledger
-- ============================================================================
CREATE INDEX idx_wo2_ledger_bin ON public.wo_inventory_ledger USING btree (bin_id, created_at DESC);

-- ============================================================================
-- Object:        public.idx_wo2_ledger_correlation
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_inventory_ledger.sql
-- Dependencies:  wo_inventory_ledger
-- ============================================================================
CREATE INDEX idx_wo2_ledger_correlation ON public.wo_inventory_ledger USING btree (correlation_id);

-- ============================================================================
-- Object:        public.idx_wo2_ledger_created
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_inventory_ledger.sql
-- Dependencies:  wo_inventory_ledger
-- ============================================================================
CREATE INDEX idx_wo2_ledger_created ON public.wo_inventory_ledger USING btree (created_at DESC);

-- ============================================================================
-- Object:        public.idx_wo2_ledger_jo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_inventory_ledger.sql
-- Dependencies:  wo_inventory_ledger
-- ============================================================================
CREATE INDEX idx_wo2_ledger_jo ON public.wo_inventory_ledger USING btree (job_order_id);

-- ============================================================================
-- Object:        public.idx_wo2_ledger_sku
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_inventory_ledger.sql
-- Dependencies:  wo_inventory_ledger
-- ============================================================================
CREATE INDEX idx_wo2_ledger_sku ON public.wo_inventory_ledger USING btree (product_sku_id, created_at DESC);

-- ============================================================================
-- Object:        public.idx_wo2_ledger_wh
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_inventory_ledger.sql
-- Dependencies:  wo_inventory_ledger
-- ============================================================================
CREATE INDEX idx_wo2_ledger_wh ON public.wo_inventory_ledger USING btree (warehouse_id, created_at DESC);

-- ============================================================================
-- Object:        public.idx_wo_item_manifests_sku
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_item_manifests.sql
-- Dependencies:  wo_item_manifests
-- ============================================================================
CREATE INDEX idx_wo_item_manifests_sku ON public.wo_item_manifests USING btree (product_sku_id);

-- ============================================================================
-- Object:        public.idx_wo_item_manifests_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_item_manifests.sql
-- Dependencies:  wo_item_manifests
-- ============================================================================
CREATE INDEX idx_wo_item_manifests_tenant ON public.wo_item_manifests USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wo_item_manifests_wo_item
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_item_manifests.sql
-- Dependencies:  wo_item_manifests
-- ============================================================================
CREATE INDEX idx_wo_item_manifests_wo_item ON public.wo_item_manifests USING btree (wo_item_id);

-- ============================================================================
-- Object:        public.idx_truck_wo_items_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_items.sql
-- Dependencies:  wo_items
-- ============================================================================
CREATE INDEX idx_truck_wo_items_status ON public.wo_items USING btree (status);

-- ============================================================================
-- Object:        public.idx_truck_wo_items_wo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_items.sql
-- Dependencies:  wo_items
-- ============================================================================
CREATE INDEX idx_truck_wo_items_wo ON public.wo_items USING btree (wo_id);

-- ============================================================================
-- Object:        public.idx_wo_items_handover
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_items.sql
-- Dependencies:  wo_items
-- ============================================================================
CREATE INDEX idx_wo_items_handover ON public.wo_items USING btree (handover_status);

-- ============================================================================
-- Object:        public.idx_wo_items_revenue
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_items.sql
-- Dependencies:  wo_items
-- ============================================================================
CREATE INDEX idx_wo_items_revenue ON public.wo_items USING btree (wo_id, unit_price, total_revenue);

-- ============================================================================
-- Object:        public.idx_wo_items_tenant_id
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_items.sql
-- Dependencies:  wo_items
-- ============================================================================
CREATE INDEX idx_wo_items_tenant_id ON public.wo_items USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wo2_jo_items_inv
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_job_order_items.sql
-- Dependencies:  wo_job_order_items
-- ============================================================================
CREATE INDEX idx_wo2_jo_items_inv ON public.wo_job_order_items USING btree (inventory_id);

-- ============================================================================
-- Object:        public.idx_wo2_jo_items_jo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_job_order_items.sql
-- Dependencies:  wo_job_order_items
-- ============================================================================
CREATE INDEX idx_wo2_jo_items_jo ON public.wo_job_order_items USING btree (job_order_id);

-- ============================================================================
-- Object:        public.idx_wo2_jo_items_sku
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_job_order_items.sql
-- Dependencies:  wo_job_order_items
-- ============================================================================
CREATE INDEX idx_wo2_jo_items_sku ON public.wo_job_order_items USING btree (product_sku_id);

-- ============================================================================
-- Object:        public.idx_wo2_jo_assigned
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_job_orders
-- ============================================================================
CREATE INDEX idx_wo2_jo_assigned ON public.wo_job_orders USING btree (assigned_to);

-- ============================================================================
-- Object:        public.idx_wo2_jo_correlation
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_job_orders
-- ============================================================================
CREATE INDEX idx_wo2_jo_correlation ON public.wo_job_orders USING btree (correlation_id);

-- ============================================================================
-- Object:        public.idx_wo2_jo_exec_org
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_job_orders
-- ============================================================================
CREATE INDEX idx_wo2_jo_exec_org ON public.wo_job_orders USING btree (executing_org_id);

-- ============================================================================
-- Object:        public.idx_wo2_jo_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_job_orders
-- ============================================================================
CREATE INDEX idx_wo2_jo_status ON public.wo_job_orders USING btree (status);

-- ============================================================================
-- Object:        public.idx_wo2_jo_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_job_orders
-- ============================================================================
CREATE INDEX idx_wo2_jo_tenant ON public.wo_job_orders USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wo2_jo_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_job_orders
-- ============================================================================
CREATE INDEX idx_wo2_jo_type ON public.wo_job_orders USING btree (jo_type);

-- ============================================================================
-- Object:        public.idx_wo2_jo_warehouse
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_job_orders
-- ============================================================================
CREATE INDEX idx_wo2_jo_warehouse ON public.wo_job_orders USING btree (assigned_warehouse_id);

-- ============================================================================
-- Object:        public.idx_wo2_jo_wo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_job_orders
-- ============================================================================
CREATE INDEX idx_wo2_jo_wo ON public.wo_job_orders USING btree (work_order_id);

-- ============================================================================
-- Object:        public.idx_wo2_monitoring_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_monitoring_events.sql
-- Dependencies:  wo_monitoring_events
-- ============================================================================
CREATE INDEX idx_wo2_monitoring_tenant ON public.wo_monitoring_events USING btree (tenant_id, created_at DESC);

-- ============================================================================
-- Object:        public.idx_wo2_monitoring_unresolved
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_monitoring_events.sql
-- Dependencies:  wo_monitoring_events
-- ============================================================================
CREATE INDEX idx_wo2_monitoring_unresolved ON public.wo_monitoring_events USING btree (is_acknowledged, severity, created_at DESC);

-- ============================================================================
-- Object:        public.idx_wo_org_region
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_organization_users.sql
-- Dependencies:  wo_organization_users
-- ============================================================================
CREATE INDEX idx_wo_org_region ON public.wo_organization_users USING btree (tenant_id, assigned_region_id);

-- ============================================================================
-- Object:        public.idx_wo_org_users_org
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_organization_users.sql
-- Dependencies:  wo_organization_users
-- ============================================================================
CREATE INDEX idx_wo_org_users_org ON public.wo_organization_users USING btree (organization_id);

-- ============================================================================
-- Object:        public.idx_wo_org_users_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_organization_users.sql
-- Dependencies:  wo_organization_users
-- ============================================================================
CREATE INDEX idx_wo_org_users_tenant ON public.wo_organization_users USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wo_org_users_user
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_organization_users.sql
-- Dependencies:  wo_organization_users
-- ============================================================================
CREATE INDEX idx_wo_org_users_user ON public.wo_organization_users USING btree (user_id);

-- ============================================================================
-- Object:        public.idx_wo_org_users_warehouse
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_organization_users.sql
-- Dependencies:  wo_organization_users
-- ============================================================================
CREATE INDEX idx_wo_org_users_warehouse ON public.wo_organization_users USING btree (assigned_warehouse_id);

-- ============================================================================
-- Object:        public.idx_orgs_path
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_organizations.sql
-- Dependencies:  wo_organizations
-- ============================================================================
CREATE INDEX idx_orgs_path ON public.wo_organizations USING gist (org_path);

-- ============================================================================
-- Object:        public.idx_wo_orgs_parent
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_organizations.sql
-- Dependencies:  wo_organizations
-- ============================================================================
CREATE INDEX idx_wo_orgs_parent ON public.wo_organizations USING btree (parent_org_id);

-- ============================================================================
-- Object:        public.idx_wo_orgs_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_organizations.sql
-- Dependencies:  wo_organizations
-- ============================================================================
CREATE INDEX idx_wo_orgs_tenant ON public.wo_organizations USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wo2_status_correlation
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_status_history.sql
-- Dependencies:  wo_status_history
-- ============================================================================
CREATE INDEX idx_wo2_status_correlation ON public.wo_status_history USING btree (correlation_id);

-- ============================================================================
-- Object:        public.idx_wo2_status_entity
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_status_history.sql
-- Dependencies:  wo_status_history
-- ============================================================================
CREATE INDEX idx_wo2_status_entity ON public.wo_status_history USING btree (entity_type, entity_id, created_at DESC);

-- ============================================================================
-- Object:        public.idx_wo2_status_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_status_history.sql
-- Dependencies:  wo_status_history
-- ============================================================================
CREATE INDEX idx_wo2_status_tenant ON public.wo_status_history USING btree (tenant_id, created_at DESC);

-- ============================================================================
-- Object:        public.idx_wo2_items_sku
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_work_order_items.sql
-- Dependencies:  wo_work_order_items
-- ============================================================================
CREATE INDEX idx_wo2_items_sku ON public.wo_work_order_items USING btree (product_sku_id);

-- ============================================================================
-- Object:        public.idx_wo2_items_wo
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_work_order_items.sql
-- Dependencies:  wo_work_order_items
-- ============================================================================
CREATE INDEX idx_wo2_items_wo ON public.wo_work_order_items USING btree (work_order_id);

-- ============================================================================
-- Object:        public.idx_wo2_assigned
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_work_orders
-- ============================================================================
CREATE INDEX idx_wo2_assigned ON public.wo_work_orders USING btree (assigned_org_id);

-- ============================================================================
-- Object:        public.idx_wo2_correlation
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_work_orders
-- ============================================================================
CREATE INDEX idx_wo2_correlation ON public.wo_work_orders USING btree (correlation_id);

-- ============================================================================
-- Object:        public.idx_wo2_created
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_work_orders
-- ============================================================================
CREATE INDEX idx_wo2_created ON public.wo_work_orders USING btree (created_at DESC);

-- ============================================================================
-- Object:        public.idx_wo2_org
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_work_orders
-- ============================================================================
CREATE INDEX idx_wo2_org ON public.wo_work_orders USING btree (originating_org_id);

-- ============================================================================
-- Object:        public.idx_wo2_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_work_orders
-- ============================================================================
CREATE INDEX idx_wo2_status ON public.wo_work_orders USING btree (status);

-- ============================================================================
-- Object:        public.idx_wo2_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_work_orders
-- ============================================================================
CREATE INDEX idx_wo2_tenant ON public.wo_work_orders USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wo2_type
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_work_orders
-- ============================================================================
CREATE INDEX idx_wo2_type ON public.wo_work_orders USING btree (wo_type);

-- ============================================================================
-- Object:        public.idx_wo2_wf_correlation
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_workflow_instances.sql
-- Dependencies:  wo_workflow_instances
-- ============================================================================
CREATE INDEX idx_wo2_wf_correlation ON public.wo_workflow_instances USING btree (correlation_id);

-- ============================================================================
-- Object:        public.idx_wo2_wf_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_workflow_instances.sql
-- Dependencies:  wo_workflow_instances
-- ============================================================================
CREATE INDEX idx_wo2_wf_status ON public.wo_workflow_instances USING btree (status, created_at DESC);

-- ============================================================================
-- Object:        public.idx_wo2_wf_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/wo_workflow_instances.sql
-- Dependencies:  wo_workflow_instances
-- ============================================================================
CREATE INDEX idx_wo2_wf_tenant ON public.wo_workflow_instances USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_truck_wo_customer
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders
-- ============================================================================
CREATE INDEX idx_truck_wo_customer ON public.work_orders USING btree (customer_id);

-- ============================================================================
-- Object:        public.idx_truck_wo_status
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders
-- ============================================================================
CREATE INDEX idx_truck_wo_status ON public.work_orders USING btree (status);

-- ============================================================================
-- Object:        public.idx_truck_wo_tenant
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders
-- ============================================================================
CREATE INDEX idx_truck_wo_tenant ON public.work_orders USING btree (tenant_id);

-- ============================================================================
-- Object:        public.idx_wo_assigned_at
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders
-- ============================================================================
CREATE INDEX idx_wo_assigned_at ON public.work_orders USING btree (assigned_at)
  WHERE (assigned_at IS NOT NULL);

-- ============================================================================
-- Object:        public.idx_wo_completed_at
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders
-- ============================================================================
CREATE INDEX idx_wo_completed_at ON public.work_orders USING btree (completed_at)
  WHERE (completed_at IS NOT NULL);

-- ============================================================================
-- Object:        public.idx_wo_invoiced_at
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders
-- ============================================================================
CREATE INDEX idx_wo_invoiced_at ON public.work_orders USING btree (invoiced_at)
  WHERE (invoiced_at IS NOT NULL);

-- ============================================================================
-- Object:        public.idx_wo_ready_billing_at
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders
-- ============================================================================
CREATE INDEX idx_wo_ready_billing_at ON public.work_orders USING btree (ready_billing_at)
  WHERE (ready_billing_at IS NOT NULL);

-- ============================================================================
-- Object:        public.idx_wo_region
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders
-- ============================================================================
CREATE INDEX idx_wo_region ON public.work_orders USING btree (tenant_id, region_id);

-- ============================================================================
-- Object:        public.idx_wo_submitted_at
-- Layer:         005 Explicit Indexes
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders
-- ============================================================================
CREATE INDEX idx_wo_submitted_at ON public.work_orders USING btree (submitted_at)
  WHERE (submitted_at IS NOT NULL);
