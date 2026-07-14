-- Add missing foreign key for customer_id in md_storage_contracts

ALTER TABLE md_storage_contracts
  ADD CONSTRAINT md_storage_contracts_customer_id_fkey
  FOREIGN KEY (customer_id)
  REFERENCES md_entities(id)
  ON DELETE CASCADE;
