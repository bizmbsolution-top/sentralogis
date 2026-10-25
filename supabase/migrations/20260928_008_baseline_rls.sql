-- ============================================================================
-- SENTRALOGIS MODULAR LAYERED BASELINE MIGRATION
-- Layer:         008 RLS
-- Architecture:  D8-02 Option B2 / D8-30 Ratified
-- Baseline:      9bd2c04ce64b5e5c1d4b71451e4bab4a03c93999
-- Generation:    Deterministic Static Formation (Delivery Unit 2 / D8-33)
-- Total Objects: 591
-- Description:   Row Level Security enablement and access policies
-- ============================================================================
-- ----------------------------------------------------------------------------
-- SECTION 1: ROW LEVEL SECURITY ENABLEMENT (258 tables)
-- ----------------------------------------------------------------------------

-- ============================================================================
-- Object:        public._wo_renumber_temp.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/_wo_renumber_temp.sql
-- Dependencies:  _wo_renumber_temp
-- ============================================================================
ALTER TABLE "public"."_wo_renumber_temp" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.accounting_event_lines.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/accounting_event_lines.sql
-- Dependencies:  accounting_event_lines
-- ============================================================================
ALTER TABLE "public"."accounting_event_lines" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.accounting_events.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/accounting_events.sql
-- Dependencies:  accounting_events
-- ============================================================================
ALTER TABLE "public"."accounting_events" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.accounting_providers.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/accounting_providers.sql
-- Dependencies:  accounting_providers
-- ============================================================================
ALTER TABLE "public"."accounting_providers" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.add_costs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/add_costs.sql
-- Dependencies:  add_costs
-- ============================================================================
ALTER TABLE "public"."add_costs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.addresses.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/addresses.sql
-- Dependencies:  addresses
-- ============================================================================
ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.armada.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/armada.sql
-- Dependencies:  armada
-- ============================================================================
ALTER TABLE "public"."armada" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.attribute_types.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/attribute_types.sql
-- Dependencies:  attribute_types
-- ============================================================================
ALTER TABLE "public"."attribute_types" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.backup_customers.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/backup_customers.sql
-- Dependencies:  backup_customers
-- ============================================================================
ALTER TABLE "public"."backup_customers" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.backup_inventory.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/backup_inventory.sql
-- Dependencies:  backup_inventory
-- ============================================================================
ALTER TABLE "public"."backup_inventory" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.backup_products.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/backup_products.sql
-- Dependencies:  backup_products
-- ============================================================================
ALTER TABLE "public"."backup_products" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.btki_codes.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/btki_codes.sql
-- Dependencies:  btki_codes
-- ============================================================================
ALTER TABLE "public"."btki_codes" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cash_advances.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cash_advances.sql
-- Dependencies:  cash_advances
-- ============================================================================
ALTER TABLE "public"."cash_advances" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.chat_attachments.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_attachments.sql
-- Dependencies:  chat_attachments
-- ============================================================================
ALTER TABLE "public"."chat_attachments" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.chat_channels.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_channels.sql
-- Dependencies:  chat_channels
-- ============================================================================
ALTER TABLE "public"."chat_channels" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.chat_group_members.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  chat_group_members
-- ============================================================================
ALTER TABLE "public"."chat_group_members" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.chat_groups.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_groups.sql
-- Dependencies:  chat_groups
-- ============================================================================
ALTER TABLE "public"."chat_groups" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.chat_messages.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.chat_participants.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_participants.sql
-- Dependencies:  chat_participants
-- ============================================================================
ALTER TABLE "public"."chat_participants" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.commercial_capability_bindings.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/commercial_capability_bindings.sql
-- Dependencies:  commercial_capability_bindings
-- ============================================================================
ALTER TABLE "public"."commercial_capability_bindings" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.commercial_line_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/commercial_line_items.sql
-- Dependencies:  commercial_line_items
-- ============================================================================
ALTER TABLE "public"."commercial_line_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.commercial_service_scopes.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/commercial_service_scopes.sql
-- Dependencies:  commercial_service_scopes
-- ============================================================================
ALTER TABLE "public"."commercial_service_scopes" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.commercial_work_orders.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/commercial_work_orders.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
ALTER TABLE "public"."commercial_work_orders" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.companies.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/companies.sql
-- Dependencies:  companies
-- ============================================================================
ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.country_master.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/country_master.sql
-- Dependencies:  country_master
-- ============================================================================
ALTER TABLE "public"."country_master" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.crm_activities.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_activities.sql
-- Dependencies:  crm_activities
-- ============================================================================
ALTER TABLE "public"."crm_activities" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.crm_deals.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_deals.sql
-- Dependencies:  crm_deals
-- ============================================================================
ALTER TABLE "public"."crm_deals" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.crm_guest_links.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_guest_links.sql
-- Dependencies:  crm_guest_links
-- ============================================================================
ALTER TABLE "public"."crm_guest_links" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.crm_quotation_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_quotation_items.sql
-- Dependencies:  crm_quotation_items
-- ============================================================================
ALTER TABLE "public"."crm_quotation_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.crm_quotation_sections.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_quotation_sections.sql
-- Dependencies:  crm_quotation_sections
-- ============================================================================
ALTER TABLE "public"."crm_quotation_sections" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.crm_quotations.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_quotations.sql
-- Dependencies:  crm_quotations
-- ============================================================================
ALTER TABLE "public"."crm_quotations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.crm_sbu_customer_rates.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_sbu_customer_rates.sql
-- Dependencies:  crm_sbu_customer_rates
-- ============================================================================
ALTER TABLE "public"."crm_sbu_customer_rates" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cus_ceisa_preparations.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_ceisa_preparations.sql
-- Dependencies:  cus_ceisa_preparations
-- ============================================================================
ALTER TABLE "public"."cus_ceisa_preparations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cus_ceisa_validation_results.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_ceisa_validation_results.sql
-- Dependencies:  cus_ceisa_validation_results
-- ============================================================================
ALTER TABLE "public"."cus_ceisa_validation_results" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cus_classification_lines.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_classification_lines.sql
-- Dependencies:  cus_classification_lines
-- ============================================================================
ALTER TABLE "public"."cus_classification_lines" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cus_customs_decisions.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_customs_decisions.sql
-- Dependencies:  cus_customs_decisions
-- ============================================================================
ALTER TABLE "public"."cus_customs_decisions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cus_declaration_audit_events.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_declaration_audit_events.sql
-- Dependencies:  cus_declaration_audit_events
-- ============================================================================
ALTER TABLE "public"."cus_declaration_audit_events" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cus_declaration_documents.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_declaration_documents.sql
-- Dependencies:  cus_declaration_documents
-- ============================================================================
ALTER TABLE "public"."cus_declaration_documents" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cus_declaration_exceptions.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  cus_declaration_exceptions
-- ============================================================================
ALTER TABLE "public"."cus_declaration_exceptions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cus_declaration_validation_runs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_declaration_validation_runs.sql
-- Dependencies:  cus_declaration_validation_runs
-- ============================================================================
ALTER TABLE "public"."cus_declaration_validation_runs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cus_declarations.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  cus_declarations
-- ============================================================================
ALTER TABLE "public"."cus_declarations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cus_item_audit_logs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_item_audit_logs.sql
-- Dependencies:  cus_item_audit_logs
-- ============================================================================
ALTER TABLE "public"."cus_item_audit_logs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cus_sku_classification_history.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_sku_classification_history.sql
-- Dependencies:  cus_sku_classification_history
-- ============================================================================
ALTER TABLE "public"."cus_sku_classification_history" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.cus_sku_intelligence.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_sku_intelligence.sql
-- Dependencies:  cus_sku_intelligence
-- ============================================================================
ALTER TABLE "public"."cus_sku_intelligence" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.customer_requests.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/customer_requests.sql
-- Dependencies:  customer_requests
-- ============================================================================
ALTER TABLE "public"."customer_requests" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.customers.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/customers.sql
-- Dependencies:  customers
-- ============================================================================
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.debug_traces.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/debug_traces.sql
-- Dependencies:  debug_traces
-- ============================================================================
ALTER TABLE "public"."debug_traces" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.documents.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/documents.sql
-- Dependencies:  documents
-- ============================================================================
ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.driver_attendance.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/driver_attendance.sql
-- Dependencies:  driver_attendance
-- ============================================================================
ALTER TABLE "public"."driver_attendance" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.driver_kpi_history.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/driver_kpi_history.sql
-- Dependencies:  driver_kpi_history
-- ============================================================================
ALTER TABLE "public"."driver_kpi_history" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.driver_performance_logs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/driver_performance_logs.sql
-- Dependencies:  driver_performance_logs
-- ============================================================================
ALTER TABLE "public"."driver_performance_logs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.driver_profiles.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/driver_profiles.sql
-- Dependencies:  driver_profiles
-- ============================================================================
ALTER TABLE "public"."driver_profiles" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.driver_requests.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/driver_requests.sql
-- Dependencies:  driver_requests
-- ============================================================================
ALTER TABLE "public"."driver_requests" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.driver_resolution_audit_logs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/driver_resolution_audit_logs.sql
-- Dependencies:  driver_resolution_audit_logs
-- ============================================================================
ALTER TABLE "public"."driver_resolution_audit_logs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.driver_tenant_links.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/driver_tenant_links.sql
-- Dependencies:  driver_tenant_links
-- ============================================================================
ALTER TABLE "public"."driver_tenant_links" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.drivers.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/drivers.sql
-- Dependencies:  drivers
-- ============================================================================
ALTER TABLE "public"."drivers" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.event_consumption_log.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/event_consumption_log.sql
-- Dependencies:  event_consumption_log
-- ============================================================================
ALTER TABLE "public"."event_consumption_log" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.event_dead_letter.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/event_dead_letter.sql
-- Dependencies:  event_dead_letter
-- ============================================================================
ALTER TABLE "public"."event_dead_letter" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.event_outbox.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/event_outbox.sql
-- Dependencies:  event_outbox
-- ============================================================================
ALTER TABLE "public"."event_outbox" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.extra_costs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  extra_costs
-- ============================================================================
ALTER TABLE "public"."extra_costs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fin_adjustments.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_adjustments.sql
-- Dependencies:  fin_adjustments
-- ============================================================================
ALTER TABLE "public"."fin_adjustments" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fin_ar_ap.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_ar_ap.sql
-- Dependencies:  fin_ar_ap
-- ============================================================================
ALTER TABLE "public"."fin_ar_ap" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fin_billable_events.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_billable_events.sql
-- Dependencies:  fin_billable_events
-- ============================================================================
ALTER TABLE "public"."fin_billable_events" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fin_financial_ledger_entries.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_financial_ledger_entries.sql
-- Dependencies:  fin_financial_ledger_entries
-- ============================================================================
ALTER TABLE "public"."fin_financial_ledger_entries" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fin_invoice_lines.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_invoice_lines.sql
-- Dependencies:  fin_invoice_lines
-- ============================================================================
ALTER TABLE "public"."fin_invoice_lines" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fin_invoices.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_invoices.sql
-- Dependencies:  fin_invoices
-- ============================================================================
ALTER TABLE "public"."fin_invoices" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fin_payment_allocations.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_payment_allocations.sql
-- Dependencies:  fin_payment_allocations
-- ============================================================================
ALTER TABLE "public"."fin_payment_allocations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fin_payments.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_payments.sql
-- Dependencies:  fin_payments
-- ============================================================================
ALTER TABLE "public"."fin_payments" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fin_reconciliation_records.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_reconciliation_records.sql
-- Dependencies:  fin_reconciliation_records
-- ============================================================================
ALTER TABLE "public"."fin_reconciliation_records" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fin_settlements.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_settlements.sql
-- Dependencies:  fin_settlements
-- ============================================================================
ALTER TABLE "public"."fin_settlements" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.finance_coa.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/finance_coa.sql
-- Dependencies:  finance_coa
-- ============================================================================
ALTER TABLE "public"."finance_coa" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.finance_journal_entries.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/finance_journal_entries.sql
-- Dependencies:  finance_journal_entries
-- ============================================================================
ALTER TABLE "public"."finance_journal_entries" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.finance_journals.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/finance_journals.sql
-- Dependencies:  finance_journals
-- ============================================================================
ALTER TABLE "public"."finance_journals" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.finance_transactions.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/finance_transactions.sql
-- Dependencies:  finance_transactions
-- ============================================================================
ALTER TABLE "public"."finance_transactions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fleet_driver_history.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fleet_driver_history.sql
-- Dependencies:  fleet_driver_history
-- ============================================================================
ALTER TABLE "public"."fleet_driver_history" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fleet_gps_status.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fleet_gps_status.sql
-- Dependencies:  fleet_gps_status
-- ============================================================================
ALTER TABLE "public"."fleet_gps_status" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fleet_inspections.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fleet_inspections.sql
-- Dependencies:  fleet_inspections
-- ============================================================================
ALTER TABLE "public"."fleet_inspections" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fleets.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fleets.sql
-- Dependencies:  fleets
-- ============================================================================
ALTER TABLE "public"."fleets" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fw_consolidation_manifest.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_consolidation_manifest.sql
-- Dependencies:  fw_consolidation_manifest
-- ============================================================================
ALTER TABLE "public"."fw_consolidation_manifest" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fw_consolidations.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_consolidations.sql
-- Dependencies:  fw_consolidations
-- ============================================================================
ALTER TABLE "public"."fw_consolidations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fw_container_assignments.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_container_assignments.sql
-- Dependencies:  fw_container_assignments
-- ============================================================================
ALTER TABLE "public"."fw_container_assignments" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fw_container_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  fw_container_items
-- ============================================================================
ALTER TABLE "public"."fw_container_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fw_hs_codes.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_hs_codes.sql
-- Dependencies:  fw_hs_codes
-- ============================================================================
ALTER TABLE "public"."fw_hs_codes" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fw_legs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_legs.sql
-- Dependencies:  fw_legs
-- ============================================================================
ALTER TABLE "public"."fw_legs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fw_order_headers.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_order_headers.sql
-- Dependencies:  fw_order_headers
-- ============================================================================
ALTER TABLE "public"."fw_order_headers" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.fw_price_master.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_price_master.sql
-- Dependencies:  fw_price_master
-- ============================================================================
ALTER TABLE "public"."fw_price_master" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.general_ledger.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/general_ledger.sql
-- Dependencies:  general_ledger
-- ============================================================================
ALTER TABLE "public"."general_ledger" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.geofence_events.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/geofence_events.sql
-- Dependencies:  geofence_events
-- ============================================================================
ALTER TABLE "public"."geofence_events" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.geofence_zones.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/geofence_zones.sql
-- Dependencies:  geofence_zones
-- ============================================================================
ALTER TABLE "public"."geofence_zones" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.gps_provider_configs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/gps_provider_configs.sql
-- Dependencies:  gps_provider_configs
-- ============================================================================
ALTER TABLE "public"."gps_provider_configs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.ground_assignment_pics.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/ground_assignment_pics.sql
-- Dependencies:  ground_assignment_pics
-- ============================================================================
ALTER TABLE "public"."ground_assignment_pics" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.ground_documents.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/ground_documents.sql
-- Dependencies:  ground_documents
-- ============================================================================
ALTER TABLE "public"."ground_documents" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.ground_event_types.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/ground_event_types.sql
-- Dependencies:  ground_event_types
-- ============================================================================
ALTER TABLE "public"."ground_event_types" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.ground_events.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/ground_events.sql
-- Dependencies:  ground_events
-- ============================================================================
ALTER TABLE "public"."ground_events" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.ground_sites.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/ground_sites.sql
-- Dependencies:  ground_sites
-- ============================================================================
ALTER TABLE "public"."ground_sites" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.ground_staff_profiles.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/ground_staff_profiles.sql
-- Dependencies:  ground_staff_profiles
-- ============================================================================
ALTER TABLE "public"."ground_staff_profiles" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.hs_agent_config.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/hs_agent_config.sql
-- Dependencies:  hs_agent_config
-- ============================================================================
ALTER TABLE "public"."hs_agent_config" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.hs_job_tracking.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/hs_job_tracking.sql
-- Dependencies:  hs_job_tracking
-- ============================================================================
ALTER TABLE "public"."hs_job_tracking" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.inbound_headers.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/inbound_headers.sql
-- Dependencies:  inbound_headers
-- ============================================================================
ALTER TABLE "public"."inbound_headers" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.intr_endpoint_cache.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/intr_endpoint_cache.sql
-- Dependencies:  intr_endpoint_cache
-- ============================================================================
ALTER TABLE "public"."intr_endpoint_cache" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.intr_test_log.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/intr_test_log.sql
-- Dependencies:  intr_test_log
-- ============================================================================
ALTER TABLE "public"."intr_test_log" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.inventory.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/inventory.sql
-- Dependencies:  inventory
-- ============================================================================
ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.inventory_movement_history.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/inventory_movement_history.sql
-- Dependencies:  inventory_movement_history
-- ============================================================================
ALTER TABLE "public"."inventory_movement_history" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.inventory_movements.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/inventory_movements.sql
-- Dependencies:  inventory_movements
-- ============================================================================
ALTER TABLE "public"."inventory_movements" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.invoice_line_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/invoice_line_items.sql
-- Dependencies:  invoice_line_items
-- ============================================================================
ALTER TABLE "public"."invoice_line_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.invoice_lines.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/invoice_lines.sql
-- Dependencies:  invoice_lines
-- ============================================================================
ALTER TABLE "public"."invoice_lines" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.invoices.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  invoices
-- ============================================================================
ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.jo_warehouse_assignments.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/jo_warehouse_assignments.sql
-- Dependencies:  jo_warehouse_assignments
-- ============================================================================
ALTER TABLE "public"."jo_warehouse_assignments" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.job_order_payments.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_order_payments.sql
-- Dependencies:  job_order_payments
-- ============================================================================
ALTER TABLE "public"."job_order_payments" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.job_orders.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
ALTER TABLE "public"."job_orders" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.job_routes.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_routes.sql
-- Dependencies:  job_routes
-- ============================================================================
ALTER TABLE "public"."job_routes" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.job_status_history.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_status_history.sql
-- Dependencies:  job_status_history
-- ============================================================================
ALTER TABLE "public"."job_status_history" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.job_tracking.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_tracking.sql
-- Dependencies:  job_tracking
-- ============================================================================
ALTER TABLE "public"."job_tracking" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.locations.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/locations.sql
-- Dependencies:  locations
-- ============================================================================
ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.master_contacts.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/master_contacts.sql
-- Dependencies:  master_contacts
-- ============================================================================
ALTER TABLE "public"."master_contacts" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_bill_of_materials.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_bill_of_materials.sql
-- Dependencies:  md_bill_of_materials
-- ============================================================================
ALTER TABLE "public"."md_bill_of_materials" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_billing_rates.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_billing_rates.sql
-- Dependencies:  md_billing_rates
-- ============================================================================
ALTER TABLE "public"."md_billing_rates" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_bom_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_bom_items.sql
-- Dependencies:  md_bom_items
-- ============================================================================
ALTER TABLE "public"."md_bom_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_contacts.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_contacts.sql
-- Dependencies:  md_contacts
-- ============================================================================
ALTER TABLE "public"."md_contacts" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_contract_warehouses.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_contract_warehouses.sql
-- Dependencies:  md_contract_warehouses
-- ============================================================================
ALTER TABLE "public"."md_contract_warehouses" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_customer_users.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_customer_users.sql
-- Dependencies:  md_customer_users
-- ============================================================================
ALTER TABLE "public"."md_customer_users" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_customs_hs_codes.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_customs_hs_codes.sql
-- Dependencies:  md_customs_hs_codes
-- ============================================================================
ALTER TABLE "public"."md_customs_hs_codes" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_driver_allowances.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_driver_allowances.sql
-- Dependencies:  md_driver_allowances
-- ============================================================================
ALTER TABLE "public"."md_driver_allowances" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_drivers.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  md_drivers
-- ============================================================================
ALTER TABLE "public"."md_drivers" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_entities.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  md_entities
-- ============================================================================
ALTER TABLE "public"."md_entities" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_entity_addresses.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_entity_addresses.sql
-- Dependencies:  md_entity_addresses
-- ============================================================================
ALTER TABLE "public"."md_entity_addresses" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_fleet_master.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_fleet_master.sql
-- Dependencies:  md_fleet_master
-- ============================================================================
ALTER TABLE "public"."md_fleet_master" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_fleet_types.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_fleet_types.sql
-- Dependencies:  md_fleet_types
-- ============================================================================
ALTER TABLE "public"."md_fleet_types" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_fleets.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  md_fleets
-- ============================================================================
ALTER TABLE "public"."md_fleets" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_locations.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_locations.sql
-- Dependencies:  md_locations
-- ============================================================================
ALTER TABLE "public"."md_locations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_product_categories.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_product_categories.sql
-- Dependencies:  md_product_categories
-- ============================================================================
ALTER TABLE "public"."md_product_categories" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_product_skus.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  md_product_skus
-- ============================================================================
ALTER TABLE "public"."md_product_skus" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_services.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_services.sql
-- Dependencies:  md_services
-- ============================================================================
ALTER TABLE "public"."md_services" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_storage_contracts.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_storage_contracts.sql
-- Dependencies:  md_storage_contracts
-- ============================================================================
ALTER TABLE "public"."md_storage_contracts" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_taxes.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_taxes.sql
-- Dependencies:  md_taxes
-- ============================================================================
ALTER TABLE "public"."md_taxes" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_tenants.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_tenants.sql
-- Dependencies:  md_tenants
-- ============================================================================
ALTER TABLE "public"."md_tenants" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_transporter_drivers.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_transporter_drivers.sql
-- Dependencies:  md_transporter_drivers
-- ============================================================================
ALTER TABLE "public"."md_transporter_drivers" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_transporter_fleets.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_transporter_fleets.sql
-- Dependencies:  md_transporter_fleets
-- ============================================================================
ALTER TABLE "public"."md_transporter_fleets" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_transporters.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_transporters.sql
-- Dependencies:  md_transporters
-- ============================================================================
ALTER TABLE "public"."md_transporters" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_trucking_regions.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_trucking_regions.sql
-- Dependencies:  md_trucking_regions
-- ============================================================================
ALTER TABLE "public"."md_trucking_regions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_uoms.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_uoms.sql
-- Dependencies:  md_uoms
-- ============================================================================
ALTER TABLE "public"."md_uoms" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_vehicle_types.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_vehicle_types.sql
-- Dependencies:  md_vehicle_types
-- ============================================================================
ALTER TABLE "public"."md_vehicle_types" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_warehouse_areas.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_warehouse_areas.sql
-- Dependencies:  md_warehouse_areas
-- ============================================================================
ALTER TABLE "public"."md_warehouse_areas" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_warehouse_locations.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_warehouse_locations.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
ALTER TABLE "public"."md_warehouse_locations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_warehouse_staff.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_warehouse_staff.sql
-- Dependencies:  md_warehouse_staff
-- ============================================================================
ALTER TABLE "public"."md_warehouse_staff" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_warehouse_zones.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_warehouse_zones.sql
-- Dependencies:  md_warehouse_zones
-- ============================================================================
ALTER TABLE "public"."md_warehouse_zones" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.md_warehouses.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_warehouses.sql
-- Dependencies:  md_warehouses
-- ============================================================================
ALTER TABLE "public"."md_warehouses" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.monitoring_checks.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/monitoring_checks.sql
-- Dependencies:  monitoring_checks
-- ============================================================================
ALTER TABLE "public"."monitoring_checks" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.notifications.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/notifications.sql
-- Dependencies:  notifications
-- ============================================================================
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.party_contacts.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/party_contacts.sql
-- Dependencies:  party_contacts
-- ============================================================================
ALTER TABLE "public"."party_contacts" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.party_locations.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/party_locations.sql
-- Dependencies:  party_locations
-- ============================================================================
ALTER TABLE "public"."party_locations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.party_relationships.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/party_relationships.sql
-- Dependencies:  party_relationships
-- ============================================================================
ALTER TABLE "public"."party_relationships" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.party_roles.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  party_roles
-- ============================================================================
ALTER TABLE "public"."party_roles" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.pricing_rate_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/pricing_rate_items.sql
-- Dependencies:  pricing_rate_items
-- ============================================================================
ALTER TABLE "public"."pricing_rate_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.pricing_rate_versions.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/pricing_rate_versions.sql
-- Dependencies:  pricing_rate_versions
-- ============================================================================
ALTER TABLE "public"."pricing_rate_versions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.pricing_rates.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/pricing_rates.sql
-- Dependencies:  pricing_rates
-- ============================================================================
ALTER TABLE "public"."pricing_rates" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.profiles.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/profiles.sql
-- Dependencies:  profiles
-- ============================================================================
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.putaway_assignments.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/putaway_assignments.sql
-- Dependencies:  putaway_assignments
-- ============================================================================
ALTER TABLE "public"."putaway_assignments" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.reset_password_requests.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/reset_password_requests.sql
-- Dependencies:  reset_password_requests
-- ============================================================================
ALTER TABLE "public"."reset_password_requests" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.roles.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/roles.sql
-- Dependencies:  roles
-- ============================================================================
ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.sales_order_line_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sales_order_line_items.sql
-- Dependencies:  sales_order_line_items
-- ============================================================================
ALTER TABLE "public"."sales_order_line_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.sales_orders.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sales_orders.sql
-- Dependencies:  sales_orders
-- ============================================================================
ALTER TABLE "public"."sales_orders" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.sbu_token_rates.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sbu_token_rates.sql
-- Dependencies:  sbu_token_rates
-- ============================================================================
ALTER TABLE "public"."sbu_token_rates" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.sbu_token_transactions.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sbu_token_transactions.sql
-- Dependencies:  sbu_token_transactions
-- ============================================================================
ALTER TABLE "public"."sbu_token_transactions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shipment_status_history.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shipment_status_history.sql
-- Dependencies:  shipment_status_history
-- ============================================================================
ALTER TABLE "public"."shipment_status_history" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shippers.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shippers.sql
-- Dependencies:  shippers
-- ============================================================================
ALTER TABLE "public"."shippers" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shp_exceptions.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_exceptions.sql
-- Dependencies:  shp_exceptions
-- ============================================================================
ALTER TABLE "public"."shp_exceptions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shp_execution_legs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_execution_legs.sql
-- Dependencies:  shp_execution_legs
-- ============================================================================
ALTER TABLE "public"."shp_execution_legs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shp_execution_plans.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_execution_plans.sql
-- Dependencies:  shp_execution_plans
-- ============================================================================
ALTER TABLE "public"."shp_execution_plans" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shp_leg_units.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_leg_units.sql
-- Dependencies:  shp_leg_units
-- ============================================================================
ALTER TABLE "public"."shp_leg_units" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shp_manifest_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_manifest_items.sql
-- Dependencies:  shp_manifest_items
-- ============================================================================
ALTER TABLE "public"."shp_manifest_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shp_milestones.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_milestones.sql
-- Dependencies:  shp_milestones
-- ============================================================================
ALTER TABLE "public"."shp_milestones" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shp_shipments.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  shp_shipments
-- ============================================================================
ALTER TABLE "public"."shp_shipments" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shp_unit_bulk.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_unit_bulk.sql
-- Dependencies:  shp_unit_bulk
-- ============================================================================
ALTER TABLE "public"."shp_unit_bulk" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shp_unit_containers.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_unit_containers.sql
-- Dependencies:  shp_unit_containers
-- ============================================================================
ALTER TABLE "public"."shp_unit_containers" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shp_unit_packages.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_unit_packages.sql
-- Dependencies:  shp_unit_packages
-- ============================================================================
ALTER TABLE "public"."shp_unit_packages" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shp_unit_vehicles.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_unit_vehicles.sql
-- Dependencies:  shp_unit_vehicles
-- ============================================================================
ALTER TABLE "public"."shp_unit_vehicles" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.shp_units.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_units.sql
-- Dependencies:  shp_units
-- ============================================================================
ALTER TABLE "public"."shp_units" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.sla_daily_snapshots.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sla_daily_snapshots.sql
-- Dependencies:  sla_daily_snapshots
-- ============================================================================
ALTER TABLE "public"."sla_daily_snapshots" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.sla_escalations.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sla_escalations.sql
-- Dependencies:  sla_escalations
-- ============================================================================
ALTER TABLE "public"."sla_escalations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.staff.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/staff.sql
-- Dependencies:  staff
-- ============================================================================
ALTER TABLE "public"."staff" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.storage_areas.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/storage_areas.sql
-- Dependencies:  storage_areas
-- ============================================================================
ALTER TABLE "public"."storage_areas" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.storage_locations.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/storage_locations.sql
-- Dependencies:  storage_locations
-- ============================================================================
ALTER TABLE "public"."storage_locations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.storage_zones.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/storage_zones.sql
-- Dependencies:  storage_zones
-- ============================================================================
ALTER TABLE "public"."storage_zones" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.svc_service_requests.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/svc_service_requests.sql
-- Dependencies:  svc_service_requests
-- ============================================================================
ALTER TABLE "public"."svc_service_requests" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.tax_rates.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tax_rates.sql
-- Dependencies:  tax_rates
-- ============================================================================
ALTER TABLE "public"."tax_rates" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.tenant_roles.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenant_roles.sql
-- Dependencies:  tenant_roles
-- ============================================================================
ALTER TABLE "public"."tenant_roles" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.tenant_sbus.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenant_sbus.sql
-- Dependencies:  tenant_sbus
-- ============================================================================
ALTER TABLE "public"."tenant_sbus" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.tenant_users.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  tenant_users
-- ============================================================================
ALTER TABLE "public"."tenant_users" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.tenants.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  tenants
-- ============================================================================
ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.token_price_history.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/token_price_history.sql
-- Dependencies:  token_price_history
-- ============================================================================
ALTER TABLE "public"."token_price_history" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.token_prices.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/token_prices.sql
-- Dependencies:  token_prices
-- ============================================================================
ALTER TABLE "public"."token_prices" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.token_transactions.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/token_transactions.sql
-- Dependencies:  token_transactions
-- ============================================================================
ALTER TABLE "public"."token_transactions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.topup_requests.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/topup_requests.sql
-- Dependencies:  topup_requests
-- ============================================================================
ALTER TABLE "public"."topup_requests" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.tracking_points.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tracking_points.sql
-- Dependencies:  tracking_points
-- ============================================================================
ALTER TABLE "public"."tracking_points" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.tracking_sessions.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tracking_sessions.sql
-- Dependencies:  tracking_sessions
-- ============================================================================
ALTER TABLE "public"."tracking_sessions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.tracking_updates.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tracking_updates.sql
-- Dependencies:  tracking_updates
-- ============================================================================
ALTER TABLE "public"."tracking_updates" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.transporters.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/transporters.sql
-- Dependencies:  transporters
-- ============================================================================
ALTER TABLE "public"."transporters" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.truck_types.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/truck_types.sql
-- Dependencies:  truck_types
-- ============================================================================
ALTER TABLE "public"."truck_types" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.user_roles.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/user_roles.sql
-- Dependencies:  user_roles
-- ============================================================================
ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.vendor_invoices.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/vendor_invoices.sql
-- Dependencies:  vendor_invoices
-- ============================================================================
ALTER TABLE "public"."vendor_invoices" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.warehouse_staff_attendance.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/warehouse_staff_attendance.sql
-- Dependencies:  warehouse_staff_attendance
-- ============================================================================
ALTER TABLE "public"."warehouse_staff_attendance" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.warehouse_users.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/warehouse_users.sql
-- Dependencies:  warehouse_users
-- ============================================================================
ALTER TABLE "public"."warehouse_users" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.warehouses.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/warehouses.sql
-- Dependencies:  warehouses
-- ============================================================================
ALTER TABLE "public"."warehouses" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_billing_invoice_details.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_billing_invoice_details.sql
-- Dependencies:  wh_billing_invoice_details
-- ============================================================================
ALTER TABLE "public"."wh_billing_invoice_details" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_billing_invoices.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_billing_invoices.sql
-- Dependencies:  wh_billing_invoices
-- ============================================================================
ALTER TABLE "public"."wh_billing_invoices" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_daily_stock_snapshots.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_daily_stock_snapshots.sql
-- Dependencies:  wh_daily_stock_snapshots
-- ============================================================================
ALTER TABLE "public"."wh_daily_stock_snapshots" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_inbound_damage_records.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inbound_damage_records.sql
-- Dependencies:  wh_inbound_damage_records
-- ============================================================================
ALTER TABLE "public"."wh_inbound_damage_records" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_inbound_receipt_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inbound_receipt_items.sql
-- Dependencies:  wh_inbound_receipt_items
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipt_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_inbound_receipts.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  wh_inbound_receipts
-- ============================================================================
ALTER TABLE "public"."wh_inbound_receipts" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_internal_movements.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  wh_internal_movements
-- ============================================================================
ALTER TABLE "public"."wh_internal_movements" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_inventory.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
ALTER TABLE "public"."wh_inventory" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_inventory_movements.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inventory_movements.sql
-- Dependencies:  wh_inventory_movements
-- ============================================================================
ALTER TABLE "public"."wh_inventory_movements" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_items.sql
-- Dependencies:  wh_items
-- ============================================================================
ALTER TABLE "public"."wh_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_jo_staff_assignments.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_jo_staff_assignments.sql
-- Dependencies:  wh_jo_staff_assignments
-- ============================================================================
ALTER TABLE "public"."wh_jo_staff_assignments" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_loading_sessions.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_loading_sessions.sql
-- Dependencies:  wh_loading_sessions
-- ============================================================================
ALTER TABLE "public"."wh_loading_sessions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_master_boxes.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_master_boxes.sql
-- Dependencies:  wh_master_boxes
-- ============================================================================
ALTER TABLE "public"."wh_master_boxes" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_milestone_logs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_milestone_logs.sql
-- Dependencies:  wh_milestone_logs
-- ============================================================================
ALTER TABLE "public"."wh_milestone_logs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_outbound_damage_records.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_outbound_damage_records.sql
-- Dependencies:  wh_outbound_damage_records
-- ============================================================================
ALTER TABLE "public"."wh_outbound_damage_records" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_outbound_shipment_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_outbound_shipment_items.sql
-- Dependencies:  wh_outbound_shipment_items
-- ============================================================================
ALTER TABLE "public"."wh_outbound_shipment_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_outbound_shipments.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  wh_outbound_shipments
-- ============================================================================
ALTER TABLE "public"."wh_outbound_shipments" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_packages.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_packages.sql
-- Dependencies:  wh_packages
-- ============================================================================
ALTER TABLE "public"."wh_packages" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_pallets.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_pallets.sql
-- Dependencies:  wh_pallets
-- ============================================================================
ALTER TABLE "public"."wh_pallets" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_parcel_inbound.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_parcel_inbound.sql
-- Dependencies:  wh_parcel_inbound
-- ============================================================================
ALTER TABLE "public"."wh_parcel_inbound" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_picking_details.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_picking_details.sql
-- Dependencies:  wh_picking_details
-- ============================================================================
ALTER TABLE "public"."wh_picking_details" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_picking_lists.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_picking_lists.sql
-- Dependencies:  wh_picking_lists
-- ============================================================================
ALTER TABLE "public"."wh_picking_lists" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_receipt_details.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_receipt_details.sql
-- Dependencies:  wh_receipt_details
-- ============================================================================
ALTER TABLE "public"."wh_receipt_details" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_receipt_orders.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_receipt_orders.sql
-- Dependencies:  wh_receipt_orders
-- ============================================================================
ALTER TABLE "public"."wh_receipt_orders" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_repacking_conversions.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  wh_repacking_conversions
-- ============================================================================
ALTER TABLE "public"."wh_repacking_conversions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_repacking_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  wh_repacking_items
-- ============================================================================
ALTER TABLE "public"."wh_repacking_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_repacking_orders.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
ALTER TABLE "public"."wh_repacking_orders" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_staff_attendance.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_staff_attendance.sql
-- Dependencies:  wh_staff_attendance
-- ============================================================================
ALTER TABLE "public"."wh_staff_attendance" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_task_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_task_items.sql
-- Dependencies:  wh_task_items
-- ============================================================================
ALTER TABLE "public"."wh_task_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_tasks.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_tasks.sql
-- Dependencies:  wh_tasks
-- ============================================================================
ALTER TABLE "public"."wh_tasks" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_temperature_alerts.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_temperature_alerts.sql
-- Dependencies:  wh_temperature_alerts
-- ============================================================================
ALTER TABLE "public"."wh_temperature_alerts" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_temperature_logs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_temperature_logs.sql
-- Dependencies:  wh_temperature_logs
-- ============================================================================
ALTER TABLE "public"."wh_temperature_logs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_transfer_details.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_transfer_details.sql
-- Dependencies:  wh_transfer_details
-- ============================================================================
ALTER TABLE "public"."wh_transfer_details" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_transfer_orders.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_transfer_orders.sql
-- Dependencies:  wh_transfer_orders
-- ============================================================================
ALTER TABLE "public"."wh_transfer_orders" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_transformation_components.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_transformation_components.sql
-- Dependencies:  wh_transformation_components
-- ============================================================================
ALTER TABLE "public"."wh_transformation_components" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_transformation_orders.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_transformation_orders.sql
-- Dependencies:  wh_transformation_orders
-- ============================================================================
ALTER TABLE "public"."wh_transformation_orders" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_transformation_outputs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_transformation_outputs.sql
-- Dependencies:  wh_transformation_outputs
-- ============================================================================
ALTER TABLE "public"."wh_transformation_outputs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_unloading_sessions.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_unloading_sessions.sql
-- Dependencies:  wh_unloading_sessions
-- ============================================================================
ALTER TABLE "public"."wh_unloading_sessions" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_vas_orders.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_vas_orders.sql
-- Dependencies:  wh_vas_orders
-- ============================================================================
ALTER TABLE "public"."wh_vas_orders" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wh_wa_notifications.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_wa_notifications.sql
-- Dependencies:  wh_wa_notifications
-- ============================================================================
ALTER TABLE "public"."wh_wa_notifications" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_audit_logs.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_audit_logs.sql
-- Dependencies:  wo_audit_logs
-- ============================================================================
ALTER TABLE "public"."wo_audit_logs" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_inventory_ledger.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_inventory_ledger.sql
-- Dependencies:  wo_inventory_ledger
-- ============================================================================
ALTER TABLE "public"."wo_inventory_ledger" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_item_manifests.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_item_manifests.sql
-- Dependencies:  wo_item_manifests
-- ============================================================================
ALTER TABLE "public"."wo_item_manifests" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_items.sql
-- Dependencies:  wo_items
-- ============================================================================
ALTER TABLE "public"."wo_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_job_order_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_job_order_items.sql
-- Dependencies:  wo_job_order_items
-- ============================================================================
ALTER TABLE "public"."wo_job_order_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_job_orders.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_job_orders
-- ============================================================================
ALTER TABLE "public"."wo_job_orders" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_monitoring_events.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_monitoring_events.sql
-- Dependencies:  wo_monitoring_events
-- ============================================================================
ALTER TABLE "public"."wo_monitoring_events" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_organization_users.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_organization_users.sql
-- Dependencies:  wo_organization_users
-- ============================================================================
ALTER TABLE "public"."wo_organization_users" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_organizations.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_organizations.sql
-- Dependencies:  wo_organizations
-- ============================================================================
ALTER TABLE "public"."wo_organizations" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_status_history.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_status_history.sql
-- Dependencies:  wo_status_history
-- ============================================================================
ALTER TABLE "public"."wo_status_history" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_work_order_items.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_work_order_items.sql
-- Dependencies:  wo_work_order_items
-- ============================================================================
ALTER TABLE "public"."wo_work_order_items" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_work_orders.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_work_orders
-- ============================================================================
ALTER TABLE "public"."wo_work_orders" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.wo_workflow_instances.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_workflow_instances.sql
-- Dependencies:  wo_workflow_instances
-- ============================================================================
ALTER TABLE "public"."wo_workflow_instances" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Object:        public.work_orders.enable_rls
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders
-- ============================================================================
ALTER TABLE "public"."work_orders" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- SECTION 2: ACCESS POLICIES (333 policies)
-- ----------------------------------------------------------------------------

-- ============================================================================
-- Object:        public.accounting_event_lines.accounting_event_lines_policy_accounting_lines_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/accounting_event_lines.sql
-- Dependencies:  accounting_event_lines
-- ============================================================================
CREATE POLICY "accounting_lines_tenant_isolation" ON "public"."accounting_event_lines"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.accounting_events.accounting_events_policy_accounting_events_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/accounting_events.sql
-- Dependencies:  accounting_events
-- ============================================================================
CREATE POLICY "accounting_events_tenant_isolation" ON "public"."accounting_events"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.accounting_providers.accounting_providers_policy_accounting_providers_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/accounting_providers.sql
-- Dependencies:  accounting_providers
-- ============================================================================
CREATE POLICY "accounting_providers_tenant_isolation" ON "public"."accounting_providers"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.add_costs.add_costs_policy_Allow full access to add_costs for authenticated users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/add_costs.sql
-- Dependencies:  add_costs
-- ============================================================================
CREATE POLICY "Allow full access to add_costs for authenticated users" ON "public"."add_costs"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.add_costs.add_costs_policy_sbu_finance_all_add_costs
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/add_costs.sql
-- Dependencies:  add_costs
-- ============================================================================
CREATE POLICY "sbu_finance_all_add_costs" ON "public"."add_costs"
  FOR ALL
  TO PUBLIC
  USING (((( SELECT tenant_users.role_code
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid())))::text = 'sbu_finance_tr'::text));

-- ============================================================================
-- Object:        public.add_costs.add_costs_policy_sbu_finance_insert_add_costs
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/add_costs.sql
-- Dependencies:  add_costs
-- ============================================================================
CREATE POLICY "sbu_finance_insert_add_costs" ON "public"."add_costs"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((( SELECT tenant_users.role_code
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid())))::text = 'sbu_finance_tr'::text));

-- ============================================================================
-- Object:        public.cash_advances.cash_advances_policy_Allow authenticated full access to cash_advances
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cash_advances.sql
-- Dependencies:  cash_advances
-- ============================================================================
CREATE POLICY "Allow authenticated full access to cash_advances" ON "public"."cash_advances"
  FOR ALL
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.chat_attachments.chat_attachments_policy_chat_attachments_delete
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_attachments.sql
-- Dependencies:  chat_attachments
-- ============================================================================
CREATE POLICY "chat_attachments_delete" ON "public"."chat_attachments"
  FOR DELETE
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.chat_attachments.chat_attachments_policy_chat_attachments_insert
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_attachments.sql
-- Dependencies:  chat_attachments
-- ============================================================================
CREATE POLICY "chat_attachments_insert" ON "public"."chat_attachments"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.chat_attachments.chat_attachments_policy_chat_attachments_insert_sender
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_attachments.sql
-- Dependencies:  chat_attachments
-- ============================================================================
CREATE POLICY "chat_attachments_insert_sender" ON "public"."chat_attachments"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_messages cm
  WHERE ((cm.id = chat_attachments.message_id) AND (cm.sender_id = auth.uid())))));

-- ============================================================================
-- Object:        public.chat_attachments.chat_attachments_policy_chat_attachments_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_attachments.sql
-- Dependencies:  chat_attachments
-- ============================================================================
CREATE POLICY "chat_attachments_select" ON "public"."chat_attachments"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.chat_attachments.chat_attachments_policy_chat_attachments_select_participant
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_attachments.sql
-- Dependencies:  chat_attachments
-- ============================================================================
CREATE POLICY "chat_attachments_select_participant" ON "public"."chat_attachments"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM (public.chat_messages cm
     JOIN public.chat_channels cc ON ((cm.channel_id = cc.id)))
  WHERE ((cm.id = chat_attachments.message_id) AND (EXISTS ( SELECT 1
           FROM public.chat_participants cp
          WHERE ((cp.channel_id = cc.id) AND (cp.user_id = auth.uid()))))))));

-- ============================================================================
-- Object:        public.chat_attachments.chat_attachments_policy_chat_attachments_update
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_attachments.sql
-- Dependencies:  chat_attachments
-- ============================================================================
CREATE POLICY "chat_attachments_update" ON "public"."chat_attachments"
  FOR UPDATE
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.chat_channels.chat_channels_policy_chat_channels_delete
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_channels.sql
-- Dependencies:  chat_channels
-- ============================================================================
CREATE POLICY "chat_channels_delete" ON "public"."chat_channels"
  FOR DELETE
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.chat_channels.chat_channels_policy_chat_channels_insert
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_channels.sql
-- Dependencies:  chat_channels
-- ============================================================================
CREATE POLICY "chat_channels_insert" ON "public"."chat_channels"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.chat_channels.chat_channels_policy_chat_channels_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_channels.sql
-- Dependencies:  chat_channels
-- ============================================================================
CREATE POLICY "chat_channels_select" ON "public"."chat_channels"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.chat_channels.chat_channels_policy_chat_channels_update
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_channels.sql
-- Dependencies:  chat_channels
-- ============================================================================
CREATE POLICY "chat_channels_update" ON "public"."chat_channels"
  FOR UPDATE
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.chat_group_members.chat_group_members_policy_chat_group_members_delete
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  chat_group_members
-- ============================================================================
CREATE POLICY "chat_group_members_delete" ON "public"."chat_group_members"
  FOR DELETE
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.chat_group_members.chat_group_members_policy_chat_group_members_delete_admin
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  chat_group_members
-- ============================================================================
CREATE POLICY "chat_group_members_delete_admin" ON "public"."chat_group_members"
  FOR DELETE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.chat_group_members gm
  WHERE ((gm.group_id = chat_group_members.group_id) AND (gm.user_id = auth.uid()) AND (gm.role = 'admin'::text)))));

-- ============================================================================
-- Object:        public.chat_group_members.chat_group_members_policy_chat_group_members_insert
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  chat_group_members
-- ============================================================================
CREATE POLICY "chat_group_members_insert" ON "public"."chat_group_members"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.chat_group_members.chat_group_members_policy_chat_group_members_insert_member
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  chat_group_members
-- ============================================================================
CREATE POLICY "chat_group_members_insert_member" ON "public"."chat_group_members"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((group_id IN ( SELECT chat_groups.id
   FROM public.chat_groups
  WHERE (chat_groups.tenant_id = public.fn_get_user_tenant_id()))));

-- ============================================================================
-- Object:        public.chat_group_members.chat_group_members_policy_chat_group_members_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  chat_group_members
-- ============================================================================
CREATE POLICY "chat_group_members_select" ON "public"."chat_group_members"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.chat_group_members.chat_group_members_policy_chat_group_members_select_member
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  chat_group_members
-- ============================================================================
CREATE POLICY "chat_group_members_select_member" ON "public"."chat_group_members"
  FOR SELECT
  TO PUBLIC
  USING ((group_id IN ( SELECT chat_groups.id
   FROM public.chat_groups
  WHERE (chat_groups.tenant_id = public.fn_get_user_tenant_id()))));

-- ============================================================================
-- Object:        public.chat_group_members.chat_group_members_policy_chat_group_members_update
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_group_members.sql
-- Dependencies:  chat_group_members
-- ============================================================================
CREATE POLICY "chat_group_members_update" ON "public"."chat_group_members"
  FOR UPDATE
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.chat_groups.chat_groups_policy_chat_groups_insert_tenant
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_groups.sql
-- Dependencies:  chat_groups
-- ============================================================================
CREATE POLICY "chat_groups_insert_tenant" ON "public"."chat_groups"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((tenant_id = public.fn_get_user_tenant_id()));

-- ============================================================================
-- Object:        public.chat_groups.chat_groups_policy_chat_groups_select_member
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_groups.sql
-- Dependencies:  chat_groups
-- ============================================================================
CREATE POLICY "chat_groups_select_member" ON "public"."chat_groups"
  FOR SELECT
  TO PUBLIC
  USING ((tenant_id = public.fn_get_user_tenant_id()));

-- ============================================================================
-- Object:        public.chat_groups.chat_groups_policy_chat_groups_update_admin
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_groups.sql
-- Dependencies:  chat_groups
-- ============================================================================
CREATE POLICY "chat_groups_update_admin" ON "public"."chat_groups"
  FOR UPDATE
  TO PUBLIC
  USING (((EXISTS ( SELECT 1
   FROM public.chat_group_members
  WHERE ((chat_group_members.group_id = chat_groups.id) AND (chat_group_members.user_id = auth.uid()) AND (chat_group_members.role = 'admin'::text)))) OR
    (created_by = auth.uid())));

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_policy_chat_messages_delete
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
CREATE POLICY "chat_messages_delete" ON "public"."chat_messages"
  FOR DELETE
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_policy_chat_messages_delete_own
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
CREATE POLICY "chat_messages_delete_own" ON "public"."chat_messages"
  FOR DELETE
  TO PUBLIC
  USING ((sender_id = auth.uid()));

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_policy_chat_messages_insert
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
CREATE POLICY "chat_messages_insert" ON "public"."chat_messages"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_policy_chat_messages_insert_participant
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
CREATE POLICY "chat_messages_insert_participant" ON "public"."chat_messages"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.chat_participants
  WHERE ((chat_participants.channel_id = chat_messages.channel_id) AND (chat_participants.user_id = auth.uid()))))));

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_policy_chat_messages_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
CREATE POLICY "chat_messages_select" ON "public"."chat_messages"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_policy_chat_messages_select_participant
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
CREATE POLICY "chat_messages_select_participant" ON "public"."chat_messages"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.chat_participants
  WHERE ((chat_participants.channel_id = chat_messages.channel_id) AND (chat_participants.user_id = auth.uid())))));

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_policy_chat_messages_update
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
CREATE POLICY "chat_messages_update" ON "public"."chat_messages"
  FOR UPDATE
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.chat_messages.chat_messages_policy_chat_messages_update_own
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_messages.sql
-- Dependencies:  chat_messages
-- ============================================================================
CREATE POLICY "chat_messages_update_own" ON "public"."chat_messages"
  FOR UPDATE
  TO PUBLIC
  USING ((sender_id = auth.uid()))
  WITH CHECK ((sender_id = auth.uid()));

-- ============================================================================
-- Object:        public.chat_participants.chat_participants_policy_chat_participants_delete
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_participants.sql
-- Dependencies:  chat_participants
-- ============================================================================
CREATE POLICY "chat_participants_delete" ON "public"."chat_participants"
  FOR DELETE
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.chat_participants.chat_participants_policy_chat_participants_insert
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_participants.sql
-- Dependencies:  chat_participants
-- ============================================================================
CREATE POLICY "chat_participants_insert" ON "public"."chat_participants"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.chat_participants.chat_participants_policy_chat_participants_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_participants.sql
-- Dependencies:  chat_participants
-- ============================================================================
CREATE POLICY "chat_participants_select" ON "public"."chat_participants"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.chat_participants.chat_participants_policy_chat_participants_update
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/chat_participants.sql
-- Dependencies:  chat_participants
-- ============================================================================
CREATE POLICY "chat_participants_update" ON "public"."chat_participants"
  FOR UPDATE
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.commercial_capability_bindings.commercial_capability_bindings_policy_com_capability_bindings_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/commercial_capability_bindings.sql
-- Dependencies:  commercial_capability_bindings
-- ============================================================================
CREATE POLICY "com_capability_bindings_tenant_isolation" ON "public"."commercial_capability_bindings"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.commercial_line_items.commercial_line_items_policy_com_line_items_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/commercial_line_items.sql
-- Dependencies:  commercial_line_items
-- ============================================================================
CREATE POLICY "com_line_items_isolation" ON "public"."commercial_line_items"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.commercial_service_scopes.commercial_service_scopes_policy_com_service_scopes_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/commercial_service_scopes.sql
-- Dependencies:  commercial_service_scopes
-- ============================================================================
CREATE POLICY "com_service_scopes_isolation" ON "public"."commercial_service_scopes"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.commercial_work_orders.commercial_work_orders_policy_com_work_orders_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/commercial_work_orders.sql
-- Dependencies:  commercial_work_orders
-- ============================================================================
CREATE POLICY "com_work_orders_isolation" ON "public"."commercial_work_orders"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.crm_activities.crm_activities_policy_tenant_isolation_crm_activities
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_activities.sql
-- Dependencies:  crm_activities
-- ============================================================================
CREATE POLICY "tenant_isolation_crm_activities" ON "public"."crm_activities"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.crm_deals.crm_deals_policy_tenant_isolation_crm_deals
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_deals.sql
-- Dependencies:  crm_deals
-- ============================================================================
CREATE POLICY "tenant_isolation_crm_deals" ON "public"."crm_deals"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.crm_guest_links.crm_guest_links_policy_guest_links_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_guest_links.sql
-- Dependencies:  crm_guest_links
-- ============================================================================
CREATE POLICY "guest_links_tenant_isolation" ON "public"."crm_guest_links"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = public.fn_get_user_tenant_id()));

-- ============================================================================
-- Object:        public.crm_quotation_items.crm_quotation_items_policy_tenant_isolation_crm_quotation_items
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_quotation_items.sql
-- Dependencies:  crm_quotation_items
-- ============================================================================
CREATE POLICY "tenant_isolation_crm_quotation_items" ON "public"."crm_quotation_items"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.crm_quotation_sections.crm_quotation_sections_policy_tenant_isolation_crm_quotation_sections
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_quotation_sections.sql
-- Dependencies:  crm_quotation_sections
-- ============================================================================
CREATE POLICY "tenant_isolation_crm_quotation_sections" ON "public"."crm_quotation_sections"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.crm_quotations.crm_quotations_policy_tenant_isolation_crm_quotations
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_quotations.sql
-- Dependencies:  crm_quotations
-- ============================================================================
CREATE POLICY "tenant_isolation_crm_quotations" ON "public"."crm_quotations"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.crm_sbu_customer_rates.crm_sbu_customer_rates_policy_tenant_isolation_crm_sbu_customer_rates
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/crm_sbu_customer_rates.sql
-- Dependencies:  crm_sbu_customer_rates
-- ============================================================================
CREATE POLICY "tenant_isolation_crm_sbu_customer_rates" ON "public"."crm_sbu_customer_rates"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.cus_ceisa_preparations.cus_ceisa_preparations_policy_tenant_isolation_cus_ceisa_preparations
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_ceisa_preparations.sql
-- Dependencies:  cus_ceisa_preparations
-- ============================================================================
CREATE POLICY "tenant_isolation_cus_ceisa_preparations" ON "public"."cus_ceisa_preparations"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));

-- ============================================================================
-- Object:        public.cus_ceisa_validation_results.cus_ceisa_validation_results_policy_tenant_isolation_cus_ceisa_validation_results
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_ceisa_validation_results.sql
-- Dependencies:  cus_ceisa_validation_results
-- ============================================================================
CREATE POLICY "tenant_isolation_cus_ceisa_validation_results" ON "public"."cus_ceisa_validation_results"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid));

-- ============================================================================
-- Object:        public.cus_classification_lines.cus_classification_lines_policy_cus_classification_lines_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_classification_lines.sql
-- Dependencies:  cus_classification_lines
-- ============================================================================
CREATE POLICY "cus_classification_lines_tenant_isolation" ON "public"."cus_classification_lines"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.cus_customs_decisions.cus_customs_decisions_policy_cus_decisions_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_customs_decisions.sql
-- Dependencies:  cus_customs_decisions
-- ============================================================================
CREATE POLICY "cus_decisions_tenant_isolation" ON "public"."cus_customs_decisions"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.cus_declaration_audit_events.cus_declaration_audit_events_policy_cus_audit_events_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_declaration_audit_events.sql
-- Dependencies:  cus_declaration_audit_events
-- ============================================================================
CREATE POLICY "cus_audit_events_tenant_isolation" ON "public"."cus_declaration_audit_events"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.cus_declaration_documents.cus_declaration_documents_policy_cus_docs_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_declaration_documents.sql
-- Dependencies:  cus_declaration_documents
-- ============================================================================
CREATE POLICY "cus_docs_tenant_isolation" ON "public"."cus_declaration_documents"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.cus_declaration_exceptions.cus_declaration_exceptions_policy_cus_exceptions_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_declaration_exceptions.sql
-- Dependencies:  cus_declaration_exceptions
-- ============================================================================
CREATE POLICY "cus_exceptions_tenant_isolation" ON "public"."cus_declaration_exceptions"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.cus_declaration_validation_runs.cus_declaration_validation_runs_policy_cus_val_runs_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_declaration_validation_runs.sql
-- Dependencies:  cus_declaration_validation_runs
-- ============================================================================
CREATE POLICY "cus_val_runs_tenant_isolation" ON "public"."cus_declaration_validation_runs"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.cus_declarations.cus_declarations_policy_cus_declarations_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_declarations.sql
-- Dependencies:  cus_declarations
-- ============================================================================
CREATE POLICY "cus_declarations_tenant_isolation" ON "public"."cus_declarations"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.cus_item_audit_logs.cus_item_audit_logs_policy_cus_audit_insert_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_item_audit_logs.sql
-- Dependencies:  cus_item_audit_logs
-- ============================================================================
CREATE POLICY "cus_audit_insert_isolation" ON "public"."cus_item_audit_logs"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.cus_item_audit_logs.cus_item_audit_logs_policy_cus_audit_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_item_audit_logs.sql
-- Dependencies:  cus_item_audit_logs
-- ============================================================================
CREATE POLICY "cus_audit_tenant_isolation" ON "public"."cus_item_audit_logs"
  FOR SELECT
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.cus_sku_classification_history.cus_sku_classification_history_policy_cus_sku_hist_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_sku_classification_history.sql
-- Dependencies:  cus_sku_classification_history
-- ============================================================================
CREATE POLICY "cus_sku_hist_tenant_isolation" ON "public"."cus_sku_classification_history"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.cus_sku_intelligence.cus_sku_intelligence_policy_cus_sku_intelligence_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/cus_sku_intelligence.sql
-- Dependencies:  cus_sku_intelligence
-- ============================================================================
CREATE POLICY "cus_sku_intelligence_tenant_isolation" ON "public"."cus_sku_intelligence"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.customer_requests.customer_requests_policy_customer_access_own_requests
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/customer_requests.sql
-- Dependencies:  customer_requests
-- ============================================================================
CREATE POLICY "customer_access_own_requests" ON "public"."customer_requests"
  FOR ALL
  TO "authenticated"
  USING ((customer_id IN ( SELECT customers.id
   FROM public.customers
  WHERE (customers.auth_user_id = auth.uid()))));

-- ============================================================================
-- Object:        public.customer_requests.customer_requests_policy_tenant_access_requests
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/customer_requests.sql
-- Dependencies:  customer_requests
-- ============================================================================
CREATE POLICY "tenant_access_requests" ON "public"."customer_requests"
  FOR ALL
  TO "authenticated"
  USING ((customer_id IN ( SELECT customers.id
   FROM public.customers
  WHERE (customers.tenant_id IN ( SELECT tenants.id
           FROM public.tenants
          WHERE (tenants.user_id = auth.uid()))))));

-- ============================================================================
-- Object:        public.customers.customers_policy_tenant_access_customers
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/customers.sql
-- Dependencies:  customers
-- ============================================================================
CREATE POLICY "tenant_access_customers" ON "public"."customers"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (tenants.user_id = auth.uid()))));

-- ============================================================================
-- Object:        public.driver_profiles.driver_profiles_policy_driver_profiles_service_role
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/driver_profiles.sql
-- Dependencies:  driver_profiles
-- ============================================================================
CREATE POLICY "driver_profiles_service_role" ON "public"."driver_profiles"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.driver_requests.driver_requests_policy_cs_access_requests
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/driver_requests.sql
-- Dependencies:  driver_requests
-- ============================================================================
CREATE POLICY "cs_access_requests" ON "public"."driver_requests"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = auth.uid()) AND ((tenant_users.role_code)::text = 'hq_cs'::text)))));

-- ============================================================================
-- Object:        public.driver_requests.driver_requests_policy_sbu_ops_read_requests
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/driver_requests.sql
-- Dependencies:  driver_requests
-- ============================================================================
CREATE POLICY "sbu_ops_read_requests" ON "public"."driver_requests"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = auth.uid()) AND ((tenant_users.role_code)::text = 'sbu_ops_tr'::text)))));

-- ============================================================================
-- Object:        public.driver_tenant_links.driver_tenant_links_policy_driver_tenant_links_service_role
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/driver_tenant_links.sql
-- Dependencies:  driver_tenant_links
-- ============================================================================
CREATE POLICY "driver_tenant_links_service_role" ON "public"."driver_tenant_links"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.event_consumption_log.event_consumption_log_policy_event_consumption_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/event_consumption_log.sql
-- Dependencies:  event_consumption_log
-- ============================================================================
CREATE POLICY "event_consumption_tenant_isolation" ON "public"."event_consumption_log"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.event_dead_letter.event_dead_letter_policy_event_dead_letter_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/event_dead_letter.sql
-- Dependencies:  event_dead_letter
-- ============================================================================
CREATE POLICY "event_dead_letter_tenant_isolation" ON "public"."event_dead_letter"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.event_outbox.event_outbox_policy_event_outbox_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/event_outbox.sql
-- Dependencies:  event_outbox
-- ============================================================================
CREATE POLICY "event_outbox_tenant_isolation" ON "public"."event_outbox"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.extra_costs.extra_costs_policy_Enable insert for all
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  extra_costs
-- ============================================================================
CREATE POLICY "Enable insert for all" ON "public"."extra_costs"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.extra_costs.extra_costs_policy_Enable read access for all
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  extra_costs
-- ============================================================================
CREATE POLICY "Enable read access for all" ON "public"."extra_costs"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.extra_costs.extra_costs_policy_Enable update for all
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  extra_costs
-- ============================================================================
CREATE POLICY "Enable update for all" ON "public"."extra_costs"
  FOR UPDATE
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.extra_costs.extra_costs_policy_extra_costs_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/extra_costs.sql
-- Dependencies:  extra_costs
-- ============================================================================
CREATE POLICY "extra_costs_isolation" ON "public"."extra_costs"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.fin_adjustments.fin_adjustments_policy_fin_adjustments_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_adjustments.sql
-- Dependencies:  fin_adjustments
-- ============================================================================
CREATE POLICY "fin_adjustments_tenant_isolation" ON "public"."fin_adjustments"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fin_ar_ap.fin_ar_ap_policy_fin_ar_ap_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_ar_ap.sql
-- Dependencies:  fin_ar_ap
-- ============================================================================
CREATE POLICY "fin_ar_ap_tenant_isolation" ON "public"."fin_ar_ap"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fin_billable_events.fin_billable_events_policy_fin_billable_events_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_billable_events.sql
-- Dependencies:  fin_billable_events
-- ============================================================================
CREATE POLICY "fin_billable_events_tenant_isolation" ON "public"."fin_billable_events"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fin_financial_ledger_entries.fin_financial_ledger_entries_policy_fin_financial_ledger_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_financial_ledger_entries.sql
-- Dependencies:  fin_financial_ledger_entries
-- ============================================================================
CREATE POLICY "fin_financial_ledger_tenant_isolation" ON "public"."fin_financial_ledger_entries"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fin_invoice_lines.fin_invoice_lines_policy_fin_invoice_lines_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_invoice_lines.sql
-- Dependencies:  fin_invoice_lines
-- ============================================================================
CREATE POLICY "fin_invoice_lines_tenant_isolation" ON "public"."fin_invoice_lines"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fin_invoices.fin_invoices_policy_fin_invoices_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_invoices.sql
-- Dependencies:  fin_invoices
-- ============================================================================
CREATE POLICY "fin_invoices_tenant_isolation" ON "public"."fin_invoices"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fin_payment_allocations.fin_payment_allocations_policy_fin_allocations_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_payment_allocations.sql
-- Dependencies:  fin_payment_allocations
-- ============================================================================
CREATE POLICY "fin_allocations_tenant_isolation" ON "public"."fin_payment_allocations"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fin_payments.fin_payments_policy_fin_payments_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_payments.sql
-- Dependencies:  fin_payments
-- ============================================================================
CREATE POLICY "fin_payments_tenant_isolation" ON "public"."fin_payments"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fin_reconciliation_records.fin_reconciliation_records_policy_fin_recon_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_reconciliation_records.sql
-- Dependencies:  fin_reconciliation_records
-- ============================================================================
CREATE POLICY "fin_recon_tenant_isolation" ON "public"."fin_reconciliation_records"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fin_settlements.fin_settlements_policy_fin_settlements_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fin_settlements.sql
-- Dependencies:  fin_settlements
-- ============================================================================
CREATE POLICY "fin_settlements_tenant_isolation" ON "public"."fin_settlements"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.finance_coa.finance_coa_policy_Allow full access to finance tables for authenticated users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/finance_coa.sql
-- Dependencies:  finance_coa
-- ============================================================================
CREATE POLICY "Allow full access to finance tables for authenticated users" ON "public"."finance_coa"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.finance_journal_entries.finance_journal_entries_policy_Allow full access to finance journal entries for authenticated 
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/finance_journal_entries.sql
-- Dependencies:  finance_journal_entries
-- ============================================================================
CREATE POLICY "Allow full access to finance journal entries for authenticated " ON "public"."finance_journal_entries"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.finance_journals.finance_journals_policy_Allow full access to finance journals for authenticated users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/finance_journals.sql
-- Dependencies:  finance_journals
-- ============================================================================
CREATE POLICY "Allow full access to finance journals for authenticated users" ON "public"."finance_journals"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.finance_transactions.finance_transactions_policy_Allow authenticated full access to finance_transactions
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/finance_transactions.sql
-- Dependencies:  finance_transactions
-- ============================================================================
CREATE POLICY "Allow authenticated full access to finance_transactions" ON "public"."finance_transactions"
  FOR ALL
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.fleet_gps_status.fleet_gps_status_policy_Service role full access
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fleet_gps_status.sql
-- Dependencies:  fleet_gps_status
-- ============================================================================
CREATE POLICY "Service role full access" ON "public"."fleet_gps_status"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.fw_consolidations.fw_consolidations_policy_fw_consolidations_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_consolidations.sql
-- Dependencies:  fw_consolidations
-- ============================================================================
CREATE POLICY "fw_consolidations_tenant_isolation" ON "public"."fw_consolidations"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fw_container_assignments.fw_container_assignments_policy_fw_container_assignments_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_container_assignments.sql
-- Dependencies:  fw_container_assignments
-- ============================================================================
CREATE POLICY "fw_container_assignments_tenant_isolation" ON "public"."fw_container_assignments"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fw_container_items.fw_container_items_policy_fw_container_items_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  fw_container_items
-- ============================================================================
CREATE POLICY "fw_container_items_tenant_isolation" ON "public"."fw_container_items"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fw_legs.fw_legs_policy_fw_legs_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_legs.sql
-- Dependencies:  fw_legs
-- ============================================================================
CREATE POLICY "fw_legs_tenant_isolation" ON "public"."fw_legs"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fw_order_headers.fw_order_headers_policy_fw_order_headers_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_order_headers.sql
-- Dependencies:  fw_order_headers
-- ============================================================================
CREATE POLICY "fw_order_headers_tenant_isolation" ON "public"."fw_order_headers"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.fw_price_master.fw_price_master_policy_fw_price_master_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/fw_price_master.sql
-- Dependencies:  fw_price_master
-- ============================================================================
CREATE POLICY "fw_price_master_tenant_isolation" ON "public"."fw_price_master"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.general_ledger.general_ledger_policy_Allow authenticated full access to general_ledger
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/general_ledger.sql
-- Dependencies:  general_ledger
-- ============================================================================
CREATE POLICY "Allow authenticated full access to general_ledger" ON "public"."general_ledger"
  FOR ALL
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.gps_provider_configs.gps_provider_configs_policy_Tenant isolation for gps_provider_configs
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/gps_provider_configs.sql
-- Dependencies:  gps_provider_configs
-- ============================================================================
CREATE POLICY "Tenant isolation for gps_provider_configs" ON "public"."gps_provider_configs"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ((auth.jwt() ->> 'tenant_id'::text))::uuid));

-- ============================================================================
-- Object:        public.ground_assignment_pics.ground_assignment_pics_policy_admin_all_access_assignment
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/ground_assignment_pics.sql
-- Dependencies:  ground_assignment_pics
-- ============================================================================
CREATE POLICY "admin_all_access_assignment" ON "public"."ground_assignment_pics"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM auth.users au
  WHERE (au.id = auth.uid()))));

-- ============================================================================
-- Object:        public.ground_assignment_pics.ground_assignment_pics_policy_ground_staff_read_assignment
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/ground_assignment_pics.sql
-- Dependencies:  ground_assignment_pics
-- ============================================================================
CREATE POLICY "ground_staff_read_assignment" ON "public"."ground_assignment_pics"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.ground_staff_profiles gsp
  WHERE ((gsp.user_id = auth.uid()) AND (gsp.is_active = true)))));

-- ============================================================================
-- Object:        public.ground_documents.ground_documents_policy_ground_documents_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/ground_documents.sql
-- Dependencies:  ground_documents
-- ============================================================================
CREATE POLICY "ground_documents_tenant_isolation" ON "public"."ground_documents"
  FOR ALL
  TO PUBLIC
  USING ((ground_event_id IN ( SELECT ground_events.id
   FROM public.ground_events
  WHERE (ground_events.job_order_id IN ( SELECT job_orders.id
           FROM public.job_orders
          WHERE (job_orders.tenant_id = public.get_my_tenant_id()))))));

-- ============================================================================
-- Object:        public.ground_events.ground_events_policy_ground_events_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/ground_events.sql
-- Dependencies:  ground_events
-- ============================================================================
CREATE POLICY "ground_events_tenant_isolation" ON "public"."ground_events"
  FOR ALL
  TO PUBLIC
  USING ((job_order_id IN ( SELECT job_orders.id
   FROM public.job_orders
  WHERE (job_orders.tenant_id = public.get_my_tenant_id()))));

-- ============================================================================
-- Object:        public.ground_sites.ground_sites_policy_ground_sites_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/ground_sites.sql
-- Dependencies:  ground_sites
-- ============================================================================
CREATE POLICY "ground_sites_tenant_isolation" ON "public"."ground_sites"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.ground_staff_profiles.ground_staff_profiles_policy_ground_staff_profiles_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/ground_staff_profiles.sql
-- Dependencies:  ground_staff_profiles
-- ============================================================================
CREATE POLICY "ground_staff_profiles_tenant_isolation" ON "public"."ground_staff_profiles"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.intr_endpoint_cache.intr_endpoint_cache_policy_Allow internal access
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/intr_endpoint_cache.sql
-- Dependencies:  intr_endpoint_cache
-- ============================================================================
CREATE POLICY "Allow internal access" ON "public"."intr_endpoint_cache"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.intr_endpoint_cache.intr_endpoint_cache_policy_Allow public insert/update
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/intr_endpoint_cache.sql
-- Dependencies:  intr_endpoint_cache
-- ============================================================================
CREATE POLICY "Allow public insert/update" ON "public"."intr_endpoint_cache"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.intr_endpoint_cache.intr_endpoint_cache_policy_Allow public read access
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/intr_endpoint_cache.sql
-- Dependencies:  intr_endpoint_cache
-- ============================================================================
CREATE POLICY "Allow public read access" ON "public"."intr_endpoint_cache"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.intr_test_log.intr_test_log_policy_Allow internal access to test log
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/intr_test_log.sql
-- Dependencies:  intr_test_log
-- ============================================================================
CREATE POLICY "Allow internal access to test log" ON "public"."intr_test_log"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.invoice_lines.invoice_lines_policy_invoice_lines_all
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/invoice_lines.sql
-- Dependencies:  invoice_lines
-- ============================================================================
CREATE POLICY "invoice_lines_all" ON "public"."invoice_lines"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.invoices.invoices_policy_invoices_all
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  invoices
-- ============================================================================
CREATE POLICY "invoices_all" ON "public"."invoices"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.jo_warehouse_assignments.jo_warehouse_assignments_policy_Enable delete for authenticated users on jo_warehouse_assignmen
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/jo_warehouse_assignments.sql
-- Dependencies:  jo_warehouse_assignments
-- ============================================================================
CREATE POLICY "Enable delete for authenticated users on jo_warehouse_assignmen" ON "public"."jo_warehouse_assignments"
  FOR DELETE
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

-- ============================================================================
-- Object:        public.jo_warehouse_assignments.jo_warehouse_assignments_policy_Enable insert for authenticated users on jo_warehouse_assignmen
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/jo_warehouse_assignments.sql
-- Dependencies:  jo_warehouse_assignments
-- ============================================================================
CREATE POLICY "Enable insert for authenticated users on jo_warehouse_assignmen" ON "public"."jo_warehouse_assignments"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.role() = 'authenticated'::text));

-- ============================================================================
-- Object:        public.jo_warehouse_assignments.jo_warehouse_assignments_policy_Enable public SELECT for jo_warehouse_assignments
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/jo_warehouse_assignments.sql
-- Dependencies:  jo_warehouse_assignments
-- ============================================================================
CREATE POLICY "Enable public SELECT for jo_warehouse_assignments" ON "public"."jo_warehouse_assignments"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.jo_warehouse_assignments.jo_warehouse_assignments_policy_Enable read for authenticated users on jo_warehouse_assignments
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/jo_warehouse_assignments.sql
-- Dependencies:  jo_warehouse_assignments
-- ============================================================================
CREATE POLICY "Enable read for authenticated users on jo_warehouse_assignments" ON "public"."jo_warehouse_assignments"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

-- ============================================================================
-- Object:        public.jo_warehouse_assignments.jo_warehouse_assignments_policy_Enable update for authenticated users on jo_warehouse_assignmen
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/jo_warehouse_assignments.sql
-- Dependencies:  jo_warehouse_assignments
-- ============================================================================
CREATE POLICY "Enable update for authenticated users on jo_warehouse_assignmen" ON "public"."jo_warehouse_assignments"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

-- ============================================================================
-- Object:        public.job_order_payments.job_order_payments_policy_job_order_payments_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_order_payments.sql
-- Dependencies:  job_order_payments
-- ============================================================================
CREATE POLICY "job_order_payments_isolation" ON "public"."job_order_payments"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.job_orders.job_orders_policy_driver_portal_jo_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE POLICY "driver_portal_jo_select" ON "public"."job_orders"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'anon'::text));

-- ============================================================================
-- Object:        public.job_orders.job_orders_policy_tr_jo_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders
-- ============================================================================
CREATE POLICY "tr_jo_isolation" ON "public"."job_orders"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.job_routes.job_routes_policy_cs_full_access_job_routes
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_routes.sql
-- Dependencies:  job_routes
-- ============================================================================
CREATE POLICY "cs_full_access_job_routes" ON "public"."job_routes"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = auth.uid()) AND ((tenant_users.role_code)::text = 'hq_cs'::text)))));

-- ============================================================================
-- Object:        public.job_routes.job_routes_policy_driver_portal_routes_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_routes.sql
-- Dependencies:  job_routes
-- ============================================================================
CREATE POLICY "driver_portal_routes_select" ON "public"."job_routes"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'anon'::text));

-- ============================================================================
-- Object:        public.job_routes.job_routes_policy_job_routes_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_routes.sql
-- Dependencies:  job_routes
-- ============================================================================
CREATE POLICY "job_routes_isolation" ON "public"."job_routes"
  FOR ALL
  TO "authenticated"
  USING ((job_order_id IN ( SELECT job_orders.id
   FROM public.job_orders)))
  WITH CHECK ((job_order_id IN ( SELECT job_orders.id
   FROM public.job_orders)));

-- ============================================================================
-- Object:        public.job_routes.job_routes_policy_sbu_ops_access_job_routes
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_routes.sql
-- Dependencies:  job_routes
-- ============================================================================
CREATE POLICY "sbu_ops_access_job_routes" ON "public"."job_routes"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = auth.uid()) AND ((tenant_users.role_code)::text = 'sbu_ops_tr'::text)))));

-- ============================================================================
-- Object:        public.job_routes.job_routes_policy_sbu_ops_update_job_routes
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_routes.sql
-- Dependencies:  job_routes
-- ============================================================================
CREATE POLICY "sbu_ops_update_job_routes" ON "public"."job_routes"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = auth.uid()) AND ((tenant_users.role_code)::text = 'sbu_ops_tr'::text)))));

-- ============================================================================
-- Object:        public.job_tracking.job_tracking_policy_Allow public select on job_tracking
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_tracking.sql
-- Dependencies:  job_tracking
-- ============================================================================
CREATE POLICY "Allow public select on job_tracking" ON "public"."job_tracking"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.job_tracking.job_tracking_policy_Enable read access for all users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/job_tracking.sql
-- Dependencies:  job_tracking
-- ============================================================================
CREATE POLICY "Enable read access for all users" ON "public"."job_tracking"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.md_bill_of_materials.md_bill_of_materials_policy_tenant_isolation_md_bom
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_bill_of_materials.sql
-- Dependencies:  md_bill_of_materials
-- ============================================================================
CREATE POLICY "tenant_isolation_md_bom" ON "public"."md_bill_of_materials"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT md_bill_of_materials.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.md_billing_rates.md_billing_rates_policy_tenant_isolation_md_billing_rates
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_billing_rates.sql
-- Dependencies:  md_billing_rates
-- ============================================================================
CREATE POLICY "tenant_isolation_md_billing_rates" ON "public"."md_billing_rates"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.md_bom_items.md_bom_items_policy_tenant_isolation_md_bom_itm
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_bom_items.sql
-- Dependencies:  md_bom_items
-- ============================================================================
CREATE POLICY "tenant_isolation_md_bom_itm" ON "public"."md_bom_items"
  FOR ALL
  TO PUBLIC
  USING ((bom_id IN ( SELECT md_bill_of_materials.id
   FROM public.md_bill_of_materials
  WHERE (md_bill_of_materials.tenant_id = ( SELECT md_bill_of_materials.tenant_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));

-- ============================================================================
-- Object:        public.md_contacts.md_contacts_policy_owner_all_md_contacts
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_contacts.sql
-- Dependencies:  md_contacts
-- ============================================================================
CREATE POLICY "owner_all_md_contacts" ON "public"."md_contacts"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.md_contract_warehouses.md_contract_warehouses_policy_tenant_isolation_md_contract_warehouses
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_contract_warehouses.sql
-- Dependencies:  md_contract_warehouses
-- ============================================================================
CREATE POLICY "tenant_isolation_md_contract_warehouses" ON "public"."md_contract_warehouses"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.md_customer_users.md_customer_users_policy_Admins can manage customer portal users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_customer_users.sql
-- Dependencies:  md_customer_users
-- ============================================================================
CREATE POLICY "Admins can manage customer portal users" ON "public"."md_customer_users"
  FOR ALL
  TO PUBLIC
  USING (((EXISTS ( SELECT 1
   FROM public.tenant_users tu
  WHERE ((tu.user_id = auth.uid()) AND ((tu.tenant_id = md_customer_users.tenant_id) OR (md_customer_users.tenant_id IS NULL) OR (tu.tenant_id IS
    NOT NULL)) AND
    ((tu.role_code)::text = ANY ((ARRAY['tenant_superadmin'::character varying, 'tenant_admin'::character varying, 'sbu_wh_manager'::character varying, 'sbu_manager_wh'::character
    varying, 'sbu_ops_wh'::character varying, 'sbu_admin_wh'::character varying])::text[]))))) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE
    ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['tenant_superadmin'::text, 'tenant_admin'::text, 'sbu_wh_manager'::text, 'sbu_manager_wh'::text, 'sbu_ops_wh'::text,
    'sbu_admin_wh'::text, 'owner_sentralogis'::text, 'superadmin'::text]))))) OR (EXISTS ( SELECT 1
   FROM public.tenants t
  WHERE (t.user_id = auth.uid()))) OR (auth.role() = 'service_role'::text)))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.tenant_users tu
  WHERE
    ((tu.user_id = auth.uid()) AND ((tu.role_code)::text = ANY ((ARRAY['tenant_superadmin'::character varying, 'tenant_admin'::character varying, 'sbu_wh_manager'::character
    varying, 'sbu_manager_wh'::character varying, 'sbu_ops_wh'::character varying, 'sbu_admin_wh'::character varying])::text[]))))) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE
    ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['tenant_superadmin'::text, 'tenant_admin'::text, 'sbu_wh_manager'::text, 'sbu_manager_wh'::text, 'sbu_ops_wh'::text,
    'sbu_admin_wh'::text, 'owner_sentralogis'::text, 'superadmin'::text]))))) OR (EXISTS ( SELECT 1
   FROM public.tenants t
  WHERE (t.user_id = auth.uid()))) OR (auth.role() = 'service_role'::text)));

-- ============================================================================
-- Object:        public.md_customer_users.md_customer_users_policy_Customer users can view and update their own mapping
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_customer_users.sql
-- Dependencies:  md_customer_users
-- ============================================================================
CREATE POLICY "Customer users can view and update their own mapping" ON "public"."md_customer_users"
  FOR ALL
  TO PUBLIC
  USING (((user_id = auth.uid()) OR (lower(email) = lower((auth.jwt() ->> 'email'::text))) OR (auth.role() = 'service_role'::text)))
  WITH CHECK (((user_id = auth.uid()) OR (lower(email) = lower((auth.jwt() ->> 'email'::text))) OR (auth.role() = 'service_role'::text)));

-- ============================================================================
-- Object:        public.md_customs_hs_codes.md_customs_hs_codes_policy_md_customs_hs_codes_read
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_customs_hs_codes.sql
-- Dependencies:  md_customs_hs_codes
-- ============================================================================
CREATE POLICY "md_customs_hs_codes_read" ON "public"."md_customs_hs_codes"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.md_driver_allowances.md_driver_allowances_policy_driver_allowances_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_driver_allowances.sql
-- Dependencies:  md_driver_allowances
-- ============================================================================
CREATE POLICY "driver_allowances_isolation" ON "public"."md_driver_allowances"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.md_drivers.md_drivers_policy_md_drivers_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_drivers.sql
-- Dependencies:  md_drivers
-- ============================================================================
CREATE POLICY "md_drivers_tenant_isolation" ON "public"."md_drivers"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.md_entities.md_entities_policy_md_entities_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_entities.sql
-- Dependencies:  md_entities
-- ============================================================================
CREATE POLICY "md_entities_tenant_isolation" ON "public"."md_entities"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.md_entity_addresses.md_entity_addresses_policy_addresses_access
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_entity_addresses.sql
-- Dependencies:  md_entity_addresses
-- ============================================================================
CREATE POLICY "addresses_access" ON "public"."md_entity_addresses"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.md_entities e
  WHERE ((e.id = md_entity_addresses.entity_id) AND (e.tenant_id = ( SELECT tenant_users.tenant_id
           FROM public.tenant_users
          WHERE (tenant_users.user_id = auth.uid())))))));

-- ============================================================================
-- Object:        public.md_fleet_types.md_fleet_types_policy_Allow public read access on md_fleet_types
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_fleet_types.sql
-- Dependencies:  md_fleet_types
-- ============================================================================
CREATE POLICY "Allow public read access on md_fleet_types" ON "public"."md_fleet_types"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.md_fleet_types.md_fleet_types_policy_Allow Public Read md_fleet_types
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_fleet_types.sql
-- Dependencies:  md_fleet_types
-- ============================================================================
CREATE POLICY "Allow Public Read md_fleet_types" ON "public"."md_fleet_types"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.md_fleet_types.md_fleet_types_policy_driver_portal_fleet_types_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_fleet_types.sql
-- Dependencies:  md_fleet_types
-- ============================================================================
CREATE POLICY "driver_portal_fleet_types_select" ON "public"."md_fleet_types"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'anon'::text));

-- ============================================================================
-- Object:        public.md_fleet_types.md_fleet_types_policy_fleet_types_read
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_fleet_types.sql
-- Dependencies:  md_fleet_types
-- ============================================================================
CREATE POLICY "fleet_types_read" ON "public"."md_fleet_types"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.md_fleet_types.md_fleet_types_policy_fleet_types_simple_access
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_fleet_types.sql
-- Dependencies:  md_fleet_types
-- ============================================================================
CREATE POLICY "fleet_types_simple_access" ON "public"."md_fleet_types"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.md_fleet_types.md_fleet_types_policy_fleet_types_write
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_fleet_types.sql
-- Dependencies:  md_fleet_types
-- ============================================================================
CREATE POLICY "fleet_types_write" ON "public"."md_fleet_types"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() IN ( SELECT users.id
   FROM auth.users
  WHERE ((users.email)::text = 'admin1@sentralogis.com'::text))));

-- ============================================================================
-- Object:        public.md_fleets.md_fleets_policy_driver_portal_fleets_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  md_fleets
-- ============================================================================
CREATE POLICY "driver_portal_fleets_select" ON "public"."md_fleets"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'anon'::text));

-- ============================================================================
-- Object:        public.md_fleets.md_fleets_policy_md_fleets_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_fleets.sql
-- Dependencies:  md_fleets
-- ============================================================================
CREATE POLICY "md_fleets_tenant_isolation" ON "public"."md_fleets"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.md_locations.md_locations_policy_md_locations_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_locations.sql
-- Dependencies:  md_locations
-- ============================================================================
CREATE POLICY "md_locations_tenant_isolation" ON "public"."md_locations"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.md_product_categories.md_product_categories_policy_Enable read access for all users on categories
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_product_categories.sql
-- Dependencies:  md_product_categories
-- ============================================================================
CREATE POLICY "Enable read access for all users on categories" ON "public"."md_product_categories"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.md_product_categories.md_product_categories_policy_Enable write access for tenant users on categories
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_product_categories.sql
-- Dependencies:  md_product_categories
-- ============================================================================
CREATE POLICY "Enable write access for tenant users on categories" ON "public"."md_product_categories"
  FOR ALL
  TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.md_product_skus.md_product_skus_policy_tenant_isolation_md_product_skus
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_product_skus.sql
-- Dependencies:  md_product_skus
-- ============================================================================
CREATE POLICY "tenant_isolation_md_product_skus" ON "public"."md_product_skus"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT md_product_skus.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.md_services.md_services_policy_Enable delete for users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_services.sql
-- Dependencies:  md_services
-- ============================================================================
CREATE POLICY "Enable delete for users" ON "public"."md_services"
  FOR DELETE
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.md_services.md_services_policy_Enable insert for users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_services.sql
-- Dependencies:  md_services
-- ============================================================================
CREATE POLICY "Enable insert for users" ON "public"."md_services"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.md_services.md_services_policy_Enable read access for users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_services.sql
-- Dependencies:  md_services
-- ============================================================================
CREATE POLICY "Enable read access for users" ON "public"."md_services"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.md_services.md_services_policy_Enable update for users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_services.sql
-- Dependencies:  md_services
-- ============================================================================
CREATE POLICY "Enable update for users" ON "public"."md_services"
  FOR UPDATE
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.md_storage_contracts.md_storage_contracts_policy_tenant_isolation_md_storage_contracts
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_storage_contracts.sql
-- Dependencies:  md_storage_contracts
-- ============================================================================
CREATE POLICY "tenant_isolation_md_storage_contracts" ON "public"."md_storage_contracts"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.md_taxes.md_taxes_policy_Allow read access for all authenticated users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_taxes.sql
-- Dependencies:  md_taxes
-- ============================================================================
CREATE POLICY "Allow read access for all authenticated users" ON "public"."md_taxes"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.md_taxes.md_taxes_policy_md_taxes_all
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_taxes.sql
-- Dependencies:  md_taxes
-- ============================================================================
CREATE POLICY "md_taxes_all" ON "public"."md_taxes"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.md_taxes.md_taxes_policy_md_taxes_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_taxes.sql
-- Dependencies:  md_taxes
-- ============================================================================
CREATE POLICY "md_taxes_select" ON "public"."md_taxes"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.md_tenants.md_tenants_policy_md_tenants_read_own
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_tenants.sql
-- Dependencies:  md_tenants
-- ============================================================================
CREATE POLICY "md_tenants_read_own" ON "public"."md_tenants"
  FOR SELECT
  TO "authenticated"
  USING ((id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.md_transporter_drivers.md_transporter_drivers_policy_Enable read access for authenticated users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_transporter_drivers.sql
-- Dependencies:  md_transporter_drivers
-- ============================================================================
CREATE POLICY "Enable read access for authenticated users" ON "public"."md_transporter_drivers"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

-- ============================================================================
-- Object:        public.md_transporter_fleets.md_transporter_fleets_policy_Enable read access for authenticated users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_transporter_fleets.sql
-- Dependencies:  md_transporter_fleets
-- ============================================================================
CREATE POLICY "Enable read access for authenticated users" ON "public"."md_transporter_fleets"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

-- ============================================================================
-- Object:        public.md_transporters.md_transporters_policy_owner_all_md_transporters
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_transporters.sql
-- Dependencies:  md_transporters
-- ============================================================================
CREATE POLICY "owner_all_md_transporters" ON "public"."md_transporters"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.md_trucking_regions.md_trucking_regions_policy_tenant_read_regions
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_trucking_regions.sql
-- Dependencies:  md_trucking_regions
-- ============================================================================
CREATE POLICY "tenant_read_regions" ON "public"."md_trucking_regions"
  FOR SELECT
  TO PUBLIC
  USING ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.md_trucking_regions.md_trucking_regions_policy_tenant_write_regions
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_trucking_regions.sql
-- Dependencies:  md_trucking_regions
-- ============================================================================
CREATE POLICY "tenant_write_regions" ON "public"."md_trucking_regions"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.md_uoms.md_uoms_policy_Allow authenticated users to manage uoms
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_uoms.sql
-- Dependencies:  md_uoms
-- ============================================================================
CREATE POLICY "Allow authenticated users to manage uoms" ON "public"."md_uoms"
  FOR ALL
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text))
  WITH CHECK ((auth.role() = 'authenticated'::text));

-- ============================================================================
-- Object:        public.md_warehouse_areas.md_warehouse_areas_policy_tenant_isolation_md_warehouse_areas
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_warehouse_areas.sql
-- Dependencies:  md_warehouse_areas
-- ============================================================================
CREATE POLICY "tenant_isolation_md_warehouse_areas" ON "public"."md_warehouse_areas"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT md_warehouse_areas.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.md_warehouse_locations.md_warehouse_locations_policy_Enable public SELECT for warehouse locations
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_warehouse_locations.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
CREATE POLICY "Enable public SELECT for warehouse locations" ON "public"."md_warehouse_locations"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.md_warehouse_locations.md_warehouse_locations_policy_tenant_isolation_md_warehouse_locations
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_warehouse_locations.sql
-- Dependencies:  md_warehouse_locations
-- ============================================================================
CREATE POLICY "tenant_isolation_md_warehouse_locations" ON "public"."md_warehouse_locations"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT md_warehouse_locations.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.md_warehouse_staff.md_warehouse_staff_policy_Enable ALL for authenticated
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_warehouse_staff.sql
-- Dependencies:  md_warehouse_staff
-- ============================================================================
CREATE POLICY "Enable ALL for authenticated" ON "public"."md_warehouse_staff"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.md_warehouse_staff.md_warehouse_staff_policy_Enable public SELECT for login
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_warehouse_staff.sql
-- Dependencies:  md_warehouse_staff
-- ============================================================================
CREATE POLICY "Enable public SELECT for login" ON "public"."md_warehouse_staff"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.md_warehouse_zones.md_warehouse_zones_policy_tenant_isolation_md_warehouse_zones
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_warehouse_zones.sql
-- Dependencies:  md_warehouse_zones
-- ============================================================================
CREATE POLICY "tenant_isolation_md_warehouse_zones" ON "public"."md_warehouse_zones"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT md_warehouse_zones.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.md_warehouses.md_warehouses_policy_tenant_isolation_md_warehouses
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/md_warehouses.sql
-- Dependencies:  md_warehouses
-- ============================================================================
CREATE POLICY "tenant_isolation_md_warehouses" ON "public"."md_warehouses"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT md_warehouses.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.notifications.notifications_policy_system_insert_notifications
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/notifications.sql
-- Dependencies:  notifications
-- ============================================================================
CREATE POLICY "system_insert_notifications" ON "public"."notifications"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.notifications.notifications_policy_user_update_own_notifications
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/notifications.sql
-- Dependencies:  notifications
-- ============================================================================
CREATE POLICY "user_update_own_notifications" ON "public"."notifications"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = user_id));

-- ============================================================================
-- Object:        public.notifications.notifications_policy_user_view_own_notifications
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/notifications.sql
-- Dependencies:  notifications
-- ============================================================================
CREATE POLICY "user_view_own_notifications" ON "public"."notifications"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = user_id));

-- ============================================================================
-- Object:        public.party_contacts.party_contacts_policy_party_contacts_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/party_contacts.sql
-- Dependencies:  party_contacts
-- ============================================================================
CREATE POLICY "party_contacts_tenant_isolation" ON "public"."party_contacts"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.party_locations.party_locations_policy_party_locations_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/party_locations.sql
-- Dependencies:  party_locations
-- ============================================================================
CREATE POLICY "party_locations_tenant_isolation" ON "public"."party_locations"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.party_relationships.party_relationships_policy_party_relationships_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/party_relationships.sql
-- Dependencies:  party_relationships
-- ============================================================================
CREATE POLICY "party_relationships_tenant_isolation" ON "public"."party_relationships"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.party_roles.party_roles_policy_party_roles_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  party_roles
-- ============================================================================
CREATE POLICY "party_roles_tenant_isolation" ON "public"."party_roles"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.pricing_rate_items.pricing_rate_items_policy_pricing_rate_items_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/pricing_rate_items.sql
-- Dependencies:  pricing_rate_items
-- ============================================================================
CREATE POLICY "pricing_rate_items_tenant_isolation" ON "public"."pricing_rate_items"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.pricing_rate_versions.pricing_rate_versions_policy_pricing_rate_versions_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/pricing_rate_versions.sql
-- Dependencies:  pricing_rate_versions
-- ============================================================================
CREATE POLICY "pricing_rate_versions_tenant_isolation" ON "public"."pricing_rate_versions"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.pricing_rates.pricing_rates_policy_pricing_rates_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/pricing_rates.sql
-- Dependencies:  pricing_rates
-- ============================================================================
CREATE POLICY "pricing_rates_tenant_isolation" ON "public"."pricing_rates"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.profiles.profiles_policy_Anyone can read profiles
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/profiles.sql
-- Dependencies:  profiles
-- ============================================================================
CREATE POLICY "Anyone can read profiles" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.profiles.profiles_policy_Enable read for authenticated users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/profiles.sql
-- Dependencies:  profiles
-- ============================================================================
CREATE POLICY "Enable read for authenticated users" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.profiles.profiles_policy_profiles_read_authenticated
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/profiles.sql
-- Dependencies:  profiles
-- ============================================================================
CREATE POLICY "profiles_read_authenticated" ON "public"."profiles"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'authenticated'::text));

-- ============================================================================
-- Object:        public.profiles.profiles_policy_profiles_self_update
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/profiles.sql
-- Dependencies:  profiles
-- ============================================================================
CREATE POLICY "profiles_self_update" ON "public"."profiles"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = id));

-- ============================================================================
-- Object:        public.profiles.profiles_policy_Users can read own profile
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/profiles.sql
-- Dependencies:  profiles
-- ============================================================================
CREATE POLICY "Users can read own profile" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((auth.uid() = id));

-- ============================================================================
-- Object:        public.profiles.profiles_policy_Users can view profiles
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/profiles.sql
-- Dependencies:  profiles
-- ============================================================================
CREATE POLICY "Users can view profiles" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.putaway_assignments.putaway_assignments_policy_Enable all for authenticated users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/putaway_assignments.sql
-- Dependencies:  putaway_assignments
-- ============================================================================
CREATE POLICY "Enable all for authenticated users" ON "public"."putaway_assignments"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.reset_password_requests.reset_password_requests_policy_owner_access_by_role
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/reset_password_requests.sql
-- Dependencies:  reset_password_requests
-- ============================================================================
CREATE POLICY "owner_access_by_role" ON "public"."reset_password_requests"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'owner_sentralogis'::text)))));

-- ============================================================================
-- Object:        public.reset_password_requests.reset_password_requests_policy_public_insert
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/reset_password_requests.sql
-- Dependencies:  reset_password_requests
-- ============================================================================
CREATE POLICY "public_insert" ON "public"."reset_password_requests"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.sales_order_line_items.sales_order_line_items_policy_so_line_items_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sales_order_line_items.sql
-- Dependencies:  sales_order_line_items
-- ============================================================================
CREATE POLICY "so_line_items_tenant_isolation" ON "public"."sales_order_line_items"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.sales_orders.sales_orders_policy_sales_orders_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sales_orders.sql
-- Dependencies:  sales_orders
-- ============================================================================
CREATE POLICY "sales_orders_isolation" ON "public"."sales_orders"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.sbu_token_rates.sbu_token_rates_policy_sbu_token_rates_all
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sbu_token_rates.sql
-- Dependencies:  sbu_token_rates
-- ============================================================================
CREATE POLICY "sbu_token_rates_all" ON "public"."sbu_token_rates"
  FOR ALL
  TO "authenticated"
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'owner'::text]))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'owner'::text]))))));

-- ============================================================================
-- Object:        public.sbu_token_rates.sbu_token_rates_policy_sbu_token_rates_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sbu_token_rates.sql
-- Dependencies:  sbu_token_rates
-- ============================================================================
CREATE POLICY "sbu_token_rates_select" ON "public"."sbu_token_rates"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.shp_exceptions.shp_exceptions_policy_shp_exceptions_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_exceptions.sql
-- Dependencies:  shp_exceptions
-- ============================================================================
CREATE POLICY "shp_exceptions_tenant_isolation" ON "public"."shp_exceptions"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.shp_execution_legs.shp_execution_legs_policy_shp_execution_legs_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_execution_legs.sql
-- Dependencies:  shp_execution_legs
-- ============================================================================
CREATE POLICY "shp_execution_legs_tenant_isolation" ON "public"."shp_execution_legs"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.shp_execution_plans.shp_execution_plans_policy_shp_execution_plans_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_execution_plans.sql
-- Dependencies:  shp_execution_plans
-- ============================================================================
CREATE POLICY "shp_execution_plans_tenant_isolation" ON "public"."shp_execution_plans"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.shp_leg_units.shp_leg_units_policy_shp_leg_units_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_leg_units.sql
-- Dependencies:  shp_leg_units
-- ============================================================================
CREATE POLICY "shp_leg_units_tenant_isolation" ON "public"."shp_leg_units"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.shp_manifest_items.shp_manifest_items_policy_shp_manifest_items_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_manifest_items.sql
-- Dependencies:  shp_manifest_items
-- ============================================================================
CREATE POLICY "shp_manifest_items_tenant_isolation" ON "public"."shp_manifest_items"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.shp_milestones.shp_milestones_policy_shp_milestones_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_milestones.sql
-- Dependencies:  shp_milestones
-- ============================================================================
CREATE POLICY "shp_milestones_tenant_isolation" ON "public"."shp_milestones"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.shp_shipments.shp_shipments_policy_shp_shipments_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_shipments.sql
-- Dependencies:  shp_shipments
-- ============================================================================
CREATE POLICY "shp_shipments_tenant_isolation" ON "public"."shp_shipments"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.shp_unit_bulk.shp_unit_bulk_policy_shp_unit_bulk_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_unit_bulk.sql
-- Dependencies:  shp_unit_bulk
-- ============================================================================
CREATE POLICY "shp_unit_bulk_tenant_isolation" ON "public"."shp_unit_bulk"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.shp_unit_containers.shp_unit_containers_policy_shp_unit_containers_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_unit_containers.sql
-- Dependencies:  shp_unit_containers
-- ============================================================================
CREATE POLICY "shp_unit_containers_tenant_isolation" ON "public"."shp_unit_containers"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.shp_unit_packages.shp_unit_packages_policy_shp_unit_packages_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_unit_packages.sql
-- Dependencies:  shp_unit_packages
-- ============================================================================
CREATE POLICY "shp_unit_packages_tenant_isolation" ON "public"."shp_unit_packages"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.shp_unit_vehicles.shp_unit_vehicles_policy_shp_unit_vehicles_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_unit_vehicles.sql
-- Dependencies:  shp_unit_vehicles
-- ============================================================================
CREATE POLICY "shp_unit_vehicles_tenant_isolation" ON "public"."shp_unit_vehicles"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.shp_units.shp_units_policy_shp_units_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/shp_units.sql
-- Dependencies:  shp_units
-- ============================================================================
CREATE POLICY "shp_units_tenant_isolation" ON "public"."shp_units"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.sla_daily_snapshots.sla_daily_snapshots_policy_tenant_isolation_sla_daily_snapshots
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sla_daily_snapshots.sql
-- Dependencies:  sla_daily_snapshots
-- ============================================================================
CREATE POLICY "tenant_isolation_sla_daily_snapshots" ON "public"."sla_daily_snapshots"
  FOR ALL
  TO "authenticated"
  USING (((tenant_id = public.get_my_tenant_id()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'owner'::text, 'director'::text, 'hq_admin'::text])))))))
  WITH CHECK (((tenant_id = public.get_my_tenant_id()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['superadmin'::text, 'owner'::text, 'director'::text, 'hq_admin'::text])))))));

-- ============================================================================
-- Object:        public.sla_escalations.sla_escalations_policy_Allow all authenticated to read sla_escalations
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sla_escalations.sql
-- Dependencies:  sla_escalations
-- ============================================================================
CREATE POLICY "Allow all authenticated to read sla_escalations" ON "public"."sla_escalations"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.sla_escalations.sla_escalations_policy_Allow system to insert sla_escalations
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sla_escalations.sql
-- Dependencies:  sla_escalations
-- ============================================================================
CREATE POLICY "Allow system to insert sla_escalations" ON "public"."sla_escalations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.sla_escalations.sla_escalations_policy_Allow system to update sla_escalations
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/sla_escalations.sql
-- Dependencies:  sla_escalations
-- ============================================================================
CREATE POLICY "Allow system to update sla_escalations" ON "public"."sla_escalations"
  FOR UPDATE
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.staff.staff_policy_Owners manage their staff
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/staff.sql
-- Dependencies:  staff
-- ============================================================================
CREATE POLICY "Owners manage their staff" ON "public"."staff"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = auth.uid()));

-- ============================================================================
-- Object:        public.staff.staff_policy_Users can view their own staff profile
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/staff.sql
-- Dependencies:  staff
-- ============================================================================
CREATE POLICY "Users can view their own staff profile" ON "public"."staff"
  FOR SELECT
  TO PUBLIC
  USING ((user_id = auth.uid()));

-- ============================================================================
-- Object:        public.svc_service_requests.svc_service_requests_policy_svc_service_requests_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/svc_service_requests.sql
-- Dependencies:  svc_service_requests
-- ============================================================================
CREATE POLICY "svc_service_requests_tenant_isolation" ON "public"."svc_service_requests"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.tenant_roles.tenant_roles_policy_allow_all_read_roles
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenant_roles.sql
-- Dependencies:  tenant_roles
-- ============================================================================
CREATE POLICY "allow_all_read_roles" ON "public"."tenant_roles"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.tenant_sbus.tenant_sbus_policy_tenant_sbus_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenant_sbus.sql
-- Dependencies:  tenant_sbus
-- ============================================================================
CREATE POLICY "tenant_sbus_tenant_isolation" ON "public"."tenant_sbus"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.tenant_users.tenant_users_policy_manage_tenant_users_policy
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  tenant_users
-- ============================================================================
CREATE POLICY "manage_tenant_users_policy" ON "public"."tenant_users"
  FOR ALL
  TO PUBLIC
  USING (public.is_tenant_superadmin());

-- ============================================================================
-- Object:        public.tenant_users.tenant_users_policy_tenant_users_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenant_users.sql
-- Dependencies:  tenant_users
-- ============================================================================
CREATE POLICY "tenant_users_tenant_isolation" ON "public"."tenant_users"
  FOR SELECT
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.tenants.tenants_policy_Authenticated users can read tenants
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  tenants
-- ============================================================================
CREATE POLICY "Authenticated users can read tenants" ON "public"."tenants"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.tenants.tenants_policy_Public view tenants
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  tenants
-- ============================================================================
CREATE POLICY "Public view tenants" ON "public"."tenants"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- ============================================================================
-- Object:        public.tenants.tenants_policy_tenants_owner_update
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  tenants
-- ============================================================================
CREATE POLICY "tenants_owner_update" ON "public"."tenants"
  FOR UPDATE
  TO PUBLIC
  USING ((user_id = auth.uid()));

-- ============================================================================
-- Object:        public.tenants.tenants_policy_tenants_read_access
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  tenants
-- ============================================================================
CREATE POLICY "tenants_read_access" ON "public"."tenants"
  FOR SELECT
  TO PUBLIC
  USING (((user_id = auth.uid()) OR (id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid())))));

-- ============================================================================
-- Object:        public.tenants.tenants_policy_Users can view their own tenant profile
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  tenants
-- ============================================================================
CREATE POLICY "Users can view their own tenant profile" ON "public"."tenants"
  FOR SELECT
  TO PUBLIC
  USING ((user_id = auth.uid()));

-- ============================================================================
-- Object:        public.token_price_history.token_price_history_policy_token_price_history_insert_owner
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/token_price_history.sql
-- Dependencies:  token_price_history
-- ============================================================================
CREATE POLICY "token_price_history_insert_owner" ON "public"."token_price_history"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['owner'::text, 'superadmin'::text]))))));

-- ============================================================================
-- Object:        public.token_price_history.token_price_history_policy_token_price_history_read_all
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/token_price_history.sql
-- Dependencies:  token_price_history
-- ============================================================================
CREATE POLICY "token_price_history_read_all" ON "public"."token_price_history"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.token_prices.token_prices_policy_token_prices_read_all
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/token_prices.sql
-- Dependencies:  token_prices
-- ============================================================================
CREATE POLICY "token_prices_read_all" ON "public"."token_prices"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.token_prices.token_prices_policy_token_prices_update_owner
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/token_prices.sql
-- Dependencies:  token_prices
-- ============================================================================
CREATE POLICY "token_prices_update_owner" ON "public"."token_prices"
  FOR ALL
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['owner'::text, 'superadmin'::text]))))));

-- ============================================================================
-- Object:        public.topup_requests.topup_requests_policy_Enable all for owner
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/topup_requests.sql
-- Dependencies:  topup_requests
-- ============================================================================
CREATE POLICY "Enable all for owner" ON "public"."topup_requests"
  FOR ALL
  TO PUBLIC
  USING (((auth.jwt() ->> 'email'::text) = 'admin1@sentralogis.com'::text));

-- ============================================================================
-- Object:        public.topup_requests.topup_requests_policy_Enable insert for authenticated users
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/topup_requests.sql
-- Dependencies:  topup_requests
-- ============================================================================
CREATE POLICY "Enable insert for authenticated users" ON "public"."topup_requests"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.role() = 'authenticated'::text));

-- ============================================================================
-- Object:        public.topup_requests.topup_requests_policy_Enable select for users based on tenant_id
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/topup_requests.sql
-- Dependencies:  topup_requests
-- ============================================================================
CREATE POLICY "Enable select for users based on tenant_id" ON "public"."topup_requests"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() IN ( SELECT tenants.user_id
   FROM public.tenants
  WHERE (tenants.id = topup_requests.tenant_id))));

-- ============================================================================
-- Object:        public.vendor_invoices.vendor_invoices_policy_vi_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/vendor_invoices.sql
-- Dependencies:  vendor_invoices
-- ============================================================================
CREATE POLICY "vi_isolation" ON "public"."vendor_invoices"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.warehouse_staff_attendance.warehouse_staff_attendance_policy_wsa_insert_policy
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/warehouse_staff_attendance.sql
-- Dependencies:  warehouse_staff_attendance
-- ============================================================================
CREATE POLICY "wsa_insert_policy" ON "public"."warehouse_staff_attendance"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((user_id = auth.uid()) AND (tenant_id = ( SELECT warehouse_staff_attendance.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));

-- ============================================================================
-- Object:        public.warehouse_staff_attendance.warehouse_staff_attendance_policy_wsa_select_policy
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/warehouse_staff_attendance.sql
-- Dependencies:  warehouse_staff_attendance
-- ============================================================================
CREATE POLICY "wsa_select_policy" ON "public"."warehouse_staff_attendance"
  FOR SELECT
  TO PUBLIC
  USING (((tenant_id = ( SELECT warehouse_staff_attendance.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND ((user_id = auth.uid()) OR (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['superadmin'::text, 'director'::text, 'admin_sbu'::text])))));

-- ============================================================================
-- Object:        public.warehouse_staff_attendance.warehouse_staff_attendance_policy_wsa_update_policy
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/warehouse_staff_attendance.sql
-- Dependencies:  warehouse_staff_attendance
-- ============================================================================
CREATE POLICY "wsa_update_policy" ON "public"."warehouse_staff_attendance"
  FOR UPDATE
  TO PUBLIC
  USING (((user_id = auth.uid()) AND (tenant_id = ( SELECT warehouse_staff_attendance.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));

-- ============================================================================
-- Object:        public.warehouse_users.warehouse_users_policy_Owners manage assignments
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/warehouse_users.sql
-- Dependencies:  warehouse_users
-- ============================================================================
CREATE POLICY "Owners manage assignments" ON "public"."warehouse_users"
  FOR ALL
  TO PUBLIC
  USING ((warehouse_id IN ( SELECT warehouses.id
   FROM public.warehouses
  WHERE (warehouses.tenant_id = auth.uid()))));

-- ============================================================================
-- Object:        public.warehouses.warehouses_policy_Staff can view their assigned warehouse
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/warehouses.sql
-- Dependencies:  warehouses
-- ============================================================================
CREATE POLICY "Staff can view their assigned warehouse" ON "public"."warehouses"
  FOR SELECT
  TO PUBLIC
  USING ((id IN ( SELECT staff.warehouse_id
   FROM public.staff
  WHERE (staff.user_id = auth.uid()))));

-- ============================================================================
-- Object:        public.warehouses.warehouses_policy_Tenants can view their own warehouses
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/warehouses.sql
-- Dependencies:  warehouses
-- ============================================================================
CREATE POLICY "Tenants can view their own warehouses" ON "public"."warehouses"
  FOR SELECT
  TO PUBLIC
  USING ((tenant_id IN ( SELECT tenants.id
   FROM public.tenants
  WHERE (tenants.user_id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_billing_invoice_details.wh_billing_invoice_details_policy_tenant_isolation_wh_billing_invoice_details
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_billing_invoice_details.sql
-- Dependencies:  wh_billing_invoice_details
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_billing_invoice_details" ON "public"."wh_billing_invoice_details"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_billing_invoice_details.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_billing_invoices.wh_billing_invoices_policy_tenant_isolation_wh_billing_invoices
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_billing_invoices.sql
-- Dependencies:  wh_billing_invoices
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_billing_invoices" ON "public"."wh_billing_invoices"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_billing_invoices.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_daily_stock_snapshots.wh_daily_stock_snapshots_policy_tenant_isolation_wh_daily_stock_snapshots
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_daily_stock_snapshots.sql
-- Dependencies:  wh_daily_stock_snapshots
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_daily_stock_snapshots" ON "public"."wh_daily_stock_snapshots"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_daily_stock_snapshots.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_inbound_damage_records.wh_inbound_damage_records_policy_Enable public ALL on damage_records
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inbound_damage_records.sql
-- Dependencies:  wh_inbound_damage_records
-- ============================================================================
CREATE POLICY "Enable public ALL on damage_records" ON "public"."wh_inbound_damage_records"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_inbound_receipt_items.wh_inbound_receipt_items_policy_Enable public SELECT for inbound receipt items
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inbound_receipt_items.sql
-- Dependencies:  wh_inbound_receipt_items
-- ============================================================================
CREATE POLICY "Enable public SELECT for inbound receipt items" ON "public"."wh_inbound_receipt_items"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_inbound_receipt_items.wh_inbound_receipt_items_policy_Enable public UPDATE for inbound receipt items
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inbound_receipt_items.sql
-- Dependencies:  wh_inbound_receipt_items
-- ============================================================================
CREATE POLICY "Enable public UPDATE for inbound receipt items" ON "public"."wh_inbound_receipt_items"
  FOR UPDATE
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_inbound_receipt_items.wh_inbound_receipt_items_policy_tenant_isolation_wh_inb_itm
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inbound_receipt_items.sql
-- Dependencies:  wh_inbound_receipt_items
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_inb_itm" ON "public"."wh_inbound_receipt_items"
  FOR ALL
  TO PUBLIC
  USING ((receipt_id IN ( SELECT wh_inbound_receipts.id
   FROM public.wh_inbound_receipts
  WHERE (wh_inbound_receipts.tenant_id = ( SELECT wh_inbound_receipts.tenant_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));

-- ============================================================================
-- Object:        public.wh_inbound_receipts.wh_inbound_receipts_policy_Enable public SELECT for inbound receipts
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  wh_inbound_receipts
-- ============================================================================
CREATE POLICY "Enable public SELECT for inbound receipts" ON "public"."wh_inbound_receipts"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_inbound_receipts.wh_inbound_receipts_policy_tenant_isolation_wh_inb_rec
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inbound_receipts.sql
-- Dependencies:  wh_inbound_receipts
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_inb_rec" ON "public"."wh_inbound_receipts"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_inbound_receipts.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_internal_movements.wh_internal_movements_policy_Enable public SELECT for internal movements
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  wh_internal_movements
-- ============================================================================
CREATE POLICY "Enable public SELECT for internal movements" ON "public"."wh_internal_movements"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_internal_movements.wh_internal_movements_policy_Enable public UPDATE for internal movements
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_internal_movements.sql
-- Dependencies:  wh_internal_movements
-- ============================================================================
CREATE POLICY "Enable public UPDATE for internal movements" ON "public"."wh_internal_movements"
  FOR UPDATE
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_inventory.wh_inventory_policy_Enable public INSERT for inventory
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
CREATE POLICY "Enable public INSERT for inventory" ON "public"."wh_inventory"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.wh_inventory.wh_inventory_policy_Enable public UPDATE for inventory
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
CREATE POLICY "Enable public UPDATE for inventory" ON "public"."wh_inventory"
  FOR UPDATE
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_inventory.wh_inventory_policy_tenant_isolation_wh_inventory
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_inventory" ON "public"."wh_inventory"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_inventory.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_inventory_movements.wh_inventory_movements_policy_tenant_isolation_wh_inventory_movements
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_inventory_movements.sql
-- Dependencies:  wh_inventory_movements
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_inventory_movements" ON "public"."wh_inventory_movements"
  FOR ALL
  TO PUBLIC
  USING ((inventory_id IN ( SELECT wh_inventory.id
   FROM public.wh_inventory
  WHERE (wh_inventory.tenant_id = ( SELECT wh_inventory.tenant_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));

-- ============================================================================
-- Object:        public.wh_jo_staff_assignments.wh_jo_staff_assignments_policy_Enable ALL for authenticated
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_jo_staff_assignments.sql
-- Dependencies:  wh_jo_staff_assignments
-- ============================================================================
CREATE POLICY "Enable ALL for authenticated" ON "public"."wh_jo_staff_assignments"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_jo_staff_assignments.wh_jo_staff_assignments_policy_Enable public SELECT for assignments
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_jo_staff_assignments.sql
-- Dependencies:  wh_jo_staff_assignments
-- ============================================================================
CREATE POLICY "Enable public SELECT for assignments" ON "public"."wh_jo_staff_assignments"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_jo_staff_assignments.wh_jo_staff_assignments_policy_Enable public UPDATE for assignments
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_jo_staff_assignments.sql
-- Dependencies:  wh_jo_staff_assignments
-- ============================================================================
CREATE POLICY "Enable public UPDATE for assignments" ON "public"."wh_jo_staff_assignments"
  FOR UPDATE
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_loading_sessions.wh_loading_sessions_policy_Enable public ALL on loading_sessions
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_loading_sessions.sql
-- Dependencies:  wh_loading_sessions
-- ============================================================================
CREATE POLICY "Enable public ALL on loading_sessions" ON "public"."wh_loading_sessions"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_master_boxes.wh_master_boxes_policy_Enable all for authenticated users on wh_master_boxes
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_master_boxes.sql
-- Dependencies:  wh_master_boxes
-- ============================================================================
CREATE POLICY "Enable all for authenticated users on wh_master_boxes" ON "public"."wh_master_boxes"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_master_boxes.wh_master_boxes_policy_Enable read for authenticated users on wh_master_boxes
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_master_boxes.sql
-- Dependencies:  wh_master_boxes
-- ============================================================================
CREATE POLICY "Enable read for authenticated users on wh_master_boxes" ON "public"."wh_master_boxes"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_milestone_logs.wh_milestone_logs_policy_Enable public INSERT for milestone logs
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_milestone_logs.sql
-- Dependencies:  wh_milestone_logs
-- ============================================================================
CREATE POLICY "Enable public INSERT for milestone logs" ON "public"."wh_milestone_logs"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.wh_milestone_logs.wh_milestone_logs_policy_tenant_isolation_wh_logs
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_milestone_logs.sql
-- Dependencies:  wh_milestone_logs
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_logs" ON "public"."wh_milestone_logs"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_milestone_logs.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_outbound_damage_records.wh_outbound_damage_records_policy_Enable public ALL for outbound damage records
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_outbound_damage_records.sql
-- Dependencies:  wh_outbound_damage_records
-- ============================================================================
CREATE POLICY "Enable public ALL for outbound damage records" ON "public"."wh_outbound_damage_records"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_outbound_shipment_items.wh_outbound_shipment_items_policy_Enable public SELECT for outbound shipment items
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_outbound_shipment_items.sql
-- Dependencies:  wh_outbound_shipment_items
-- ============================================================================
CREATE POLICY "Enable public SELECT for outbound shipment items" ON "public"."wh_outbound_shipment_items"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_outbound_shipment_items.wh_outbound_shipment_items_policy_Enable public UPDATE for outbound shipment items
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_outbound_shipment_items.sql
-- Dependencies:  wh_outbound_shipment_items
-- ============================================================================
CREATE POLICY "Enable public UPDATE for outbound shipment items" ON "public"."wh_outbound_shipment_items"
  FOR UPDATE
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_outbound_shipment_items.wh_outbound_shipment_items_policy_tenant_isolation_wh_out_itm
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_outbound_shipment_items.sql
-- Dependencies:  wh_outbound_shipment_items
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_out_itm" ON "public"."wh_outbound_shipment_items"
  FOR ALL
  TO PUBLIC
  USING ((shipment_id IN ( SELECT wh_outbound_shipments.id
   FROM public.wh_outbound_shipments
  WHERE (wh_outbound_shipments.tenant_id = ( SELECT wh_outbound_shipments.tenant_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));

-- ============================================================================
-- Object:        public.wh_outbound_shipments.wh_outbound_shipments_policy_Enable public SELECT for outbound shipments
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  wh_outbound_shipments
-- ============================================================================
CREATE POLICY "Enable public SELECT for outbound shipments" ON "public"."wh_outbound_shipments"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_outbound_shipments.wh_outbound_shipments_policy_Enable public UPDATE for outbound shipments
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  wh_outbound_shipments
-- ============================================================================
CREATE POLICY "Enable public UPDATE for outbound shipments" ON "public"."wh_outbound_shipments"
  FOR UPDATE
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_outbound_shipments.wh_outbound_shipments_policy_tenant_isolation_wh_out_shp
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_outbound_shipments.sql
-- Dependencies:  wh_outbound_shipments
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_out_shp" ON "public"."wh_outbound_shipments"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_outbound_shipments.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_parcel_inbound.wh_parcel_inbound_policy_Enable all for authenticated users on wh_parcel_inbound
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_parcel_inbound.sql
-- Dependencies:  wh_parcel_inbound
-- ============================================================================
CREATE POLICY "Enable all for authenticated users on wh_parcel_inbound" ON "public"."wh_parcel_inbound"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_parcel_inbound.wh_parcel_inbound_policy_Enable read for authenticated users on wh_parcel_inbound
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_parcel_inbound.sql
-- Dependencies:  wh_parcel_inbound
-- ============================================================================
CREATE POLICY "Enable read for authenticated users on wh_parcel_inbound" ON "public"."wh_parcel_inbound"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_picking_details.wh_picking_details_policy_tenant_isolation_wh_picking_details
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_picking_details.sql
-- Dependencies:  wh_picking_details
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_picking_details" ON "public"."wh_picking_details"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_picking_details.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_picking_lists.wh_picking_lists_policy_tenant_isolation_wh_picking_lists
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_picking_lists.sql
-- Dependencies:  wh_picking_lists
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_picking_lists" ON "public"."wh_picking_lists"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_picking_lists.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_receipt_details.wh_receipt_details_policy_tenant_isolation_wh_receipt_details
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_receipt_details.sql
-- Dependencies:  wh_receipt_details
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_receipt_details" ON "public"."wh_receipt_details"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_receipt_details.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_receipt_orders.wh_receipt_orders_policy_tenant_isolation_wh_receipt_orders
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_receipt_orders.sql
-- Dependencies:  wh_receipt_orders
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_receipt_orders" ON "public"."wh_receipt_orders"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_receipt_orders.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_repacking_conversions.wh_repacking_conversions_policy_Tenant admins and warehouse ops can manage repacking conversion
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  wh_repacking_conversions
-- ============================================================================
CREATE POLICY "Tenant admins and warehouse ops can manage repacking conversion" ON "public"."wh_repacking_conversions"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_repacking_conversions.wh_repacking_conversions_policy_Tenant users can view repacking conversions
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  wh_repacking_conversions
-- ============================================================================
CREATE POLICY "Tenant users can view repacking conversions" ON "public"."wh_repacking_conversions"
  FOR SELECT
  TO PUBLIC
  USING ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_repacking_items.wh_repacking_items_policy_Enable public SELECT for repacking items
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  wh_repacking_items
-- ============================================================================
CREATE POLICY "Enable public SELECT for repacking items" ON "public"."wh_repacking_items"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_repacking_items.wh_repacking_items_policy_Enable public UPDATE for repacking items
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  wh_repacking_items
-- ============================================================================
CREATE POLICY "Enable public UPDATE for repacking items" ON "public"."wh_repacking_items"
  FOR UPDATE
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_repacking_items.wh_repacking_items_policy_wh_repacking_items_order_access_delete
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  wh_repacking_items
-- ============================================================================
CREATE POLICY "wh_repacking_items_order_access_delete" ON "public"."wh_repacking_items"
  FOR DELETE
  TO PUBLIC
  USING ((repacking_order_id IN ( SELECT wh_repacking_orders.id
   FROM public.wh_repacking_orders
  WHERE (wh_repacking_orders.tenant_id = ( SELECT wh_repacking_orders.tenant_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));

-- ============================================================================
-- Object:        public.wh_repacking_items.wh_repacking_items_policy_wh_repacking_items_order_access_insert
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  wh_repacking_items
-- ============================================================================
CREATE POLICY "wh_repacking_items_order_access_insert" ON "public"."wh_repacking_items"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.wh_repacking_orders
  WHERE
    ((wh_repacking_orders.id = wh_repacking_items.repacking_order_id) AND (wh_repacking_orders.tenant_id = wh_repacking_items.tenant_id) AND (wh_repacking_orders.warehouse_id =
    wh_repacking_items.warehouse_id) AND (EXISTS ( SELECT 1
           FROM public.tenant_users
          WHERE ((tenant_users.tenant_id = wh_repacking_orders.tenant_id) AND (tenant_users.user_id = auth.uid()))))))));

-- ============================================================================
-- Object:        public.wh_repacking_items.wh_repacking_items_policy_wh_repacking_items_order_access_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  wh_repacking_items
-- ============================================================================
CREATE POLICY "wh_repacking_items_order_access_select" ON "public"."wh_repacking_items"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.wh_repacking_orders
  WHERE ((wh_repacking_orders.id = wh_repacking_items.repacking_order_id) AND (EXISTS ( SELECT 1
           FROM public.tenant_users
          WHERE ((tenant_users.tenant_id = wh_repacking_orders.tenant_id) AND (tenant_users.user_id = auth.uid()))))))));

-- ============================================================================
-- Object:        public.wh_repacking_items.wh_repacking_items_policy_wh_repacking_items_order_access_update
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_items.sql
-- Dependencies:  wh_repacking_items
-- ============================================================================
CREATE POLICY "wh_repacking_items_order_access_update" ON "public"."wh_repacking_items"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.wh_repacking_orders
  WHERE
    ((wh_repacking_orders.id = wh_repacking_items.repacking_order_id) AND (wh_repacking_orders.tenant_id = wh_repacking_items.tenant_id) AND (wh_repacking_orders.warehouse_id =
    wh_repacking_items.warehouse_id) AND (EXISTS ( SELECT 1
           FROM public.tenant_users
          WHERE ((tenant_users.tenant_id = wh_repacking_orders.tenant_id) AND (tenant_users.user_id = auth.uid()))))))));

-- ============================================================================
-- Object:        public.wh_repacking_orders.wh_repacking_orders_policy_Enable public SELECT for repacking orders
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
CREATE POLICY "Enable public SELECT for repacking orders" ON "public"."wh_repacking_orders"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_repacking_orders.wh_repacking_orders_policy_Enable public UPDATE for repacking orders
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
CREATE POLICY "Enable public UPDATE for repacking orders" ON "public"."wh_repacking_orders"
  FOR UPDATE
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_repacking_orders.wh_repacking_orders_policy_wh_repacking_orders_tenant_users_delete
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
CREATE POLICY "wh_repacking_orders_tenant_users_delete" ON "public"."wh_repacking_orders"
  FOR DELETE
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_repacking_orders.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_repacking_orders.wh_repacking_orders_policy_wh_repacking_orders_tenant_users_insert
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
CREATE POLICY "wh_repacking_orders_tenant_users_insert" ON "public"."wh_repacking_orders"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.tenant_id = wh_repacking_orders.tenant_id) AND (tenant_users.user_id = auth.uid()))))));

-- ============================================================================
-- Object:        public.wh_repacking_orders.wh_repacking_orders_policy_wh_repacking_orders_tenant_users_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
CREATE POLICY "wh_repacking_orders_tenant_users_select" ON "public"."wh_repacking_orders"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.tenant_id = wh_repacking_orders.tenant_id) AND (tenant_users.user_id = auth.uid())))));

-- ============================================================================
-- Object:        public.wh_repacking_orders.wh_repacking_orders_policy_wh_repacking_orders_tenant_users_update
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_repacking_orders.sql
-- Dependencies:  wh_repacking_orders
-- ============================================================================
CREATE POLICY "wh_repacking_orders_tenant_users_update" ON "public"."wh_repacking_orders"
  FOR UPDATE
  TO PUBLIC
  USING (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.tenant_id = wh_repacking_orders.tenant_id) AND (tenant_users.user_id = auth.uid()))))));

-- ============================================================================
-- Object:        public.wh_staff_attendance.wh_staff_attendance_policy_Enable ALL for authenticated
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_staff_attendance.sql
-- Dependencies:  wh_staff_attendance
-- ============================================================================
CREATE POLICY "Enable ALL for authenticated" ON "public"."wh_staff_attendance"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_staff_attendance.wh_staff_attendance_policy_Enable public INSERT for attendance
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_staff_attendance.sql
-- Dependencies:  wh_staff_attendance
-- ============================================================================
CREATE POLICY "Enable public INSERT for attendance" ON "public"."wh_staff_attendance"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.wh_staff_attendance.wh_staff_attendance_policy_Enable public SELECT for attendance
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_staff_attendance.sql
-- Dependencies:  wh_staff_attendance
-- ============================================================================
CREATE POLICY "Enable public SELECT for attendance" ON "public"."wh_staff_attendance"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_staff_attendance.wh_staff_attendance_policy_Enable public UPDATE for attendance
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_staff_attendance.sql
-- Dependencies:  wh_staff_attendance
-- ============================================================================
CREATE POLICY "Enable public UPDATE for attendance" ON "public"."wh_staff_attendance"
  FOR UPDATE
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_task_items.wh_task_items_policy_tenant_isolation_wh_task_items
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_task_items.sql
-- Dependencies:  wh_task_items
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_task_items" ON "public"."wh_task_items"
  FOR ALL
  TO PUBLIC
  USING ((task_id IN ( SELECT wh_tasks.id
   FROM public.wh_tasks
  WHERE (wh_tasks.tenant_id = ( SELECT wh_tasks.tenant_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));

-- ============================================================================
-- Object:        public.wh_tasks.wh_tasks_policy_tenant_isolation_wh_tasks
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_tasks.sql
-- Dependencies:  wh_tasks
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_tasks" ON "public"."wh_tasks"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_tasks.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_temperature_alerts.wh_temperature_alerts_policy_tenant_isolation_wh_temperature_alerts
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_temperature_alerts.sql
-- Dependencies:  wh_temperature_alerts
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_temperature_alerts" ON "public"."wh_temperature_alerts"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_temperature_alerts.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_temperature_logs.wh_temperature_logs_policy_tenant_isolation_wh_temperature_logs
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_temperature_logs.sql
-- Dependencies:  wh_temperature_logs
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_temperature_logs" ON "public"."wh_temperature_logs"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_temperature_logs.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_transfer_details.wh_transfer_details_policy_tenant_isolation_wh_transfer_details
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_transfer_details.sql
-- Dependencies:  wh_transfer_details
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_transfer_details" ON "public"."wh_transfer_details"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_transfer_details.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_transfer_orders.wh_transfer_orders_policy_tenant_isolation_wh_transfer_orders
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_transfer_orders.sql
-- Dependencies:  wh_transfer_orders
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_transfer_orders" ON "public"."wh_transfer_orders"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_transfer_orders.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_transformation_components.wh_transformation_components_policy_tenant_isolation_wh_transformation_components
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_transformation_components.sql
-- Dependencies:  wh_transformation_components
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_transformation_components" ON "public"."wh_transformation_components"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_transformation_components.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_transformation_orders.wh_transformation_orders_policy_tenant_isolation_wh_transformation_orders
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_transformation_orders.sql
-- Dependencies:  wh_transformation_orders
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_transformation_orders" ON "public"."wh_transformation_orders"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_transformation_orders.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_transformation_outputs.wh_transformation_outputs_policy_tenant_isolation_wh_transformation_outputs
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_transformation_outputs.sql
-- Dependencies:  wh_transformation_outputs
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_transformation_outputs" ON "public"."wh_transformation_outputs"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_transformation_outputs.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_unloading_sessions.wh_unloading_sessions_policy_Enable public ALL on unloading_sessions
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_unloading_sessions.sql
-- Dependencies:  wh_unloading_sessions
-- ============================================================================
CREATE POLICY "Enable public ALL on unloading_sessions" ON "public"."wh_unloading_sessions"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wh_vas_orders.wh_vas_orders_policy_tenant_isolation_wh_vas
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_vas_orders.sql
-- Dependencies:  wh_vas_orders
-- ============================================================================
CREATE POLICY "tenant_isolation_wh_vas" ON "public"."wh_vas_orders"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT wh_vas_orders.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

-- ============================================================================
-- Object:        public.wh_wa_notifications.wh_wa_notifications_policy_Enable public ALL on wh_wa_notifications
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wh_wa_notifications.sql
-- Dependencies:  wh_wa_notifications
-- ============================================================================
CREATE POLICY "Enable public ALL on wh_wa_notifications" ON "public"."wh_wa_notifications"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_audit_logs.wo_audit_logs_policy_audit_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_audit_logs.sql
-- Dependencies:  wo_audit_logs
-- ============================================================================
CREATE POLICY "audit_isolation" ON "public"."wo_audit_logs"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_audit_logs.wo_audit_logs_policy_wo_audit_logs_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_audit_logs.sql
-- Dependencies:  wo_audit_logs
-- ============================================================================
CREATE POLICY "wo_audit_logs_isolation" ON "public"."wo_audit_logs"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_audit_logs.wo_audit_logs_policy_wo_audit_logs_tenant_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_audit_logs.sql
-- Dependencies:  wo_audit_logs
-- ============================================================================
CREATE POLICY "wo_audit_logs_tenant_isolation" ON "public"."wo_audit_logs"
  FOR SELECT
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.wo_inventory_ledger.wo_inventory_ledger_policy_ledger_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_inventory_ledger.sql
-- Dependencies:  wo_inventory_ledger
-- ============================================================================
CREATE POLICY "ledger_isolation" ON "public"."wo_inventory_ledger"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_inventory_ledger.wo_inventory_ledger_policy_wo_inventory_ledger_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_inventory_ledger.sql
-- Dependencies:  wo_inventory_ledger
-- ============================================================================
CREATE POLICY "wo_inventory_ledger_isolation" ON "public"."wo_inventory_ledger"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_item_manifests.wo_item_manifests_policy_Enable public SELECT for wo_item_manifests
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_item_manifests.sql
-- Dependencies:  wo_item_manifests
-- ============================================================================
CREATE POLICY "Enable public SELECT for wo_item_manifests" ON "public"."wo_item_manifests"
  FOR SELECT
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_item_manifests.wo_item_manifests_policy_wo_item_manifests_all
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_item_manifests.sql
-- Dependencies:  wo_item_manifests
-- ============================================================================
CREATE POLICY "wo_item_manifests_all" ON "public"."wo_item_manifests"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Object:        public.wo_items.wo_items_policy_driver_portal_wo_items_select
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_items.sql
-- Dependencies:  wo_items
-- ============================================================================
CREATE POLICY "driver_portal_wo_items_select" ON "public"."wo_items"
  FOR SELECT
  TO PUBLIC
  USING ((auth.role() = 'anon'::text));

-- ============================================================================
-- Object:        public.wo_items.wo_items_policy_tenant_access_wo_items
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_items.sql
-- Dependencies:  wo_items
-- ============================================================================
CREATE POLICY "tenant_access_wo_items" ON "public"."wo_items"
  FOR ALL
  TO PUBLIC
  USING ((tenant_id = ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid())
 LIMIT 1)));

-- ============================================================================
-- Object:        public.wo_items.wo_items_policy_tr_wo_items_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_items.sql
-- Dependencies:  wo_items
-- ============================================================================
CREATE POLICY "tr_wo_items_isolation" ON "public"."wo_items"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));

-- ============================================================================
-- Object:        public.wo_job_order_items.wo_job_order_items_policy_jo_items_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_job_order_items.sql
-- Dependencies:  wo_job_order_items
-- ============================================================================
CREATE POLICY "jo_items_isolation" ON "public"."wo_job_order_items"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_job_order_items.wo_job_order_items_policy_wo_job_order_items_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_job_order_items.sql
-- Dependencies:  wo_job_order_items
-- ============================================================================
CREATE POLICY "wo_job_order_items_isolation" ON "public"."wo_job_order_items"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_job_orders.wo_job_orders_policy_jo_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_job_orders
-- ============================================================================
CREATE POLICY "jo_isolation" ON "public"."wo_job_orders"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_job_orders.wo_job_orders_policy_wo_job_orders_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_job_orders.sql
-- Dependencies:  wo_job_orders
-- ============================================================================
CREATE POLICY "wo_job_orders_isolation" ON "public"."wo_job_orders"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_monitoring_events.wo_monitoring_events_policy_monitoring_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_monitoring_events.sql
-- Dependencies:  wo_monitoring_events
-- ============================================================================
CREATE POLICY "monitoring_isolation" ON "public"."wo_monitoring_events"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_monitoring_events.wo_monitoring_events_policy_wo_monitoring_events_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_monitoring_events.sql
-- Dependencies:  wo_monitoring_events
-- ============================================================================
CREATE POLICY "wo_monitoring_events_isolation" ON "public"."wo_monitoring_events"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_organization_users.wo_organization_users_policy_org_users_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_organization_users.sql
-- Dependencies:  wo_organization_users
-- ============================================================================
CREATE POLICY "org_users_isolation" ON "public"."wo_organization_users"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_organization_users.wo_organization_users_policy_wo_org_users_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_organization_users.sql
-- Dependencies:  wo_organization_users
-- ============================================================================
CREATE POLICY "wo_org_users_isolation" ON "public"."wo_organization_users"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_organizations.wo_organizations_policy_org_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_organizations.sql
-- Dependencies:  wo_organizations
-- ============================================================================
CREATE POLICY "org_isolation" ON "public"."wo_organizations"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_organizations.wo_organizations_policy_wo_org_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_organizations.sql
-- Dependencies:  wo_organizations
-- ============================================================================
CREATE POLICY "wo_org_isolation" ON "public"."wo_organizations"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_status_history.wo_status_history_policy_status_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_status_history.sql
-- Dependencies:  wo_status_history
-- ============================================================================
CREATE POLICY "status_isolation" ON "public"."wo_status_history"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_status_history.wo_status_history_policy_wo_status_history_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_status_history.sql
-- Dependencies:  wo_status_history
-- ============================================================================
CREATE POLICY "wo_status_history_isolation" ON "public"."wo_status_history"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_work_order_items.wo_work_order_items_policy_wo_items_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_work_order_items.sql
-- Dependencies:  wo_work_order_items
-- ============================================================================
CREATE POLICY "wo_items_isolation" ON "public"."wo_work_order_items"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_work_order_items.wo_work_order_items_policy_wo_work_order_items_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_work_order_items.sql
-- Dependencies:  wo_work_order_items
-- ============================================================================
CREATE POLICY "wo_work_order_items_isolation" ON "public"."wo_work_order_items"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_work_orders.wo_work_orders_policy_wo_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_work_orders
-- ============================================================================
CREATE POLICY "wo_isolation" ON "public"."wo_work_orders"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_work_orders.wo_work_orders_policy_wo_work_orders_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_work_orders
-- ============================================================================
CREATE POLICY "wo_work_orders_isolation" ON "public"."wo_work_orders"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_workflow_instances.wo_workflow_instances_policy_wf_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_workflow_instances.sql
-- Dependencies:  wo_workflow_instances
-- ============================================================================
CREATE POLICY "wf_isolation" ON "public"."wo_workflow_instances"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.wo_workflow_instances.wo_workflow_instances_policy_wo_workflow_instances_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/wo_workflow_instances.sql
-- Dependencies:  wo_workflow_instances
-- ============================================================================
CREATE POLICY "wo_workflow_instances_isolation" ON "public"."wo_workflow_instances"
  FOR ALL
  TO PUBLIC
  USING (true);

-- ============================================================================
-- Object:        public.work_orders.work_orders_policy_tr_wo_isolation
-- Layer:         008 RLS
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders
-- ============================================================================
CREATE POLICY "tr_wo_isolation" ON "public"."work_orders"
  FOR ALL
  TO "authenticated"
  USING ((tenant_id = public.get_my_tenant_id()))
  WITH CHECK ((tenant_id = public.get_my_tenant_id()));
