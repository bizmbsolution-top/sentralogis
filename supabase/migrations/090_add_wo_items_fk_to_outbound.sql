-- Menambahkan foreign key constraint dari wh_outbound_shipments.wo_item_id ke wo_items(id)
ALTER TABLE wh_outbound_shipments 
ADD CONSTRAINT wh_outbound_shipments_wo_item_id_fkey 
FOREIGN KEY (wo_item_id) REFERENCES wo_items(id) ON DELETE SET NULL;

-- Memastikan schema cache API Supabase terre-load
NOTIFY pgrst, 'reload schema';
