-- ============================================================================
-- SENTRALOGIS MODULAR LAYERED BASELINE MIGRATION
-- Layer:         007 Triggers
-- Architecture:  D8-02 Option B2 / D8-30 Ratified
-- Baseline:      9bd2c04ce64b5e5c1d4b71451e4bab4a03c93999
-- Generation:    Deterministic Static Formation (Delivery Unit 2 / D8-33)
-- Total Objects: 68
-- Description:   Table triggers and audit bindings
-- ============================================================================
-- ============================================================================
-- Object:        public.accounting_event_lines.trg_accounting_lines_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/accounting_event_lines.sql
-- Dependencies:  accounting_event_lines, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_accounting_lines_updated_at
  BEFORE UPDATE ON public.accounting_event_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.accounting_events.trg_accounting_events_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/accounting_events.sql
-- Dependencies:  accounting_events, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_accounting_events_updated_at
  BEFORE UPDATE ON public.accounting_events
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.accounting_providers.trg_accounting_providers_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/accounting_providers.sql
-- Dependencies:  accounting_providers, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_accounting_providers_updated_at
  BEFORE UPDATE ON public.accounting_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.chat_channels.trg_seed_channel_participants
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/chat_channels.sql
-- Dependencies:  chat_channels, public.fn_seed_channel_participants
-- ============================================================================
CREATE TRIGGER trg_seed_channel_participants
  AFTER INSERT ON public.chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_seed_channel_participants();

-- ============================================================================
-- Object:        public.crm_deals.trg_auto_convert_deal_won
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/crm_deals.sql
-- Dependencies:  crm_deals, public.trg_fn_update_entity_on_deal_won
-- ============================================================================
CREATE TRIGGER trg_auto_convert_deal_won
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_update_entity_on_deal_won();

-- ============================================================================
-- Object:        public.crm_deals.trg_crm_deals_set_updated_by
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/crm_deals.sql
-- Dependencies:  crm_deals, public.set_updated_by_and_time
-- ============================================================================
CREATE TRIGGER trg_crm_deals_set_updated_by
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_by_and_time();

-- ============================================================================
-- Object:        public.crm_quotation_items.trg_before_quotation_items_section
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/crm_quotation_items.sql
-- Dependencies:  crm_quotation_items, public.trg_fn_before_quotation_items_section
-- ============================================================================
CREATE TRIGGER trg_before_quotation_items_section
  BEFORE INSERT OR UPDATE OF section_id, sbu_cluster ON public.crm_quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_before_quotation_items_section();

-- ============================================================================
-- Object:        public.crm_quotation_items.trg_calc_quotation_item_total
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/crm_quotation_items.sql
-- Dependencies:  crm_quotation_items, public.trg_fn_calc_quotation_item_total
-- ============================================================================
CREATE TRIGGER trg_calc_quotation_item_total
  BEFORE INSERT OR UPDATE ON public.crm_quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_calc_quotation_item_total();

-- ============================================================================
-- Object:        public.crm_quotation_items.trg_rollup_quotation_sections_and_totals
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/crm_quotation_items.sql
-- Dependencies:  crm_quotation_items, public.trg_fn_rollup_quotation_sections_and_totals
-- ============================================================================
CREATE TRIGGER trg_rollup_quotation_sections_and_totals
  AFTER INSERT OR DELETE OR UPDATE ON public.crm_quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_rollup_quotation_sections_and_totals();

-- ============================================================================
-- Object:        public.crm_quotation_sections.trg_check_all_sections_approved
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/crm_quotation_sections.sql
-- Dependencies:  crm_quotation_sections, public.trg_fn_check_all_sections_approved
-- ============================================================================
CREATE TRIGGER trg_check_all_sections_approved
  AFTER INSERT OR UPDATE OF approval_status ON public.crm_quotation_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_check_all_sections_approved();

-- ============================================================================
-- Object:        public.crm_quotation_sections.trg_crm_quotation_sections_set_updated_by
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/crm_quotation_sections.sql
-- Dependencies:  crm_quotation_sections, public.set_updated_by_and_time
-- ============================================================================
CREATE TRIGGER trg_crm_quotation_sections_set_updated_by
  BEFORE UPDATE ON public.crm_quotation_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_by_and_time();

-- ============================================================================
-- Object:        public.crm_quotations.trg_crm_quotations_set_updated_by
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/crm_quotations.sql
-- Dependencies:  crm_quotations, public.set_updated_by_and_time
-- ============================================================================
CREATE TRIGGER trg_crm_quotations_set_updated_by
  BEFORE UPDATE ON public.crm_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_by_and_time();

-- ============================================================================
-- Object:        public.crm_quotations.trg_sync_deal_on_quotation_sent
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/crm_quotations.sql
-- Dependencies:  crm_quotations, public.fn_sync_deal_on_quotation_sent
-- ============================================================================
CREATE TRIGGER trg_sync_deal_on_quotation_sent
  AFTER UPDATE OF status ON public.crm_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_deal_on_quotation_sent();

-- ============================================================================
-- Object:        public.crm_sbu_customer_rates.trg_crm_sbu_customer_rates_set_updated_by
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/crm_sbu_customer_rates.sql
-- Dependencies:  crm_sbu_customer_rates, public.set_updated_by_and_time
-- ============================================================================
CREATE TRIGGER trg_crm_sbu_customer_rates_set_updated_by
  BEFORE UPDATE ON public.crm_sbu_customer_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_by_and_time();

-- ============================================================================
-- Object:        public.fin_adjustments.trg_fin_adjustments_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fin_adjustments.sql
-- Dependencies:  fin_adjustments, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_fin_adjustments_updated_at
  BEFORE UPDATE ON public.fin_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.fin_ar_ap.trg_fin_ar_ap_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fin_ar_ap.sql
-- Dependencies:  fin_ar_ap, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_fin_ar_ap_updated_at
  BEFORE UPDATE ON public.fin_ar_ap
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.fin_billable_events.trg_fin_billable_events_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fin_billable_events.sql
-- Dependencies:  fin_billable_events, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_fin_billable_events_updated_at
  BEFORE UPDATE ON public.fin_billable_events
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.fin_invoice_lines.trg_fin_invoice_lines_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fin_invoice_lines.sql
-- Dependencies:  fin_invoice_lines, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_fin_invoice_lines_updated_at
  BEFORE UPDATE ON public.fin_invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.fin_invoices.trg_fin_invoices_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fin_invoices.sql
-- Dependencies:  fin_invoices, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_fin_invoices_updated_at
  BEFORE UPDATE ON public.fin_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.fin_payment_allocations.trg_fin_allocations_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fin_payment_allocations.sql
-- Dependencies:  fin_payment_allocations, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_fin_allocations_updated_at
  BEFORE UPDATE ON public.fin_payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.fin_payments.trg_fin_payments_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fin_payments.sql
-- Dependencies:  fin_payments, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_fin_payments_updated_at
  BEFORE UPDATE ON public.fin_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.fin_reconciliation_records.trg_fin_recon_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fin_reconciliation_records.sql
-- Dependencies:  fin_reconciliation_records, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_fin_recon_updated_at
  BEFORE UPDATE ON public.fin_reconciliation_records
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.fin_settlements.trg_fin_settlements_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fin_settlements.sql
-- Dependencies:  fin_settlements, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_fin_settlements_updated_at
  BEFORE UPDATE ON public.fin_settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.fw_consolidations.trg_fw_consolidations_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fw_consolidations.sql
-- Dependencies:  fw_consolidations, public.update_fw_tables_updated_at
-- ============================================================================
CREATE TRIGGER trg_fw_consolidations_updated_at
  BEFORE UPDATE ON public.fw_consolidations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fw_tables_updated_at();

-- ============================================================================
-- Object:        public.fw_consolidations.trg_generate_fw_consol_number
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fw_consolidations.sql
-- Dependencies:  fw_consolidations, public.generate_fw_consol_number
-- ============================================================================
CREATE TRIGGER trg_generate_fw_consol_number
  BEFORE INSERT ON public.fw_consolidations
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_fw_consol_number();

-- ============================================================================
-- Object:        public.fw_container_assignments.trg_fw_container_assignments_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fw_container_assignments.sql
-- Dependencies:  fw_container_assignments, public.update_fw_tables_updated_at
-- ============================================================================
CREATE TRIGGER trg_fw_container_assignments_updated_at
  BEFORE UPDATE ON public.fw_container_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fw_tables_updated_at();

-- ============================================================================
-- Object:        public.fw_container_items.trg_fw_container_items_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fw_container_items.sql
-- Dependencies:  fw_container_items, public.update_fw_tables_updated_at
-- ============================================================================
CREATE TRIGGER trg_fw_container_items_updated_at
  BEFORE UPDATE ON public.fw_container_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fw_tables_updated_at();

-- ============================================================================
-- Object:        public.fw_price_master.trg_fw_price_master_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/fw_price_master.sql
-- Dependencies:  fw_price_master, public.update_fw_tables_updated_at
-- ============================================================================
CREATE TRIGGER trg_fw_price_master_updated_at
  BEFORE UPDATE ON public.fw_price_master
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fw_tables_updated_at();

-- ============================================================================
-- Object:        public.inbound_headers.trg_inbound_completion_stock
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/inbound_headers.sql
-- Dependencies:  inbound_headers, public.fn_process_inbound_stock
-- ============================================================================
CREATE TRIGGER trg_inbound_completion_stock
  AFTER UPDATE ON public.inbound_headers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_process_inbound_stock();

-- ============================================================================
-- Object:        public.invoices.trg_set_wo_invoiced_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  invoices, public.set_wo_invoiced_at
-- ============================================================================
CREATE TRIGGER trg_set_wo_invoiced_at
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_wo_invoiced_at();

-- ============================================================================
-- Object:        public.invoices.trg_set_wo_invoiced_at_status
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  invoices, public.set_wo_invoiced_at_on_status_change
-- ============================================================================
CREATE TRIGGER trg_set_wo_invoiced_at_status
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_wo_invoiced_at_on_status_change();

-- ============================================================================
-- Object:        public.invoices.trigger_invoice_timestamps
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/invoices.sql
-- Dependencies:  invoices, public.set_invoice_timestamps
-- ============================================================================
CREATE TRIGGER trigger_invoice_timestamps
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_invoice_timestamps();

-- ============================================================================
-- Object:        public.jo_warehouse_assignments.update_jo_warehouse_assignments_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/jo_warehouse_assignments.sql
-- Dependencies:  jo_warehouse_assignments, public.update_updated_at_column
-- ============================================================================
CREATE TRIGGER update_jo_warehouse_assignments_updated_at
  BEFORE UPDATE ON public.jo_warehouse_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Object:        public.job_order_payments.trg_jo_payments_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/job_order_payments.sql
-- Dependencies:  job_order_payments, public.update_jo_payments_updated_at
-- ============================================================================
CREATE TRIGGER trg_jo_payments_updated_at
  BEFORE UPDATE ON public.job_order_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_jo_payments_updated_at();

-- ============================================================================
-- Object:        public.job_orders.trg_audit_job_orders
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders, public.log_wo_jo_changes
-- ============================================================================
CREATE TRIGGER trg_audit_job_orders
  AFTER INSERT OR UPDATE ON public.job_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_wo_jo_changes();

-- ============================================================================
-- Object:        public.job_orders.trg_auto_complete_wo
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders, public.check_and_update_wo_status
-- ============================================================================
CREATE TRIGGER trg_auto_complete_wo
  AFTER UPDATE OF status ON public.job_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_update_wo_status();

-- ============================================================================
-- Object:        public.job_orders.trg_deduct_tokens_on_jo_complete
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders, public.deduct_tokens_on_jo_complete
-- ============================================================================
CREATE TRIGGER trg_deduct_tokens_on_jo_complete
  AFTER UPDATE OF status ON public.job_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_tokens_on_jo_complete();

-- ============================================================================
-- Object:        public.job_orders.trg_job_orders_set_updated_by
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders, public.set_updated_by_and_time
-- ============================================================================
CREATE TRIGGER trg_job_orders_set_updated_by
  BEFORE UPDATE ON public.job_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_by_and_time();

-- ============================================================================
-- Object:        public.job_orders.trg_set_wo_ready_billing_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders, public.set_wo_ready_billing_at
-- ============================================================================
CREATE TRIGGER trg_set_wo_ready_billing_at
  AFTER UPDATE OF is_doc_finished, is_cost_finished ON public.job_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_wo_ready_billing_at();

-- ============================================================================
-- Object:        public.job_orders.trg_set_wo_ready_billing_at_insert
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/job_orders.sql
-- Dependencies:  job_orders, public.set_wo_ready_billing_at
-- ============================================================================
CREATE TRIGGER trg_set_wo_ready_billing_at_insert
  AFTER INSERT ON public.job_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_wo_ready_billing_at();

-- ============================================================================
-- Object:        public.md_driver_allowances.trg_md_driver_allowances_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/md_driver_allowances.sql
-- Dependencies:  md_driver_allowances, public.handle_updated_at
-- ============================================================================
CREATE TRIGGER trg_md_driver_allowances_updated_at
  BEFORE UPDATE ON public.md_driver_allowances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- Object:        public.md_product_categories.update_md_product_categories_modtime
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/md_product_categories.sql
-- Dependencies:  md_product_categories, public.update_md_product_categories_modtime
-- ============================================================================
CREATE TRIGGER update_md_product_categories_modtime
  BEFORE UPDATE ON public.md_product_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_md_product_categories_modtime();

-- ============================================================================
-- Object:        public.md_services.trigger_auto_create_coa_for_service
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/md_services.sql
-- Dependencies:  md_services, public.trg_auto_create_coa_for_service
-- ============================================================================
CREATE TRIGGER trigger_auto_create_coa_for_service
  BEFORE INSERT ON public.md_services
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_create_coa_for_service();

-- ============================================================================
-- Object:        public.md_warehouse_staff.trg_sync_warehouse_staff_roles
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/md_warehouse_staff.sql
-- Dependencies:  md_warehouse_staff, public.sync_warehouse_staff_roles
-- ============================================================================
CREATE TRIGGER trg_sync_warehouse_staff_roles
  BEFORE INSERT OR UPDATE ON public.md_warehouse_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_warehouse_staff_roles();

-- ============================================================================
-- Object:        public.party_contacts.trg_party_contacts_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/party_contacts.sql
-- Dependencies:  party_contacts, public.update_party_tables_updated_at
-- ============================================================================
CREATE TRIGGER trg_party_contacts_updated_at
  BEFORE UPDATE ON public.party_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_party_tables_updated_at();

-- ============================================================================
-- Object:        public.party_locations.trg_party_locations_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/party_locations.sql
-- Dependencies:  party_locations, public.update_party_tables_updated_at
-- ============================================================================
CREATE TRIGGER trg_party_locations_updated_at
  BEFORE UPDATE ON public.party_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_party_tables_updated_at();

-- ============================================================================
-- Object:        public.party_relationships.trg_party_relationships_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/party_relationships.sql
-- Dependencies:  party_relationships, public.update_party_tables_updated_at
-- ============================================================================
CREATE TRIGGER trg_party_relationships_updated_at
  BEFORE UPDATE ON public.party_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_party_tables_updated_at();

-- ============================================================================
-- Object:        public.party_roles.trg_party_roles_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/party_roles.sql
-- Dependencies:  party_roles, public.update_party_tables_updated_at
-- ============================================================================
CREATE TRIGGER trg_party_roles_updated_at
  BEFORE UPDATE ON public.party_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_party_tables_updated_at();

-- ============================================================================
-- Object:        public.pricing_rate_items.trg_pricing_rate_items_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/pricing_rate_items.sql
-- Dependencies:  pricing_rate_items, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_pricing_rate_items_updated_at
  BEFORE UPDATE ON public.pricing_rate_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.pricing_rate_versions.trg_pricing_rate_versions_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/pricing_rate_versions.sql
-- Dependencies:  pricing_rate_versions, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_pricing_rate_versions_updated_at
  BEFORE UPDATE ON public.pricing_rate_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.pricing_rates.trg_pricing_rates_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/pricing_rates.sql
-- Dependencies:  pricing_rates, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_pricing_rates_updated_at
  BEFORE UPDATE ON public.pricing_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.product_batches.trigger_batch_priority
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/product_batches.sql
-- Dependencies:  product_batches, public.set_batch_priority
-- ============================================================================
CREATE TRIGGER trigger_batch_priority
  BEFORE INSERT OR UPDATE ON public.product_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_batch_priority();

-- ============================================================================
-- Object:        public.products.trigger_update_cbm
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/products.sql
-- Dependencies:  products, public.update_product_cbm
-- ============================================================================
CREATE TRIGGER trigger_update_cbm
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_cbm();

-- ============================================================================
-- Object:        public.profiles.on_profile_role_updated
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/profiles.sql
-- Dependencies:  profiles, public.sync_user_role
-- ============================================================================
CREATE TRIGGER on_profile_role_updated
  AFTER UPDATE OF ROLE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_role();

-- ============================================================================
-- Object:        public.sales_order_line_items.trg_so_line_items_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/sales_order_line_items.sql
-- Dependencies:  sales_order_line_items, public.fn_pricing_set_updated_at
-- ============================================================================
CREATE TRIGGER trg_so_line_items_updated_at
  BEFORE UPDATE ON public.sales_order_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pricing_set_updated_at();

-- ============================================================================
-- Object:        public.storage_locations.update_storage_locations_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/storage_locations.sql
-- Dependencies:  storage_locations, public.update_updated_at_column
-- ============================================================================
CREATE TRIGGER update_storage_locations_updated_at
  BEFORE UPDATE ON public.storage_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Object:        public.storage_zones.update_storage_zones_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/storage_zones.sql
-- Dependencies:  storage_zones, public.update_updated_at_column
-- ============================================================================
CREATE TRIGGER update_storage_zones_updated_at
  BEFORE UPDATE ON public.storage_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Object:        public.tenants.token_grant_log
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  tenants, public.log_token_grant
-- ============================================================================
CREATE TRIGGER token_grant_log
  AFTER UPDATE ON public.tenants
  FOR EACH ROW
  WHEN ((new.token_balance > old.token_balance))
  EXECUTE FUNCTION public.log_token_grant();

-- ============================================================================
-- Object:        public.tenants.token_transaction_trigger
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  tenants, public.auto_log_token_transaction
-- ============================================================================
CREATE TRIGGER token_transaction_trigger
  AFTER UPDATE OF token_balance ON public.tenants
  FOR EACH ROW
  WHEN ((old.token_balance IS DISTINCT FROM new.token_balance))
  EXECUTE FUNCTION public.auto_log_token_transaction();

-- ============================================================================
-- Object:        public.tenants.trg_tenants_sync_md_tenants
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/tenants.sql
-- Dependencies:  tenants, public.fn_sync_md_tenants
-- ============================================================================
CREATE TRIGGER trg_tenants_sync_md_tenants
  AFTER INSERT OR DELETE OR UPDATE OF name, tenant_code, status, updated_at ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_md_tenants();

-- ============================================================================
-- Object:        public.wh_inventory.trg_wh_log_movement
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory, public.fn_wh_log_movement
-- ============================================================================
CREATE TRIGGER trg_wh_log_movement
  AFTER UPDATE ON public.wh_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_wh_log_movement();

-- ============================================================================
-- Object:        public.wh_inventory.trg_wh_update_bin_status
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/wh_inventory.sql
-- Dependencies:  wh_inventory, public.fn_wh_update_bin_status
-- ============================================================================
CREATE TRIGGER trg_wh_update_bin_status
  AFTER UPDATE OF location_id ON public.wh_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_wh_update_bin_status();

-- ============================================================================
-- Object:        public.wh_repacking_conversions.update_wh_repacking_conversions_updated_at
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/wh_repacking_conversions.sql
-- Dependencies:  wh_repacking_conversions, public.update_updated_at_column
-- ============================================================================
CREATE TRIGGER update_wh_repacking_conversions_updated_at
  BEFORE UPDATE ON public.wh_repacking_conversions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Object:        public.wo_items.trigger_update_wo_on_handover
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/wo_items.sql
-- Dependencies:  wo_items, public.update_wo_status_on_handover
-- ============================================================================
CREATE TRIGGER trigger_update_wo_on_handover
  AFTER UPDATE OF handover_status ON public.wo_items
  FOR EACH ROW
  WHEN (((old.handover_status)::text IS DISTINCT FROM (new.handover_status)::text))
  EXECUTE FUNCTION public.update_wo_status_on_handover();

-- ============================================================================
-- Object:        public.wo_work_orders.trg_audit_wo_work_orders
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/wo_work_orders.sql
-- Dependencies:  wo_work_orders, public.log_wo_jo_changes
-- ============================================================================
CREATE TRIGGER trg_audit_wo_work_orders
  AFTER INSERT OR UPDATE ON public.wo_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_wo_jo_changes();

-- ============================================================================
-- Object:        public.work_orders.trg_audit_work_orders
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders, public.log_wo_jo_changes
-- ============================================================================
CREATE TRIGGER trg_audit_work_orders
  AFTER INSERT OR UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_wo_jo_changes();

-- ============================================================================
-- Object:        public.work_orders.trg_set_wo_sla_timestamps
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders, public.set_wo_sla_timestamps
-- ============================================================================
CREATE TRIGGER trg_set_wo_sla_timestamps
  BEFORE UPDATE OF status ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_wo_sla_timestamps();

-- ============================================================================
-- Object:        public.work_orders.trg_work_orders_set_updated_by
-- Layer:         007 Triggers
-- Source:        supabase/schemas/public/tables/work_orders.sql
-- Dependencies:  work_orders, public.set_updated_by_and_time
-- ============================================================================
CREATE TRIGGER trg_work_orders_set_updated_by
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_by_and_time();
