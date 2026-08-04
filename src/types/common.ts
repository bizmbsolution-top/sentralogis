// src/types/common.ts
export interface BaseEntity {
  id: string;
  /**
   * Mandatory tenant isolation identifier
   */
  tenant_id: string;
  created_at: string;
  updated_at?: string;
  /**
   * User who created the record
   */
  created_by?: string;
  /**
   * Last user modifying the record
   */
  updated_by?: string;
}
