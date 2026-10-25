-- ============================================================================
-- SENTRALOGIS MODULAR LAYERED BASELINE MIGRATION
-- Layer:         004 Deferred Foreign Key Constraints
-- Architecture:  D8-02 Option B2 / D8-30 Ratified
-- Baseline:      9bd2c04ce64b5e5c1d4b71451e4bab4a03c93999
-- Generation:    Deterministic Static Formation (Delivery Unit 2 / D8-33)
-- Total Objects: 587
-- Description:   Standalone deferred foreign key constraints
-- ============================================================================
-- ============================================================================
-- Object:        public.accounting_event_lines.accounting_event_lines_accounting_event_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/accounting_event_lines.sql
-- Dependencies:  accounting_events
-- ============================================================================
ALTER TABLE "public"."accounting_event_lines" ADD CONSTRAINT "accounting_event_lines_accounting_event_id_fkey" FOREIGN KEY (accounting_event_id) REFERENCES public.accounting_events (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.accounting_event_lines.accounting_event_lines_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/accounting_event_lines.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."accounting_event_lines" ADD CONSTRAINT "accounting_event_lines_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.accounting_events.accounting_events_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/accounting_events.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."accounting_events" ADD CONSTRAINT "accounting_events_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.accounting_providers.accounting_providers_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/accounting_providers.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."accounting_providers" ADD CONSTRAINT "accounting_providers_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.add_costs.add_costs_approved_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/add_costs.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."add_costs" ADD CONSTRAINT "add_costs_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.add_costs.add_costs_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/add_costs.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."add_costs" ADD CONSTRAINT "add_costs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.add_costs.add_costs_vendor_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/add_costs.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."add_costs" ADD CONSTRAINT "add_costs_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.attribute_types.attribute_types_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/attribute_types.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."attribute_types" ADD CONSTRAINT "attribute_types_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.chat_attachments.chat_attachments_message_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_attachments.sql
-- Dependencies:  chat_messages
-- ============================================================================
ALTER TABLE "public"."chat_attachments" ADD CONSTRAINT "chat_attachments_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.chat_messages (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.chat_channels.chat_channels_archived_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_channels.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."chat_channels" ADD CONSTRAINT "chat_channels_archived_by_fkey" FOREIGN KEY (archived_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.chat_channels.chat_channels_group_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_channels.sql
-- Dependencies:  chat_groups
-- ============================================================================
ALTER TABLE "public"."chat_channels" ADD CONSTRAINT "chat_channels_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.chat_groups (id);

-- ============================================================================
-- Object:        public.chat_group_members.chat_group_members_group_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  chat_groups
-- ============================================================================
ALTER TABLE "public"."chat_group_members" ADD CONSTRAINT "chat_group_members_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.chat_groups (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.chat_group_members.chat_group_members_user_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."chat_group_members" ADD CONSTRAINT "chat_group_members_user_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.chat_group_members.chat_group_members_user_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."chat_group_members" ADD CONSTRAINT "chat_group_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.chat_groups.chat_groups_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_groups.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."chat_groups" ADD CONSTRAINT "chat_groups_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.chat_groups.chat_groups_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_groups.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."chat_groups" ADD CONSTRAINT "chat_groups_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_channel_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_channels
-- ============================================================================
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.chat_channels (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_parent_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.chat_messages (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_pinned_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_pinned_by_fkey" FOREIGN KEY (pinned_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_sender_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_sender_fkey" FOREIGN KEY (sender_id) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_sender_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.chat_participants.chat_participants_channel_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_participants.sql
-- Dependencies:  chat_channels
-- ============================================================================
ALTER TABLE "public"."chat_participants" ADD CONSTRAINT "chat_participants_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.chat_channels (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.chat_participants.chat_participants_user_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_participants.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."chat_participants" ADD CONSTRAINT "chat_participants_user_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.chat_participants.chat_participants_user_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/chat_participants.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."chat_participants" ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.commercial_capability_bindings.commercial_capability_bindings_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_capability_bindings.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."commercial_capability_bindings" ADD CONSTRAINT "commercial_capability_bindings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.commercial_capability_bindings.commercial_capability_bindings_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_capability_bindings.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."commercial_capability_bindings" ADD CONSTRAINT "commercial_capability_bindings_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.commercial_capability_bindings.commercial_capability_bindings_work_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_capability_bindings.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
ALTER TABLE "public"."commercial_capability_bindings" ADD CONSTRAINT "commercial_capability_bindings_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.commercial_work_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.commercial_line_items.commercial_line_items_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_line_items.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."commercial_line_items" ADD CONSTRAINT "commercial_line_items_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.commercial_line_items.commercial_line_items_work_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_line_items.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
ALTER TABLE "public"."commercial_line_items" ADD CONSTRAINT "commercial_line_items_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.commercial_work_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.commercial_service_scopes.commercial_service_scopes_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_service_scopes.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."commercial_service_scopes" ADD CONSTRAINT "commercial_service_scopes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.commercial_service_scopes.commercial_service_scopes_dest_scope_node_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_service_scopes.sql
-- Dependencies:  md_locations
-- ============================================================================
ALTER TABLE "public"."commercial_service_scopes" ADD CONSTRAINT "commercial_service_scopes_dest_scope_node_id_fkey" FOREIGN KEY (dest_scope_node_id) REFERENCES public.md_locations (id);

-- ============================================================================
-- Object:        public.commercial_service_scopes.commercial_service_scopes_origin_scope_node_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_service_scopes.sql
-- Dependencies:  md_locations
-- ============================================================================
ALTER TABLE "public"."commercial_service_scopes" ADD CONSTRAINT "commercial_service_scopes_origin_scope_node_id_fkey" FOREIGN KEY (origin_scope_node_id) REFERENCES public.md_locations (id);

-- ============================================================================
-- Object:        public.commercial_service_scopes.commercial_service_scopes_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_service_scopes.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."commercial_service_scopes" ADD CONSTRAINT "commercial_service_scopes_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.commercial_service_scopes.commercial_service_scopes_updated_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_service_scopes.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."commercial_service_scopes" ADD CONSTRAINT "commercial_service_scopes_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.commercial_work_orders.commercial_work_orders_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_work_orders.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."commercial_work_orders" ADD CONSTRAINT "commercial_work_orders_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.commercial_work_orders.commercial_work_orders_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_work_orders.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."commercial_work_orders" ADD CONSTRAINT "commercial_work_orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.commercial_work_orders.commercial_work_orders_service_scope_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_work_orders.sql
-- Dependencies:  commercial_service_scopes
-- ============================================================================
ALTER TABLE "public"."commercial_work_orders" ADD CONSTRAINT "commercial_work_orders_service_scope_id_fkey" FOREIGN KEY (service_scope_id) REFERENCES public.commercial_service_scopes (id);

-- ============================================================================
-- Object:        public.commercial_work_orders.commercial_work_orders_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_work_orders.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."commercial_work_orders" ADD CONSTRAINT "commercial_work_orders_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.commercial_work_orders.commercial_work_orders_updated_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/commercial_work_orders.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."commercial_work_orders" ADD CONSTRAINT "commercial_work_orders_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.crm_activities.crm_activities_deal_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_activities.sql
-- Dependencies:  crm_deals
-- ============================================================================
ALTER TABLE "public"."crm_activities" ADD CONSTRAINT "crm_activities_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES public.crm_deals (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.crm_activities.crm_activities_entity_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_activities.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."crm_activities" ADD CONSTRAINT "crm_activities_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.crm_activities.crm_activities_performed_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_activities.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_activities" ADD CONSTRAINT "crm_activities_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.crm_deals.crm_deals_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_deals.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_deals" ADD CONSTRAINT "crm_deals_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.crm_deals.crm_deals_entity_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_deals.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."crm_deals" ADD CONSTRAINT "crm_deals_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.crm_deals.crm_deals_updated_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_deals.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_deals" ADD CONSTRAINT "crm_deals_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.crm_guest_links.crm_guest_links_channel_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_guest_links.sql
-- Dependencies:  chat_channels
-- ============================================================================
ALTER TABLE "public"."crm_guest_links" ADD CONSTRAINT "crm_guest_links_channel_id_fkey" FOREIGN KEY (channel_id) REFERENCES public.chat_channels (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.crm_guest_links.crm_guest_links_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_guest_links.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_guest_links" ADD CONSTRAINT "crm_guest_links_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.crm_guest_links.crm_guest_links_entity_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_guest_links.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."crm_guest_links" ADD CONSTRAINT "crm_guest_links_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.crm_quotation_items.crm_quotation_items_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotation_items.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_quotation_items" ADD CONSTRAINT "crm_quotation_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.crm_quotation_items.crm_quotation_items_quotation_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotation_items.sql
-- Dependencies:  crm_quotations
-- ============================================================================
ALTER TABLE "public"."crm_quotation_items" ADD CONSTRAINT "crm_quotation_items_quotation_id_fkey" FOREIGN KEY (quotation_id) REFERENCES public.crm_quotations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.crm_quotation_items.crm_quotation_items_rate_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotation_items.sql
-- Dependencies:  crm_sbu_customer_rates
-- ============================================================================
ALTER TABLE "public"."crm_quotation_items" ADD CONSTRAINT "crm_quotation_items_rate_id_fkey" FOREIGN KEY (rate_id) REFERENCES public.crm_sbu_customer_rates (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.crm_quotation_items.crm_quotation_items_section_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotation_items.sql
-- Dependencies:  crm_quotation_sections
-- ============================================================================
ALTER TABLE "public"."crm_quotation_items" ADD CONSTRAINT "crm_quotation_items_section_id_fkey" FOREIGN KEY (section_id) REFERENCES public.crm_quotation_sections (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.crm_quotation_items.crm_quotation_items_service_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotation_items.sql
-- Dependencies:  md_services
-- ============================================================================
ALTER TABLE "public"."crm_quotation_items" ADD CONSTRAINT "crm_quotation_items_service_id_fkey" FOREIGN KEY (service_id) REFERENCES public.md_services (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.crm_quotation_items.crm_quotation_items_updated_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotation_items.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_quotation_items" ADD CONSTRAINT "crm_quotation_items_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.crm_quotation_sections.crm_quotation_sections_approved_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotation_sections.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_quotation_sections" ADD CONSTRAINT "crm_quotation_sections_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.crm_quotation_sections.crm_quotation_sections_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotation_sections.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_quotation_sections" ADD CONSTRAINT "crm_quotation_sections_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.crm_quotation_sections.crm_quotation_sections_quotation_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotation_sections.sql
-- Dependencies:  crm_quotations
-- ============================================================================
ALTER TABLE "public"."crm_quotation_sections" ADD CONSTRAINT "crm_quotation_sections_quotation_id_fkey" FOREIGN KEY (quotation_id) REFERENCES public.crm_quotations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.crm_quotation_sections.crm_quotation_sections_updated_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotation_sections.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_quotation_sections" ADD CONSTRAINT "crm_quotation_sections_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.crm_quotations.crm_quotations_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotations.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_quotations" ADD CONSTRAINT "crm_quotations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.crm_quotations.crm_quotations_deal_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotations.sql
-- Dependencies:  crm_deals
-- ============================================================================
ALTER TABLE "public"."crm_quotations" ADD CONSTRAINT "crm_quotations_deal_id_fkey" FOREIGN KEY (deal_id) REFERENCES public.crm_deals (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.crm_quotations.crm_quotations_updated_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_quotations.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_quotations" ADD CONSTRAINT "crm_quotations_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.crm_sbu_customer_rates.crm_sbu_customer_rates_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_sbu_customer_rates.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_sbu_customer_rates" ADD CONSTRAINT "crm_sbu_customer_rates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.crm_sbu_customer_rates.crm_sbu_customer_rates_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_sbu_customer_rates.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."crm_sbu_customer_rates" ADD CONSTRAINT "crm_sbu_customer_rates_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.crm_sbu_customer_rates.crm_sbu_customer_rates_updated_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/crm_sbu_customer_rates.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."crm_sbu_customer_rates" ADD CONSTRAINT "crm_sbu_customer_rates_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.cus_ceisa_preparations.cus_ceisa_preparations_declaration_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_ceisa_preparations.sql
-- Dependencies:  cus_declarations
-- ============================================================================
ALTER TABLE "public"."cus_ceisa_preparations" ADD CONSTRAINT "cus_ceisa_preparations_declaration_id_fkey" FOREIGN KEY (declaration_id) REFERENCES public.cus_declarations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.cus_ceisa_preparations.cus_ceisa_preparations_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_ceisa_preparations.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."cus_ceisa_preparations" ADD CONSTRAINT "cus_ceisa_preparations_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.cus_ceisa_validation_results.cus_ceisa_validation_results_preparation_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_ceisa_validation_results.sql
-- Dependencies:  cus_ceisa_preparations
-- ============================================================================
ALTER TABLE "public"."cus_ceisa_validation_results" ADD CONSTRAINT "cus_ceisa_validation_results_preparation_id_fkey" FOREIGN KEY (preparation_id) REFERENCES public.cus_ceisa_preparations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.cus_ceisa_validation_results.cus_ceisa_validation_results_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_ceisa_validation_results.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."cus_ceisa_validation_results" ADD CONSTRAINT "cus_ceisa_validation_results_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.cus_classification_lines.cus_classification_lines_declaration_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_classification_lines.sql
-- Dependencies:  cus_declarations
-- ============================================================================
ALTER TABLE "public"."cus_classification_lines" ADD CONSTRAINT "cus_classification_lines_declaration_id_fkey" FOREIGN KEY (declaration_id) REFERENCES public.cus_declarations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.cus_classification_lines.cus_classification_lines_hs_master_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_classification_lines.sql
-- Dependencies:  md_customs_hs_codes
-- ============================================================================
ALTER TABLE "public"."cus_classification_lines" ADD CONSTRAINT "cus_classification_lines_hs_master_id_fkey" FOREIGN KEY (hs_master_id) REFERENCES public.md_customs_hs_codes (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_classification_lines.cus_classification_lines_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_classification_lines.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."cus_classification_lines" ADD CONSTRAINT "cus_classification_lines_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.cus_customs_decisions.cus_customs_decisions_declaration_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_customs_decisions.sql
-- Dependencies:  cus_declarations
-- ============================================================================
ALTER TABLE "public"."cus_customs_decisions" ADD CONSTRAINT "cus_customs_decisions_declaration_id_fkey" FOREIGN KEY (declaration_id) REFERENCES public.cus_declarations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.cus_customs_decisions.cus_customs_decisions_related_document_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_customs_decisions.sql
-- Dependencies:  cus_declaration_documents
-- ============================================================================
ALTER TABLE "public"."cus_customs_decisions" ADD CONSTRAINT "cus_customs_decisions_related_document_id_fkey" FOREIGN KEY (related_document_id) REFERENCES public.cus_declaration_documents (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_customs_decisions.cus_customs_decisions_related_exception_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_customs_decisions.sql
-- Dependencies:  cus_declaration_exceptions
-- ============================================================================
ALTER TABLE "public"."cus_customs_decisions" ADD CONSTRAINT "cus_customs_decisions_related_exception_id_fkey" FOREIGN KEY (related_exception_id) REFERENCES public.cus_declaration_exceptions (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_customs_decisions.cus_customs_decisions_related_item_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_customs_decisions.sql
-- Dependencies:  cus_classification_lines
-- ============================================================================
ALTER TABLE "public"."cus_customs_decisions" ADD CONSTRAINT "cus_customs_decisions_related_item_id_fkey" FOREIGN KEY (related_item_id) REFERENCES public.cus_classification_lines (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_customs_decisions.cus_customs_decisions_related_prep_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_customs_decisions.sql
-- Dependencies:  cus_ceisa_preparations
-- ============================================================================
ALTER TABLE "public"."cus_customs_decisions" ADD CONSTRAINT "cus_customs_decisions_related_prep_id_fkey" FOREIGN KEY (related_prep_id) REFERENCES public.cus_ceisa_preparations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_customs_decisions.cus_customs_decisions_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_customs_decisions.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."cus_customs_decisions" ADD CONSTRAINT "cus_customs_decisions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.cus_declaration_audit_events.cus_declaration_audit_events_declaration_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declaration_audit_events.sql
-- Dependencies:  cus_declarations
-- ============================================================================
ALTER TABLE "public"."cus_declaration_audit_events" ADD CONSTRAINT "cus_declaration_audit_events_declaration_id_fkey" FOREIGN KEY (declaration_id) REFERENCES public.cus_declarations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.cus_declaration_audit_events.cus_declaration_audit_events_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declaration_audit_events.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."cus_declaration_audit_events" ADD CONSTRAINT "cus_declaration_audit_events_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.cus_declaration_documents.cus_declaration_documents_classification_line_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declaration_documents.sql
-- Dependencies:  cus_classification_lines
-- ============================================================================
ALTER TABLE "public"."cus_declaration_documents" ADD CONSTRAINT "cus_declaration_documents_classification_line_id_fkey" FOREIGN KEY (classification_line_id) REFERENCES public.cus_classification_lines (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_declaration_documents.cus_declaration_documents_declaration_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declaration_documents.sql
-- Dependencies:  cus_declarations
-- ============================================================================
ALTER TABLE "public"."cus_declaration_documents" ADD CONSTRAINT "cus_declaration_documents_declaration_id_fkey" FOREIGN KEY (declaration_id) REFERENCES public.cus_declarations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.cus_declaration_documents.cus_declaration_documents_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declaration_documents.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."cus_declaration_documents" ADD CONSTRAINT "cus_declaration_documents_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.cus_declaration_exceptions.cus_declaration_exceptions_classification_line_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  cus_classification_lines
-- ============================================================================
ALTER TABLE "public"."cus_declaration_exceptions" ADD CONSTRAINT "cus_declaration_exceptions_classification_line_id_fkey" FOREIGN KEY (classification_line_id) REFERENCES public.cus_classification_lines (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_declaration_exceptions.cus_declaration_exceptions_declaration_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  cus_declarations
-- ============================================================================
ALTER TABLE "public"."cus_declaration_exceptions" ADD CONSTRAINT "cus_declaration_exceptions_declaration_id_fkey" FOREIGN KEY (declaration_id) REFERENCES public.cus_declarations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.cus_declaration_exceptions.cus_declaration_exceptions_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."cus_declaration_exceptions" ADD CONSTRAINT "cus_declaration_exceptions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.cus_declaration_exceptions.cus_declaration_exceptions_validation_run_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  cus_declaration_validation_runs
-- ============================================================================
ALTER TABLE "public"."cus_declaration_exceptions" ADD CONSTRAINT "cus_declaration_exceptions_validation_run_id_fkey" FOREIGN KEY (validation_run_id) REFERENCES public.cus_declaration_validation_runs (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_declaration_validation_runs.cus_declaration_validation_runs_declaration_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declaration_validation_runs.sql
-- Dependencies:  cus_declarations
-- ============================================================================
ALTER TABLE "public"."cus_declaration_validation_runs" ADD CONSTRAINT "cus_declaration_validation_runs_declaration_id_fkey" FOREIGN KEY (declaration_id) REFERENCES public.cus_declarations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.cus_declaration_validation_runs.cus_declaration_validation_runs_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declaration_validation_runs.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."cus_declaration_validation_runs" ADD CONSTRAINT "cus_declaration_validation_runs_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.cus_declarations.cus_declarations_execution_leg_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  shp_execution_legs
-- ============================================================================
ALTER TABLE "public"."cus_declarations" ADD CONSTRAINT "cus_declarations_execution_leg_id_fkey" FOREIGN KEY (execution_leg_id) REFERENCES public.shp_execution_legs (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_declarations.cus_declarations_importer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."cus_declarations" ADD CONSTRAINT "cus_declarations_importer_id_fkey" FOREIGN KEY (importer_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.cus_declarations.cus_declarations_ppjk_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."cus_declarations" ADD CONSTRAINT "cus_declarations_ppjk_id_fkey" FOREIGN KEY (ppjk_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.cus_declarations.cus_declarations_service_request_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  svc_service_requests
-- ============================================================================
ALTER TABLE "public"."cus_declarations" ADD CONSTRAINT "cus_declarations_service_request_id_fkey" FOREIGN KEY (service_request_id) REFERENCES public.svc_service_requests (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_declarations.cus_declarations_shipment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  shp_shipments
-- ============================================================================
ALTER TABLE "public"."cus_declarations" ADD CONSTRAINT "cus_declarations_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.shp_shipments (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_declarations.cus_declarations_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."cus_declarations" ADD CONSTRAINT "cus_declarations_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.cus_declarations.cus_declarations_work_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
ALTER TABLE "public"."cus_declarations" ADD CONSTRAINT "cus_declarations_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.commercial_work_orders (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_item_audit_logs.cus_item_audit_logs_classification_line_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_item_audit_logs.sql
-- Dependencies:  cus_classification_lines
-- ============================================================================
ALTER TABLE "public"."cus_item_audit_logs" ADD CONSTRAINT "cus_item_audit_logs_classification_line_id_fkey" FOREIGN KEY (classification_line_id) REFERENCES public.cus_classification_lines (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_item_audit_logs.cus_item_audit_logs_declaration_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_item_audit_logs.sql
-- Dependencies:  cus_declarations
-- ============================================================================
ALTER TABLE "public"."cus_item_audit_logs" ADD CONSTRAINT "cus_item_audit_logs_declaration_id_fkey" FOREIGN KEY (declaration_id) REFERENCES public.cus_declarations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.cus_item_audit_logs.cus_item_audit_logs_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_item_audit_logs.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."cus_item_audit_logs" ADD CONSTRAINT "cus_item_audit_logs_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.cus_sku_classification_history.cus_sku_classification_history_declaration_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_sku_classification_history.sql
-- Dependencies:  cus_declarations
-- ============================================================================
ALTER TABLE "public"."cus_sku_classification_history" ADD CONSTRAINT "cus_sku_classification_history_declaration_id_fkey" FOREIGN KEY (declaration_id) REFERENCES public.cus_declarations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_sku_classification_history.cus_sku_classification_history_importer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_sku_classification_history.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."cus_sku_classification_history" ADD CONSTRAINT "cus_sku_classification_history_importer_id_fkey" FOREIGN KEY (importer_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.cus_sku_classification_history.cus_sku_classification_history_sku_intelligence_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_sku_classification_history.sql
-- Dependencies:  cus_sku_intelligence
-- ============================================================================
ALTER TABLE "public"."cus_sku_classification_history" ADD CONSTRAINT "cus_sku_classification_history_sku_intelligence_id_fkey" FOREIGN KEY (sku_intelligence_id) REFERENCES public.cus_sku_intelligence (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.cus_sku_classification_history.cus_sku_classification_history_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_sku_classification_history.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."cus_sku_classification_history" ADD CONSTRAINT "cus_sku_classification_history_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.cus_sku_intelligence.cus_sku_intelligence_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_sku_intelligence.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."cus_sku_intelligence" ADD CONSTRAINT "cus_sku_intelligence_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.cus_sku_intelligence.cus_sku_intelligence_importer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_sku_intelligence.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."cus_sku_intelligence" ADD CONSTRAINT "cus_sku_intelligence_importer_id_fkey" FOREIGN KEY (importer_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.cus_sku_intelligence.cus_sku_intelligence_last_used_declaration_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_sku_intelligence.sql
-- Dependencies:  cus_declarations
-- ============================================================================
ALTER TABLE "public"."cus_sku_intelligence" ADD CONSTRAINT "cus_sku_intelligence_last_used_declaration_id_fkey" FOREIGN KEY (last_used_declaration_id) REFERENCES public.cus_declarations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.cus_sku_intelligence.cus_sku_intelligence_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/cus_sku_intelligence.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."cus_sku_intelligence" ADD CONSTRAINT "cus_sku_intelligence_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.customer_requests.customer_requests_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/customer_requests.sql
-- Dependencies:  customers
-- ============================================================================
ALTER TABLE "public"."customer_requests" ADD CONSTRAINT "customer_requests_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.customer_requests.customer_requests_product_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/customer_requests.sql
-- Dependencies:  products
-- ============================================================================
ALTER TABLE "public"."customer_requests" ADD CONSTRAINT "customer_requests_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products (id);

-- ============================================================================
-- Object:        public.customer_requests.customer_requests_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/customer_requests.sql
-- Dependencies:  warehouses
-- ============================================================================
ALTER TABLE "public"."customer_requests" ADD CONSTRAINT "customer_requests_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.customers.customers_auth_user_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/customers.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.customers.customers_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/customers.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.documents.documents_job_route_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/documents.sql
-- Dependencies:  job_routes
-- ============================================================================
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_job_route_id_fkey" FOREIGN KEY (job_route_id) REFERENCES public.job_routes (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.documents.documents_uploaded_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/documents.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.documents.documents_verified_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/documents.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.documents.fk_documents_uploaded_by
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/documents.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."documents" ADD CONSTRAINT "fk_documents_uploaded_by" FOREIGN KEY (uploaded_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.driver_attendance.driver_attendance_driver_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/driver_attendance.sql
-- Dependencies:  md_drivers
-- ============================================================================
ALTER TABLE "public"."driver_attendance" ADD CONSTRAINT "driver_attendance_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.md_drivers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.driver_attendance.driver_attendance_fleet_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/driver_attendance.sql
-- Dependencies:  md_fleets
-- ============================================================================
ALTER TABLE "public"."driver_attendance" ADD CONSTRAINT "driver_attendance_fleet_id_fkey" FOREIGN KEY (fleet_id) REFERENCES public.md_fleets (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.driver_kpi_history.driver_kpi_history_driver_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/driver_kpi_history.sql
-- Dependencies:  md_drivers
-- ============================================================================
ALTER TABLE "public"."driver_kpi_history" ADD CONSTRAINT "driver_kpi_history_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.md_drivers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.driver_performance_logs.driver_performance_logs_driver_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/driver_performance_logs.sql
-- Dependencies:  md_drivers
-- ============================================================================
ALTER TABLE "public"."driver_performance_logs" ADD CONSTRAINT "driver_performance_logs_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.md_drivers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.driver_requests.driver_requests_approved_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/driver_requests.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."driver_requests" ADD CONSTRAINT "driver_requests_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.driver_resolution_audit_logs.driver_resolution_audit_logs_conflicting_driver_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/driver_resolution_audit_logs.sql
-- Dependencies:  md_drivers
-- ============================================================================
ALTER TABLE "public"."driver_resolution_audit_logs" ADD CONSTRAINT "driver_resolution_audit_logs_conflicting_driver_id_fkey" FOREIGN KEY (conflicting_driver_id) REFERENCES public.md_drivers (id);

-- ============================================================================
-- Object:        public.driver_resolution_audit_logs.driver_resolution_audit_logs_driver_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/driver_resolution_audit_logs.sql
-- Dependencies:  md_drivers
-- ============================================================================
ALTER TABLE "public"."driver_resolution_audit_logs" ADD CONSTRAINT "driver_resolution_audit_logs_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.md_drivers (id);

-- ============================================================================
-- Object:        public.driver_resolution_audit_logs.driver_resolution_audit_logs_operator_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/driver_resolution_audit_logs.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."driver_resolution_audit_logs" ADD CONSTRAINT "driver_resolution_audit_logs_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.driver_resolution_audit_logs.driver_resolution_audit_logs_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/driver_resolution_audit_logs.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."driver_resolution_audit_logs" ADD CONSTRAINT "driver_resolution_audit_logs_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.driver_tenant_links.driver_tenant_links_driver_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/driver_tenant_links.sql
-- Dependencies:  md_drivers
-- ============================================================================
ALTER TABLE "public"."driver_tenant_links" ADD CONSTRAINT "driver_tenant_links_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.md_drivers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.driver_tenant_links.driver_tenant_links_profile_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/driver_tenant_links.sql
-- Dependencies:  driver_profiles
-- ============================================================================
ALTER TABLE "public"."driver_tenant_links" ADD CONSTRAINT "driver_tenant_links_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.driver_profiles (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.driver_tenant_links.driver_tenant_links_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/driver_tenant_links.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."driver_tenant_links" ADD CONSTRAINT "driver_tenant_links_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.drivers.drivers_company_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/drivers.sql
-- Dependencies:  companies
-- ============================================================================
ALTER TABLE "public"."drivers" ADD CONSTRAINT "drivers_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.drivers.drivers_current_fleet_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/drivers.sql
-- Dependencies:  fleets
-- ============================================================================
ALTER TABLE "public"."drivers" ADD CONSTRAINT "drivers_current_fleet_id_fkey" FOREIGN KEY (current_fleet_id) REFERENCES public.fleets (id);

-- ============================================================================
-- Object:        public.event_consumption_log.event_consumption_log_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/event_consumption_log.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."event_consumption_log" ADD CONSTRAINT "event_consumption_log_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.event_dead_letter.event_dead_letter_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/event_dead_letter.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."event_dead_letter" ADD CONSTRAINT "event_dead_letter_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.event_outbox.event_outbox_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/event_outbox.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."event_outbox" ADD CONSTRAINT "event_outbox_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.extra_costs.extra_costs_cost_account_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  finance_coa
-- ============================================================================
ALTER TABLE "public"."extra_costs" ADD CONSTRAINT "extra_costs_cost_account_id_fkey" FOREIGN KEY (cost_account_id) REFERENCES public.finance_coa (id);

-- ============================================================================
-- Object:        public.extra_costs.extra_costs_tax_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  md_taxes
-- ============================================================================
ALTER TABLE "public"."extra_costs" ADD CONSTRAINT "extra_costs_tax_id_fkey" FOREIGN KEY (tax_id) REFERENCES public.md_taxes (id);

-- ============================================================================
-- Object:        public.extra_costs.extra_costs_vendor_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."extra_costs" ADD CONSTRAINT "extra_costs_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.extra_costs.extra_costs_wo_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  work_orders
-- ============================================================================
ALTER TABLE "public"."extra_costs" ADD CONSTRAINT "extra_costs_wo_id_fkey" FOREIGN KEY (wo_id) REFERENCES public.work_orders (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_adjustments.fin_adjustments_ar_ap_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_adjustments.sql
-- Dependencies:  fin_ar_ap
-- ============================================================================
ALTER TABLE "public"."fin_adjustments" ADD CONSTRAINT "fin_adjustments_ar_ap_id_fkey" FOREIGN KEY (ar_ap_id) REFERENCES public.fin_ar_ap (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_adjustments.fin_adjustments_invoice_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_adjustments.sql
-- Dependencies:  fin_invoices
-- ============================================================================
ALTER TABLE "public"."fin_adjustments" ADD CONSTRAINT "fin_adjustments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.fin_invoices (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_adjustments.fin_adjustments_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_adjustments.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."fin_adjustments" ADD CONSTRAINT "fin_adjustments_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_ar_ap.fin_ar_ap_invoice_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_ar_ap.sql
-- Dependencies:  fin_invoices
-- ============================================================================
ALTER TABLE "public"."fin_ar_ap" ADD CONSTRAINT "fin_ar_ap_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.fin_invoices (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_ar_ap.fin_ar_ap_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_ar_ap.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."fin_ar_ap" ADD CONSTRAINT "fin_ar_ap_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_billable_events.fin_billable_events_sales_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_billable_events.sql
-- Dependencies:  sales_orders
-- ============================================================================
ALTER TABLE "public"."fin_billable_events" ADD CONSTRAINT "fin_billable_events_sales_order_id_fkey" FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_billable_events.fin_billable_events_so_line_item_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_billable_events.sql
-- Dependencies:  sales_order_line_items
-- ============================================================================
ALTER TABLE "public"."fin_billable_events" ADD CONSTRAINT "fin_billable_events_so_line_item_id_fkey" FOREIGN KEY (so_line_item_id) REFERENCES public.sales_order_line_items (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_billable_events.fin_billable_events_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_billable_events.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."fin_billable_events" ADD CONSTRAINT "fin_billable_events_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_financial_ledger_entries.fin_financial_ledger_entries_execution_leg_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_financial_ledger_entries.sql
-- Dependencies:  shp_execution_legs
-- ============================================================================
ALTER TABLE "public"."fin_financial_ledger_entries" ADD CONSTRAINT "fin_financial_ledger_entries_execution_leg_id_fkey" FOREIGN KEY (execution_leg_id) REFERENCES public.shp_execution_legs (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_financial_ledger_entries.fin_financial_ledger_entries_service_request_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_financial_ledger_entries.sql
-- Dependencies:  svc_service_requests
-- ============================================================================
ALTER TABLE "public"."fin_financial_ledger_entries" ADD CONSTRAINT "fin_financial_ledger_entries_service_request_id_fkey" FOREIGN KEY (service_request_id) REFERENCES public.svc_service_requests (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_financial_ledger_entries.fin_financial_ledger_entries_shipment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_financial_ledger_entries.sql
-- Dependencies:  shp_shipments
-- ============================================================================
ALTER TABLE "public"."fin_financial_ledger_entries" ADD CONSTRAINT "fin_financial_ledger_entries_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.shp_shipments (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_financial_ledger_entries.fin_financial_ledger_entries_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_financial_ledger_entries.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."fin_financial_ledger_entries" ADD CONSTRAINT "fin_financial_ledger_entries_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.fin_financial_ledger_entries.fin_financial_ledger_entries_vendor_entity_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_financial_ledger_entries.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."fin_financial_ledger_entries" ADD CONSTRAINT "fin_financial_ledger_entries_vendor_entity_id_fkey" FOREIGN KEY (vendor_entity_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_financial_ledger_entries.fin_financial_ledger_entries_work_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_financial_ledger_entries.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
ALTER TABLE "public"."fin_financial_ledger_entries" ADD CONSTRAINT "fin_financial_ledger_entries_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.commercial_work_orders (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_invoice_lines.fin_invoice_lines_billable_event_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_invoice_lines.sql
-- Dependencies:  fin_billable_events
-- ============================================================================
ALTER TABLE "public"."fin_invoice_lines" ADD CONSTRAINT "fin_invoice_lines_billable_event_id_fkey" FOREIGN KEY (billable_event_id) REFERENCES public.fin_billable_events (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_invoice_lines.fin_invoice_lines_invoice_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_invoice_lines.sql
-- Dependencies:  fin_invoices
-- ============================================================================
ALTER TABLE "public"."fin_invoice_lines" ADD CONSTRAINT "fin_invoice_lines_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.fin_invoices (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_invoice_lines.fin_invoice_lines_so_line_item_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_invoice_lines.sql
-- Dependencies:  sales_order_line_items
-- ============================================================================
ALTER TABLE "public"."fin_invoice_lines" ADD CONSTRAINT "fin_invoice_lines_so_line_item_id_fkey" FOREIGN KEY (so_line_item_id) REFERENCES public.sales_order_line_items (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_invoice_lines.fin_invoice_lines_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_invoice_lines.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."fin_invoice_lines" ADD CONSTRAINT "fin_invoice_lines_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_invoices.fin_invoices_sales_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_invoices.sql
-- Dependencies:  sales_orders
-- ============================================================================
ALTER TABLE "public"."fin_invoices" ADD CONSTRAINT "fin_invoices_sales_order_id_fkey" FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_invoices.fin_invoices_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_invoices.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."fin_invoices" ADD CONSTRAINT "fin_invoices_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_payment_allocations.fin_payment_allocations_invoice_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_payment_allocations.sql
-- Dependencies:  fin_invoices
-- ============================================================================
ALTER TABLE "public"."fin_payment_allocations" ADD CONSTRAINT "fin_payment_allocations_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.fin_invoices (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_payment_allocations.fin_payment_allocations_payment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_payment_allocations.sql
-- Dependencies:  fin_payments
-- ============================================================================
ALTER TABLE "public"."fin_payment_allocations" ADD CONSTRAINT "fin_payment_allocations_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.fin_payments (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_payment_allocations.fin_payment_allocations_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_payment_allocations.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."fin_payment_allocations" ADD CONSTRAINT "fin_payment_allocations_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_payments.fin_payments_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_payments.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."fin_payments" ADD CONSTRAINT "fin_payments_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_reconciliation_records.fin_reconciliation_records_payment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_reconciliation_records.sql
-- Dependencies:  fin_payments
-- ============================================================================
ALTER TABLE "public"."fin_reconciliation_records" ADD CONSTRAINT "fin_reconciliation_records_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES public.fin_payments (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fin_reconciliation_records.fin_reconciliation_records_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_reconciliation_records.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."fin_reconciliation_records" ADD CONSTRAINT "fin_reconciliation_records_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_settlements.fin_settlements_allocation_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_settlements.sql
-- Dependencies:  fin_payment_allocations
-- ============================================================================
ALTER TABLE "public"."fin_settlements" ADD CONSTRAINT "fin_settlements_allocation_id_fkey" FOREIGN KEY (allocation_id) REFERENCES public.fin_payment_allocations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fin_settlements.fin_settlements_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fin_settlements.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."fin_settlements" ADD CONSTRAINT "fin_settlements_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.finance_coa.finance_coa_parent_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/finance_coa.sql
-- Dependencies:  finance_coa
-- ============================================================================
ALTER TABLE "public"."finance_coa" ADD CONSTRAINT "finance_coa_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.finance_coa (id);

-- ============================================================================
-- Object:        public.finance_journal_entries.finance_journal_entries_account_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/finance_journal_entries.sql
-- Dependencies:  finance_coa
-- ============================================================================
ALTER TABLE "public"."finance_journal_entries" ADD CONSTRAINT "finance_journal_entries_account_id_fkey" FOREIGN KEY (account_id) REFERENCES public.finance_coa (id);

-- ============================================================================
-- Object:        public.finance_journal_entries.finance_journal_entries_journal_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/finance_journal_entries.sql
-- Dependencies:  finance_journals
-- ============================================================================
ALTER TABLE "public"."finance_journal_entries" ADD CONSTRAINT "finance_journal_entries_journal_id_fkey" FOREIGN KEY (journal_id) REFERENCES public.finance_journals (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.finance_journals.finance_journals_wo_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/finance_journals.sql
-- Dependencies:  work_orders
-- ============================================================================
ALTER TABLE "public"."finance_journals" ADD CONSTRAINT "finance_journals_wo_id_fkey" FOREIGN KEY (wo_id) REFERENCES public.work_orders (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.fleet_driver_history.fleet_driver_history_driver_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fleet_driver_history.sql
-- Dependencies:  drivers
-- ============================================================================
ALTER TABLE "public"."fleet_driver_history" ADD CONSTRAINT "fleet_driver_history_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.drivers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fleet_driver_history.fleet_driver_history_fleet_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fleet_driver_history.sql
-- Dependencies:  fleets
-- ============================================================================
ALTER TABLE "public"."fleet_driver_history" ADD CONSTRAINT "fleet_driver_history_fleet_id_fkey" FOREIGN KEY (fleet_id) REFERENCES public.fleets (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fleet_gps_status.fleet_gps_status_fleet_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fleet_gps_status.sql
-- Dependencies:  md_fleets
-- ============================================================================
ALTER TABLE "public"."fleet_gps_status" ADD CONSTRAINT "fleet_gps_status_fleet_id_fkey" FOREIGN KEY (fleet_id) REFERENCES public.md_fleets (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fleet_gps_status.fleet_gps_status_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fleet_gps_status.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."fleet_gps_status" ADD CONSTRAINT "fleet_gps_status_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fleet_inspections.fleet_inspections_driver_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fleet_inspections.sql
-- Dependencies:  md_drivers
-- ============================================================================
ALTER TABLE "public"."fleet_inspections" ADD CONSTRAINT "fleet_inspections_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.md_drivers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fleet_inspections.fleet_inspections_fleet_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fleet_inspections.sql
-- Dependencies:  md_fleets
-- ============================================================================
ALTER TABLE "public"."fleet_inspections" ADD CONSTRAINT "fleet_inspections_fleet_id_fkey" FOREIGN KEY (fleet_id) REFERENCES public.md_fleets (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fleet_inspections.fleet_inspections_resolved_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fleet_inspections.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."fleet_inspections" ADD CONSTRAINT "fleet_inspections_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.fleets.fleets_company_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fleets.sql
-- Dependencies:  companies
-- ============================================================================
ALTER TABLE "public"."fleets" ADD CONSTRAINT "fleets_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fw_consolidations.fw_consolidations_consol_warehouse_destination_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_consolidations.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."fw_consolidations" ADD CONSTRAINT "fw_consolidations_consol_warehouse_destination_id_fkey" FOREIGN KEY (consol_warehouse_destination_id) REFERENCES public.md_warehouses (id);

-- ============================================================================
-- Object:        public.fw_consolidations.fw_consolidations_consol_warehouse_origin_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_consolidations.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."fw_consolidations" ADD CONSTRAINT "fw_consolidations_consol_warehouse_origin_id_fkey" FOREIGN KEY (consol_warehouse_origin_id) REFERENCES public.md_warehouses (id);

-- ============================================================================
-- Object:        public.fw_consolidations.fw_consolidations_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_consolidations.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."fw_consolidations" ADD CONSTRAINT "fw_consolidations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.fw_consolidations.fw_consolidations_shipping_line_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_consolidations.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."fw_consolidations" ADD CONSTRAINT "fw_consolidations_shipping_line_id_fkey" FOREIGN KEY (shipping_line_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.fw_container_assignments.fw_container_assignments_consolidation_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_container_assignments.sql
-- Dependencies:  fw_consolidations
-- ============================================================================
ALTER TABLE "public"."fw_container_assignments" ADD CONSTRAINT "fw_container_assignments_consolidation_id_fkey" FOREIGN KEY (consolidation_id) REFERENCES public.fw_consolidations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fw_container_items.fw_container_items_container_assignment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  fw_container_assignments
-- ============================================================================
ALTER TABLE "public"."fw_container_items" ADD CONSTRAINT "fw_container_items_container_assignment_id_fkey" FOREIGN KEY (container_assignment_id) REFERENCES public.fw_container_assignments (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fw_container_items.fw_container_items_last_mile_wo_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  work_orders
-- ============================================================================
ALTER TABLE "public"."fw_container_items" ADD CONSTRAINT "fw_container_items_last_mile_wo_id_fkey" FOREIGN KEY (last_mile_wo_id) REFERENCES public.work_orders (id);

-- ============================================================================
-- Object:        public.fw_container_items.fw_container_items_pickup_wo_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  work_orders
-- ============================================================================
ALTER TABLE "public"."fw_container_items" ADD CONSTRAINT "fw_container_items_pickup_wo_id_fkey" FOREIGN KEY (pickup_wo_id) REFERENCES public.work_orders (id);

-- ============================================================================
-- Object:        public.fw_container_items.fw_container_items_port_haulage_dest_wo_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  work_orders
-- ============================================================================
ALTER TABLE "public"."fw_container_items" ADD CONSTRAINT "fw_container_items_port_haulage_dest_wo_id_fkey" FOREIGN KEY (port_haulage_dest_wo_id) REFERENCES public.work_orders (id);

-- ============================================================================
-- Object:        public.fw_container_items.fw_container_items_port_haulage_origin_wo_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  work_orders
-- ============================================================================
ALTER TABLE "public"."fw_container_items" ADD CONSTRAINT "fw_container_items_port_haulage_origin_wo_id_fkey" FOREIGN KEY (port_haulage_origin_wo_id) REFERENCES public.work_orders (id);

-- ============================================================================
-- Object:        public.fw_container_items.fw_container_items_price_master_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  fw_price_master
-- ============================================================================
ALTER TABLE "public"."fw_container_items" ADD CONSTRAINT "fw_container_items_price_master_id_fkey" FOREIGN KEY (price_master_id) REFERENCES public.fw_price_master (id);

-- ============================================================================
-- Object:        public.fw_container_items.fw_container_items_wo_item_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  wo_items
-- ============================================================================
ALTER TABLE "public"."fw_container_items" ADD CONSTRAINT "fw_container_items_wo_item_id_fkey" FOREIGN KEY (wo_item_id) REFERENCES public.wo_items (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.fw_legs.fw_legs_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/fw_legs.sql
-- Dependencies:  fw_order_headers
-- ============================================================================
ALTER TABLE "public"."fw_legs" ADD CONSTRAINT "fw_legs_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.fw_order_headers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.general_ledger.general_ledger_transaction_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/general_ledger.sql
-- Dependencies:  finance_transactions
-- ============================================================================
ALTER TABLE "public"."general_ledger" ADD CONSTRAINT "general_ledger_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES public.finance_transactions (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.geofence_events.geofence_events_session_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/geofence_events.sql
-- Dependencies:  tracking_sessions
-- ============================================================================
ALTER TABLE "public"."geofence_events" ADD CONSTRAINT "geofence_events_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.tracking_sessions (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.geofence_events.geofence_events_zone_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/geofence_events.sql
-- Dependencies:  geofence_zones
-- ============================================================================
ALTER TABLE "public"."geofence_events" ADD CONSTRAINT "geofence_events_zone_id_fkey" FOREIGN KEY (zone_id) REFERENCES public.geofence_zones (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.geofence_zones.geofence_zones_session_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/geofence_zones.sql
-- Dependencies:  tracking_sessions
-- ============================================================================
ALTER TABLE "public"."geofence_zones" ADD CONSTRAINT "geofence_zones_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.tracking_sessions (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.gps_provider_configs.gps_provider_configs_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/gps_provider_configs.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."gps_provider_configs" ADD CONSTRAINT "gps_provider_configs_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.ground_assignment_pics.ground_assignment_pics_job_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/ground_assignment_pics.sql
-- Dependencies:  job_orders
-- ============================================================================
ALTER TABLE "public"."ground_assignment_pics" ADD CONSTRAINT "ground_assignment_pics_job_order_id_fkey" FOREIGN KEY (job_order_id) REFERENCES public.job_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.ground_assignment_pics.ground_assignment_pics_pic1_staff_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/ground_assignment_pics.sql
-- Dependencies:  ground_staff_profiles
-- ============================================================================
ALTER TABLE "public"."ground_assignment_pics" ADD CONSTRAINT "ground_assignment_pics_pic1_staff_id_fkey" FOREIGN KEY (pic1_staff_id) REFERENCES public.ground_staff_profiles (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.ground_assignment_pics.ground_assignment_pics_pic2_staff_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/ground_assignment_pics.sql
-- Dependencies:  ground_staff_profiles
-- ============================================================================
ALTER TABLE "public"."ground_assignment_pics" ADD CONSTRAINT "ground_assignment_pics_pic2_staff_id_fkey" FOREIGN KEY (pic2_staff_id) REFERENCES public.ground_staff_profiles (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.ground_documents.ground_documents_ground_event_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/ground_documents.sql
-- Dependencies:  ground_events
-- ============================================================================
ALTER TABLE "public"."ground_documents" ADD CONSTRAINT "ground_documents_ground_event_id_fkey" FOREIGN KEY (ground_event_id) REFERENCES public.ground_events (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.ground_documents.ground_documents_job_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/ground_documents.sql
-- Dependencies:  job_orders
-- ============================================================================
ALTER TABLE "public"."ground_documents" ADD CONSTRAINT "ground_documents_job_order_id_fkey" FOREIGN KEY (job_order_id) REFERENCES public.job_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.ground_events.ground_events_captured_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/ground_events.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."ground_events" ADD CONSTRAINT "ground_events_captured_by_fkey" FOREIGN KEY (captured_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.ground_events.ground_events_job_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/ground_events.sql
-- Dependencies:  job_orders
-- ============================================================================
ALTER TABLE "public"."ground_events" ADD CONSTRAINT "ground_events_job_order_id_fkey" FOREIGN KEY (job_order_id) REFERENCES public.job_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.ground_events.ground_events_site_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/ground_events.sql
-- Dependencies:  ground_sites
-- ============================================================================
ALTER TABLE "public"."ground_events" ADD CONSTRAINT "ground_events_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.ground_sites (id);

-- ============================================================================
-- Object:        public.ground_sites.ground_sites_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/ground_sites.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."ground_sites" ADD CONSTRAINT "ground_sites_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.ground_staff_profiles.ground_staff_profiles_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/ground_staff_profiles.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."ground_staff_profiles" ADD CONSTRAINT "ground_staff_profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.ground_staff_profiles.ground_staff_profiles_user_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/ground_staff_profiles.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."ground_staff_profiles" ADD CONSTRAINT "ground_staff_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.hs_edges.hs_edges_from_node_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/hs_edges.sql
-- Dependencies:  hs_nodes
-- ============================================================================
ALTER TABLE "public"."hs_edges" ADD CONSTRAINT "hs_edges_from_node_fkey" FOREIGN KEY (from_node) REFERENCES public.hs_nodes (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.hs_edges.hs_edges_to_node_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/hs_edges.sql
-- Dependencies:  hs_nodes
-- ============================================================================
ALTER TABLE "public"."hs_edges" ADD CONSTRAINT "hs_edges_to_node_fkey" FOREIGN KEY (to_node) REFERENCES public.hs_nodes (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.inbound_damages.inbound_damages_inbound_detail_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_damages.sql
-- Dependencies:  inbound_details
-- ============================================================================
ALTER TABLE "public"."inbound_damages" ADD CONSTRAINT "inbound_damages_inbound_detail_id_fkey" FOREIGN KEY (inbound_detail_id) REFERENCES public.inbound_details (id);

-- ============================================================================
-- Object:        public.inbound_damages.inbound_damages_inbound_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_damages.sql
-- Dependencies:  inbound_headers
-- ============================================================================
ALTER TABLE "public"."inbound_damages" ADD CONSTRAINT "inbound_damages_inbound_id_fkey" FOREIGN KEY (inbound_id) REFERENCES public.inbound_headers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.inbound_details.inbound_details_inbound_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_details.sql
-- Dependencies:  inbound_headers
-- ============================================================================
ALTER TABLE "public"."inbound_details" ADD CONSTRAINT "inbound_details_inbound_id_fkey" FOREIGN KEY (inbound_id) REFERENCES public.inbound_headers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.inbound_details.inbound_details_product_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_details.sql
-- Dependencies:  products
-- ============================================================================
ALTER TABLE "public"."inbound_details" ADD CONSTRAINT "inbound_details_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products (id);

-- ============================================================================
-- Object:        public.inbound_headers.inbound_headers_armada_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_headers.sql
-- Dependencies:  armada
-- ============================================================================
ALTER TABLE "public"."inbound_headers" ADD CONSTRAINT "inbound_headers_armada_id_fkey" FOREIGN KEY (armada_id) REFERENCES public.armada (id);

-- ============================================================================
-- Object:        public.inbound_headers.inbound_headers_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_headers.sql
-- Dependencies:  customers
-- ============================================================================
ALTER TABLE "public"."inbound_headers" ADD CONSTRAINT "inbound_headers_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers (id);

-- ============================================================================
-- Object:        public.inbound_headers.inbound_headers_driver_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_headers.sql
-- Dependencies:  drivers
-- ============================================================================
ALTER TABLE "public"."inbound_headers" ADD CONSTRAINT "inbound_headers_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.drivers (id);

-- ============================================================================
-- Object:        public.inbound_headers.inbound_headers_recipient_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_headers.sql
-- Dependencies:  recipients
-- ============================================================================
ALTER TABLE "public"."inbound_headers" ADD CONSTRAINT "inbound_headers_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES public.recipients (id);

-- ============================================================================
-- Object:        public.inbound_headers.inbound_headers_shipper_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_headers.sql
-- Dependencies:  shippers
-- ============================================================================
ALTER TABLE "public"."inbound_headers" ADD CONSTRAINT "inbound_headers_shipper_id_fkey" FOREIGN KEY (shipper_id) REFERENCES public.shippers (id);

-- ============================================================================
-- Object:        public.inbound_headers.inbound_headers_transporter_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_headers.sql
-- Dependencies:  transporters
-- ============================================================================
ALTER TABLE "public"."inbound_headers" ADD CONSTRAINT "inbound_headers_transporter_id_fkey" FOREIGN KEY (transporter_id) REFERENCES public.transporters (id);

-- ============================================================================
-- Object:        public.inbound_putaway.inbound_putaway_inbound_detail_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_putaway.sql
-- Dependencies:  inbound_details
-- ============================================================================
ALTER TABLE "public"."inbound_putaway" ADD CONSTRAINT "inbound_putaway_inbound_detail_id_fkey" FOREIGN KEY (inbound_detail_id) REFERENCES public.inbound_details (id);

-- ============================================================================
-- Object:        public.inbound_putaway.inbound_putaway_inbound_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_putaway.sql
-- Dependencies:  inbound_headers
-- ============================================================================
ALTER TABLE "public"."inbound_putaway" ADD CONSTRAINT "inbound_putaway_inbound_id_fkey" FOREIGN KEY (inbound_id) REFERENCES public.inbound_headers (id);

-- ============================================================================
-- Object:        public.inbound_putaway.inbound_putaway_storage_area_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inbound_putaway.sql
-- Dependencies:  storage_areas
-- ============================================================================
ALTER TABLE "public"."inbound_putaway" ADD CONSTRAINT "inbound_putaway_storage_area_id_fkey" FOREIGN KEY (storage_area_id) REFERENCES public.storage_areas (id);

-- ============================================================================
-- Object:        public.intr_rules.intr_rules_country_code_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/intr_rules.sql
-- Dependencies:  country_master
-- ============================================================================
ALTER TABLE "public"."intr_rules" ADD CONSTRAINT "intr_rules_country_code_fkey" FOREIGN KEY (country_code) REFERENCES public.country_master (country_code);

-- ============================================================================
-- Object:        public.inventory.inventory_batch_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inventory.sql
-- Dependencies:  product_batches
-- ============================================================================
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.product_batches (id);

-- ============================================================================
-- Object:        public.inventory.inventory_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inventory.sql
-- Dependencies:  customers
-- ============================================================================
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.inventory.inventory_product_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inventory.sql
-- Dependencies:  products
-- ============================================================================
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.inventory.inventory_uom_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inventory.sql
-- Dependencies:  uom_types
-- ============================================================================
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_uom_id_fkey" FOREIGN KEY (uom_id) REFERENCES public.uom_types (id);

-- ============================================================================
-- Object:        public.inventory.inventory_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inventory.sql
-- Dependencies:  warehouses
-- ============================================================================
ALTER TABLE "public"."inventory" ADD CONSTRAINT "inventory_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.inventory_movements.inventory_movements_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inventory_movements.sql
-- Dependencies:  customers
-- ============================================================================
ALTER TABLE "public"."inventory_movements" ADD CONSTRAINT "inventory_movements_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers (id);

-- ============================================================================
-- Object:        public.inventory_movements.inventory_movements_product_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inventory_movements.sql
-- Dependencies:  products
-- ============================================================================
ALTER TABLE "public"."inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products (id);

-- ============================================================================
-- Object:        public.inventory_movements.inventory_movements_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/inventory_movements.sql
-- Dependencies:  warehouses
-- ============================================================================
ALTER TABLE "public"."inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses (id);

-- ============================================================================
-- Object:        public.invoice_line_items.invoice_line_items_co_cost_account_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/invoice_line_items.sql
-- Dependencies:  finance_coa
-- ============================================================================
ALTER TABLE "public"."invoice_line_items" ADD CONSTRAINT "invoice_line_items_co_cost_account_id_fkey" FOREIGN KEY (co_cost_account_id) REFERENCES public.finance_coa (id);

-- ============================================================================
-- Object:        public.invoice_line_items.invoice_line_items_invoice_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/invoice_line_items.sql
-- Dependencies:  invoices
-- ============================================================================
ALTER TABLE "public"."invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.invoice_lines.invoice_lines_coa_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/invoice_lines.sql
-- Dependencies:  finance_coa
-- ============================================================================
ALTER TABLE "public"."invoice_lines" ADD CONSTRAINT "invoice_lines_coa_id_fkey" FOREIGN KEY (coa_id) REFERENCES public.finance_coa (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.invoice_lines.invoice_lines_extra_cost_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/invoice_lines.sql
-- Dependencies:  extra_costs
-- ============================================================================
ALTER TABLE "public"."invoice_lines" ADD CONSTRAINT "invoice_lines_extra_cost_id_fkey" FOREIGN KEY (extra_cost_id) REFERENCES public.extra_costs (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.invoice_lines.invoice_lines_invoice_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/invoice_lines.sql
-- Dependencies:  invoices
-- ============================================================================
ALTER TABLE "public"."invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.invoices (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.invoice_lines.invoice_lines_job_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/invoice_lines.sql
-- Dependencies:  job_orders
-- ============================================================================
ALTER TABLE "public"."invoice_lines" ADD CONSTRAINT "invoice_lines_job_order_id_fkey" FOREIGN KEY (job_order_id) REFERENCES public.job_orders (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.invoices.invoices_co_revenue_account_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  finance_coa
-- ============================================================================
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_co_revenue_account_id_fkey" FOREIGN KEY (co_revenue_account_id) REFERENCES public.finance_coa (id);

-- ============================================================================
-- Object:        public.invoices.invoices_tax_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  md_taxes
-- ============================================================================
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_tax_id_fkey" FOREIGN KEY (tax_id) REFERENCES public.md_taxes (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.jo_warehouse_assignments.jo_warehouse_assignments_job_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/jo_warehouse_assignments.sql
-- Dependencies:  job_orders
-- ============================================================================
ALTER TABLE "public"."jo_warehouse_assignments" ADD CONSTRAINT "jo_warehouse_assignments_job_order_id_fkey" FOREIGN KEY (job_order_id) REFERENCES public.job_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.jo_warehouse_assignments.jo_warehouse_assignments_warehouse_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/jo_warehouse_assignments.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."jo_warehouse_assignments" ADD CONSTRAINT "jo_warehouse_assignments_warehouse_location_id_fkey" FOREIGN KEY (warehouse_location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.jo_warehouse_assignments.jo_warehouse_assignments_wo_item_manifest_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/jo_warehouse_assignments.sql
-- Dependencies:  wo_item_manifests
-- ============================================================================
ALTER TABLE "public"."jo_warehouse_assignments" ADD CONSTRAINT "jo_warehouse_assignments_wo_item_manifest_id_fkey" FOREIGN KEY (wo_item_manifest_id) REFERENCES public.wo_item_manifests (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.job_order_payments.job_order_payments_extra_cost_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_order_payments.sql
-- Dependencies:  extra_costs
-- ============================================================================
ALTER TABLE "public"."job_order_payments" ADD CONSTRAINT "job_order_payments_extra_cost_id_fkey" FOREIGN KEY (extra_cost_id) REFERENCES public.extra_costs (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.job_order_payments.job_order_payments_job_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_order_payments.sql
-- Dependencies:  job_orders
-- ============================================================================
ALTER TABLE "public"."job_order_payments" ADD CONSTRAINT "job_order_payments_job_order_id_fkey" FOREIGN KEY (job_order_id) REFERENCES public.job_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.job_order_payments.job_order_payments_paid_by_user_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_order_payments.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."job_order_payments" ADD CONSTRAINT "job_order_payments_paid_by_user_fkey" FOREIGN KEY (paid_by_user) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.job_order_payments.job_order_payments_verified_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_order_payments.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."job_order_payments" ADD CONSTRAINT "job_order_payments_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.job_orders.fk_job_orders_driver
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  md_drivers
-- ============================================================================
ALTER TABLE "public"."job_orders" ADD CONSTRAINT "fk_job_orders_driver" FOREIGN KEY (driver_id) REFERENCES public.md_drivers (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.job_orders.fk_job_orders_fleet
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  md_fleets
-- ============================================================================
ALTER TABLE "public"."job_orders" ADD CONSTRAINT "fk_job_orders_fleet" FOREIGN KEY (fleet_id) REFERENCES public.md_fleets (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.job_orders.fk_job_orders_transporter
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."job_orders" ADD CONSTRAINT "fk_job_orders_transporter" FOREIGN KEY (transporter_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.job_orders.fk_job_orders_vendor
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."job_orders" ADD CONSTRAINT "fk_job_orders_vendor" FOREIGN KEY (vendor_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.job_orders.job_orders_cost_account_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  finance_coa
-- ============================================================================
ALTER TABLE "public"."job_orders" ADD CONSTRAINT "job_orders_cost_account_id_fkey" FOREIGN KEY (cost_account_id) REFERENCES public.finance_coa (id);

-- ============================================================================
-- Object:        public.job_orders.job_orders_vendor_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."job_orders" ADD CONSTRAINT "job_orders_vendor_tenant_id_fkey" FOREIGN KEY (vendor_tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.job_orders.job_orders_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."job_orders" ADD CONSTRAINT "job_orders_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.job_orders.job_orders_wo_item_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  wo_items
-- ============================================================================
ALTER TABLE "public"."job_orders" ADD CONSTRAINT "job_orders_wo_item_id_fkey" FOREIGN KEY (wo_item_id) REFERENCES public.wo_items (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.job_tracking.job_tracking_job_route_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/job_tracking.sql
-- Dependencies:  job_routes
-- ============================================================================
ALTER TABLE "public"."job_tracking" ADD CONSTRAINT "job_tracking_job_route_id_fkey" FOREIGN KEY (job_route_id) REFERENCES public.job_routes (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.master_contacts.master_contacts_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/master_contacts.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."master_contacts" ADD CONSTRAINT "master_contacts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.md_bill_of_materials.md_bill_of_materials_kit_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_bill_of_materials.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."md_bill_of_materials" ADD CONSTRAINT "md_bill_of_materials_kit_sku_id_fkey" FOREIGN KEY (kit_sku_id) REFERENCES public.md_product_skus (id);

-- ============================================================================
-- Object:        public.md_billing_rates.md_billing_rates_contract_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_billing_rates.sql
-- Dependencies:  md_storage_contracts
-- ============================================================================
ALTER TABLE "public"."md_billing_rates" ADD CONSTRAINT "md_billing_rates_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES public.md_storage_contracts (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_billing_rates.md_billing_rates_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_billing_rates.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."md_billing_rates" ADD CONSTRAINT "md_billing_rates_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_bom_items.md_bom_items_bom_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_bom_items.sql
-- Dependencies:  md_bill_of_materials
-- ============================================================================
ALTER TABLE "public"."md_bom_items" ADD CONSTRAINT "md_bom_items_bom_id_fkey" FOREIGN KEY (bom_id) REFERENCES public.md_bill_of_materials (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_bom_items.md_bom_items_component_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_bom_items.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."md_bom_items" ADD CONSTRAINT "md_bom_items_component_sku_id_fkey" FOREIGN KEY (component_sku_id) REFERENCES public.md_product_skus (id);

-- ============================================================================
-- Object:        public.md_contacts.md_contacts_parent_contact_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_contacts.sql
-- Dependencies:  md_contacts
-- ============================================================================
ALTER TABLE "public"."md_contacts" ADD CONSTRAINT "md_contacts_parent_contact_id_fkey" FOREIGN KEY (parent_contact_id) REFERENCES public.md_contacts (id);

-- ============================================================================
-- Object:        public.md_contacts.md_contacts_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_contacts.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."md_contacts" ADD CONSTRAINT "md_contacts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_contract_warehouses.md_contract_warehouses_contract_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_contract_warehouses.sql
-- Dependencies:  md_storage_contracts
-- ============================================================================
ALTER TABLE "public"."md_contract_warehouses" ADD CONSTRAINT "md_contract_warehouses_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES public.md_storage_contracts (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_contract_warehouses.md_contract_warehouses_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_contract_warehouses.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."md_contract_warehouses" ADD CONSTRAINT "md_contract_warehouses_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE RESTRICT;

-- ============================================================================
-- Object:        public.md_customer_users.md_customer_users_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_customer_users.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."md_customer_users" ADD CONSTRAINT "md_customer_users_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_customer_users.md_customer_users_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_customer_users.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."md_customer_users" ADD CONSTRAINT "md_customer_users_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_customer_users.md_customer_users_user_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_customer_users.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."md_customer_users" ADD CONSTRAINT "md_customer_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.md_driver_allowances.md_driver_allowances_fleet_type_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_driver_allowances.sql
-- Dependencies:  md_fleet_types
-- ============================================================================
ALTER TABLE "public"."md_driver_allowances" ADD CONSTRAINT "md_driver_allowances_fleet_type_id_fkey" FOREIGN KEY (fleet_type_id) REFERENCES public.md_fleet_types (id) ON DELETE RESTRICT;

-- ============================================================================
-- Object:        public.md_drivers.md_drivers_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."md_drivers" ADD CONSTRAINT "md_drivers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.md_drivers.md_drivers_entity_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."md_drivers" ADD CONSTRAINT "md_drivers_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_drivers.md_drivers_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."md_drivers" ADD CONSTRAINT "md_drivers_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.md_entities.md_entities_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."md_entities" ADD CONSTRAINT "md_entities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.md_entities.md_entities_parent_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."md_entities" ADD CONSTRAINT "md_entities_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.md_entities.md_entities_sales_rep_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."md_entities" ADD CONSTRAINT "md_entities_sales_rep_id_fkey" FOREIGN KEY (sales_rep_id) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.md_entities.md_entities_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."md_entities" ADD CONSTRAINT "md_entities_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_entities.md_entities_vendor_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."md_entities" ADD CONSTRAINT "md_entities_vendor_tenant_id_fkey" FOREIGN KEY (vendor_tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.md_entity_addresses.md_entity_addresses_entity_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_entity_addresses.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."md_entity_addresses" ADD CONSTRAINT "md_entity_addresses_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_fleet_types.md_fleet_types_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_fleet_types.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."md_fleet_types" ADD CONSTRAINT "md_fleet_types_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.md_fleets.md_fleets_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."md_fleets" ADD CONSTRAINT "md_fleets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.md_fleets.md_fleets_entity_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."md_fleets" ADD CONSTRAINT "md_fleets_entity_id_fkey" FOREIGN KEY (entity_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_fleets.md_fleets_fleet_type_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  md_fleet_types
-- ============================================================================
ALTER TABLE "public"."md_fleets" ADD CONSTRAINT "md_fleets_fleet_type_id_fkey" FOREIGN KEY (fleet_type_id) REFERENCES public.md_fleet_types (id);

-- ============================================================================
-- Object:        public.md_fleets.md_fleets_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."md_fleets" ADD CONSTRAINT "md_fleets_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.md_fleets.md_fleets_vendor_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."md_fleets" ADD CONSTRAINT "md_fleets_vendor_tenant_id_fkey" FOREIGN KEY (vendor_tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.md_locations.md_locations_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_locations.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."md_locations" ADD CONSTRAINT "md_locations_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.md_product_categories.md_product_categories_parent_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_product_categories.sql
-- Dependencies:  md_product_categories
-- ============================================================================
ALTER TABLE "public"."md_product_categories" ADD CONSTRAINT "md_product_categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.md_product_categories (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_product_categories.md_product_categories_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_product_categories.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."md_product_categories" ADD CONSTRAINT "md_product_categories_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_product_skus.md_product_skus_category_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  md_product_categories
-- ============================================================================
ALTER TABLE "public"."md_product_skus" ADD CONSTRAINT "md_product_skus_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.md_product_categories (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.md_product_skus.md_product_skus_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."md_product_skus" ADD CONSTRAINT "md_product_skus_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.md_product_skus.md_product_skus_parent_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."md_product_skus" ADD CONSTRAINT "md_product_skus_parent_sku_id_fkey" FOREIGN KEY (parent_sku_id) REFERENCES public.md_product_skus (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.md_services.md_services_expense_account_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_services.sql
-- Dependencies:  finance_coa
-- ============================================================================
ALTER TABLE "public"."md_services" ADD CONSTRAINT "md_services_expense_account_id_fkey" FOREIGN KEY (expense_account_id) REFERENCES public.finance_coa (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.md_services.md_services_income_account_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_services.sql
-- Dependencies:  finance_coa
-- ============================================================================
ALTER TABLE "public"."md_services" ADD CONSTRAINT "md_services_income_account_id_fkey" FOREIGN KEY (income_account_id) REFERENCES public.finance_coa (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.md_storage_contracts.md_storage_contracts_area_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_storage_contracts.sql
-- Dependencies:  md_warehouse_areas
-- ============================================================================
ALTER TABLE "public"."md_storage_contracts" ADD CONSTRAINT "md_storage_contracts_area_id_fkey" FOREIGN KEY (area_id) REFERENCES public.md_warehouse_areas (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.md_storage_contracts.md_storage_contracts_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_storage_contracts.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."md_storage_contracts" ADD CONSTRAINT "md_storage_contracts_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_storage_contracts.md_storage_contracts_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_storage_contracts.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."md_storage_contracts" ADD CONSTRAINT "md_storage_contracts_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_transporter_drivers.md_transporter_drivers_driver_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_transporter_drivers.sql
-- Dependencies:  md_drivers
-- ============================================================================
ALTER TABLE "public"."md_transporter_drivers" ADD CONSTRAINT "md_transporter_drivers_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.md_drivers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_transporter_drivers.md_transporter_drivers_transporter_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_transporter_drivers.sql
-- Dependencies:  md_transporters
-- ============================================================================
ALTER TABLE "public"."md_transporter_drivers" ADD CONSTRAINT "md_transporter_drivers_transporter_id_fkey" FOREIGN KEY (transporter_id) REFERENCES public.md_transporters (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_transporter_fleets.md_transporter_fleets_fleet_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_transporter_fleets.sql
-- Dependencies:  md_fleets
-- ============================================================================
ALTER TABLE "public"."md_transporter_fleets" ADD CONSTRAINT "md_transporter_fleets_fleet_id_fkey" FOREIGN KEY (fleet_id) REFERENCES public.md_fleets (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_transporter_fleets.md_transporter_fleets_transporter_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_transporter_fleets.sql
-- Dependencies:  md_transporters
-- ============================================================================
ALTER TABLE "public"."md_transporter_fleets" ADD CONSTRAINT "md_transporter_fleets_transporter_id_fkey" FOREIGN KEY (transporter_id) REFERENCES public.md_transporters (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_transporters.md_transporters_contact_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_transporters.sql
-- Dependencies:  md_contacts
-- ============================================================================
ALTER TABLE "public"."md_transporters" ADD CONSTRAINT "md_transporters_contact_id_fkey" FOREIGN KEY (contact_id) REFERENCES public.md_contacts (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_trucking_regions.md_trucking_regions_parent_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_trucking_regions.sql
-- Dependencies:  md_trucking_regions
-- ============================================================================
ALTER TABLE "public"."md_trucking_regions" ADD CONSTRAINT "md_trucking_regions_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.md_trucking_regions (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.md_uoms.md_uoms_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_uoms.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."md_uoms" ADD CONSTRAINT "md_uoms_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_warehouse_areas.md_warehouse_areas_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_warehouse_areas.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."md_warehouse_areas" ADD CONSTRAINT "md_warehouse_areas_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_warehouse_locations.fk_mwl_area
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_warehouse_locations.sql
-- Dependencies:  md_warehouse_areas
-- ============================================================================
ALTER TABLE "public"."md_warehouse_locations" ADD CONSTRAINT "fk_mwl_area" FOREIGN KEY (area_id) REFERENCES public.md_warehouse_areas (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.md_warehouse_locations.fk_mwl_zone
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_warehouse_locations.sql
-- Dependencies:  md_warehouse_zones
-- ============================================================================
ALTER TABLE "public"."md_warehouse_locations" ADD CONSTRAINT "fk_mwl_zone" FOREIGN KEY (zone_id) REFERENCES public.md_warehouse_zones (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.md_warehouse_locations.md_warehouse_locations_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_warehouse_locations.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."md_warehouse_locations" ADD CONSTRAINT "md_warehouse_locations_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_warehouse_staff.md_warehouse_staff_sbu_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_warehouse_staff.sql
-- Dependencies:  tenant_sbus
-- ============================================================================
ALTER TABLE "public"."md_warehouse_staff" ADD CONSTRAINT "md_warehouse_staff_sbu_id_fkey" FOREIGN KEY (sbu_id) REFERENCES public.tenant_sbus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_warehouse_staff.md_warehouse_staff_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_warehouse_staff.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."md_warehouse_staff" ADD CONSTRAINT "md_warehouse_staff_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_warehouse_zones.md_warehouse_zones_area_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_warehouse_zones.sql
-- Dependencies:  md_warehouse_areas
-- ============================================================================
ALTER TABLE "public"."md_warehouse_zones" ADD CONSTRAINT "md_warehouse_zones_area_id_fkey" FOREIGN KEY (area_id) REFERENCES public.md_warehouse_areas (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.md_warehouses.md_warehouses_parent_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_warehouses.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."md_warehouses" ADD CONSTRAINT "md_warehouses_parent_warehouse_id_fkey" FOREIGN KEY (parent_warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.md_warehouses.md_warehouses_sbu_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/md_warehouses.sql
-- Dependencies:  tenant_sbus
-- ============================================================================
ALTER TABLE "public"."md_warehouses" ADD CONSTRAINT "md_warehouses_sbu_id_fkey" FOREIGN KEY (sbu_id) REFERENCES public.tenant_sbus (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.notifications.notifications_user_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/notifications.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.party_contacts.party_contacts_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_contacts.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."party_contacts" ADD CONSTRAINT "party_contacts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.party_contacts.party_contacts_party_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_contacts.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."party_contacts" ADD CONSTRAINT "party_contacts_party_id_fkey" FOREIGN KEY (party_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.party_contacts.party_contacts_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_contacts.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."party_contacts" ADD CONSTRAINT "party_contacts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.party_locations.party_locations_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_locations.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."party_locations" ADD CONSTRAINT "party_locations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.party_locations.party_locations_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_locations.sql
-- Dependencies:  md_locations
-- ============================================================================
ALTER TABLE "public"."party_locations" ADD CONSTRAINT "party_locations_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.md_locations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.party_locations.party_locations_party_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_locations.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."party_locations" ADD CONSTRAINT "party_locations_party_id_fkey" FOREIGN KEY (party_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.party_locations.party_locations_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_locations.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."party_locations" ADD CONSTRAINT "party_locations_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.party_relationships.party_relationships_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_relationships.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."party_relationships" ADD CONSTRAINT "party_relationships_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.party_relationships.party_relationships_from_party_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_relationships.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."party_relationships" ADD CONSTRAINT "party_relationships_from_party_id_fkey" FOREIGN KEY (from_party_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.party_relationships.party_relationships_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_relationships.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."party_relationships" ADD CONSTRAINT "party_relationships_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.party_relationships.party_relationships_to_party_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_relationships.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."party_relationships" ADD CONSTRAINT "party_relationships_to_party_id_fkey" FOREIGN KEY (to_party_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.party_roles.party_roles_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."party_roles" ADD CONSTRAINT "party_roles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.party_roles.party_roles_party_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."party_roles" ADD CONSTRAINT "party_roles_party_id_fkey" FOREIGN KEY (party_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.party_roles.party_roles_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."party_roles" ADD CONSTRAINT "party_roles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.pricing_rate_items.fk_pricing_rate_items_version_tenant
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/pricing_rate_items.sql
-- Dependencies:  pricing_rate_versions
-- ============================================================================
ALTER TABLE "public"."pricing_rate_items" ADD CONSTRAINT "fk_pricing_rate_items_version_tenant" FOREIGN KEY (rate_version_id, tenant_id) REFERENCES public.pricing_rate_versions (id, tenant_id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.pricing_rate_items.pricing_rate_items_rate_version_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/pricing_rate_items.sql
-- Dependencies:  pricing_rate_versions
-- ============================================================================
ALTER TABLE "public"."pricing_rate_items" ADD CONSTRAINT "pricing_rate_items_rate_version_id_fkey" FOREIGN KEY (rate_version_id) REFERENCES public.pricing_rate_versions (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.pricing_rate_items.pricing_rate_items_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/pricing_rate_items.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."pricing_rate_items" ADD CONSTRAINT "pricing_rate_items_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.pricing_rate_versions.fk_pricing_rate_versions_rate_tenant
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/pricing_rate_versions.sql
-- Dependencies:  pricing_rates
-- ============================================================================
ALTER TABLE "public"."pricing_rate_versions" ADD CONSTRAINT "fk_pricing_rate_versions_rate_tenant" FOREIGN KEY (rate_id, tenant_id) REFERENCES public.pricing_rates (id, tenant_id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.pricing_rate_versions.pricing_rate_versions_rate_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/pricing_rate_versions.sql
-- Dependencies:  pricing_rates
-- ============================================================================
ALTER TABLE "public"."pricing_rate_versions" ADD CONSTRAINT "pricing_rate_versions_rate_id_fkey" FOREIGN KEY (rate_id) REFERENCES public.pricing_rates (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.pricing_rate_versions.pricing_rate_versions_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/pricing_rate_versions.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."pricing_rate_versions" ADD CONSTRAINT "pricing_rate_versions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.pricing_rates.pricing_rates_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/pricing_rates.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."pricing_rates" ADD CONSTRAINT "pricing_rates_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.product_batches.product_batches_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/product_batches.sql
-- Dependencies:  customers
-- ============================================================================
ALTER TABLE "public"."product_batches" ADD CONSTRAINT "product_batches_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers (id);

-- ============================================================================
-- Object:        public.product_batches.product_batches_product_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/product_batches.sql
-- Dependencies:  products
-- ============================================================================
ALTER TABLE "public"."product_batches" ADD CONSTRAINT "product_batches_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products (id);

-- ============================================================================
-- Object:        public.product_batches.product_batches_uom_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/product_batches.sql
-- Dependencies:  uom_types
-- ============================================================================
ALTER TABLE "public"."product_batches" ADD CONSTRAINT "product_batches_uom_id_fkey" FOREIGN KEY (uom_id) REFERENCES public.uom_types (id);

-- ============================================================================
-- Object:        public.product_batches.product_batches_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/product_batches.sql
-- Dependencies:  warehouses
-- ============================================================================
ALTER TABLE "public"."product_batches" ADD CONSTRAINT "product_batches_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses (id);

-- ============================================================================
-- Object:        public.product_brands.product_brands_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/product_brands.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."product_brands" ADD CONSTRAINT "product_brands_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.product_categories.product_categories_parent_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/product_categories.sql
-- Dependencies:  product_categories
-- ============================================================================
ALTER TABLE "public"."product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.product_categories (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.product_categories.product_categories_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/product_categories.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."product_categories" ADD CONSTRAINT "product_categories_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.product_custom_attributes.product_custom_attributes_product_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/product_custom_attributes.sql
-- Dependencies:  products
-- ============================================================================
ALTER TABLE "public"."product_custom_attributes" ADD CONSTRAINT "product_custom_attributes_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.product_uom_conversions.product_uom_conversions_from_uom_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/product_uom_conversions.sql
-- Dependencies:  uom_types
-- ============================================================================
ALTER TABLE "public"."product_uom_conversions" ADD CONSTRAINT "product_uom_conversions_from_uom_id_fkey" FOREIGN KEY (from_uom_id) REFERENCES public.uom_types (id);

-- ============================================================================
-- Object:        public.product_uom_conversions.product_uom_conversions_product_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/product_uom_conversions.sql
-- Dependencies:  products
-- ============================================================================
ALTER TABLE "public"."product_uom_conversions" ADD CONSTRAINT "product_uom_conversions_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.product_uom_conversions.product_uom_conversions_to_uom_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/product_uom_conversions.sql
-- Dependencies:  uom_types
-- ============================================================================
ALTER TABLE "public"."product_uom_conversions" ADD CONSTRAINT "product_uom_conversions_to_uom_id_fkey" FOREIGN KEY (to_uom_id) REFERENCES public.uom_types (id);

-- ============================================================================
-- Object:        public.product_variants.product_variants_product_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/product_variants.sql
-- Dependencies:  products
-- ============================================================================
ALTER TABLE "public"."product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.products.products_base_uom_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/products.sql
-- Dependencies:  uom_types
-- ============================================================================
ALTER TABLE "public"."products" ADD CONSTRAINT "products_base_uom_id_fkey" FOREIGN KEY (base_uom_id) REFERENCES public.uom_types (id);

-- ============================================================================
-- Object:        public.products.products_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/products.sql
-- Dependencies:  customers
-- ============================================================================
ALTER TABLE "public"."products" ADD CONSTRAINT "products_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.products.products_default_inbound_uom_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/products.sql
-- Dependencies:  uom_types
-- ============================================================================
ALTER TABLE "public"."products" ADD CONSTRAINT "products_default_inbound_uom_id_fkey" FOREIGN KEY (default_inbound_uom_id) REFERENCES public.uom_types (id);

-- ============================================================================
-- Object:        public.products.products_default_outbound_uom_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/products.sql
-- Dependencies:  uom_types
-- ============================================================================
ALTER TABLE "public"."products" ADD CONSTRAINT "products_default_outbound_uom_id_fkey" FOREIGN KEY (default_outbound_uom_id) REFERENCES public.uom_types (id);

-- ============================================================================
-- Object:        public.products.products_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/products.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.profiles.profiles_company_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/profiles.sql
-- Dependencies:  companies
-- ============================================================================
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_company_id_fkey" FOREIGN KEY (company_id) REFERENCES public.companies (id);

-- ============================================================================
-- Object:        public.profiles.profiles_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/profiles.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.profiles.profiles_region_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/profiles.sql
-- Dependencies:  md_trucking_regions
-- ============================================================================
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_region_id_fkey" FOREIGN KEY (region_id) REFERENCES public.md_trucking_regions (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.putaway_assignments.putaway_assignments_actual_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/putaway_assignments.sql
-- Dependencies:  storage_locations
-- ============================================================================
ALTER TABLE "public"."putaway_assignments" ADD CONSTRAINT "putaway_assignments_actual_location_id_fkey" FOREIGN KEY (actual_location_id) REFERENCES public.storage_locations (id);

-- ============================================================================
-- Object:        public.putaway_assignments.putaway_assignments_inbound_detail_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/putaway_assignments.sql
-- Dependencies:  inbound_details
-- ============================================================================
ALTER TABLE "public"."putaway_assignments" ADD CONSTRAINT "putaway_assignments_inbound_detail_id_fkey" FOREIGN KEY (inbound_detail_id) REFERENCES public.inbound_details (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.putaway_assignments.putaway_assignments_suggested_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/putaway_assignments.sql
-- Dependencies:  storage_locations
-- ============================================================================
ALTER TABLE "public"."putaway_assignments" ADD CONSTRAINT "putaway_assignments_suggested_location_id_fkey" FOREIGN KEY (suggested_location_id) REFERENCES public.storage_locations (id);

-- ============================================================================
-- Object:        public.reset_password_requests.reset_password_requests_processed_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/reset_password_requests.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."reset_password_requests" ADD CONSTRAINT "reset_password_requests_processed_by_fkey" FOREIGN KEY (processed_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.reset_password_requests.reset_password_requests_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/reset_password_requests.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."reset_password_requests" ADD CONSTRAINT "reset_password_requests_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.sales_order_line_items.sales_order_line_items_sales_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/sales_order_line_items.sql
-- Dependencies:  sales_orders
-- ============================================================================
ALTER TABLE "public"."sales_order_line_items" ADD CONSTRAINT "sales_order_line_items_sales_order_id_fkey" FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.sales_order_line_items.sales_order_line_items_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/sales_order_line_items.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."sales_order_line_items" ADD CONSTRAINT "sales_order_line_items_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.sales_orders.sales_orders_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/sales_orders.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.sales_orders.sales_orders_engagement_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/sales_orders.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_engagement_id_fkey" FOREIGN KEY (engagement_id) REFERENCES public.commercial_work_orders (id) ON DELETE RESTRICT;

-- ============================================================================
-- Object:        public.sales_orders.sales_orders_quote_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/sales_orders.sql
-- Dependencies:  crm_quotations
-- ============================================================================
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_quote_id_fkey" FOREIGN KEY (quote_id) REFERENCES public.crm_quotations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.sales_orders.sales_orders_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/sales_orders.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.sales_orders.sales_orders_updated_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/sales_orders.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."sales_orders" ADD CONSTRAINT "sales_orders_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.sbu_token_rates.sbu_token_rates_updated_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/sbu_token_rates.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."sbu_token_rates" ADD CONSTRAINT "sbu_token_rates_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.sbu_token_transactions.sbu_token_transactions_sbu_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/sbu_token_transactions.sql
-- Dependencies:  tenant_sbus
-- ============================================================================
ALTER TABLE "public"."sbu_token_transactions" ADD CONSTRAINT "sbu_token_transactions_sbu_id_fkey" FOREIGN KEY (sbu_id) REFERENCES public.tenant_sbus (id);

-- ============================================================================
-- Object:        public.sbu_token_transactions.sbu_token_transactions_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/sbu_token_transactions.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."sbu_token_transactions" ADD CONSTRAINT "sbu_token_transactions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.serial_numbers.serial_numbers_batch_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/serial_numbers.sql
-- Dependencies:  product_batches
-- ============================================================================
ALTER TABLE "public"."serial_numbers" ADD CONSTRAINT "serial_numbers_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.product_batches (id);

-- ============================================================================
-- Object:        public.serial_numbers.serial_numbers_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/serial_numbers.sql
-- Dependencies:  customers
-- ============================================================================
ALTER TABLE "public"."serial_numbers" ADD CONSTRAINT "serial_numbers_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers (id);

-- ============================================================================
-- Object:        public.serial_numbers.serial_numbers_product_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/serial_numbers.sql
-- Dependencies:  products
-- ============================================================================
ALTER TABLE "public"."serial_numbers" ADD CONSTRAINT "serial_numbers_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products (id);

-- ============================================================================
-- Object:        public.serial_numbers.serial_numbers_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/serial_numbers.sql
-- Dependencies:  warehouses
-- ============================================================================
ALTER TABLE "public"."serial_numbers" ADD CONSTRAINT "serial_numbers_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses (id);

-- ============================================================================
-- Object:        public.shp_exceptions.shp_exceptions_execution_leg_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_exceptions.sql
-- Dependencies:  shp_execution_legs
-- ============================================================================
ALTER TABLE "public"."shp_exceptions" ADD CONSTRAINT "shp_exceptions_execution_leg_id_fkey" FOREIGN KEY (execution_leg_id) REFERENCES public.shp_execution_legs (id);

-- ============================================================================
-- Object:        public.shp_exceptions.shp_exceptions_resolved_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_exceptions.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."shp_exceptions" ADD CONSTRAINT "shp_exceptions_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.shp_exceptions.shp_exceptions_shipment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_exceptions.sql
-- Dependencies:  shp_shipments
-- ============================================================================
ALTER TABLE "public"."shp_exceptions" ADD CONSTRAINT "shp_exceptions_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.shp_shipments (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_exceptions.shp_exceptions_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_exceptions.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."shp_exceptions" ADD CONSTRAINT "shp_exceptions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.shp_execution_legs.shp_execution_legs_assigned_vendor_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_execution_legs.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."shp_execution_legs" ADD CONSTRAINT "shp_execution_legs_assigned_vendor_id_fkey" FOREIGN KEY (assigned_vendor_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.shp_execution_legs.shp_execution_legs_destination_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_execution_legs.sql
-- Dependencies:  md_locations
-- ============================================================================
ALTER TABLE "public"."shp_execution_legs" ADD CONSTRAINT "shp_execution_legs_destination_location_id_fkey" FOREIGN KEY (destination_location_id) REFERENCES public.md_locations (id);

-- ============================================================================
-- Object:        public.shp_execution_legs.shp_execution_legs_execution_plan_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_execution_legs.sql
-- Dependencies:  shp_execution_plans
-- ============================================================================
ALTER TABLE "public"."shp_execution_legs" ADD CONSTRAINT "shp_execution_legs_execution_plan_id_fkey" FOREIGN KEY (execution_plan_id) REFERENCES public.shp_execution_plans (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_execution_legs.shp_execution_legs_origin_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_execution_legs.sql
-- Dependencies:  md_locations
-- ============================================================================
ALTER TABLE "public"."shp_execution_legs" ADD CONSTRAINT "shp_execution_legs_origin_location_id_fkey" FOREIGN KEY (origin_location_id) REFERENCES public.md_locations (id);

-- ============================================================================
-- Object:        public.shp_execution_legs.shp_execution_legs_shipment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_execution_legs.sql
-- Dependencies:  shp_shipments
-- ============================================================================
ALTER TABLE "public"."shp_execution_legs" ADD CONSTRAINT "shp_execution_legs_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.shp_shipments (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_execution_legs.shp_execution_legs_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_execution_legs.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."shp_execution_legs" ADD CONSTRAINT "shp_execution_legs_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.shp_execution_plans.shp_execution_plans_shipment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_execution_plans.sql
-- Dependencies:  shp_shipments
-- ============================================================================
ALTER TABLE "public"."shp_execution_plans" ADD CONSTRAINT "shp_execution_plans_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.shp_shipments (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_execution_plans.shp_execution_plans_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_execution_plans.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."shp_execution_plans" ADD CONSTRAINT "shp_execution_plans_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.shp_leg_units.shp_leg_units_execution_leg_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_leg_units.sql
-- Dependencies:  shp_execution_legs
-- ============================================================================
ALTER TABLE "public"."shp_leg_units" ADD CONSTRAINT "shp_leg_units_execution_leg_id_fkey" FOREIGN KEY (execution_leg_id) REFERENCES public.shp_execution_legs (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_leg_units.shp_leg_units_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_leg_units.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."shp_leg_units" ADD CONSTRAINT "shp_leg_units_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.shp_leg_units.shp_leg_units_unit_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_leg_units.sql
-- Dependencies:  shp_units
-- ============================================================================
ALTER TABLE "public"."shp_leg_units" ADD CONSTRAINT "shp_leg_units_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES public.shp_units (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_manifest_items.shp_manifest_items_shipment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_manifest_items.sql
-- Dependencies:  shp_shipments
-- ============================================================================
ALTER TABLE "public"."shp_manifest_items" ADD CONSTRAINT "shp_manifest_items_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.shp_shipments (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_manifest_items.shp_manifest_items_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_manifest_items.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."shp_manifest_items" ADD CONSTRAINT "shp_manifest_items_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.shp_milestones.shp_milestones_execution_leg_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_milestones.sql
-- Dependencies:  shp_execution_legs
-- ============================================================================
ALTER TABLE "public"."shp_milestones" ADD CONSTRAINT "shp_milestones_execution_leg_id_fkey" FOREIGN KEY (execution_leg_id) REFERENCES public.shp_execution_legs (id);

-- ============================================================================
-- Object:        public.shp_milestones.shp_milestones_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_milestones.sql
-- Dependencies:  md_locations
-- ============================================================================
ALTER TABLE "public"."shp_milestones" ADD CONSTRAINT "shp_milestones_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.md_locations (id);

-- ============================================================================
-- Object:        public.shp_milestones.shp_milestones_recorded_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_milestones.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."shp_milestones" ADD CONSTRAINT "shp_milestones_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.shp_milestones.shp_milestones_shipment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_milestones.sql
-- Dependencies:  shp_shipments
-- ============================================================================
ALTER TABLE "public"."shp_milestones" ADD CONSTRAINT "shp_milestones_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.shp_shipments (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_milestones.shp_milestones_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_milestones.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."shp_milestones" ADD CONSTRAINT "shp_milestones_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_consignee_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ADD CONSTRAINT "shp_shipments_consignee_id_fkey" FOREIGN KEY (consignee_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ADD CONSTRAINT "shp_shipments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ADD CONSTRAINT "shp_shipments_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_destination_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  md_locations
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ADD CONSTRAINT "shp_shipments_destination_location_id_fkey" FOREIGN KEY (destination_location_id) REFERENCES public.md_locations (id);

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_notify_party_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ADD CONSTRAINT "shp_shipments_notify_party_id_fkey" FOREIGN KEY (notify_party_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_origin_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  md_locations
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ADD CONSTRAINT "shp_shipments_origin_location_id_fkey" FOREIGN KEY (origin_location_id) REFERENCES public.md_locations (id);

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_sales_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  sales_orders
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ADD CONSTRAINT "shp_shipments_sales_order_id_fkey" FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_service_scope_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  commercial_service_scopes
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ADD CONSTRAINT "shp_shipments_service_scope_id_fkey" FOREIGN KEY (service_scope_id) REFERENCES public.commercial_service_scopes (id);

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_shipper_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ADD CONSTRAINT "shp_shipments_shipper_id_fkey" FOREIGN KEY (shipper_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ADD CONSTRAINT "shp_shipments_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_updated_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ADD CONSTRAINT "shp_shipments_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_work_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ADD CONSTRAINT "shp_shipments_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.commercial_work_orders (id) ON DELETE RESTRICT;

-- ============================================================================
-- Object:        public.shp_unit_bulk.shp_unit_bulk_surveyor_entity_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_unit_bulk.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."shp_unit_bulk" ADD CONSTRAINT "shp_unit_bulk_surveyor_entity_id_fkey" FOREIGN KEY (surveyor_entity_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.shp_unit_bulk.shp_unit_bulk_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_unit_bulk.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."shp_unit_bulk" ADD CONSTRAINT "shp_unit_bulk_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.shp_unit_bulk.shp_unit_bulk_unit_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_unit_bulk.sql
-- Dependencies:  shp_units
-- ============================================================================
ALTER TABLE "public"."shp_unit_bulk" ADD CONSTRAINT "shp_unit_bulk_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES public.shp_units (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_unit_containers.shp_unit_containers_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_unit_containers.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."shp_unit_containers" ADD CONSTRAINT "shp_unit_containers_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.shp_unit_containers.shp_unit_containers_unit_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_unit_containers.sql
-- Dependencies:  shp_units
-- ============================================================================
ALTER TABLE "public"."shp_unit_containers" ADD CONSTRAINT "shp_unit_containers_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES public.shp_units (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_unit_packages.shp_unit_packages_parent_container_unit_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_unit_packages.sql
-- Dependencies:  shp_units
-- ============================================================================
ALTER TABLE "public"."shp_unit_packages" ADD CONSTRAINT "shp_unit_packages_parent_container_unit_id_fkey" FOREIGN KEY (parent_container_unit_id) REFERENCES public.shp_units (id);

-- ============================================================================
-- Object:        public.shp_unit_packages.shp_unit_packages_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_unit_packages.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."shp_unit_packages" ADD CONSTRAINT "shp_unit_packages_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.shp_unit_packages.shp_unit_packages_unit_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_unit_packages.sql
-- Dependencies:  shp_units
-- ============================================================================
ALTER TABLE "public"."shp_unit_packages" ADD CONSTRAINT "shp_unit_packages_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES public.shp_units (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_unit_vehicles.shp_unit_vehicles_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_unit_vehicles.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."shp_unit_vehicles" ADD CONSTRAINT "shp_unit_vehicles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.shp_unit_vehicles.shp_unit_vehicles_unit_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_unit_vehicles.sql
-- Dependencies:  shp_units
-- ============================================================================
ALTER TABLE "public"."shp_unit_vehicles" ADD CONSTRAINT "shp_unit_vehicles_unit_id_fkey" FOREIGN KEY (unit_id) REFERENCES public.shp_units (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_units.shp_units_current_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_units.sql
-- Dependencies:  md_locations
-- ============================================================================
ALTER TABLE "public"."shp_units" ADD CONSTRAINT "shp_units_current_location_id_fkey" FOREIGN KEY (current_location_id) REFERENCES public.md_locations (id);

-- ============================================================================
-- Object:        public.shp_units.shp_units_shipment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_units.sql
-- Dependencies:  shp_shipments
-- ============================================================================
ALTER TABLE "public"."shp_units" ADD CONSTRAINT "shp_units_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.shp_shipments (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.shp_units.shp_units_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/shp_units.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."shp_units" ADD CONSTRAINT "shp_units_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.sla_daily_snapshots.sla_daily_snapshots_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/sla_daily_snapshots.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."sla_daily_snapshots" ADD CONSTRAINT "sla_daily_snapshots_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.staff.staff_role_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/staff.sql
-- Dependencies:  roles
-- ============================================================================
ALTER TABLE "public"."staff" ADD CONSTRAINT "staff_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles (id);

-- ============================================================================
-- Object:        public.staff.staff_user_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/staff.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."staff" ADD CONSTRAINT "staff_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.staff.staff_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/staff.sql
-- Dependencies:  warehouses
-- ============================================================================
ALTER TABLE "public"."staff" ADD CONSTRAINT "staff_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses (id);

-- ============================================================================
-- Object:        public.storage_locations.storage_locations_zone_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/storage_locations.sql
-- Dependencies:  storage_zones
-- ============================================================================
ALTER TABLE "public"."storage_locations" ADD CONSTRAINT "storage_locations_zone_id_fkey" FOREIGN KEY (zone_id) REFERENCES public.storage_zones (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.storage_zones.storage_zones_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/storage_zones.sql
-- Dependencies:  warehouses
-- ============================================================================
ALTER TABLE "public"."storage_zones" ADD CONSTRAINT "storage_zones_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.svc_service_requests.svc_service_requests_execution_leg_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/svc_service_requests.sql
-- Dependencies:  shp_execution_legs
-- ============================================================================
ALTER TABLE "public"."svc_service_requests" ADD CONSTRAINT "svc_service_requests_execution_leg_id_fkey" FOREIGN KEY (execution_leg_id) REFERENCES public.shp_execution_legs (id) ON DELETE RESTRICT;

-- ============================================================================
-- Object:        public.svc_service_requests.svc_service_requests_shipment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/svc_service_requests.sql
-- Dependencies:  shp_shipments
-- ============================================================================
ALTER TABLE "public"."svc_service_requests" ADD CONSTRAINT "svc_service_requests_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.shp_shipments (id) ON DELETE RESTRICT;

-- ============================================================================
-- Object:        public.svc_service_requests.svc_service_requests_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/svc_service_requests.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."svc_service_requests" ADD CONSTRAINT "svc_service_requests_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.md_tenants (id);

-- ============================================================================
-- Object:        public.svc_service_requests.svc_service_requests_work_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/svc_service_requests.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
ALTER TABLE "public"."svc_service_requests" ADD CONSTRAINT "svc_service_requests_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.commercial_work_orders (id) ON DELETE RESTRICT;

-- ============================================================================
-- Object:        public.tax_rates.tax_rates_country_code_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tax_rates.sql
-- Dependencies:  country_master
-- ============================================================================
ALTER TABLE "public"."tax_rates" ADD CONSTRAINT "tax_rates_country_code_fkey" FOREIGN KEY (country_code) REFERENCES public.country_master (country_code);

-- ============================================================================
-- Object:        public.tenant_sbus.tenant_sbus_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tenant_sbus.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."tenant_sbus" ADD CONSTRAINT "tenant_sbus_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.tenant_sbus.tenant_sbus_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tenant_sbus.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."tenant_sbus" ADD CONSTRAINT "tenant_sbus_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.tenant_users.tenant_users_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."tenant_users" ADD CONSTRAINT "tenant_users_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.tenant_users.tenant_users_region_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  md_trucking_regions
-- ============================================================================
ALTER TABLE "public"."tenant_users" ADD CONSTRAINT "tenant_users_region_id_fkey" FOREIGN KEY (region_id) REFERENCES public.md_trucking_regions (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.tenant_users.tenant_users_role_code_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  tenant_roles
-- ============================================================================
ALTER TABLE "public"."tenant_users" ADD CONSTRAINT "tenant_users_role_code_fkey" FOREIGN KEY (role_code) REFERENCES public.tenant_roles (role_code);

-- ============================================================================
-- Object:        public.tenant_users.tenant_users_sbu_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  tenant_sbus
-- ============================================================================
ALTER TABLE "public"."tenant_users" ADD CONSTRAINT "tenant_users_sbu_id_fkey" FOREIGN KEY (sbu_id) REFERENCES public.tenant_sbus (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.tenant_users.tenant_users_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.tenant_users.tenant_users_user_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."tenant_users" ADD CONSTRAINT "tenant_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.tenant_users.tenant_users_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."tenant_users" ADD CONSTRAINT "tenant_users_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.tenants.tenants_user_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."tenants" ADD CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.tenants.tenants_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  warehouses
-- ============================================================================
ALTER TABLE "public"."tenants" ADD CONSTRAINT "tenants_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.token_price_history.token_price_history_changed_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/token_price_history.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."token_price_history" ADD CONSTRAINT "token_price_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.token_prices.token_prices_updated_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/token_prices.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."token_prices" ADD CONSTRAINT "token_prices_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users (id);

-- ============================================================================
-- Object:        public.token_transactions.token_transactions_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/token_transactions.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."token_transactions" ADD CONSTRAINT "token_transactions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.topup_requests.topup_requests_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/topup_requests.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."topup_requests" ADD CONSTRAINT "topup_requests_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.tracking_points.tracking_points_session_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tracking_points.sql
-- Dependencies:  tracking_sessions
-- ============================================================================
ALTER TABLE "public"."tracking_points" ADD CONSTRAINT "tracking_points_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.tracking_sessions (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.tracking_sessions.tracking_sessions_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/tracking_sessions.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."tracking_sessions" ADD CONSTRAINT "tracking_sessions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.uom_types.uom_types_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/uom_types.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."uom_types" ADD CONSTRAINT "uom_types_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.user_roles.user_roles_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/user_roles.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."user_roles" ADD CONSTRAINT "user_roles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.variant_types.variant_types_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/variant_types.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."variant_types" ADD CONSTRAINT "variant_types_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.variant_values.variant_values_variant_type_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/variant_values.sql
-- Dependencies:  variant_types
-- ============================================================================
ALTER TABLE "public"."variant_values" ADD CONSTRAINT "variant_values_variant_type_id_fkey" FOREIGN KEY (variant_type_id) REFERENCES public.variant_types (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.vendor_invoices.vendor_invoices_matched_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/vendor_invoices.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."vendor_invoices" ADD CONSTRAINT "vendor_invoices_matched_by_fkey" FOREIGN KEY (matched_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.vendor_invoices.vendor_invoices_vendor_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/vendor_invoices.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."vendor_invoices" ADD CONSTRAINT "vendor_invoices_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.vendor_invoices.vendor_invoices_verified_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/vendor_invoices.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."vendor_invoices" ADD CONSTRAINT "vendor_invoices_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.warehouse_staff_attendance.warehouse_staff_attendance_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/warehouse_staff_attendance.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."warehouse_staff_attendance" ADD CONSTRAINT "warehouse_staff_attendance_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.warehouse_users.warehouse_users_staff_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/warehouse_users.sql
-- Dependencies:  staff
-- ============================================================================
ALTER TABLE "public"."warehouse_users" ADD CONSTRAINT "warehouse_users_staff_id_fkey" FOREIGN KEY (staff_id) REFERENCES public.staff (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.warehouse_users.warehouse_users_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/warehouse_users.sql
-- Dependencies:  warehouses
-- ============================================================================
ALTER TABLE "public"."warehouse_users" ADD CONSTRAINT "warehouse_users_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.weight_tracking.weight_tracking_batch_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/weight_tracking.sql
-- Dependencies:  product_batches
-- ============================================================================
ALTER TABLE "public"."weight_tracking" ADD CONSTRAINT "weight_tracking_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.product_batches (id);

-- ============================================================================
-- Object:        public.weight_tracking.weight_tracking_product_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/weight_tracking.sql
-- Dependencies:  products
-- ============================================================================
ALTER TABLE "public"."weight_tracking" ADD CONSTRAINT "weight_tracking_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products (id);

-- ============================================================================
-- Object:        public.weight_tracking.weight_tracking_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/weight_tracking.sql
-- Dependencies:  warehouses
-- ============================================================================
ALTER TABLE "public"."weight_tracking" ADD CONSTRAINT "weight_tracking_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses (id);

-- ============================================================================
-- Object:        public.wh_billing_invoice_details.wh_billing_invoice_details_invoice_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_billing_invoice_details.sql
-- Dependencies:  wh_billing_invoices
-- ============================================================================
ALTER TABLE "public"."wh_billing_invoice_details" ADD CONSTRAINT "wh_billing_invoice_details_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES public.wh_billing_invoices (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_billing_invoices.wh_billing_invoices_contract_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_billing_invoices.sql
-- Dependencies:  md_storage_contracts
-- ============================================================================
ALTER TABLE "public"."wh_billing_invoices" ADD CONSTRAINT "wh_billing_invoices_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES public.md_storage_contracts (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_daily_stock_snapshots.wh_daily_stock_snapshots_area_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_daily_stock_snapshots.sql
-- Dependencies:  md_warehouse_areas
-- ============================================================================
ALTER TABLE "public"."wh_daily_stock_snapshots" ADD CONSTRAINT "wh_daily_stock_snapshots_area_id_fkey" FOREIGN KEY (area_id) REFERENCES public.md_warehouse_areas (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_daily_stock_snapshots.wh_daily_stock_snapshots_contract_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_daily_stock_snapshots.sql
-- Dependencies:  md_storage_contracts
-- ============================================================================
ALTER TABLE "public"."wh_daily_stock_snapshots" ADD CONSTRAINT "wh_daily_stock_snapshots_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES public.md_storage_contracts (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_daily_stock_snapshots.wh_daily_stock_snapshots_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_daily_stock_snapshots.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_daily_stock_snapshots" ADD CONSTRAINT "wh_daily_stock_snapshots_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_inbound_damage_records.wh_inbound_damage_records_decision_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_damage_records.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."wh_inbound_damage_records" ADD CONSTRAINT "wh_inbound_damage_records_decision_by_fkey" FOREIGN KEY (decision_by) REFERENCES public.profiles (id);

-- ============================================================================
-- Object:        public.wh_inbound_damage_records.wh_inbound_damage_records_planned_quarantine_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_damage_records.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_inbound_damage_records" ADD CONSTRAINT "wh_inbound_damage_records_planned_quarantine_location_id_fkey" FOREIGN KEY (planned_quarantine_location_id) REFERENCES public.md_warehouse_locations (id);

-- ============================================================================
-- Object:        public.wh_inbound_damage_records.wh_inbound_damage_records_quarantine_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_damage_records.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_inbound_damage_records" ADD CONSTRAINT "wh_inbound_damage_records_quarantine_location_id_fkey" FOREIGN KEY (quarantine_location_id) REFERENCES public.md_warehouse_locations (id);

-- ============================================================================
-- Object:        public.wh_inbound_damage_records.wh_inbound_damage_records_receipt_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_damage_records.sql
-- Dependencies:  wh_inbound_receipts
-- ============================================================================
ALTER TABLE "public"."wh_inbound_damage_records" ADD CONSTRAINT "wh_inbound_damage_records_receipt_id_fkey" FOREIGN KEY (receipt_id) REFERENCES public.wh_inbound_receipts (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_inbound_damage_records.wh_inbound_damage_records_receipt_item_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_damage_records.sql
-- Dependencies:  wh_inbound_receipt_items
-- ============================================================================
ALTER TABLE "public"."wh_inbound_damage_records" ADD CONSTRAINT "wh_inbound_damage_records_receipt_item_id_fkey" FOREIGN KEY (receipt_item_id) REFERENCES public.wh_inbound_receipt_items (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_inbound_damage_records.wh_inbound_damage_records_reported_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_damage_records.sql
-- Dependencies:  md_warehouse_staff
-- ============================================================================
ALTER TABLE "public"."wh_inbound_damage_records" ADD CONSTRAINT "wh_inbound_damage_records_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES public.md_warehouse_staff (id);

-- ============================================================================
-- Object:        public.wh_inbound_receipt_items.wh_inbound_receipt_items_planned_putaway_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_receipt_items.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipt_items" ADD CONSTRAINT "wh_inbound_receipt_items_planned_putaway_location_id_fkey" FOREIGN KEY (planned_putaway_location_id) REFERENCES public.md_warehouse_locations (id);

-- ============================================================================
-- Object:        public.wh_inbound_receipt_items.wh_inbound_receipt_items_product_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_receipt_items.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipt_items" ADD CONSTRAINT "wh_inbound_receipt_items_product_sku_id_fkey" FOREIGN KEY (product_sku_id) REFERENCES public.md_product_skus (id);

-- ============================================================================
-- Object:        public.wh_inbound_receipt_items.wh_inbound_receipt_items_putaway_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_receipt_items.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipt_items" ADD CONSTRAINT "wh_inbound_receipt_items_putaway_location_id_fkey" FOREIGN KEY (putaway_location_id) REFERENCES public.md_warehouse_locations (id);

-- ============================================================================
-- Object:        public.wh_inbound_receipt_items.wh_inbound_receipt_items_receipt_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_receipt_items.sql
-- Dependencies:  wh_inbound_receipts
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipt_items" ADD CONSTRAINT "wh_inbound_receipt_items_receipt_id_fkey" FOREIGN KEY (receipt_id) REFERENCES public.wh_inbound_receipts (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_inbound_receipts.wh_inbound_receipts_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipts" ADD CONSTRAINT "wh_inbound_receipts_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_inbound_receipts.wh_inbound_receipts_driver_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  md_drivers
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipts" ADD CONSTRAINT "wh_inbound_receipts_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.md_drivers (id);

-- ============================================================================
-- Object:        public.wh_inbound_receipts.wh_inbound_receipts_fleet_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  md_fleets
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipts" ADD CONSTRAINT "wh_inbound_receipts_fleet_id_fkey" FOREIGN KEY (fleet_id) REFERENCES public.md_fleets (id);

-- ============================================================================
-- Object:        public.wh_inbound_receipts.wh_inbound_receipts_shipper_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipts" ADD CONSTRAINT "wh_inbound_receipts_shipper_id_fkey" FOREIGN KEY (shipper_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_inbound_receipts.wh_inbound_receipts_transfer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  wh_transfer_orders
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipts" ADD CONSTRAINT "wh_inbound_receipts_transfer_id_fkey" FOREIGN KEY (transfer_id) REFERENCES public.wh_transfer_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_inbound_receipts.wh_inbound_receipts_transporter_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipts" ADD CONSTRAINT "wh_inbound_receipts_transporter_id_fkey" FOREIGN KEY (transporter_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.wh_inbound_receipts.wh_inbound_receipts_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipts" ADD CONSTRAINT "wh_inbound_receipts_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id);

-- ============================================================================
-- Object:        public.wh_internal_movements.wh_internal_movements_assigned_to_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  md_warehouse_staff
-- ============================================================================
ALTER TABLE "public"."wh_internal_movements" ADD CONSTRAINT "wh_internal_movements_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.md_warehouse_staff (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_internal_movements.wh_internal_movements_from_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_internal_movements" ADD CONSTRAINT "wh_internal_movements_from_location_id_fkey" FOREIGN KEY (from_location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_internal_movements.wh_internal_movements_product_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_internal_movements" ADD CONSTRAINT "wh_internal_movements_product_sku_id_fkey" FOREIGN KEY (product_sku_id) REFERENCES public.md_product_skus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_internal_movements.wh_internal_movements_to_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_internal_movements" ADD CONSTRAINT "wh_internal_movements_to_location_id_fkey" FOREIGN KEY (to_location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_internal_movements.wh_internal_movements_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_internal_movements" ADD CONSTRAINT "wh_internal_movements_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_inventory.wh_inventory_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_inventory" ADD CONSTRAINT "wh_inventory_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_inventory.wh_inventory_parent_inventory_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
ALTER TABLE "public"."wh_inventory" ADD CONSTRAINT "wh_inventory_parent_inventory_id_fkey" FOREIGN KEY (parent_inventory_id) REFERENCES public.wh_inventory (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_inventory.wh_inventory_product_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_inventory" ADD CONSTRAINT "wh_inventory_product_sku_id_fkey" FOREIGN KEY (product_sku_id) REFERENCES public.md_product_skus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_inventory.wh_inventory_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_inventory" ADD CONSTRAINT "wh_inventory_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_inventory_movements.wh_inventory_movements_from_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inventory_movements.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_inventory_movements" ADD CONSTRAINT "wh_inventory_movements_from_location_id_fkey" FOREIGN KEY (from_location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_inventory_movements.wh_inventory_movements_inventory_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inventory_movements.sql
-- Dependencies:  wh_inventory
-- ============================================================================
ALTER TABLE "public"."wh_inventory_movements" ADD CONSTRAINT "wh_inventory_movements_inventory_id_fkey" FOREIGN KEY (inventory_id) REFERENCES public.wh_inventory (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_inventory_movements.wh_inventory_movements_to_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_inventory_movements.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_inventory_movements" ADD CONSTRAINT "wh_inventory_movements_to_location_id_fkey" FOREIGN KEY (to_location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_item_packaging.wh_item_packaging_item_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_item_packaging.sql
-- Dependencies:  wh_items
-- ============================================================================
ALTER TABLE "public"."wh_item_packaging" ADD CONSTRAINT "wh_item_packaging_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.wh_items (id);

-- ============================================================================
-- Object:        public.wh_items.wh_items_hs_code_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_items.sql
-- Dependencies:  fw_hs_codes
-- ============================================================================
ALTER TABLE "public"."wh_items" ADD CONSTRAINT "wh_items_hs_code_id_fkey" FOREIGN KEY (hs_code_id) REFERENCES public.fw_hs_codes (id);

-- ============================================================================
-- Object:        public.wh_jo_staff_assignments.wh_jo_staff_assignments_jo_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_jo_staff_assignments.sql
-- Dependencies:  job_orders
-- ============================================================================
ALTER TABLE "public"."wh_jo_staff_assignments" ADD CONSTRAINT "wh_jo_staff_assignments_jo_id_fkey" FOREIGN KEY (jo_id) REFERENCES public.job_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_jo_staff_assignments.wh_jo_staff_assignments_receipt_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_jo_staff_assignments.sql
-- Dependencies:  wh_inbound_receipts
-- ============================================================================
ALTER TABLE "public"."wh_jo_staff_assignments" ADD CONSTRAINT "wh_jo_staff_assignments_receipt_id_fkey" FOREIGN KEY (receipt_id) REFERENCES public.wh_inbound_receipts (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_jo_staff_assignments.wh_jo_staff_assignments_shipment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_jo_staff_assignments.sql
-- Dependencies:  wh_outbound_shipments
-- ============================================================================
ALTER TABLE "public"."wh_jo_staff_assignments" ADD CONSTRAINT "wh_jo_staff_assignments_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.wh_outbound_shipments (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_jo_staff_assignments.wh_jo_staff_assignments_staff_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_jo_staff_assignments.sql
-- Dependencies:  md_warehouse_staff
-- ============================================================================
ALTER TABLE "public"."wh_jo_staff_assignments" ADD CONSTRAINT "wh_jo_staff_assignments_staff_id_fkey" FOREIGN KEY (staff_id) REFERENCES public.md_warehouse_staff (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_loading_sessions.wh_loading_sessions_shipment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_loading_sessions.sql
-- Dependencies:  wh_outbound_shipments
-- ============================================================================
ALTER TABLE "public"."wh_loading_sessions" ADD CONSTRAINT "wh_loading_sessions_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.wh_outbound_shipments (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_master_boxes.wh_master_boxes_job_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_master_boxes.sql
-- Dependencies:  job_orders
-- ============================================================================
ALTER TABLE "public"."wh_master_boxes" ADD CONSTRAINT "wh_master_boxes_job_order_id_fkey" FOREIGN KEY (job_order_id) REFERENCES public.job_orders (id);

-- ============================================================================
-- Object:        public.wh_master_boxes.wh_master_boxes_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_master_boxes.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_master_boxes" ADD CONSTRAINT "wh_master_boxes_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_master_boxes.wh_master_boxes_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_master_boxes.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."wh_master_boxes" ADD CONSTRAINT "wh_master_boxes_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.wh_master_boxes.wh_master_boxes_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_master_boxes.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_master_boxes" ADD CONSTRAINT "wh_master_boxes_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id);

-- ============================================================================
-- Object:        public.wh_outbound_damage_records.wh_outbound_damage_records_shipment_item_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_outbound_damage_records.sql
-- Dependencies:  wh_outbound_shipment_items
-- ============================================================================
ALTER TABLE "public"."wh_outbound_damage_records" ADD CONSTRAINT "wh_outbound_damage_records_shipment_item_id_fkey" FOREIGN KEY (shipment_item_id) REFERENCES public.wh_outbound_shipment_items (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_outbound_shipment_items.wh_outbound_shipment_items_product_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_outbound_shipment_items.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_outbound_shipment_items" ADD CONSTRAINT "wh_outbound_shipment_items_product_sku_id_fkey" FOREIGN KEY (product_sku_id) REFERENCES public.md_product_skus (id);

-- ============================================================================
-- Object:        public.wh_outbound_shipment_items.wh_outbound_shipment_items_shipment_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_outbound_shipment_items.sql
-- Dependencies:  wh_outbound_shipments
-- ============================================================================
ALTER TABLE "public"."wh_outbound_shipment_items" ADD CONSTRAINT "wh_outbound_shipment_items_shipment_id_fkey" FOREIGN KEY (shipment_id) REFERENCES public.wh_outbound_shipments (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_outbound_shipments.wh_outbound_shipments_consignee_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."wh_outbound_shipments" ADD CONSTRAINT "wh_outbound_shipments_consignee_id_fkey" FOREIGN KEY (consignee_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_outbound_shipments.wh_outbound_shipments_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."wh_outbound_shipments" ADD CONSTRAINT "wh_outbound_shipments_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_outbound_shipments.wh_outbound_shipments_driver_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  md_drivers
-- ============================================================================
ALTER TABLE "public"."wh_outbound_shipments" ADD CONSTRAINT "wh_outbound_shipments_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES public.md_drivers (id);

-- ============================================================================
-- Object:        public.wh_outbound_shipments.wh_outbound_shipments_fleet_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  md_fleets
-- ============================================================================
ALTER TABLE "public"."wh_outbound_shipments" ADD CONSTRAINT "wh_outbound_shipments_fleet_id_fkey" FOREIGN KEY (fleet_id) REFERENCES public.md_fleets (id);

-- ============================================================================
-- Object:        public.wh_outbound_shipments.wh_outbound_shipments_transfer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  wh_transfer_orders
-- ============================================================================
ALTER TABLE "public"."wh_outbound_shipments" ADD CONSTRAINT "wh_outbound_shipments_transfer_id_fkey" FOREIGN KEY (transfer_id) REFERENCES public.wh_transfer_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_outbound_shipments.wh_outbound_shipments_transporter_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."wh_outbound_shipments" ADD CONSTRAINT "wh_outbound_shipments_transporter_id_fkey" FOREIGN KEY (transporter_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.wh_outbound_shipments.wh_outbound_shipments_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_outbound_shipments" ADD CONSTRAINT "wh_outbound_shipments_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id);

-- ============================================================================
-- Object:        public.wh_outbound_shipments.wh_outbound_shipments_wo_item_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  wo_items
-- ============================================================================
ALTER TABLE "public"."wh_outbound_shipments" ADD CONSTRAINT "wh_outbound_shipments_wo_item_id_fkey" FOREIGN KEY (wo_item_id) REFERENCES public.wo_items (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_parcel_inbound.wh_parcel_inbound_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_parcel_inbound.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."wh_parcel_inbound" ADD CONSTRAINT "wh_parcel_inbound_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id);

-- ============================================================================
-- Object:        public.wh_parcel_inbound.wh_parcel_inbound_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_parcel_inbound.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_parcel_inbound" ADD CONSTRAINT "wh_parcel_inbound_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.md_warehouse_locations (id);

-- ============================================================================
-- Object:        public.wh_parcel_inbound.wh_parcel_inbound_master_box_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_parcel_inbound.sql
-- Dependencies:  wh_master_boxes
-- ============================================================================
ALTER TABLE "public"."wh_parcel_inbound" ADD CONSTRAINT "wh_parcel_inbound_master_box_id_fkey" FOREIGN KEY (master_box_id) REFERENCES public.wh_master_boxes (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_parcel_inbound.wh_parcel_inbound_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_parcel_inbound.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."wh_parcel_inbound" ADD CONSTRAINT "wh_parcel_inbound_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id);

-- ============================================================================
-- Object:        public.wh_parcel_inbound.wh_parcel_inbound_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_parcel_inbound.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_parcel_inbound" ADD CONSTRAINT "wh_parcel_inbound_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id);

-- ============================================================================
-- Object:        public.wh_picking_details.wh_picking_details_from_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_picking_details.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_picking_details" ADD CONSTRAINT "wh_picking_details_from_location_id_fkey" FOREIGN KEY (from_location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_picking_details.wh_picking_details_inventory_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_picking_details.sql
-- Dependencies:  wh_inventory
-- ============================================================================
ALTER TABLE "public"."wh_picking_details" ADD CONSTRAINT "wh_picking_details_inventory_id_fkey" FOREIGN KEY (inventory_id) REFERENCES public.wh_inventory (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_picking_details.wh_picking_details_picking_list_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_picking_details.sql
-- Dependencies:  wh_picking_lists
-- ============================================================================
ALTER TABLE "public"."wh_picking_details" ADD CONSTRAINT "wh_picking_details_picking_list_id_fkey" FOREIGN KEY (picking_list_id) REFERENCES public.wh_picking_lists (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_picking_details.wh_picking_details_product_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_picking_details.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_picking_details" ADD CONSTRAINT "wh_picking_details_product_sku_id_fkey" FOREIGN KEY (product_sku_id) REFERENCES public.md_product_skus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_picking_lists.wh_picking_lists_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_picking_lists.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_picking_lists" ADD CONSTRAINT "wh_picking_lists_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_receipt_details.wh_receipt_details_generated_inventory_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_receipt_details.sql
-- Dependencies:  wh_inventory
-- ============================================================================
ALTER TABLE "public"."wh_receipt_details" ADD CONSTRAINT "wh_receipt_details_generated_inventory_id_fkey" FOREIGN KEY (generated_inventory_id) REFERENCES public.wh_inventory (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_receipt_details.wh_receipt_details_product_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_receipt_details.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_receipt_details" ADD CONSTRAINT "wh_receipt_details_product_sku_id_fkey" FOREIGN KEY (product_sku_id) REFERENCES public.md_product_skus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_receipt_details.wh_receipt_details_receipt_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_receipt_details.sql
-- Dependencies:  wh_receipt_orders
-- ============================================================================
ALTER TABLE "public"."wh_receipt_details" ADD CONSTRAINT "wh_receipt_details_receipt_id_fkey" FOREIGN KEY (receipt_id) REFERENCES public.wh_receipt_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_receipt_orders.wh_receipt_orders_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_receipt_orders.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_receipt_orders" ADD CONSTRAINT "wh_receipt_orders_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_repacking_conversions.wh_repacking_conversions_created_by_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  auth.users
-- ============================================================================
ALTER TABLE "public"."wh_repacking_conversions" ADD CONSTRAINT "wh_repacking_conversions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_repacking_conversions.wh_repacking_conversions_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."wh_repacking_conversions" ADD CONSTRAINT "wh_repacking_conversions_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_repacking_conversions.wh_repacking_conversions_source_product_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_repacking_conversions" ADD CONSTRAINT "wh_repacking_conversions_source_product_id_fkey" FOREIGN KEY (source_product_id) REFERENCES public.md_product_skus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_repacking_conversions.wh_repacking_conversions_target_product_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_repacking_conversions" ADD CONSTRAINT "wh_repacking_conversions_target_product_id_fkey" FOREIGN KEY (target_product_id) REFERENCES public.md_product_skus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_repacking_conversions.wh_repacking_conversions_tenant_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."wh_repacking_conversions" ADD CONSTRAINT "wh_repacking_conversions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_repacking_items.wh_repacking_items_product_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_repacking_items" ADD CONSTRAINT "wh_repacking_items_product_sku_id_fkey" FOREIGN KEY (product_sku_id) REFERENCES public.md_product_skus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_repacking_items.wh_repacking_items_repacking_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
ALTER TABLE "public"."wh_repacking_items" ADD CONSTRAINT "wh_repacking_items_repacking_order_id_fkey" FOREIGN KEY (repacking_order_id) REFERENCES public.wh_repacking_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_repacking_items.wh_repacking_items_source_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_repacking_items" ADD CONSTRAINT "wh_repacking_items_source_location_id_fkey" FOREIGN KEY (source_location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_repacking_items.wh_repacking_items_target_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_repacking_items" ADD CONSTRAINT "wh_repacking_items_target_location_id_fkey" FOREIGN KEY (target_location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_repacking_items.wh_repacking_items_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_repacking_items" ADD CONSTRAINT "wh_repacking_items_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_repacking_orders.wh_repacking_orders_customer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."wh_repacking_orders" ADD CONSTRAINT "wh_repacking_orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_repacking_orders.wh_repacking_orders_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_repacking_orders" ADD CONSTRAINT "wh_repacking_orders_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_staff_attendance.wh_staff_attendance_staff_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_staff_attendance.sql
-- Dependencies:  md_warehouse_staff
-- ============================================================================
ALTER TABLE "public"."wh_staff_attendance" ADD CONSTRAINT "wh_staff_attendance_staff_id_fkey" FOREIGN KEY (staff_id) REFERENCES public.md_warehouse_staff (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_task_items.wh_task_items_from_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_task_items.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_task_items" ADD CONSTRAINT "wh_task_items_from_location_id_fkey" FOREIGN KEY (from_location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_task_items.wh_task_items_product_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_task_items.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_task_items" ADD CONSTRAINT "wh_task_items_product_sku_id_fkey" FOREIGN KEY (product_sku_id) REFERENCES public.md_product_skus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_task_items.wh_task_items_task_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_task_items.sql
-- Dependencies:  wh_tasks
-- ============================================================================
ALTER TABLE "public"."wh_task_items" ADD CONSTRAINT "wh_task_items_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.wh_tasks (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_task_items.wh_task_items_to_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_task_items.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_task_items" ADD CONSTRAINT "wh_task_items_to_location_id_fkey" FOREIGN KEY (to_location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_tasks.wh_tasks_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_tasks.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_tasks" ADD CONSTRAINT "wh_tasks_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_temperature_alerts.wh_temperature_alerts_zone_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_temperature_alerts.sql
-- Dependencies:  md_warehouse_zones
-- ============================================================================
ALTER TABLE "public"."wh_temperature_alerts" ADD CONSTRAINT "wh_temperature_alerts_zone_id_fkey" FOREIGN KEY (zone_id) REFERENCES public.md_warehouse_zones (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_temperature_logs.wh_temperature_logs_zone_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_temperature_logs.sql
-- Dependencies:  md_warehouse_zones
-- ============================================================================
ALTER TABLE "public"."wh_temperature_logs" ADD CONSTRAINT "wh_temperature_logs_zone_id_fkey" FOREIGN KEY (zone_id) REFERENCES public.md_warehouse_zones (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_transfer_details.wh_transfer_details_from_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transfer_details.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_transfer_details" ADD CONSTRAINT "wh_transfer_details_from_location_id_fkey" FOREIGN KEY (from_location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_transfer_details.wh_transfer_details_inventory_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transfer_details.sql
-- Dependencies:  wh_inventory
-- ============================================================================
ALTER TABLE "public"."wh_transfer_details" ADD CONSTRAINT "wh_transfer_details_inventory_id_fkey" FOREIGN KEY (inventory_id) REFERENCES public.wh_inventory (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_transfer_details.wh_transfer_details_product_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transfer_details.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_transfer_details" ADD CONSTRAINT "wh_transfer_details_product_sku_id_fkey" FOREIGN KEY (product_sku_id) REFERENCES public.md_product_skus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_transfer_details.wh_transfer_details_to_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transfer_details.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_transfer_details" ADD CONSTRAINT "wh_transfer_details_to_location_id_fkey" FOREIGN KEY (to_location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_transfer_details.wh_transfer_details_transfer_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transfer_details.sql
-- Dependencies:  wh_transfer_orders
-- ============================================================================
ALTER TABLE "public"."wh_transfer_details" ADD CONSTRAINT "wh_transfer_details_transfer_id_fkey" FOREIGN KEY (transfer_id) REFERENCES public.wh_transfer_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_transfer_orders.wh_transfer_orders_consignee_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transfer_orders.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."wh_transfer_orders" ADD CONSTRAINT "wh_transfer_orders_consignee_id_fkey" FOREIGN KEY (consignee_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_transfer_orders.wh_transfer_orders_from_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transfer_orders.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_transfer_orders" ADD CONSTRAINT "wh_transfer_orders_from_warehouse_id_fkey" FOREIGN KEY (from_warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_transfer_orders.wh_transfer_orders_to_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transfer_orders.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_transfer_orders" ADD CONSTRAINT "wh_transfer_orders_to_warehouse_id_fkey" FOREIGN KEY (to_warehouse_id) REFERENCES public.md_warehouses (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_transformation_components.wh_transformation_components_inventory_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transformation_components.sql
-- Dependencies:  wh_inventory
-- ============================================================================
ALTER TABLE "public"."wh_transformation_components" ADD CONSTRAINT "wh_transformation_components_inventory_id_fkey" FOREIGN KEY (inventory_id) REFERENCES public.wh_inventory (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_transformation_components.wh_transformation_components_product_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transformation_components.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_transformation_components" ADD CONSTRAINT "wh_transformation_components_product_sku_id_fkey" FOREIGN KEY (product_sku_id) REFERENCES public.md_product_skus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_transformation_components.wh_transformation_components_transformation_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transformation_components.sql
-- Dependencies:  wh_transformation_orders
-- ============================================================================
ALTER TABLE "public"."wh_transformation_components" ADD CONSTRAINT "wh_transformation_components_transformation_order_id_fkey" FOREIGN KEY (transformation_order_id) REFERENCES public.wh_transformation_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_transformation_orders.wh_transformation_orders_location_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transformation_orders.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."wh_transformation_orders" ADD CONSTRAINT "wh_transformation_orders_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.md_warehouse_locations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_transformation_orders.wh_transformation_orders_output_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transformation_orders.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_transformation_orders" ADD CONSTRAINT "wh_transformation_orders_output_sku_id_fkey" FOREIGN KEY (output_sku_id) REFERENCES public.md_product_skus (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wh_transformation_outputs.wh_transformation_outputs_generated_inventory_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transformation_outputs.sql
-- Dependencies:  wh_inventory
-- ============================================================================
ALTER TABLE "public"."wh_transformation_outputs" ADD CONSTRAINT "wh_transformation_outputs_generated_inventory_id_fkey" FOREIGN KEY (generated_inventory_id) REFERENCES public.wh_inventory (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_transformation_outputs.wh_transformation_outputs_product_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transformation_outputs.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_transformation_outputs" ADD CONSTRAINT "wh_transformation_outputs_product_sku_id_fkey" FOREIGN KEY (product_sku_id) REFERENCES public.md_product_skus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_transformation_outputs.wh_transformation_outputs_transformation_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_transformation_outputs.sql
-- Dependencies:  wh_transformation_orders
-- ============================================================================
ALTER TABLE "public"."wh_transformation_outputs" ADD CONSTRAINT "wh_transformation_outputs_transformation_order_id_fkey" FOREIGN KEY (transformation_order_id) REFERENCES public.wh_transformation_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_unloading_sessions.wh_unloading_sessions_receipt_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_unloading_sessions.sql
-- Dependencies:  wh_inbound_receipts
-- ============================================================================
ALTER TABLE "public"."wh_unloading_sessions" ADD CONSTRAINT "wh_unloading_sessions_receipt_id_fkey" FOREIGN KEY (receipt_id) REFERENCES public.wh_inbound_receipts (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wh_vas_orders.wh_vas_orders_bom_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_vas_orders.sql
-- Dependencies:  md_bill_of_materials
-- ============================================================================
ALTER TABLE "public"."wh_vas_orders" ADD CONSTRAINT "wh_vas_orders_bom_id_fkey" FOREIGN KEY (bom_id) REFERENCES public.md_bill_of_materials (id);

-- ============================================================================
-- Object:        public.wh_vas_orders.wh_vas_orders_target_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_vas_orders.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wh_vas_orders" ADD CONSTRAINT "wh_vas_orders_target_sku_id_fkey" FOREIGN KEY (target_sku_id) REFERENCES public.md_product_skus (id);

-- ============================================================================
-- Object:        public.wh_vas_orders.wh_vas_orders_warehouse_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_vas_orders.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."wh_vas_orders" ADD CONSTRAINT "wh_vas_orders_warehouse_id_fkey" FOREIGN KEY (warehouse_id) REFERENCES public.md_warehouses (id);

-- ============================================================================
-- Object:        public.wh_wa_notifications.wh_wa_notifications_receipt_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wh_wa_notifications.sql
-- Dependencies:  wh_inbound_receipts
-- ============================================================================
ALTER TABLE "public"."wh_wa_notifications" ADD CONSTRAINT "wh_wa_notifications_receipt_id_fkey" FOREIGN KEY (receipt_id) REFERENCES public.wh_inbound_receipts (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wo_audit_logs.fk_audit_performed_by
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_audit_logs.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."wo_audit_logs" ADD CONSTRAINT "fk_audit_performed_by" FOREIGN KEY (performed_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wo_item_manifests.wo_item_manifests_job_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_item_manifests.sql
-- Dependencies:  job_orders
-- ============================================================================
ALTER TABLE "public"."wo_item_manifests" ADD CONSTRAINT "wo_item_manifests_job_order_id_fkey" FOREIGN KEY (job_order_id) REFERENCES public.job_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wo_item_manifests.wo_item_manifests_product_sku_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_item_manifests.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."wo_item_manifests" ADD CONSTRAINT "wo_item_manifests_product_sku_id_fkey" FOREIGN KEY (product_sku_id) REFERENCES public.md_product_skus (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wo_item_manifests.wo_item_manifests_wo_item_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_item_manifests.sql
-- Dependencies:  wo_items
-- ============================================================================
ALTER TABLE "public"."wo_item_manifests" ADD CONSTRAINT "wo_item_manifests_wo_item_id_fkey" FOREIGN KEY (wo_item_id) REFERENCES public.wo_items (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wo_items.wo_items_wo_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_items.sql
-- Dependencies:  work_orders
-- ============================================================================
ALTER TABLE "public"."wo_items" ADD CONSTRAINT "wo_items_wo_id_fkey" FOREIGN KEY (wo_id) REFERENCES public.work_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wo_job_order_items.job_order_items_job_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_job_order_items.sql
-- Dependencies:  wo_job_orders
-- ============================================================================
ALTER TABLE "public"."wo_job_order_items" ADD CONSTRAINT "job_order_items_job_order_id_fkey" FOREIGN KEY (job_order_id) REFERENCES public.wo_job_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wo_job_orders.job_orders_executing_org_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_organizations
-- ============================================================================
ALTER TABLE "public"."wo_job_orders" ADD CONSTRAINT "job_orders_executing_org_id_fkey" FOREIGN KEY (executing_org_id) REFERENCES public.wo_organizations (id);

-- ============================================================================
-- Object:        public.wo_job_orders.job_orders_originating_org_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_organizations
-- ============================================================================
ALTER TABLE "public"."wo_job_orders" ADD CONSTRAINT "job_orders_originating_org_id_fkey" FOREIGN KEY (originating_org_id) REFERENCES public.wo_organizations (id);

-- ============================================================================
-- Object:        public.wo_job_orders.job_orders_work_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_work_orders
-- ============================================================================
ALTER TABLE "public"."wo_job_orders" ADD CONSTRAINT "job_orders_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.wo_work_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wo_organization_users.organization_users_organization_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_organization_users.sql
-- Dependencies:  wo_organizations
-- ============================================================================
ALTER TABLE "public"."wo_organization_users" ADD CONSTRAINT "organization_users_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.wo_organizations (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wo_organization_users.wo_organization_users_assigned_region_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_organization_users.sql
-- Dependencies:  md_trucking_regions
-- ============================================================================
ALTER TABLE "public"."wo_organization_users" ADD CONSTRAINT "wo_organization_users_assigned_region_id_fkey" FOREIGN KEY (assigned_region_id) REFERENCES public.md_trucking_regions (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wo_organizations.organizations_parent_org_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_organizations.sql
-- Dependencies:  wo_organizations
-- ============================================================================
ALTER TABLE "public"."wo_organizations" ADD CONSTRAINT "organizations_parent_org_id_fkey" FOREIGN KEY (parent_org_id) REFERENCES public.wo_organizations (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.wo_work_order_items.work_order_items_work_order_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_work_order_items.sql
-- Dependencies:  wo_work_orders
-- ============================================================================
ALTER TABLE "public"."wo_work_order_items" ADD CONSTRAINT "work_order_items_work_order_id_fkey" FOREIGN KEY (work_order_id) REFERENCES public.wo_work_orders (id) ON DELETE CASCADE;

-- ============================================================================
-- Object:        public.wo_work_orders.work_orders_assigned_org_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_organizations
-- ============================================================================
ALTER TABLE "public"."wo_work_orders" ADD CONSTRAINT "work_orders_assigned_org_id_fkey" FOREIGN KEY (assigned_org_id) REFERENCES public.wo_organizations (id);

-- ============================================================================
-- Object:        public.wo_work_orders.work_orders_originating_org_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_organizations
-- ============================================================================
ALTER TABLE "public"."wo_work_orders" ADD CONSTRAINT "work_orders_originating_org_id_fkey" FOREIGN KEY (originating_org_id) REFERENCES public.wo_organizations (id);

-- ============================================================================
-- Object:        public.work_orders.fk_work_orders_customer
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "fk_work_orders_customer" FOREIGN KEY (customer_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.work_orders.fk_work_orders_transporter
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "fk_work_orders_transporter" FOREIGN KEY (transporter_id) REFERENCES public.md_entities (id) ON DELETE SET NULL;

-- ============================================================================
-- Object:        public.work_orders.work_orders_region_id_fkey
-- Layer:         004 Deferred Foreign Key Constraints
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  md_trucking_regions
-- ============================================================================
ALTER TABLE "public"."work_orders" ADD CONSTRAINT "work_orders_region_id_fkey" FOREIGN KEY (region_id) REFERENCES public.md_trucking_regions (id) ON DELETE SET NULL;
