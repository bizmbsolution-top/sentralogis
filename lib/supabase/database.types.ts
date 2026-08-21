/**
 * Database schema types for the public schema.
 * GENERATED from the live database via scripts-introspection (pg_catalog).
 * Format: @supabase/supabase-js v2 Database shape (with Relationships).
 * Do not hand-edit; regenerate instead.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      "_wo_renumber_temp": {
        Row: {
          "id": string | null;
          "old_wo_number": string | null;
          "tenant_name": string | null;
          "customer_name": string | null;
          "mmyy": string | null;
          "seq_num": number | null;
        };
        Insert: {
          "id"?: string | null;
          "old_wo_number"?: string | null;
          "tenant_name"?: string | null;
          "customer_name"?: string | null;
          "mmyy"?: string | null;
          "seq_num"?: number | null;
        };
        Update: {
          "id"?: string | null;
          "old_wo_number"?: string | null;
          "tenant_name"?: string | null;
          "customer_name"?: string | null;
          "mmyy"?: string | null;
          "seq_num"?: number | null;
        };
        Relationships: [];
      };
      "add_costs": {
        Row: {
          "id": string;
          "job_order_id": string | null;
          "cost_type": string;
          "amount": number;
          "description": string | null;
          "is_vendor": boolean | null;
          "vendor_id": string | null;
          "status": string | null;
          "notes": string | null;
          "document_url": string | null;
          "created_by": string | null;
          "approved_by": string | null;
          "approved_at": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "job_order_id"?: string | null;
          "cost_type": string;
          "amount": number;
          "description"?: string | null;
          "is_vendor"?: boolean | null;
          "vendor_id"?: string | null;
          "status"?: string | null;
          "notes"?: string | null;
          "document_url"?: string | null;
          "created_by"?: string | null;
          "approved_by"?: string | null;
          "approved_at"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string | null;
          "cost_type"?: string;
          "amount"?: number;
          "description"?: string | null;
          "is_vendor"?: boolean | null;
          "vendor_id"?: string | null;
          "status"?: string | null;
          "notes"?: string | null;
          "document_url"?: string | null;
          "created_by"?: string | null;
          "approved_by"?: string | null;
          "approved_at"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "add_costs_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "add_costs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "add_costs_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          }
        ];
      };
      "addresses": {
        Row: {
          "id": string;
          "name": string;
          "address": string;
          "city": string | null;
          "type": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "name": string;
          "address": string;
          "city"?: string | null;
          "type"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "address"?: string;
          "city"?: string | null;
          "type"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "armada": {
        Row: {
          "id": string;
          "tenant_id": string;
          "vehicle_number": string;
          "vehicle_type": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "vehicle_number": string;
          "vehicle_type"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "vehicle_number"?: string;
          "vehicle_type"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [];
      };
      "attribute_types": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "name": string;
          "data_type": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name": string;
          "data_type"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name"?: string;
          "data_type"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attribute_types_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "backup_customers": {
        Row: {
          "id": string | null;
          "tenant_id": string | null;
          "name": string | null;
          "email": string | null;
          "phone": string | null;
          "address": string | null;
          "is_active": boolean | null;
          "auth_user_id": string | null;
          "created_by": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "customer_code": string | null;
          "pic_name": string | null;
          "billing_address": string | null;
          "city": string | null;
          "code": string | null;
          "pic_phone": string | null;
          "tax_id": string | null;
        };
        Insert: {
          "id"?: string | null;
          "tenant_id"?: string | null;
          "name"?: string | null;
          "email"?: string | null;
          "phone"?: string | null;
          "address"?: string | null;
          "is_active"?: boolean | null;
          "auth_user_id"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "customer_code"?: string | null;
          "pic_name"?: string | null;
          "billing_address"?: string | null;
          "city"?: string | null;
          "code"?: string | null;
          "pic_phone"?: string | null;
          "tax_id"?: string | null;
        };
        Update: {
          "id"?: string | null;
          "tenant_id"?: string | null;
          "name"?: string | null;
          "email"?: string | null;
          "phone"?: string | null;
          "address"?: string | null;
          "is_active"?: boolean | null;
          "auth_user_id"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "customer_code"?: string | null;
          "pic_name"?: string | null;
          "billing_address"?: string | null;
          "city"?: string | null;
          "code"?: string | null;
          "pic_phone"?: string | null;
          "tax_id"?: string | null;
        };
        Relationships: [];
      };
      "backup_inventory": {
        Row: {
          "id": string | null;
          "product_id": string | null;
          "warehouse_id": string | null;
          "customer_id": string | null;
          "quantity": number | null;
          "lot_number": string | null;
          "status": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "batch_id": string | null;
          "uom_id": string | null;
          "location_barcode": string | null;
        };
        Insert: {
          "id"?: string | null;
          "product_id"?: string | null;
          "warehouse_id"?: string | null;
          "customer_id"?: string | null;
          "quantity"?: number | null;
          "lot_number"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "batch_id"?: string | null;
          "uom_id"?: string | null;
          "location_barcode"?: string | null;
        };
        Update: {
          "id"?: string | null;
          "product_id"?: string | null;
          "warehouse_id"?: string | null;
          "customer_id"?: string | null;
          "quantity"?: number | null;
          "lot_number"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "batch_id"?: string | null;
          "uom_id"?: string | null;
          "location_barcode"?: string | null;
        };
        Relationships: [];
      };
      "backup_products": {
        Row: {
          "id": string | null;
          "customer_id": string | null;
          "sku": string | null;
          "name": string | null;
          "category": string | null;
          "length_cm": number | null;
          "width_cm": number | null;
          "height_cm": number | null;
          "weight_kg": number | null;
          "created_at": string | null;
          "packaging_type": string | null;
          "packaging_qty": number | null;
          "content_qty": number | null;
          "total_weight_kg": number | null;
          "total_volume_m3": number | null;
          "tenant_id": string | null;
          "barcode": string | null;
          "description": string | null;
          "sub_category": string | null;
          "brand": string | null;
          "image_url": string | null;
          "image_urls": string[] | null;
          "base_uom_id": string | null;
          "default_inbound_uom_id": string | null;
          "default_outbound_uom_id": string | null;
          "cbm_override": number | null;
          "cbm": number | null;
          "enable_serial_tracking": boolean | null;
          "enable_weight_tracking": boolean | null;
          "enable_expiry_tracking": boolean | null;
          "enable_batch_tracking": boolean | null;
          "enable_variant_tracking": boolean | null;
          "enable_custom_attributes": boolean | null;
          "default_outbound_strategy": string | null;
          "is_active": boolean | null;
          "is_hazardous": boolean | null;
          "requires_temperature_control": boolean | null;
          "min_temperature": number | null;
          "max_temperature": number | null;
          "created_by": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string | null;
          "customer_id"?: string | null;
          "sku"?: string | null;
          "name"?: string | null;
          "category"?: string | null;
          "length_cm"?: number | null;
          "width_cm"?: number | null;
          "height_cm"?: number | null;
          "weight_kg"?: number | null;
          "created_at"?: string | null;
          "packaging_type"?: string | null;
          "packaging_qty"?: number | null;
          "content_qty"?: number | null;
          "total_weight_kg"?: number | null;
          "total_volume_m3"?: number | null;
          "tenant_id"?: string | null;
          "barcode"?: string | null;
          "description"?: string | null;
          "sub_category"?: string | null;
          "brand"?: string | null;
          "image_url"?: string | null;
          "image_urls"?: string[] | null;
          "base_uom_id"?: string | null;
          "default_inbound_uom_id"?: string | null;
          "default_outbound_uom_id"?: string | null;
          "cbm_override"?: number | null;
          "cbm"?: number | null;
          "enable_serial_tracking"?: boolean | null;
          "enable_weight_tracking"?: boolean | null;
          "enable_expiry_tracking"?: boolean | null;
          "enable_batch_tracking"?: boolean | null;
          "enable_variant_tracking"?: boolean | null;
          "enable_custom_attributes"?: boolean | null;
          "default_outbound_strategy"?: string | null;
          "is_active"?: boolean | null;
          "is_hazardous"?: boolean | null;
          "requires_temperature_control"?: boolean | null;
          "min_temperature"?: number | null;
          "max_temperature"?: number | null;
          "created_by"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string | null;
          "customer_id"?: string | null;
          "sku"?: string | null;
          "name"?: string | null;
          "category"?: string | null;
          "length_cm"?: number | null;
          "width_cm"?: number | null;
          "height_cm"?: number | null;
          "weight_kg"?: number | null;
          "created_at"?: string | null;
          "packaging_type"?: string | null;
          "packaging_qty"?: number | null;
          "content_qty"?: number | null;
          "total_weight_kg"?: number | null;
          "total_volume_m3"?: number | null;
          "tenant_id"?: string | null;
          "barcode"?: string | null;
          "description"?: string | null;
          "sub_category"?: string | null;
          "brand"?: string | null;
          "image_url"?: string | null;
          "image_urls"?: string[] | null;
          "base_uom_id"?: string | null;
          "default_inbound_uom_id"?: string | null;
          "default_outbound_uom_id"?: string | null;
          "cbm_override"?: number | null;
          "cbm"?: number | null;
          "enable_serial_tracking"?: boolean | null;
          "enable_weight_tracking"?: boolean | null;
          "enable_expiry_tracking"?: boolean | null;
          "enable_batch_tracking"?: boolean | null;
          "enable_variant_tracking"?: boolean | null;
          "enable_custom_attributes"?: boolean | null;
          "default_outbound_strategy"?: string | null;
          "is_active"?: boolean | null;
          "is_hazardous"?: boolean | null;
          "requires_temperature_control"?: boolean | null;
          "min_temperature"?: number | null;
          "max_temperature"?: number | null;
          "created_by"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [];
      };
      "btki_codes": {
        Row: {
          "id": string;
          "hs_code": string;
          "description_id": string | null;
          "description_en": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "hs_code": string;
          "description_id"?: string | null;
          "description_en"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "hs_code"?: string;
          "description_id"?: string | null;
          "description_en"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "cash_advances": {
        Row: {
          "id": string;
          "job_order_id": string | null;
          "amount": number;
          "description": string | null;
          "status": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "disbursement_proof_url": string | null;
          "disbursement_notes": string | null;
          "paid_by": string | null;
          "settled_at": string | null;
          "transfer_proof_url": string | null;
          "paid_at": string | null;
        };
        Insert: {
          "id"?: string;
          "job_order_id"?: string | null;
          "amount"?: number;
          "description"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "disbursement_proof_url"?: string | null;
          "disbursement_notes"?: string | null;
          "paid_by"?: string | null;
          "settled_at"?: string | null;
          "transfer_proof_url"?: string | null;
          "paid_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string | null;
          "amount"?: number;
          "description"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "disbursement_proof_url"?: string | null;
          "disbursement_notes"?: string | null;
          "paid_by"?: string | null;
          "settled_at"?: string | null;
          "transfer_proof_url"?: string | null;
          "paid_at"?: string | null;
        };
        Relationships: [];
      };
      "chat_attachments": {
        Row: {
          "id": string;
          "message_id": string;
          "file_url": string;
          "file_name": string;
          "file_type": string | null;
          "file_size": number | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "message_id": string;
          "file_url": string;
          "file_name": string;
          "file_type"?: string | null;
          "file_size"?: number | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "message_id"?: string;
          "file_url"?: string;
          "file_name"?: string;
          "file_type"?: string | null;
          "file_size"?: number | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          }
        ];
      };
      "chat_channels": {
        Row: {
          "id": string;
          "channel_type": string;
          "channel_id": string;
          "title": string | null;
          "created_at": string | null;
          "group_id": string | null;
          "is_archived": boolean | null;
          "archived_at": string | null;
          "archived_by": string | null;
        };
        Insert: {
          "id"?: string;
          "channel_type": string;
          "channel_id": string;
          "title"?: string | null;
          "created_at"?: string | null;
          "group_id"?: string | null;
          "is_archived"?: boolean | null;
          "archived_at"?: string | null;
          "archived_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "channel_type"?: string;
          "channel_id"?: string;
          "title"?: string | null;
          "created_at"?: string | null;
          "group_id"?: string | null;
          "is_archived"?: boolean | null;
          "archived_at"?: string | null;
          "archived_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_channels_archived_by_fkey";
            columns: ["archived_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_channels_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "chat_groups";
            referencedColumns: ["id"];
          }
        ];
      };
      "chat_group_members": {
        Row: {
          "group_id": string;
          "user_id": string;
          "role": string;
          "joined_at": string | null;
        };
        Insert: {
          "group_id": string;
          "user_id": string;
          "role"?: string;
          "joined_at"?: string | null;
        };
        Update: {
          "group_id"?: string;
          "user_id"?: string;
          "role"?: string;
          "joined_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "chat_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_group_members_user_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_group_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "chat_groups": {
        Row: {
          "id": string;
          "tenant_id": string;
          "name": string;
          "group_type": string;
          "description": string | null;
          "avatar_url": string | null;
          "created_by": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "name": string;
          "group_type"?: string;
          "description"?: string | null;
          "avatar_url"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "name"?: string;
          "group_type"?: string;
          "description"?: string | null;
          "avatar_url"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_groups_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_groups_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "chat_messages": {
        Row: {
          "id": string;
          "channel_id": string;
          "sender_id": string | null;
          "message": string;
          "parent_id": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "context_type": string | null;
          "context_id": string | null;
          "is_pinned": boolean | null;
          "pinned_at": string | null;
          "pinned_by": string | null;
          "guest_sender_name": string | null;
        };
        Insert: {
          "id"?: string;
          "channel_id": string;
          "sender_id"?: string | null;
          "message": string;
          "parent_id"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "context_type"?: string | null;
          "context_id"?: string | null;
          "is_pinned"?: boolean | null;
          "pinned_at"?: string | null;
          "pinned_by"?: string | null;
          "guest_sender_name"?: string | null;
        };
        Update: {
          "id"?: string;
          "channel_id"?: string;
          "sender_id"?: string | null;
          "message"?: string;
          "parent_id"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "context_type"?: string | null;
          "context_id"?: string | null;
          "is_pinned"?: boolean | null;
          "pinned_at"?: string | null;
          "pinned_by"?: string | null;
          "guest_sender_name"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "chat_channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_pinned_by_fkey";
            columns: ["pinned_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_sender_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "chat_participants": {
        Row: {
          "id": string;
          "channel_id": string;
          "user_id": string;
          "role": string;
          "last_read_at": string | null;
          "joined_at": string | null;
        };
        Insert: {
          "id"?: string;
          "channel_id": string;
          "user_id": string;
          "role"?: string;
          "last_read_at"?: string | null;
          "joined_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "channel_id"?: string;
          "user_id"?: string;
          "role"?: string;
          "last_read_at"?: string | null;
          "joined_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_participants_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "chat_channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_participants_user_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "companies": {
        Row: {
          "id": string;
          "type": string;
          "name": string;
          "address": string | null;
          "pic_name": string | null;
          "pic_phone": string | null;
          "notes": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
          "active_sbus": string[] | null;
          "logo_url": string | null;
          "organization_id": string | null;
        };
        Insert: {
          "id"?: string;
          "type": string;
          "name": string;
          "address"?: string | null;
          "pic_name"?: string | null;
          "pic_phone"?: string | null;
          "notes"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "active_sbus"?: string[] | null;
          "logo_url"?: string | null;
          "organization_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "type"?: string;
          "name"?: string;
          "address"?: string | null;
          "pic_name"?: string | null;
          "pic_phone"?: string | null;
          "notes"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "active_sbus"?: string[] | null;
          "logo_url"?: string | null;
          "organization_id"?: string | null;
        };
        Relationships: [];
      };
      "country_master": {
        Row: {
          "country_code": string;
          "country_name": string;
          "region": string | null;
          "fta_memberships": string[] | null;
          "created_at": string | null;
        };
        Insert: {
          "country_code": string;
          "country_name": string;
          "region"?: string | null;
          "fta_memberships"?: string[] | null;
          "created_at"?: string | null;
        };
        Update: {
          "country_code"?: string;
          "country_name"?: string;
          "region"?: string | null;
          "fta_memberships"?: string[] | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "crm_activities": {
        Row: {
          "id": string;
          "tenant_id": string;
          "deal_id": string | null;
          "activity_type": "CALL" | "MEETING" | "WHATSAPP" | "EMAIL" | "NOTE" | null;
          "activity_date": string;
          "location": string | null;
          "description": string | null;
          "performed_by": string;
          "created_at": string | null;
          "entity_id": string | null;
          "status": string | null;
          "check_in_location": string | null;
          "check_in_time": string | null;
          "photo_url": string | null;
          "check_in_lat": number | null;
          "check_in_lng": number | null;
          "is_all_day": boolean | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "deal_id"?: string | null;
          "activity_type"?: "CALL" | "MEETING" | "WHATSAPP" | "EMAIL" | "NOTE" | null;
          "activity_date": string;
          "location"?: string | null;
          "description"?: string | null;
          "performed_by": string;
          "created_at"?: string | null;
          "entity_id"?: string | null;
          "status"?: string | null;
          "check_in_location"?: string | null;
          "check_in_time"?: string | null;
          "photo_url"?: string | null;
          "check_in_lat"?: number | null;
          "check_in_lng"?: number | null;
          "is_all_day"?: boolean | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "deal_id"?: string | null;
          "activity_type"?: "CALL" | "MEETING" | "WHATSAPP" | "EMAIL" | "NOTE" | null;
          "activity_date"?: string;
          "location"?: string | null;
          "description"?: string | null;
          "performed_by"?: string;
          "created_at"?: string | null;
          "entity_id"?: string | null;
          "status"?: string | null;
          "check_in_location"?: string | null;
          "check_in_time"?: string | null;
          "photo_url"?: string | null;
          "check_in_lat"?: number | null;
          "check_in_lng"?: number | null;
          "is_all_day"?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "crm_activities_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "crm_deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_activities_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_activities_performed_by_fkey";
            columns: ["performed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      "crm_deals": {
        Row: {
          "id": string;
          "tenant_id": string;
          "title": string;
          "stage": "PROSPECTING" | "NEGOTIATION" | "QUOTATION" | "WON" | "LOST" | null;
          "expected_revenue": number | null;
          "expected_close_date": string | null;
          "fee_type": "NOMINAL" | "PERCENTAGE" | null;
          "fee_value": number | null;
          "sbu_target": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "created_by": string | null;
          "updated_by": string | null;
          "entity_id": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "title": string;
          "stage"?: "PROSPECTING" | "NEGOTIATION" | "QUOTATION" | "WON" | "LOST" | null;
          "expected_revenue"?: number | null;
          "expected_close_date"?: string | null;
          "fee_type"?: "NOMINAL" | "PERCENTAGE" | null;
          "fee_value"?: number | null;
          "sbu_target"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "entity_id": string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "title"?: string;
          "stage"?: "PROSPECTING" | "NEGOTIATION" | "QUOTATION" | "WON" | "LOST" | null;
          "expected_revenue"?: number | null;
          "expected_close_date"?: string | null;
          "fee_type"?: "NOMINAL" | "PERCENTAGE" | null;
          "fee_value"?: number | null;
          "sbu_target"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "entity_id"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "crm_deals_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_deals_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_deals_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      "crm_guest_links": {
        Row: {
          "id": string;
          "tenant_id": string;
          "entity_id": string;
          "token": string;
          "channel_id": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "entity_id": string;
          "token"?: string;
          "channel_id"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "entity_id"?: string;
          "token"?: string;
          "channel_id"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "crm_guest_links_channel_id_fkey";
            columns: ["channel_id"];
            isOneToOne: false;
            referencedRelation: "chat_channels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_guest_links_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_guest_links_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          }
        ];
      };
      "crm_quotation_items": {
        Row: {
          "id": string;
          "tenant_id": string;
          "quotation_id": string;
          "service_id": string | null;
          "description": string;
          "qty": number;
          "uom": string | null;
          "unit_price": number;
          "subtotal": number;
          "tax_percent": number | null;
          "tax_amount": number | null;
          "total_price": number;
          "created_at": string | null;
          "updated_at": string | null;
          "created_by": string | null;
          "updated_by": string | null;
          "sbu_cluster": string | null;
          "section_id": string | null;
          "pricing_type": string | null;
          "min_qty": number | null;
          "rate_id": string | null;
          "sbu_metadata": Json | null;
          "remarks": string | null;
          "nego_price": number | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "quotation_id": string;
          "service_id"?: string | null;
          "description": string;
          "qty"?: number;
          "uom"?: string | null;
          "unit_price"?: number;
          "subtotal"?: number;
          "tax_percent"?: number | null;
          "tax_amount"?: number | null;
          "total_price"?: number;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "sbu_cluster"?: string | null;
          "section_id"?: string | null;
          "pricing_type"?: string | null;
          "min_qty"?: number | null;
          "rate_id"?: string | null;
          "sbu_metadata"?: Json | null;
          "remarks"?: string | null;
          "nego_price"?: number | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "quotation_id"?: string;
          "service_id"?: string | null;
          "description"?: string;
          "qty"?: number;
          "uom"?: string | null;
          "unit_price"?: number;
          "subtotal"?: number;
          "tax_percent"?: number | null;
          "tax_amount"?: number | null;
          "total_price"?: number;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "sbu_cluster"?: string | null;
          "section_id"?: string | null;
          "pricing_type"?: string | null;
          "min_qty"?: number | null;
          "rate_id"?: string | null;
          "sbu_metadata"?: Json | null;
          "remarks"?: string | null;
          "nego_price"?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "crm_quotation_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_quotation_items_quotation_id_fkey";
            columns: ["quotation_id"];
            isOneToOne: false;
            referencedRelation: "crm_quotations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_quotation_items_rate_id_fkey";
            columns: ["rate_id"];
            isOneToOne: false;
            referencedRelation: "crm_sbu_customer_rates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_quotation_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "crm_quotation_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_quotation_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "md_services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_quotation_items_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      "crm_quotation_sections": {
        Row: {
          "id": string;
          "tenant_id": string;
          "quotation_id": string;
          "sbu_type": string;
          "section_order": number | null;
          "subtotal": number | null;
          "sbu_notes": string | null;
          "approval_status": string | null;
          "approved_by": string | null;
          "approved_at": string | null;
          "rejection_reason": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "created_by": string | null;
          "updated_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "quotation_id": string;
          "sbu_type": string;
          "section_order"?: number | null;
          "subtotal"?: number | null;
          "sbu_notes"?: string | null;
          "approval_status"?: string | null;
          "approved_by"?: string | null;
          "approved_at"?: string | null;
          "rejection_reason"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "quotation_id"?: string;
          "sbu_type"?: string;
          "section_order"?: number | null;
          "subtotal"?: number | null;
          "sbu_notes"?: string | null;
          "approval_status"?: string | null;
          "approved_by"?: string | null;
          "approved_at"?: string | null;
          "rejection_reason"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "crm_quotation_sections_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_quotation_sections_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_quotation_sections_quotation_id_fkey";
            columns: ["quotation_id"];
            isOneToOne: false;
            referencedRelation: "crm_quotations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_quotation_sections_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      "crm_quotations": {
        Row: {
          "id": string;
          "tenant_id": string;
          "deal_id": string;
          "quote_number": string;
          "total_amount": number | null;
          "target_price": number | null;
          "status": string | null;
          "valid_until": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "created_by": string | null;
          "updated_by": string | null;
          "subtotal_amount": number | null;
          "tax_amount": number | null;
          "notes": string | null;
          "validity_days": number | null;
          "onetime_total": number | null;
          "recurring_total": number | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "deal_id": string;
          "quote_number": string;
          "total_amount"?: number | null;
          "target_price"?: number | null;
          "status"?: string | null;
          "valid_until"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "subtotal_amount"?: number | null;
          "tax_amount"?: number | null;
          "notes"?: string | null;
          "validity_days"?: number | null;
          "onetime_total"?: number | null;
          "recurring_total"?: number | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "deal_id"?: string;
          "quote_number"?: string;
          "total_amount"?: number | null;
          "target_price"?: number | null;
          "status"?: string | null;
          "valid_until"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
          "subtotal_amount"?: number | null;
          "tax_amount"?: number | null;
          "notes"?: string | null;
          "validity_days"?: number | null;
          "onetime_total"?: number | null;
          "recurring_total"?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "crm_quotations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_quotations_deal_id_fkey";
            columns: ["deal_id"];
            isOneToOne: false;
            referencedRelation: "crm_deals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_quotations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      "crm_sbu_customer_rates": {
        Row: {
          "id": string;
          "tenant_id": string;
          "customer_id": string;
          "sbu_type": string;
          "service_name": string;
          "description": string | null;
          "uom": string;
          "unit_price": number;
          "pricing_type": string;
          "min_qty": number | null;
          "route_origin": string | null;
          "route_destination": string | null;
          "is_active": boolean | null;
          "notes": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "created_by": string | null;
          "updated_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "customer_id": string;
          "sbu_type": string;
          "service_name": string;
          "description"?: string | null;
          "uom"?: string;
          "unit_price"?: number;
          "pricing_type"?: string;
          "min_qty"?: number | null;
          "route_origin"?: string | null;
          "route_destination"?: string | null;
          "is_active"?: boolean | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "customer_id"?: string;
          "sbu_type"?: string;
          "service_name"?: string;
          "description"?: string | null;
          "uom"?: string;
          "unit_price"?: number;
          "pricing_type"?: string;
          "min_qty"?: number | null;
          "route_origin"?: string | null;
          "route_destination"?: string | null;
          "is_active"?: boolean | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
          "updated_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "crm_sbu_customer_rates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_sbu_customer_rates_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "crm_sbu_customer_rates_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      "customer_requests": {
        Row: {
          "id": string;
          "customer_id": string;
          "warehouse_id": string;
          "request_type": string | null;
          "status": string | null;
          "product_id": string | null;
          "quantity": number | null;
          "destination_address": string | null;
          "notes": string | null;
          "photos": string[] | null;
          "response_message": string | null;
          "responded_by": string | null;
          "responded_at": string | null;
          "requested_at": string | null;
          "completed_at": string | null;
          "created_at": string | null;
          "product_name_manual": string | null;
          "sku_manual": string | null;
        };
        Insert: {
          "id"?: string;
          "customer_id": string;
          "warehouse_id": string;
          "request_type"?: string | null;
          "status"?: string | null;
          "product_id"?: string | null;
          "quantity"?: number | null;
          "destination_address"?: string | null;
          "notes"?: string | null;
          "photos"?: string[] | null;
          "response_message"?: string | null;
          "responded_by"?: string | null;
          "responded_at"?: string | null;
          "requested_at"?: string | null;
          "completed_at"?: string | null;
          "created_at"?: string | null;
          "product_name_manual"?: string | null;
          "sku_manual"?: string | null;
        };
        Update: {
          "id"?: string;
          "customer_id"?: string;
          "warehouse_id"?: string;
          "request_type"?: string | null;
          "status"?: string | null;
          "product_id"?: string | null;
          "quantity"?: number | null;
          "destination_address"?: string | null;
          "notes"?: string | null;
          "photos"?: string[] | null;
          "response_message"?: string | null;
          "responded_by"?: string | null;
          "responded_at"?: string | null;
          "requested_at"?: string | null;
          "completed_at"?: string | null;
          "created_at"?: string | null;
          "product_name_manual"?: string | null;
          "sku_manual"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customer_requests_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_requests_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_requests_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "customers": {
        Row: {
          "id": string;
          "tenant_id": string;
          "name": string;
          "email": string;
          "phone": string | null;
          "address": string | null;
          "is_active": boolean | null;
          "auth_user_id": string | null;
          "created_by": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "customer_code": string | null;
          "pic_name": string | null;
          "billing_address": string | null;
          "city": string | null;
          "code": string | null;
          "pic_phone": string | null;
          "tax_id": string | null;
          "billing_method": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "name": string;
          "email": string;
          "phone"?: string | null;
          "address"?: string | null;
          "is_active"?: boolean | null;
          "auth_user_id"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "customer_code"?: string | null;
          "pic_name"?: string | null;
          "billing_address"?: string | null;
          "city"?: string | null;
          "code"?: string | null;
          "pic_phone"?: string | null;
          "tax_id"?: string | null;
          "billing_method"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "name"?: string;
          "email"?: string;
          "phone"?: string | null;
          "address"?: string | null;
          "is_active"?: boolean | null;
          "auth_user_id"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "customer_code"?: string | null;
          "pic_name"?: string | null;
          "billing_address"?: string | null;
          "city"?: string | null;
          "code"?: string | null;
          "pic_phone"?: string | null;
          "tax_id"?: string | null;
          "billing_method"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_auth_user_id_fkey";
            columns: ["auth_user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customers_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "debug_traces": {
        Row: {
          "id": string;
          "request_id": string;
          "input_query": string | null;
          "country_code": string | null;
          "stages": Json | null;
          "debug_summary": Json | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "request_id": string;
          "input_query"?: string | null;
          "country_code"?: string | null;
          "stages"?: Json | null;
          "debug_summary"?: Json | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "request_id"?: string;
          "input_query"?: string | null;
          "country_code"?: string | null;
          "stages"?: Json | null;
          "debug_summary"?: Json | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "documents": {
        Row: {
          "id": string;
          "job_order_id": string | null;
          "doc_type": string | null;
          "file_url": string | null;
          "created_at": string | null;
          "document_name": string | null;
          "is_verified": boolean | null;
          "verified_by": string | null;
          "verified_at": string | null;
          "uploaded_by": string | null;
          "job_route_id": string | null;
        };
        Insert: {
          "id"?: string;
          "job_order_id"?: string | null;
          "doc_type"?: string | null;
          "file_url"?: string | null;
          "created_at"?: string | null;
          "document_name"?: string | null;
          "is_verified"?: boolean | null;
          "verified_by"?: string | null;
          "verified_at"?: string | null;
          "uploaded_by"?: string | null;
          "job_route_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string | null;
          "doc_type"?: string | null;
          "file_url"?: string | null;
          "created_at"?: string | null;
          "document_name"?: string | null;
          "is_verified"?: boolean | null;
          "verified_by"?: string | null;
          "verified_at"?: string | null;
          "uploaded_by"?: string | null;
          "job_route_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_job_route_id_fkey";
            columns: ["job_route_id"];
            isOneToOne: false;
            referencedRelation: "job_routes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_documents_uploaded_by";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "driver_attendance": {
        Row: {
          "id": string;
          "driver_id": string | null;
          "fleet_id": string | null;
          "attendance_type": string | null;
          "latitude": number | null;
          "longitude": number | null;
          "check_in": string | null;
          "created_at": string | null;
          "tenant_id": string | null;
          "status": string | null;
          "check_out": string | null;
        };
        Insert: {
          "id"?: string;
          "driver_id"?: string | null;
          "fleet_id"?: string | null;
          "attendance_type"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "check_in"?: string | null;
          "created_at"?: string | null;
          "tenant_id"?: string | null;
          "status"?: string | null;
          "check_out"?: string | null;
        };
        Update: {
          "id"?: string;
          "driver_id"?: string | null;
          "fleet_id"?: string | null;
          "attendance_type"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "check_in"?: string | null;
          "created_at"?: string | null;
          "tenant_id"?: string | null;
          "status"?: string | null;
          "check_out"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "driver_attendance_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "md_drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "driver_attendance_fleet_id_fkey";
            columns: ["fleet_id"];
            isOneToOne: false;
            referencedRelation: "md_fleets";
            referencedColumns: ["id"];
          }
        ];
      };
      "driver_kpi_history": {
        Row: {
          "id": string;
          "driver_id": string;
          "tenant_id": string | null;
          "period_start": string;
          "period_end": string;
          "jobs_completed": number | null;
          "on_time_delivery_rate": number | null;
          "inspection_pass_rate": number | null;
          "avg_score": number | null;
          "km_driven": number | null;
          "incident_count": number | null;
          "trust_score": number | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "driver_id": string;
          "tenant_id"?: string | null;
          "period_start": string;
          "period_end": string;
          "jobs_completed"?: number | null;
          "on_time_delivery_rate"?: number | null;
          "inspection_pass_rate"?: number | null;
          "avg_score"?: number | null;
          "km_driven"?: number | null;
          "incident_count"?: number | null;
          "trust_score"?: number | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "driver_id"?: string;
          "tenant_id"?: string | null;
          "period_start"?: string;
          "period_end"?: string;
          "jobs_completed"?: number | null;
          "on_time_delivery_rate"?: number | null;
          "inspection_pass_rate"?: number | null;
          "avg_score"?: number | null;
          "km_driven"?: number | null;
          "incident_count"?: number | null;
          "trust_score"?: number | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "driver_kpi_history_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "md_drivers";
            referencedColumns: ["id"];
          }
        ];
      };
      "driver_performance_logs": {
        Row: {
          "id": string;
          "driver_id": string | null;
          "log_type": string | null;
          "value": number | null;
          "reference_id": string | null;
          "description": string | null;
          "created_at": string | null;
          "type": string;
          "review_score": number | null;
          "review_notes": string | null;
          "job_order_id": string | null;
          "total_km": number | null;
        };
        Insert: {
          "id"?: string;
          "driver_id"?: string | null;
          "log_type"?: string | null;
          "value"?: number | null;
          "reference_id"?: string | null;
          "description"?: string | null;
          "created_at"?: string | null;
          "type"?: string;
          "review_score"?: number | null;
          "review_notes"?: string | null;
          "job_order_id"?: string | null;
          "total_km"?: number | null;
        };
        Update: {
          "id"?: string;
          "driver_id"?: string | null;
          "log_type"?: string | null;
          "value"?: number | null;
          "reference_id"?: string | null;
          "description"?: string | null;
          "created_at"?: string | null;
          "type"?: string;
          "review_score"?: number | null;
          "review_notes"?: string | null;
          "job_order_id"?: string | null;
          "total_km"?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "driver_performance_logs_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "md_drivers";
            referencedColumns: ["id"];
          }
        ];
      };
      "driver_profiles": {
        Row: {
          "id": string;
          "phone": string;
          "pin_hash": string | null;
          "full_name": string | null;
          "is_active": boolean;
          "created_at": string;
          "updated_at": string;
        };
        Insert: {
          "id"?: string;
          "phone": string;
          "pin_hash"?: string | null;
          "full_name"?: string | null;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Update: {
          "id"?: string;
          "phone"?: string;
          "pin_hash"?: string | null;
          "full_name"?: string | null;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Relationships: [];
      };
      "driver_requests": {
        Row: {
          "id": string;
          "job_order_id": string | null;
          "request_type": string;
          "notes": string;
          "photo_url": string | null;
          "status": string | null;
          "response_notes": string | null;
          "approved_by": string | null;
          "created_at": string | null;
          "resolved_at": string | null;
        };
        Insert: {
          "id"?: string;
          "job_order_id"?: string | null;
          "request_type": string;
          "notes": string;
          "photo_url"?: string | null;
          "status"?: string | null;
          "response_notes"?: string | null;
          "approved_by"?: string | null;
          "created_at"?: string | null;
          "resolved_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string | null;
          "request_type"?: string;
          "notes"?: string;
          "photo_url"?: string | null;
          "status"?: string | null;
          "response_notes"?: string | null;
          "approved_by"?: string | null;
          "created_at"?: string | null;
          "resolved_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "driver_requests_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "driver_resolution_audit_logs": {
        Row: {
          "id": string;
          "operator_id": string;
          "timestamp": string;
          "tenant_id": string;
          "driver_id": string;
          "old_phone": string | null;
          "new_phone": string | null;
          "reason": string;
          "action": string;
          "conflicting_driver_id": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "operator_id": string;
          "timestamp"?: string;
          "tenant_id": string;
          "driver_id": string;
          "old_phone"?: string | null;
          "new_phone"?: string | null;
          "reason": string;
          "action": string;
          "conflicting_driver_id"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "operator_id"?: string;
          "timestamp"?: string;
          "tenant_id"?: string;
          "driver_id"?: string;
          "old_phone"?: string | null;
          "new_phone"?: string | null;
          "reason"?: string;
          "action"?: string;
          "conflicting_driver_id"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "driver_resolution_audit_logs_conflicting_driver_id_fkey";
            columns: ["conflicting_driver_id"];
            isOneToOne: false;
            referencedRelation: "md_drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "driver_resolution_audit_logs_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "md_drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "driver_resolution_audit_logs_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "driver_resolution_audit_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "driver_tenant_links": {
        Row: {
          "id": string;
          "profile_id": string;
          "tenant_id": string;
          "driver_id": string;
          "is_active": boolean;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "profile_id": string;
          "tenant_id": string;
          "driver_id": string;
          "is_active"?: boolean;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "profile_id"?: string;
          "tenant_id"?: string;
          "driver_id"?: string;
          "is_active"?: boolean;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "driver_tenant_links_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: true;
            referencedRelation: "md_drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "driver_tenant_links_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "driver_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "driver_tenant_links_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "drivers": {
        Row: {
          "id": string;
          "company_id": string | null;
          "name": string;
          "phone": string;
          "address": string | null;
          "license_number": string | null;
          "license_expiry": string | null;
          "status": string | null;
          "current_fleet_id": string | null;
          "notes": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "nik": string | null;
          "license_type": string | null;
          "organization_id": string | null;
          "tenant_id": string | null;
          "bank_name": string | null;
          "bank_account_number": string | null;
          "bank_account_name": string | null;
        };
        Insert: {
          "id"?: string;
          "company_id"?: string | null;
          "name": string;
          "phone": string;
          "address"?: string | null;
          "license_number"?: string | null;
          "license_expiry"?: string | null;
          "status"?: string | null;
          "current_fleet_id"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "nik"?: string | null;
          "license_type"?: string | null;
          "organization_id"?: string | null;
          "tenant_id"?: string | null;
          "bank_name"?: string | null;
          "bank_account_number"?: string | null;
          "bank_account_name"?: string | null;
        };
        Update: {
          "id"?: string;
          "company_id"?: string | null;
          "name"?: string;
          "phone"?: string;
          "address"?: string | null;
          "license_number"?: string | null;
          "license_expiry"?: string | null;
          "status"?: string | null;
          "current_fleet_id"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "nik"?: string | null;
          "license_type"?: string | null;
          "organization_id"?: string | null;
          "tenant_id"?: string | null;
          "bank_name"?: string | null;
          "bank_account_number"?: string | null;
          "bank_account_name"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "drivers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "drivers_current_fleet_id_fkey";
            columns: ["current_fleet_id"];
            isOneToOne: false;
            referencedRelation: "fleets";
            referencedColumns: ["id"];
          }
        ];
      };
      "extra_costs": {
        Row: {
          "id": string;
          "jo_id": string;
          "cost_type": string;
          "amount": number;
          "description": string | null;
          "status": string;
          "is_billable": boolean;
          "created_at": string | null;
          "updated_at": string | null;
          "paid_by": string | null;
          "paid_to": string | null;
          "paid_by_entity": string | null;
          "decided_at": string | null;
          "charge_type": string | null;
          "rejection_meta": Json | null;
          "paid_by_sbu": boolean | null;
          "tax_id": string | null;
          "cost_account_id": string | null;
          "wo_id": string | null;
          "vendor_id": string | null;
        };
        Insert: {
          "id"?: string;
          "jo_id": string;
          "cost_type": string;
          "amount"?: number;
          "description"?: string | null;
          "status"?: string;
          "is_billable"?: boolean;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "paid_by"?: string | null;
          "paid_to"?: string | null;
          "paid_by_entity"?: string | null;
          "decided_at"?: string | null;
          "charge_type"?: string | null;
          "rejection_meta"?: Json | null;
          "paid_by_sbu"?: boolean | null;
          "tax_id"?: string | null;
          "cost_account_id"?: string | null;
          "wo_id"?: string | null;
          "vendor_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "jo_id"?: string;
          "cost_type"?: string;
          "amount"?: number;
          "description"?: string | null;
          "status"?: string;
          "is_billable"?: boolean;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "paid_by"?: string | null;
          "paid_to"?: string | null;
          "paid_by_entity"?: string | null;
          "decided_at"?: string | null;
          "charge_type"?: string | null;
          "rejection_meta"?: Json | null;
          "paid_by_sbu"?: boolean | null;
          "tax_id"?: string | null;
          "cost_account_id"?: string | null;
          "wo_id"?: string | null;
          "vendor_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "extra_costs_cost_account_id_fkey";
            columns: ["cost_account_id"];
            isOneToOne: false;
            referencedRelation: "finance_coa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extra_costs_tax_id_fkey";
            columns: ["tax_id"];
            isOneToOne: false;
            referencedRelation: "md_taxes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extra_costs_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extra_costs_wo_id_fkey";
            columns: ["wo_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      "finance_coa": {
        Row: {
          "id": string;
          "account_number": string;
          "account_name": string;
          "category": string;
          "is_active": boolean | null;
          "created_at": string | null;
          "parent_id": string | null;
          "is_header": boolean | null;
          "description": string | null;
          "starting_balance": number | null;
        };
        Insert: {
          "id"?: string;
          "account_number": string;
          "account_name": string;
          "category": string;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "parent_id"?: string | null;
          "is_header"?: boolean | null;
          "description"?: string | null;
          "starting_balance"?: number | null;
        };
        Update: {
          "id"?: string;
          "account_number"?: string;
          "account_name"?: string;
          "category"?: string;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "parent_id"?: string | null;
          "is_header"?: boolean | null;
          "description"?: string | null;
          "starting_balance"?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "finance_coa_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "finance_coa";
            referencedColumns: ["id"];
          }
        ];
      };
      "finance_journal_entries": {
        Row: {
          "id": string;
          "journal_id": string | null;
          "account_id": string | null;
          "description": string | null;
          "debit": number | null;
          "credit": number | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "journal_id"?: string | null;
          "account_id"?: string | null;
          "description"?: string | null;
          "debit"?: number | null;
          "credit"?: number | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "journal_id"?: string | null;
          "account_id"?: string | null;
          "description"?: string | null;
          "debit"?: number | null;
          "credit"?: number | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "finance_journal_entries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "finance_coa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "finance_journal_entries_journal_id_fkey";
            columns: ["journal_id"];
            isOneToOne: false;
            referencedRelation: "finance_journals";
            referencedColumns: ["id"];
          }
        ];
      };
      "finance_journals": {
        Row: {
          "id": string;
          "job_order_id": string | null;
          "journal_date": string;
          "reference_no": string | null;
          "description": string | null;
          "status": string | null;
          "created_at": string | null;
          "wo_id": string | null;
        };
        Insert: {
          "id"?: string;
          "job_order_id"?: string | null;
          "journal_date"?: string;
          "reference_no"?: string | null;
          "description"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "wo_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string | null;
          "journal_date"?: string;
          "reference_no"?: string | null;
          "description"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "wo_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "finance_journals_wo_id_fkey";
            columns: ["wo_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      "finance_transactions": {
        Row: {
          "id": string;
          "type": string;
          "category": string;
          "amount_base": number;
          "tax_ppn": number | null;
          "tax_pph": number | null;
          "amount_total": number | null;
          "entity_id": string | null;
          "reference_id": string | null;
          "status": string | null;
          "due_date": string | null;
          "notes": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "type": string;
          "category": string;
          "amount_base"?: number;
          "tax_ppn"?: number | null;
          "tax_pph"?: number | null;
          "amount_total"?: number | null;
          "entity_id"?: string | null;
          "reference_id"?: string | null;
          "status"?: string | null;
          "due_date"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "type"?: string;
          "category"?: string;
          "amount_base"?: number;
          "tax_ppn"?: number | null;
          "tax_pph"?: number | null;
          "amount_total"?: number | null;
          "entity_id"?: string | null;
          "reference_id"?: string | null;
          "status"?: string | null;
          "due_date"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [];
      };
      "fleet_driver_history": {
        Row: {
          "id": string;
          "fleet_id": string | null;
          "driver_id": string | null;
          "assigned_at": string | null;
          "assigned_by": string | null;
          "notes": string | null;
        };
        Insert: {
          "id"?: string;
          "fleet_id"?: string | null;
          "driver_id"?: string | null;
          "assigned_at"?: string | null;
          "assigned_by"?: string | null;
          "notes"?: string | null;
        };
        Update: {
          "id"?: string;
          "fleet_id"?: string | null;
          "driver_id"?: string | null;
          "assigned_at"?: string | null;
          "assigned_by"?: string | null;
          "notes"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fleet_driver_history_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fleet_driver_history_fleet_id_fkey";
            columns: ["fleet_id"];
            isOneToOne: false;
            referencedRelation: "fleets";
            referencedColumns: ["id"];
          }
        ];
      };
      "fleet_gps_status": {
        Row: {
          "id": string;
          "fleet_id": string;
          "tenant_id": string;
          "latitude": number | null;
          "longitude": number | null;
          "speed": number | null;
          "heading": number | null;
          "address": string | null;
          "gps_time": string | null;
          "status_vehicle": number | null;
          "engine_on": boolean | null;
          "fuel_level": number | null;
          "odometer": number | null;
          "provider": string | null;
          "raw_json": Json | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "fleet_id": string;
          "tenant_id": string;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "speed"?: number | null;
          "heading"?: number | null;
          "address"?: string | null;
          "gps_time"?: string | null;
          "status_vehicle"?: number | null;
          "engine_on"?: boolean | null;
          "fuel_level"?: number | null;
          "odometer"?: number | null;
          "provider"?: string | null;
          "raw_json"?: Json | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "fleet_id"?: string;
          "tenant_id"?: string;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "speed"?: number | null;
          "heading"?: number | null;
          "address"?: string | null;
          "gps_time"?: string | null;
          "status_vehicle"?: number | null;
          "engine_on"?: boolean | null;
          "fuel_level"?: number | null;
          "odometer"?: number | null;
          "provider"?: string | null;
          "raw_json"?: Json | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fleet_gps_status_fleet_id_fkey";
            columns: ["fleet_id"];
            isOneToOne: true;
            referencedRelation: "md_fleets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fleet_gps_status_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "fleet_inspections": {
        Row: {
          "id": string;
          "driver_id": string;
          "fleet_id": string;
          "odometer_photo_url": string | null;
          "odometer_value": number | null;
          "condition_photo_url": string | null;
          "rem_ok": boolean;
          "rem_notes": string | null;
          "lampu_ok": boolean;
          "lampu_notes": string | null;
          "ban_ok": boolean;
          "ban_notes": string | null;
          "wiper_ok": boolean;
          "wiper_notes": string | null;
          "kemudi_ok": boolean;
          "kemudi_notes": string | null;
          "total_score": number;
          "status": string;
          "notes": string | null;
          "created_at": string;
          "tenant_id": string | null;
          "is_resolved": boolean | null;
          "resolved_at": string | null;
          "resolved_notes": string | null;
          "resolved_by": string | null;
        };
        Insert: {
          "id"?: string;
          "driver_id": string;
          "fleet_id": string;
          "odometer_photo_url"?: string | null;
          "odometer_value"?: number | null;
          "condition_photo_url"?: string | null;
          "rem_ok"?: boolean;
          "rem_notes"?: string | null;
          "lampu_ok"?: boolean;
          "lampu_notes"?: string | null;
          "ban_ok"?: boolean;
          "ban_notes"?: string | null;
          "wiper_ok"?: boolean;
          "wiper_notes"?: string | null;
          "kemudi_ok"?: boolean;
          "kemudi_notes"?: string | null;
          "total_score"?: number;
          "status"?: string;
          "notes"?: string | null;
          "created_at"?: string;
          "tenant_id"?: string | null;
          "is_resolved"?: boolean | null;
          "resolved_at"?: string | null;
          "resolved_notes"?: string | null;
          "resolved_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "driver_id"?: string;
          "fleet_id"?: string;
          "odometer_photo_url"?: string | null;
          "odometer_value"?: number | null;
          "condition_photo_url"?: string | null;
          "rem_ok"?: boolean;
          "rem_notes"?: string | null;
          "lampu_ok"?: boolean;
          "lampu_notes"?: string | null;
          "ban_ok"?: boolean;
          "ban_notes"?: string | null;
          "wiper_ok"?: boolean;
          "wiper_notes"?: string | null;
          "kemudi_ok"?: boolean;
          "kemudi_notes"?: string | null;
          "total_score"?: number;
          "status"?: string;
          "notes"?: string | null;
          "created_at"?: string;
          "tenant_id"?: string | null;
          "is_resolved"?: boolean | null;
          "resolved_at"?: string | null;
          "resolved_notes"?: string | null;
          "resolved_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fleet_inspections_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "md_drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fleet_inspections_fleet_id_fkey";
            columns: ["fleet_id"];
            isOneToOne: false;
            referencedRelation: "md_fleets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fleet_inspections_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "fleets": {
        Row: {
          "id": string;
          "company_id": string | null;
          "plate_number": string;
          "truck_type": string;
          "truck_brand": string | null;
          "truck_color": string | null;
          "year_manufacture": number | null;
          "status": string | null;
          "notes": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "stnk_expiry": string | null;
          "plate_expiry": string | null;
          "organization_id": string | null;
        };
        Insert: {
          "id"?: string;
          "company_id"?: string | null;
          "plate_number": string;
          "truck_type": string;
          "truck_brand"?: string | null;
          "truck_color"?: string | null;
          "year_manufacture"?: number | null;
          "status"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "stnk_expiry"?: string | null;
          "plate_expiry"?: string | null;
          "organization_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "company_id"?: string | null;
          "plate_number"?: string;
          "truck_type"?: string;
          "truck_brand"?: string | null;
          "truck_color"?: string | null;
          "year_manufacture"?: number | null;
          "status"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "stnk_expiry"?: string | null;
          "plate_expiry"?: string | null;
          "organization_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fleets_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      "fw_consolidation_manifest": {
        Row: {
          "id": string;
          "consolidation_id": string | null;
          "entity_type": string | null;
          "entity_id": string;
          "actual_cbm": number | null;
          "actual_weight_kg": number | null;
          "buying_price_per_cbm": number | null;
          "selling_price_per_cbm": number | null;
          "billing_status": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "consolidation_id"?: string | null;
          "entity_type"?: string | null;
          "entity_id": string;
          "actual_cbm"?: number | null;
          "actual_weight_kg"?: number | null;
          "buying_price_per_cbm"?: number | null;
          "selling_price_per_cbm"?: number | null;
          "billing_status"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "consolidation_id"?: string | null;
          "entity_type"?: string | null;
          "entity_id"?: string;
          "actual_cbm"?: number | null;
          "actual_weight_kg"?: number | null;
          "buying_price_per_cbm"?: number | null;
          "selling_price_per_cbm"?: number | null;
          "billing_status"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "fw_consolidations": {
        Row: {
          "id": string;
          "tenant_id": string;
          "consol_number": string;
          "shipping_line_id": string | null;
          "shipping_line_name": string | null;
          "vessel_name": string;
          "voyage_number": string | null;
          "origin_port": string;
          "destination_port": string;
          "etd": string | null;
          "eta": string | null;
          "actual_etd": string | null;
          "actual_eta": string | null;
          "consol_warehouse_origin_id": string | null;
          "consol_warehouse_destination_id": string | null;
          "status": string | null;
          "created_by": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "consol_number": string;
          "shipping_line_id"?: string | null;
          "shipping_line_name"?: string | null;
          "vessel_name": string;
          "voyage_number"?: string | null;
          "origin_port": string;
          "destination_port": string;
          "etd"?: string | null;
          "eta"?: string | null;
          "actual_etd"?: string | null;
          "actual_eta"?: string | null;
          "consol_warehouse_origin_id"?: string | null;
          "consol_warehouse_destination_id"?: string | null;
          "status"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "consol_number"?: string;
          "shipping_line_id"?: string | null;
          "shipping_line_name"?: string | null;
          "vessel_name"?: string;
          "voyage_number"?: string | null;
          "origin_port"?: string;
          "destination_port"?: string;
          "etd"?: string | null;
          "eta"?: string | null;
          "actual_etd"?: string | null;
          "actual_eta"?: string | null;
          "consol_warehouse_origin_id"?: string | null;
          "consol_warehouse_destination_id"?: string | null;
          "status"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fw_consolidations_consol_warehouse_destination_id_fkey";
            columns: ["consol_warehouse_destination_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fw_consolidations_consol_warehouse_origin_id_fkey";
            columns: ["consol_warehouse_origin_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fw_consolidations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fw_consolidations_shipping_line_id_fkey";
            columns: ["shipping_line_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          }
        ];
      };
      "fw_container_assignments": {
        Row: {
          "id": string;
          "tenant_id": string;
          "consolidation_id": string;
          "container_number": string;
          "container_type": string;
          "seal_number": string | null;
          "bl_number": string | null;
          "max_volume_cbm": number | null;
          "status": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "consolidation_id": string;
          "container_number": string;
          "container_type": string;
          "seal_number"?: string | null;
          "bl_number"?: string | null;
          "max_volume_cbm"?: number | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "consolidation_id"?: string;
          "container_number"?: string;
          "container_type"?: string;
          "seal_number"?: string | null;
          "bl_number"?: string | null;
          "max_volume_cbm"?: number | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fw_container_assignments_consolidation_id_fkey";
            columns: ["consolidation_id"];
            isOneToOne: false;
            referencedRelation: "fw_consolidations";
            referencedColumns: ["id"];
          }
        ];
      };
      "fw_container_items": {
        Row: {
          "id": string;
          "tenant_id": string;
          "container_assignment_id": string;
          "wo_item_id": string;
          "volume_cbm": number | null;
          "gross_weight_kg": number | null;
          "packages": number | null;
          "package_type": string | null;
          "commodity": string | null;
          "description": string | null;
          "delivery_type": string;
          "delivery_address": string | null;
          "delivery_contact": string | null;
          "delivery_phone": string | null;
          "pickup_wo_id": string | null;
          "port_haulage_origin_wo_id": string | null;
          "port_haulage_dest_wo_id": string | null;
          "last_mile_wo_id": string | null;
          "price_master_id": string | null;
          "sell_price_snapshot": number | null;
          "cogs_pickup": number | null;
          "cogs_port_haulage_origin": number | null;
          "cogs_ocean_freight": number | null;
          "cogs_thc_origin": number | null;
          "cogs_thc_dest": number | null;
          "cogs_port_haulage_dest": number | null;
          "cogs_last_mile": number | null;
          "cogs_documentation": number | null;
          "cogs_other": number | null;
          "goods_received_at": string | null;
          "is_deconsoled": boolean | null;
          "deconsoled_at": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "container_assignment_id": string;
          "wo_item_id": string;
          "volume_cbm"?: number | null;
          "gross_weight_kg"?: number | null;
          "packages"?: number | null;
          "package_type"?: string | null;
          "commodity"?: string | null;
          "description"?: string | null;
          "delivery_type"?: string;
          "delivery_address"?: string | null;
          "delivery_contact"?: string | null;
          "delivery_phone"?: string | null;
          "pickup_wo_id"?: string | null;
          "port_haulage_origin_wo_id"?: string | null;
          "port_haulage_dest_wo_id"?: string | null;
          "last_mile_wo_id"?: string | null;
          "price_master_id"?: string | null;
          "sell_price_snapshot"?: number | null;
          "cogs_pickup"?: number | null;
          "cogs_port_haulage_origin"?: number | null;
          "cogs_ocean_freight"?: number | null;
          "cogs_thc_origin"?: number | null;
          "cogs_thc_dest"?: number | null;
          "cogs_port_haulage_dest"?: number | null;
          "cogs_last_mile"?: number | null;
          "cogs_documentation"?: number | null;
          "cogs_other"?: number | null;
          "goods_received_at"?: string | null;
          "is_deconsoled"?: boolean | null;
          "deconsoled_at"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "container_assignment_id"?: string;
          "wo_item_id"?: string;
          "volume_cbm"?: number | null;
          "gross_weight_kg"?: number | null;
          "packages"?: number | null;
          "package_type"?: string | null;
          "commodity"?: string | null;
          "description"?: string | null;
          "delivery_type"?: string;
          "delivery_address"?: string | null;
          "delivery_contact"?: string | null;
          "delivery_phone"?: string | null;
          "pickup_wo_id"?: string | null;
          "port_haulage_origin_wo_id"?: string | null;
          "port_haulage_dest_wo_id"?: string | null;
          "last_mile_wo_id"?: string | null;
          "price_master_id"?: string | null;
          "sell_price_snapshot"?: number | null;
          "cogs_pickup"?: number | null;
          "cogs_port_haulage_origin"?: number | null;
          "cogs_ocean_freight"?: number | null;
          "cogs_thc_origin"?: number | null;
          "cogs_thc_dest"?: number | null;
          "cogs_port_haulage_dest"?: number | null;
          "cogs_last_mile"?: number | null;
          "cogs_documentation"?: number | null;
          "cogs_other"?: number | null;
          "goods_received_at"?: string | null;
          "is_deconsoled"?: boolean | null;
          "deconsoled_at"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fw_container_items_container_assignment_id_fkey";
            columns: ["container_assignment_id"];
            isOneToOne: false;
            referencedRelation: "fw_container_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fw_container_items_last_mile_wo_id_fkey";
            columns: ["last_mile_wo_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fw_container_items_pickup_wo_id_fkey";
            columns: ["pickup_wo_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fw_container_items_port_haulage_dest_wo_id_fkey";
            columns: ["port_haulage_dest_wo_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fw_container_items_port_haulage_origin_wo_id_fkey";
            columns: ["port_haulage_origin_wo_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fw_container_items_price_master_id_fkey";
            columns: ["price_master_id"];
            isOneToOne: false;
            referencedRelation: "fw_price_master";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fw_container_items_wo_item_id_fkey";
            columns: ["wo_item_id"];
            isOneToOne: false;
            referencedRelation: "wo_items";
            referencedColumns: ["id"];
          }
        ];
      };
      "fw_hs_codes": {
        Row: {
          "id": string;
          "code": string;
          "description_id": string | null;
          "description_en": string | null;
          "bm_rate": number | null;
          "ppn_rate": number | null;
          "pph_api_rate": number | null;
          "pph_non_api_rate": number | null;
          "ppnbm_rate": number | null;
          "lartas_desc": string | null;
          "regulation_ref": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "code": string;
          "description_id"?: string | null;
          "description_en"?: string | null;
          "bm_rate"?: number | null;
          "ppn_rate"?: number | null;
          "pph_api_rate"?: number | null;
          "pph_non_api_rate"?: number | null;
          "ppnbm_rate"?: number | null;
          "lartas_desc"?: string | null;
          "regulation_ref"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "code"?: string;
          "description_id"?: string | null;
          "description_en"?: string | null;
          "bm_rate"?: number | null;
          "ppn_rate"?: number | null;
          "pph_api_rate"?: number | null;
          "pph_non_api_rate"?: number | null;
          "ppnbm_rate"?: number | null;
          "lartas_desc"?: string | null;
          "regulation_ref"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [];
      };
      "fw_price_master": {
        Row: {
          "id": string;
          "tenant_id": string;
          "origin_port": string;
          "destination_port": string;
          "service_type": string;
          "container_type": string | null;
          "delivery_type": string;
          "sell_price": number | null;
          "sell_per_cbm": number | null;
          "sell_min_cbm": number | null;
          "cogs_pickup": number | null;
          "cogs_port_haulage_origin": number | null;
          "cogs_ocean_freight": number | null;
          "cogs_thc_origin": number | null;
          "cogs_thc_dest": number | null;
          "cogs_port_haulage_dest": number | null;
          "cogs_last_mile": number | null;
          "cogs_documentation": number | null;
          "cogs_other": number | null;
          "currency": string | null;
          "effective_date": string;
          "expiry_date": string | null;
          "is_active": boolean | null;
          "notes": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "origin_port": string;
          "destination_port": string;
          "service_type": string;
          "container_type"?: string | null;
          "delivery_type"?: string;
          "sell_price"?: number | null;
          "sell_per_cbm"?: number | null;
          "sell_min_cbm"?: number | null;
          "cogs_pickup"?: number | null;
          "cogs_port_haulage_origin"?: number | null;
          "cogs_ocean_freight"?: number | null;
          "cogs_thc_origin"?: number | null;
          "cogs_thc_dest"?: number | null;
          "cogs_port_haulage_dest"?: number | null;
          "cogs_last_mile"?: number | null;
          "cogs_documentation"?: number | null;
          "cogs_other"?: number | null;
          "currency"?: string | null;
          "effective_date"?: string;
          "expiry_date"?: string | null;
          "is_active"?: boolean | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "origin_port"?: string;
          "destination_port"?: string;
          "service_type"?: string;
          "container_type"?: string | null;
          "delivery_type"?: string;
          "sell_price"?: number | null;
          "sell_per_cbm"?: number | null;
          "sell_min_cbm"?: number | null;
          "cogs_pickup"?: number | null;
          "cogs_port_haulage_origin"?: number | null;
          "cogs_ocean_freight"?: number | null;
          "cogs_thc_origin"?: number | null;
          "cogs_thc_dest"?: number | null;
          "cogs_port_haulage_dest"?: number | null;
          "cogs_last_mile"?: number | null;
          "cogs_documentation"?: number | null;
          "cogs_other"?: number | null;
          "currency"?: string | null;
          "effective_date"?: string;
          "expiry_date"?: string | null;
          "is_active"?: boolean | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [];
      };
      "general_ledger": {
        Row: {
          "id": string;
          "transaction_id": string | null;
          "account_code": string;
          "account_name": string;
          "debit": number | null;
          "credit": number | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "transaction_id"?: string | null;
          "account_code": string;
          "account_name": string;
          "debit"?: number | null;
          "credit"?: number | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "transaction_id"?: string | null;
          "account_code"?: string;
          "account_name"?: string;
          "debit"?: number | null;
          "credit"?: number | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "general_ledger_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "finance_transactions";
            referencedColumns: ["id"];
          }
        ];
      };
      "geofence_events": {
        Row: {
          "id": string;
          "session_id": string | null;
          "zone_id": string | null;
          "event_type": string;
          "latitude": number;
          "longitude": number;
          "recorded_at": string;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "session_id"?: string | null;
          "zone_id"?: string | null;
          "event_type": string;
          "latitude": number;
          "longitude": number;
          "recorded_at": string;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "session_id"?: string | null;
          "zone_id"?: string | null;
          "event_type"?: string;
          "latitude"?: number;
          "longitude"?: number;
          "recorded_at"?: string;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "geofence_events_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "tracking_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "geofence_events_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "geofence_zones";
            referencedColumns: ["id"];
          }
        ];
      };
      "geofence_zones": {
        Row: {
          "id": string;
          "session_id": string | null;
          "latitude": number;
          "longitude": number;
          "radius_meters": number | null;
          "zone_type": string;
          "location_name": string | null;
          "reference_id": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "session_id"?: string | null;
          "latitude": number;
          "longitude": number;
          "radius_meters"?: number | null;
          "zone_type": string;
          "location_name"?: string | null;
          "reference_id"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "session_id"?: string | null;
          "latitude"?: number;
          "longitude"?: number;
          "radius_meters"?: number | null;
          "zone_type"?: string;
          "location_name"?: string | null;
          "reference_id"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "geofence_zones_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "tracking_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      "gps_provider_configs": {
        Row: {
          "id": string;
          "tenant_id": string;
          "provider_name": string;
          "api_token": string;
          "api_url": string;
          "is_active": boolean | null;
          "config": Json | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "provider_name": string;
          "api_token": string;
          "api_url"?: string;
          "is_active"?: boolean | null;
          "config"?: Json | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "provider_name"?: string;
          "api_token"?: string;
          "api_url"?: string;
          "is_active"?: boolean | null;
          "config"?: Json | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "gps_provider_configs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "ground_assignment_pics": {
        Row: {
          "id": string;
          "job_order_id": string;
          "pic1_staff_id": string | null;
          "pic2_staff_id": string | null;
          "assigned_by": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "job_order_id": string;
          "pic1_staff_id"?: string | null;
          "pic2_staff_id"?: string | null;
          "assigned_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string;
          "pic1_staff_id"?: string | null;
          "pic2_staff_id"?: string | null;
          "assigned_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ground_assignment_pics_job_order_id_fkey";
            columns: ["job_order_id"];
            isOneToOne: true;
            referencedRelation: "job_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ground_assignment_pics_pic1_staff_id_fkey";
            columns: ["pic1_staff_id"];
            isOneToOne: false;
            referencedRelation: "ground_staff_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ground_assignment_pics_pic2_staff_id_fkey";
            columns: ["pic2_staff_id"];
            isOneToOne: false;
            referencedRelation: "ground_staff_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      "ground_documents": {
        Row: {
          "id": string;
          "ground_event_id": string;
          "document_type": string;
          "photo_url": string;
          "ocr_result": Json | null;
          "thumbnail_url": string | null;
          "created_at": string | null;
          "job_order_id": string | null;
          "file_url": string | null;
          "notes": string | null;
        };
        Insert: {
          "id"?: string;
          "ground_event_id": string;
          "document_type": string;
          "photo_url": string;
          "ocr_result"?: Json | null;
          "thumbnail_url"?: string | null;
          "created_at"?: string | null;
          "job_order_id"?: string | null;
          "file_url"?: string | null;
          "notes"?: string | null;
        };
        Update: {
          "id"?: string;
          "ground_event_id"?: string;
          "document_type"?: string;
          "photo_url"?: string;
          "ocr_result"?: Json | null;
          "thumbnail_url"?: string | null;
          "created_at"?: string | null;
          "job_order_id"?: string | null;
          "file_url"?: string | null;
          "notes"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ground_documents_ground_event_id_fkey";
            columns: ["ground_event_id"];
            isOneToOne: false;
            referencedRelation: "ground_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ground_documents_job_order_id_fkey";
            columns: ["job_order_id"];
            isOneToOne: false;
            referencedRelation: "job_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      "ground_event_types": {
        Row: {
          "event_type": string;
          "label": string;
          "requires_photo": boolean | null;
          "requires_container": boolean | null;
          "sort_order": number | null;
          "is_active": boolean | null;
        };
        Insert: {
          "event_type": string;
          "label": string;
          "requires_photo"?: boolean | null;
          "requires_container"?: boolean | null;
          "sort_order"?: number | null;
          "is_active"?: boolean | null;
        };
        Update: {
          "event_type"?: string;
          "label"?: string;
          "requires_photo"?: boolean | null;
          "requires_container"?: boolean | null;
          "sort_order"?: number | null;
          "is_active"?: boolean | null;
        };
        Relationships: [];
      };
      "ground_events": {
        Row: {
          "id": string;
          "job_order_id": string;
          "event_type": string;
          "captured_by": string | null;
          "captured_by_name": string | null;
          "site_id": string | null;
          "latitude": number | null;
          "longitude": number | null;
          "photo_url": string | null;
          "ocr_json": Json | null;
          "ocr_confidence": number | null;
          "match_method": string | null;
          "matched_entity_id": string | null;
          "notes": string | null;
          "source": string | null;
          "created_at": string | null;
          "verification_type": string | null;
          "verified_against": string | null;
          "verified_match": boolean | null;
        };
        Insert: {
          "id"?: string;
          "job_order_id": string;
          "event_type": string;
          "captured_by"?: string | null;
          "captured_by_name"?: string | null;
          "site_id"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "photo_url"?: string | null;
          "ocr_json"?: Json | null;
          "ocr_confidence"?: number | null;
          "match_method"?: string | null;
          "matched_entity_id"?: string | null;
          "notes"?: string | null;
          "source"?: string | null;
          "created_at"?: string | null;
          "verification_type"?: string | null;
          "verified_against"?: string | null;
          "verified_match"?: boolean | null;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string;
          "event_type"?: string;
          "captured_by"?: string | null;
          "captured_by_name"?: string | null;
          "site_id"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "photo_url"?: string | null;
          "ocr_json"?: Json | null;
          "ocr_confidence"?: number | null;
          "match_method"?: string | null;
          "matched_entity_id"?: string | null;
          "notes"?: string | null;
          "source"?: string | null;
          "created_at"?: string | null;
          "verification_type"?: string | null;
          "verified_against"?: string | null;
          "verified_match"?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "ground_events_captured_by_fkey";
            columns: ["captured_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ground_events_job_order_id_fkey";
            columns: ["job_order_id"];
            isOneToOne: false;
            referencedRelation: "job_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ground_events_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "ground_sites";
            referencedColumns: ["id"];
          }
        ];
      };
      "ground_sites": {
        Row: {
          "id": string;
          "tenant_id": string;
          "name": string;
          "code": string | null;
          "site_type": string;
          "address": string | null;
          "latitude": number | null;
          "longitude": number | null;
          "geofence_radius_m": number;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "name": string;
          "code"?: string | null;
          "site_type"?: string;
          "address"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "geofence_radius_m"?: number;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "name"?: string;
          "code"?: string | null;
          "site_type"?: string;
          "address"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "geofence_radius_m"?: number;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ground_sites_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "ground_staff_profiles": {
        Row: {
          "id": string;
          "user_id": string;
          "tenant_id": string;
          "name": string;
          "phone": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "user_id": string;
          "tenant_id": string;
          "name": string;
          "phone"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "user_id"?: string;
          "tenant_id"?: string;
          "name"?: string;
          "phone"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ground_staff_profiles_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ground_staff_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "hs_agent_config": {
        Row: {
          "id": string;
          "ai_weight": number | null;
          "vector_weight": number | null;
          "btki_weight": number | null;
          "graph_weight": number | null;
          "error_threshold": number | null;
          "last_optimized": string | null;
        };
        Insert: {
          "id"?: string;
          "ai_weight"?: number | null;
          "vector_weight"?: number | null;
          "btki_weight"?: number | null;
          "graph_weight"?: number | null;
          "error_threshold"?: number | null;
          "last_optimized"?: string | null;
        };
        Update: {
          "id"?: string;
          "ai_weight"?: number | null;
          "vector_weight"?: number | null;
          "btki_weight"?: number | null;
          "graph_weight"?: number | null;
          "error_threshold"?: number | null;
          "last_optimized"?: string | null;
        };
        Relationships: [];
      };
      "hs_agent_memory": {
        Row: {
          "id": string;
          "query": string;
          "hs_code": string;
          "decision_type": string;
          "scores_json": Json;
          "final_confidence": number;
          "is_correct": boolean | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "query": string;
          "hs_code": string;
          "decision_type": string;
          "scores_json": Json;
          "final_confidence": number;
          "is_correct"?: boolean | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "query"?: string;
          "hs_code"?: string;
          "decision_type"?: string;
          "scores_json"?: Json;
          "final_confidence"?: number;
          "is_correct"?: boolean | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "hs_codes": {
        Row: {
          "code": string;
          "description": string | null;
          "parent_code": string | null;
          "level": number | null;
          "tarif": string | null;
          "lartas": string | null;
          "bm_mfn": string | null;
          "ppn": string | null;
          "ppnbm": string | null;
          "cukai": string | null;
          "bm_ad": string | null;
          "bm_tp": string | null;
          "bm_im": string | null;
          "pph_api": string | null;
          "pph_non_api": string | null;
          "bk": string | null;
          "dhe_sda": string | null;
          "note": string | null;
          "regulations": Json | null;
          "bm_mfn_reg": string | null;
          "ppn_reg": string | null;
          "pph_api_reg": string | null;
        };
        Insert: {
          "code": string;
          "description"?: string | null;
          "parent_code"?: string | null;
          "level"?: number | null;
          "tarif"?: string | null;
          "lartas"?: string | null;
          "bm_mfn"?: string | null;
          "ppn"?: string | null;
          "ppnbm"?: string | null;
          "cukai"?: string | null;
          "bm_ad"?: string | null;
          "bm_tp"?: string | null;
          "bm_im"?: string | null;
          "pph_api"?: string | null;
          "pph_non_api"?: string | null;
          "bk"?: string | null;
          "dhe_sda"?: string | null;
          "note"?: string | null;
          "regulations"?: Json | null;
          "bm_mfn_reg"?: string | null;
          "ppn_reg"?: string | null;
          "pph_api_reg"?: string | null;
        };
        Update: {
          "code"?: string;
          "description"?: string | null;
          "parent_code"?: string | null;
          "level"?: number | null;
          "tarif"?: string | null;
          "lartas"?: string | null;
          "bm_mfn"?: string | null;
          "ppn"?: string | null;
          "ppnbm"?: string | null;
          "cukai"?: string | null;
          "bm_ad"?: string | null;
          "bm_tp"?: string | null;
          "bm_im"?: string | null;
          "pph_api"?: string | null;
          "pph_non_api"?: string | null;
          "bk"?: string | null;
          "dhe_sda"?: string | null;
          "note"?: string | null;
          "regulations"?: Json | null;
          "bm_mfn_reg"?: string | null;
          "ppn_reg"?: string | null;
          "pph_api_reg"?: string | null;
        };
        Relationships: [];
      };
      "hs_codes_temp": {
        Row: {
          "code": string;
          "description": string | null;
          "parent_code": string | null;
          "level": number | null;
        };
        Insert: {
          "code": string;
          "description"?: string | null;
          "parent_code"?: string | null;
          "level"?: number | null;
        };
        Update: {
          "code"?: string;
          "description"?: string | null;
          "parent_code"?: string | null;
          "level"?: number | null;
        };
        Relationships: [];
      };
      "hs_country_registry": {
        Row: {
          "code": string;
          "name": string;
          "tariff_system": string;
          "digit_standard": number | null;
          "region": string | null;
        };
        Insert: {
          "code": string;
          "name": string;
          "tariff_system": string;
          "digit_standard"?: number | null;
          "region"?: string | null;
        };
        Update: {
          "code"?: string;
          "name"?: string;
          "tariff_system"?: string;
          "digit_standard"?: number | null;
          "region"?: string | null;
        };
        Relationships: [];
      };
      "hs_edges": {
        Row: {
          "id": string;
          "from_node": string | null;
          "to_node": string | null;
          "relation": string;
          "weight": number | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "from_node"?: string | null;
          "to_node"?: string | null;
          "relation": string;
          "weight"?: number | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "from_node"?: string | null;
          "to_node"?: string | null;
          "relation"?: string;
          "weight"?: number | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hs_edges_from_node_fkey";
            columns: ["from_node"];
            isOneToOne: false;
            referencedRelation: "hs_nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "hs_edges_to_node_fkey";
            columns: ["to_node"];
            isOneToOne: false;
            referencedRelation: "hs_nodes";
            referencedColumns: ["id"];
          }
        ];
      };
      "hs_embeddings": {
        Row: {
          "id": string;
          "hs_code": string;
          "description": string;
          "embedding": unknown | null;
          "level": number | null;
          "is_official": boolean | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "hs_code": string;
          "description": string;
          "embedding"?: unknown | null;
          "level"?: number | null;
          "is_official"?: boolean | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "hs_code"?: string;
          "description"?: string;
          "embedding"?: unknown | null;
          "level"?: number | null;
          "is_official"?: boolean | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "hs_feedback": {
        Row: {
          "id": string;
          "query": string;
          "predicted_hs": string;
          "corrected_hs": string;
          "confidence_before": number | null;
          "confidence_after": number | null;
          "source": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "query": string;
          "predicted_hs": string;
          "corrected_hs": string;
          "confidence_before"?: number | null;
          "confidence_after"?: number | null;
          "source"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "query"?: string;
          "predicted_hs"?: string;
          "corrected_hs"?: string;
          "confidence_before"?: number | null;
          "confidence_after"?: number | null;
          "source"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "hs_global_patterns": {
        Row: {
          "id": string;
          "wco_code": string;
          "country_code": string;
          "local_hs": string;
          "usage_frequency": number | null;
          "correction_rate": number | null;
          "confidence_adjustment": number | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "wco_code": string;
          "country_code": string;
          "local_hs": string;
          "usage_frequency"?: number | null;
          "correction_rate"?: number | null;
          "confidence_adjustment"?: number | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "wco_code"?: string;
          "country_code"?: string;
          "local_hs"?: string;
          "usage_frequency"?: number | null;
          "correction_rate"?: number | null;
          "confidence_adjustment"?: number | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "hs_job_tracking": {
        Row: {
          "id": string;
          "job_id": string;
          "query": string;
          "status": string;
          "worker_id": string | null;
          "result_json": Json | null;
          "error_message": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "job_id": string;
          "query": string;
          "status": string;
          "worker_id"?: string | null;
          "result_json"?: Json | null;
          "error_message"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "job_id"?: string;
          "query"?: string;
          "status"?: string;
          "worker_id"?: string | null;
          "result_json"?: Json | null;
          "error_message"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [];
      };
      "hs_nodes": {
        Row: {
          "id": string;
          "type": string;
          "name": string;
          "properties": Json | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "type": string;
          "name": string;
          "properties"?: Json | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "type"?: string;
          "name"?: string;
          "properties"?: Json | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "hs_pattern_memory": {
        Row: {
          "id": string;
          "keyword": string;
          "hs_code": string;
          "weight": number | null;
          "occurrence_count": number | null;
          "last_used": string | null;
        };
        Insert: {
          "id"?: string;
          "keyword": string;
          "hs_code": string;
          "weight"?: number | null;
          "occurrence_count"?: number | null;
          "last_used"?: string | null;
        };
        Update: {
          "id"?: string;
          "keyword"?: string;
          "hs_code"?: string;
          "weight"?: number | null;
          "occurrence_count"?: number | null;
          "last_used"?: string | null;
        };
        Relationships: [];
      };
      "hs_requests_log": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "query": string;
          "result_json": Json | null;
          "risk_level": string | null;
          "final_decision": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "query": string;
          "result_json"?: Json | null;
          "risk_level"?: string | null;
          "final_decision"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "query"?: string;
          "result_json"?: Json | null;
          "risk_level"?: string | null;
          "final_decision"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "hs_search_requests": {
        Row: {
          "id": string;
          "keyword": string | null;
          "translated_keyword": string | null;
          "best_hs_code": string | null;
          "confidence": number | null;
          "sources": Json | null;
          "response_time_ms": number | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "keyword"?: string | null;
          "translated_keyword"?: string | null;
          "best_hs_code"?: string | null;
          "confidence"?: number | null;
          "sources"?: Json | null;
          "response_time_ms"?: number | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "keyword"?: string | null;
          "translated_keyword"?: string | null;
          "best_hs_code"?: string | null;
          "confidence"?: number | null;
          "sources"?: Json | null;
          "response_time_ms"?: number | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "hs_tariff_rates": {
        Row: {
          "id": string;
          "hs_code": string | null;
          "country_code": string | null;
          "tenant_id": string | null;
          "bm_mfn": string | null;
          "ppn": string | null;
          "ppnbm": string | null;
          "pph_api": string | null;
          "pph_non_api": string | null;
          "lartas": string | null;
          "description": string | null;
          "note": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "hs_code"?: string | null;
          "country_code"?: string | null;
          "tenant_id"?: string | null;
          "bm_mfn"?: string | null;
          "ppn"?: string | null;
          "ppnbm"?: string | null;
          "pph_api"?: string | null;
          "pph_non_api"?: string | null;
          "lartas"?: string | null;
          "description"?: string | null;
          "note"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "hs_code"?: string | null;
          "country_code"?: string | null;
          "tenant_id"?: string | null;
          "bm_mfn"?: string | null;
          "ppn"?: string | null;
          "ppnbm"?: string | null;
          "pph_api"?: string | null;
          "pph_non_api"?: string | null;
          "lartas"?: string | null;
          "description"?: string | null;
          "note"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [];
      };
      "inbound_damages": {
        Row: {
          "id": string;
          "inbound_id": string | null;
          "inbound_detail_id": string | null;
          "sku_name": string | null;
          "damage_qty": number | null;
          "damage_cause": string | null;
          "damage_category": string | null;
          "photo_urls": string[] | null;
          "notes": string | null;
          "status": string | null;
          "approved_by": string | null;
          "approved_at": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "inbound_id"?: string | null;
          "inbound_detail_id"?: string | null;
          "sku_name"?: string | null;
          "damage_qty"?: number | null;
          "damage_cause"?: string | null;
          "damage_category"?: string | null;
          "photo_urls"?: string[] | null;
          "notes"?: string | null;
          "status"?: string | null;
          "approved_by"?: string | null;
          "approved_at"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "inbound_id"?: string | null;
          "inbound_detail_id"?: string | null;
          "sku_name"?: string | null;
          "damage_qty"?: number | null;
          "damage_cause"?: string | null;
          "damage_category"?: string | null;
          "photo_urls"?: string[] | null;
          "notes"?: string | null;
          "status"?: string | null;
          "approved_by"?: string | null;
          "approved_at"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inbound_damages_inbound_detail_id_fkey";
            columns: ["inbound_detail_id"];
            isOneToOne: false;
            referencedRelation: "inbound_details";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbound_damages_inbound_id_fkey";
            columns: ["inbound_id"];
            isOneToOne: false;
            referencedRelation: "inbound_headers";
            referencedColumns: ["id"];
          }
        ];
      };
      "inbound_details": {
        Row: {
          "id": string;
          "inbound_id": string | null;
          "product_id": string | null;
          "sku": string | null;
          "sku_name": string;
          "expected_quantity": number | null;
          "received_quantity": number | null;
          "rejected_quantity": number | null;
          "unit": string | null;
          "notes": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "inbound_id"?: string | null;
          "product_id"?: string | null;
          "sku"?: string | null;
          "sku_name": string;
          "expected_quantity"?: number | null;
          "received_quantity"?: number | null;
          "rejected_quantity"?: number | null;
          "unit"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "inbound_id"?: string | null;
          "product_id"?: string | null;
          "sku"?: string | null;
          "sku_name"?: string;
          "expected_quantity"?: number | null;
          "received_quantity"?: number | null;
          "rejected_quantity"?: number | null;
          "unit"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inbound_details_inbound_id_fkey";
            columns: ["inbound_id"];
            isOneToOne: false;
            referencedRelation: "inbound_headers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbound_details_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      "inbound_headers": {
        Row: {
          "id": string;
          "tenant_id": string;
          "asn_number": string;
          "ref_number": string | null;
          "order_date": string | null;
          "eta_date": string | null;
          "eta_time": string | null;
          "shipper_id": string | null;
          "customer_id": string | null;
          "transporter_id": string | null;
          "recipient_id": string | null;
          "armada_id": string | null;
          "driver_id": string | null;
          "arrival_date": string;
          "notes": string | null;
          "header_notes": string | null;
          "status": string | null;
          "received_by": string | null;
          "received_at": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "workflow_status": string | null;
          "arrived_at": string | null;
          "unload_started_at": string | null;
          "unload_stopped_at": string | null;
          "qc_completed_at": string | null;
          "putaway_completed_at": string | null;
          "truck_photo_url": string | null;
          "driver_scan_photo_url": string | null;
          "berita_acara_photo_url": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "asn_number": string;
          "ref_number"?: string | null;
          "order_date"?: string | null;
          "eta_date"?: string | null;
          "eta_time"?: string | null;
          "shipper_id"?: string | null;
          "customer_id"?: string | null;
          "transporter_id"?: string | null;
          "recipient_id"?: string | null;
          "armada_id"?: string | null;
          "driver_id"?: string | null;
          "arrival_date"?: string;
          "notes"?: string | null;
          "header_notes"?: string | null;
          "status"?: string | null;
          "received_by"?: string | null;
          "received_at"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "workflow_status"?: string | null;
          "arrived_at"?: string | null;
          "unload_started_at"?: string | null;
          "unload_stopped_at"?: string | null;
          "qc_completed_at"?: string | null;
          "putaway_completed_at"?: string | null;
          "truck_photo_url"?: string | null;
          "driver_scan_photo_url"?: string | null;
          "berita_acara_photo_url"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "asn_number"?: string;
          "ref_number"?: string | null;
          "order_date"?: string | null;
          "eta_date"?: string | null;
          "eta_time"?: string | null;
          "shipper_id"?: string | null;
          "customer_id"?: string | null;
          "transporter_id"?: string | null;
          "recipient_id"?: string | null;
          "armada_id"?: string | null;
          "driver_id"?: string | null;
          "arrival_date"?: string;
          "notes"?: string | null;
          "header_notes"?: string | null;
          "status"?: string | null;
          "received_by"?: string | null;
          "received_at"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "workflow_status"?: string | null;
          "arrived_at"?: string | null;
          "unload_started_at"?: string | null;
          "unload_stopped_at"?: string | null;
          "qc_completed_at"?: string | null;
          "putaway_completed_at"?: string | null;
          "truck_photo_url"?: string | null;
          "driver_scan_photo_url"?: string | null;
          "berita_acara_photo_url"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inbound_headers_armada_id_fkey";
            columns: ["armada_id"];
            isOneToOne: false;
            referencedRelation: "armada";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbound_headers_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbound_headers_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbound_headers_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "recipients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbound_headers_shipper_id_fkey";
            columns: ["shipper_id"];
            isOneToOne: false;
            referencedRelation: "shippers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbound_headers_transporter_id_fkey";
            columns: ["transporter_id"];
            isOneToOne: false;
            referencedRelation: "transporters";
            referencedColumns: ["id"];
          }
        ];
      };
      "inbound_putaway": {
        Row: {
          "id": string;
          "inbound_id": string | null;
          "inbound_detail_id": string | null;
          "storage_area_id": string | null;
          "sku_name": string | null;
          "quantity": number | null;
          "operator_id": string | null;
          "completed_at": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "inbound_id"?: string | null;
          "inbound_detail_id"?: string | null;
          "storage_area_id"?: string | null;
          "sku_name"?: string | null;
          "quantity"?: number | null;
          "operator_id"?: string | null;
          "completed_at"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "inbound_id"?: string | null;
          "inbound_detail_id"?: string | null;
          "storage_area_id"?: string | null;
          "sku_name"?: string | null;
          "quantity"?: number | null;
          "operator_id"?: string | null;
          "completed_at"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inbound_putaway_inbound_detail_id_fkey";
            columns: ["inbound_detail_id"];
            isOneToOne: false;
            referencedRelation: "inbound_details";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbound_putaway_inbound_id_fkey";
            columns: ["inbound_id"];
            isOneToOne: false;
            referencedRelation: "inbound_headers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inbound_putaway_storage_area_id_fkey";
            columns: ["storage_area_id"];
            isOneToOne: false;
            referencedRelation: "storage_areas";
            referencedColumns: ["id"];
          }
        ];
      };
      "intr_endpoint_cache": {
        Row: {
          "id": string;
          "endpoint": string;
          "method": string;
          "headers": Json | null;
          "payload_template": Json | null;
          "success_score": number | null;
          "last_verified": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "endpoint": string;
          "method"?: string;
          "headers"?: Json | null;
          "payload_template"?: Json | null;
          "success_score"?: number | null;
          "last_verified"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "endpoint"?: string;
          "method"?: string;
          "headers"?: Json | null;
          "payload_template"?: Json | null;
          "success_score"?: number | null;
          "last_verified"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "intr_rules": {
        Row: {
          "id": string;
          "hs_code": string;
          "country_code": string;
          "status": string;
          "permit_required": boolean | null;
          "permit_type": string | null;
          "agency": string[] | null;
          "restriction_type": string[] | null;
          "description": string | null;
          "source_id": string | null;
          "effective_from": string | null;
          "effective_to": string | null;
          "is_active": boolean | null;
          "confidence_score": number | null;
          "created_at": string | null;
          "updated_at": string | null;
          "hs_level": string | null;
        };
        Insert: {
          "id"?: string;
          "hs_code": string;
          "country_code": string;
          "status": string;
          "permit_required"?: boolean | null;
          "permit_type"?: string | null;
          "agency"?: string[] | null;
          "restriction_type"?: string[] | null;
          "description"?: string | null;
          "source_id"?: string | null;
          "effective_from"?: string | null;
          "effective_to"?: string | null;
          "is_active"?: boolean | null;
          "confidence_score"?: number | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "hs_level"?: string | null;
        };
        Update: {
          "id"?: string;
          "hs_code"?: string;
          "country_code"?: string;
          "status"?: string;
          "permit_required"?: boolean | null;
          "permit_type"?: string | null;
          "agency"?: string[] | null;
          "restriction_type"?: string[] | null;
          "description"?: string | null;
          "source_id"?: string | null;
          "effective_from"?: string | null;
          "effective_to"?: string | null;
          "is_active"?: boolean | null;
          "confidence_score"?: number | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "hs_level"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "intr_rules_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "country_master";
            referencedColumns: ["country_code"];
          }
        ];
      };
      "intr_test_log": {
        Row: {
          "test_id": string;
          "hs_code": string;
          "endpoint": string | null;
          "status": string | null;
          "health_score": number | null;
          "response_time": number | null;
          "report": Json | null;
          "created_at": string | null;
        };
        Insert: {
          "test_id"?: string;
          "hs_code": string;
          "endpoint"?: string | null;
          "status"?: string | null;
          "health_score"?: number | null;
          "response_time"?: number | null;
          "report"?: Json | null;
          "created_at"?: string | null;
        };
        Update: {
          "test_id"?: string;
          "hs_code"?: string;
          "endpoint"?: string | null;
          "status"?: string | null;
          "health_score"?: number | null;
          "response_time"?: number | null;
          "report"?: Json | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "inventory": {
        Row: {
          "id": string;
          "product_id": string;
          "warehouse_id": string;
          "customer_id": string;
          "quantity": number | null;
          "lot_number": string | null;
          "status": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "batch_id": string | null;
          "uom_id": string | null;
          "location_barcode": string | null;
        };
        Insert: {
          "id"?: string;
          "product_id": string;
          "warehouse_id": string;
          "customer_id": string;
          "quantity"?: number | null;
          "lot_number"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "batch_id"?: string | null;
          "uom_id"?: string | null;
          "location_barcode"?: string | null;
        };
        Update: {
          "id"?: string;
          "product_id"?: string;
          "warehouse_id"?: string;
          "customer_id"?: string;
          "quantity"?: number | null;
          "lot_number"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "batch_id"?: string | null;
          "uom_id"?: string | null;
          "location_barcode"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "product_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_uom_id_fkey";
            columns: ["uom_id"];
            isOneToOne: false;
            referencedRelation: "uom_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "inventory_movement_history": {
        Row: {
          "id": string;
          "item_id": string | null;
          "warehouse_id": string | null;
          "old_quantity": number | null;
          "new_quantity": number;
          "movement_type": string;
          "reference_type": string | null;
          "reference_id": string | null;
          "changed_by": string | null;
          "changed_at": string;
          "correlation_id": string | null;
          "notes": string | null;
        };
        Insert: {
          "id"?: string;
          "item_id"?: string | null;
          "warehouse_id"?: string | null;
          "old_quantity"?: number | null;
          "new_quantity": number;
          "movement_type": string;
          "reference_type"?: string | null;
          "reference_id"?: string | null;
          "changed_by"?: string | null;
          "changed_at"?: string;
          "correlation_id"?: string | null;
          "notes"?: string | null;
        };
        Update: {
          "id"?: string;
          "item_id"?: string | null;
          "warehouse_id"?: string | null;
          "old_quantity"?: number | null;
          "new_quantity"?: number;
          "movement_type"?: string;
          "reference_type"?: string | null;
          "reference_id"?: string | null;
          "changed_by"?: string | null;
          "changed_at"?: string;
          "correlation_id"?: string | null;
          "notes"?: string | null;
        };
        Relationships: [];
      };
      "inventory_movements": {
        Row: {
          "id": string;
          "tenant_id": string;
          "product_id": string;
          "warehouse_id": string | null;
          "customer_id": string | null;
          "location_from": string | null;
          "location_to": string | null;
          "quantity": number;
          "movement_type": string | null;
          "reference_id": string | null;
          "notes": string | null;
          "created_at": string | null;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "product_id": string;
          "warehouse_id"?: string | null;
          "customer_id"?: string | null;
          "location_from"?: string | null;
          "location_to"?: string | null;
          "quantity": number;
          "movement_type"?: string | null;
          "reference_id"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "product_id"?: string;
          "warehouse_id"?: string | null;
          "customer_id"?: string | null;
          "location_from"?: string | null;
          "location_to"?: string | null;
          "quantity"?: number;
          "movement_type"?: string | null;
          "reference_id"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "invoice_line_items": {
        Row: {
          "id": string;
          "invoice_id": string;
          "jo_id": string;
          "description": string | null;
          "plate_number": string | null;
          "driver_name": string | null;
          "amount": number;
          "co_cost_account_id": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "invoice_id": string;
          "jo_id": string;
          "description"?: string | null;
          "plate_number"?: string | null;
          "driver_name"?: string | null;
          "amount"?: number;
          "co_cost_account_id"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "invoice_id"?: string;
          "jo_id"?: string;
          "description"?: string | null;
          "plate_number"?: string | null;
          "driver_name"?: string | null;
          "amount"?: number;
          "co_cost_account_id"?: string | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_co_cost_account_id_fkey";
            columns: ["co_cost_account_id"];
            isOneToOne: false;
            referencedRelation: "finance_coa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          }
        ];
      };
      "invoice_lines": {
        Row: {
          "id": string;
          "invoice_id": string;
          "tenant_id": string | null;
          "line_type": string;
          "job_order_id": string | null;
          "extra_cost_id": string | null;
          "description": string;
          "coa_id": string | null;
          "charge_type": string;
          "quantity": number;
          "unit_amount": number;
          "amount": number;
          "sort_order": number;
          "created_at": string;
          "updated_at": string;
        };
        Insert: {
          "id"?: string;
          "invoice_id": string;
          "tenant_id"?: string | null;
          "line_type"?: string;
          "job_order_id"?: string | null;
          "extra_cost_id"?: string | null;
          "description"?: string;
          "coa_id"?: string | null;
          "charge_type"?: string;
          "quantity"?: number;
          "unit_amount"?: number;
          "amount"?: number;
          "sort_order"?: number;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Update: {
          "id"?: string;
          "invoice_id"?: string;
          "tenant_id"?: string | null;
          "line_type"?: string;
          "job_order_id"?: string | null;
          "extra_cost_id"?: string | null;
          "description"?: string;
          "coa_id"?: string | null;
          "charge_type"?: string;
          "quantity"?: number;
          "unit_amount"?: number;
          "amount"?: number;
          "sort_order"?: number;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_lines_coa_id_fkey";
            columns: ["coa_id"];
            isOneToOne: false;
            referencedRelation: "finance_coa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_lines_extra_cost_id_fkey";
            columns: ["extra_cost_id"];
            isOneToOne: false;
            referencedRelation: "extra_costs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_lines_job_order_id_fkey";
            columns: ["job_order_id"];
            isOneToOne: false;
            referencedRelation: "job_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      "invoices": {
        Row: {
          "id": string;
          "wo_id": string;
          "invoice_number": string | null;
          "co_revenue_account_id": string | null;
          "total_billing": number | null;
          "total_cogs": number | null;
          "gross_margin": number | null;
          "tax_amount": number | null;
          "tax_percentage": number | null;
          "status": string;
          "invoice_date": string | null;
          "due_date": string | null;
          "sent_at": string | null;
          "customer_accepted_invoice_at": string | null;
          "paid_at": string | null;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
          "tax_id": string | null;
          "line_items": Json | null;
        };
        Insert: {
          "id"?: string;
          "wo_id": string;
          "invoice_number"?: string | null;
          "co_revenue_account_id"?: string | null;
          "total_billing"?: number | null;
          "total_cogs"?: number | null;
          "gross_margin"?: number | null;
          "tax_amount"?: number | null;
          "tax_percentage"?: number | null;
          "status"?: string;
          "invoice_date"?: string | null;
          "due_date"?: string | null;
          "sent_at"?: string | null;
          "customer_accepted_invoice_at"?: string | null;
          "paid_at"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "tax_id"?: string | null;
          "line_items"?: Json | null;
        };
        Update: {
          "id"?: string;
          "wo_id"?: string;
          "invoice_number"?: string | null;
          "co_revenue_account_id"?: string | null;
          "total_billing"?: number | null;
          "total_cogs"?: number | null;
          "gross_margin"?: number | null;
          "tax_amount"?: number | null;
          "tax_percentage"?: number | null;
          "status"?: string;
          "invoice_date"?: string | null;
          "due_date"?: string | null;
          "sent_at"?: string | null;
          "customer_accepted_invoice_at"?: string | null;
          "paid_at"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "tax_id"?: string | null;
          "line_items"?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_co_revenue_account_id_fkey";
            columns: ["co_revenue_account_id"];
            isOneToOne: false;
            referencedRelation: "finance_coa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_tax_id_fkey";
            columns: ["tax_id"];
            isOneToOne: false;
            referencedRelation: "md_taxes";
            referencedColumns: ["id"];
          }
        ];
      };
      "jo_warehouse_assignments": {
        Row: {
          "id": string;
          "tenant_id": string;
          "job_order_id": string;
          "warehouse_location_id": string;
          "allocated_cbm": number | null;
          "allocated_kg": number | null;
          "created_at": string;
          "updated_at": string;
          "wo_item_manifest_id": string | null;
          "quantity": number | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "job_order_id": string;
          "warehouse_location_id": string;
          "allocated_cbm"?: number | null;
          "allocated_kg"?: number | null;
          "created_at"?: string;
          "updated_at"?: string;
          "wo_item_manifest_id"?: string | null;
          "quantity"?: number | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "job_order_id"?: string;
          "warehouse_location_id"?: string;
          "allocated_cbm"?: number | null;
          "allocated_kg"?: number | null;
          "created_at"?: string;
          "updated_at"?: string;
          "wo_item_manifest_id"?: string | null;
          "quantity"?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "jo_warehouse_assignments_job_order_id_fkey";
            columns: ["job_order_id"];
            isOneToOne: false;
            referencedRelation: "job_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jo_warehouse_assignments_warehouse_location_id_fkey";
            columns: ["warehouse_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jo_warehouse_assignments_wo_item_manifest_id_fkey";
            columns: ["wo_item_manifest_id"];
            isOneToOne: false;
            referencedRelation: "wo_item_manifests";
            referencedColumns: ["id"];
          }
        ];
      };
      "job_order_payments": {
        Row: {
          "id": string;
          "job_order_id": string;
          "payment_type": string;
          "amount": number;
          "paid_by": string;
          "paid_by_user": string | null;
          "paid_at": string | null;
          "transfer_proof_url": string | null;
          "notes": string | null;
          "status": string;
          "verified_by": string | null;
          "verified_at": string | null;
          "extra_cost_id": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "job_order_id": string;
          "payment_type": string;
          "amount": number;
          "paid_by": string;
          "paid_by_user"?: string | null;
          "paid_at"?: string | null;
          "transfer_proof_url"?: string | null;
          "notes"?: string | null;
          "status"?: string;
          "verified_by"?: string | null;
          "verified_at"?: string | null;
          "extra_cost_id"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string;
          "payment_type"?: string;
          "amount"?: number;
          "paid_by"?: string;
          "paid_by_user"?: string | null;
          "paid_at"?: string | null;
          "transfer_proof_url"?: string | null;
          "notes"?: string | null;
          "status"?: string;
          "verified_by"?: string | null;
          "verified_at"?: string | null;
          "extra_cost_id"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_order_payments_extra_cost_id_fkey";
            columns: ["extra_cost_id"];
            isOneToOne: false;
            referencedRelation: "extra_costs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_order_payments_job_order_id_fkey";
            columns: ["job_order_id"];
            isOneToOne: false;
            referencedRelation: "job_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_order_payments_paid_by_user_fkey";
            columns: ["paid_by_user"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_order_payments_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "job_orders": {
        Row: {
          "id": string;
          "tenant_id": string;
          "wo_item_id": string;
          "jo_number": string;
          "status": string | null;
          "transporter_id": string | null;
          "fleet_id": string | null;
          "driver_id": string | null;
          "is_doc_finished": boolean | null;
          "is_cost_finished": boolean | null;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
          "base_price": number | null;
          "driver_share_percentage": number | null;
          "purchase_price": number | null;
          "vendor_invoice_amount": number | null;
          "advance_amount": number | null;
          "driver_payment_amount": number | null;
          "vendor_id": string | null;
          "total_stops": number | null;
          "tracking_token": string | null;
          "driver_phone": string | null;
          "estimated_margin": number | null;
          "wa_token": string | null;
          "driver_link_token": string | null;
          "advance_status": string | null;
          "completed_at": string | null;
          "pod_photo_url": string | null;
          "pod_status": string | null;
          "advance_receipt_url": string | null;
          "driver_revenue_share": number | null;
          "driver_payment_status": string | null;
          "driver_paid_at": string | null;
          "wa_link_sent_at": string | null;
          "driver_response": string | null;
          "transfer_proof_url": string | null;
          "physical_doc_files": Json | null;
          "physical_doc_notes": string | null;
          "accepted_at": string | null;
          "started_at": string | null;
          "loaded_at": string | null;
          "unloaded_at": string | null;
          "driver_response_at": string | null;
          "rejection_note": string | null;
          "cost_account_id": string | null;
          "updated_by": string | null;
          "sbu_type": string | null;
          "sbu_metadata": Json | null;
          "warehouse_id": string | null;
          "container_number": string | null;
          "assignment_documents": Json | null;
          "assigned_warehouse_id": string | null;
          "assigned_at": string | null;
          "departure_detected_at": string | null;
          "dispatch_ready_at": string | null;
          "dispatch_ready": boolean | null;
          "vendor_tenant_id": string | null;
          "gps_status": string | null;
          "device_health": string | null;
          "last_device_health_ping_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "wo_item_id": string;
          "jo_number": string;
          "status"?: string | null;
          "transporter_id"?: string | null;
          "fleet_id"?: string | null;
          "driver_id"?: string | null;
          "is_doc_finished"?: boolean | null;
          "is_cost_finished"?: boolean | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "base_price"?: number | null;
          "driver_share_percentage"?: number | null;
          "purchase_price"?: number | null;
          "vendor_invoice_amount"?: number | null;
          "advance_amount"?: number | null;
          "driver_payment_amount"?: number | null;
          "vendor_id"?: string | null;
          "total_stops"?: number | null;
          "tracking_token"?: string | null;
          "driver_phone"?: string | null;
          "estimated_margin"?: number | null;
          "wa_token"?: string | null;
          "driver_link_token"?: string | null;
          "advance_status"?: string | null;
          "completed_at"?: string | null;
          "pod_photo_url"?: string | null;
          "pod_status"?: string | null;
          "advance_receipt_url"?: string | null;
          "driver_revenue_share"?: number | null;
          "driver_payment_status"?: string | null;
          "driver_paid_at"?: string | null;
          "wa_link_sent_at"?: string | null;
          "driver_response"?: string | null;
          "transfer_proof_url"?: string | null;
          "physical_doc_files"?: Json | null;
          "physical_doc_notes"?: string | null;
          "accepted_at"?: string | null;
          "started_at"?: string | null;
          "loaded_at"?: string | null;
          "unloaded_at"?: string | null;
          "driver_response_at"?: string | null;
          "rejection_note"?: string | null;
          "cost_account_id"?: string | null;
          "updated_by"?: string | null;
          "sbu_type"?: string | null;
          "sbu_metadata"?: Json | null;
          "warehouse_id"?: string | null;
          "container_number"?: string | null;
          "assignment_documents"?: Json | null;
          "assigned_warehouse_id"?: string | null;
          "assigned_at"?: string | null;
          "departure_detected_at"?: string | null;
          "dispatch_ready_at"?: string | null;
          "dispatch_ready"?: boolean | null;
          "vendor_tenant_id"?: string | null;
          "gps_status"?: string | null;
          "device_health"?: string | null;
          "last_device_health_ping_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "wo_item_id"?: string;
          "jo_number"?: string;
          "status"?: string | null;
          "transporter_id"?: string | null;
          "fleet_id"?: string | null;
          "driver_id"?: string | null;
          "is_doc_finished"?: boolean | null;
          "is_cost_finished"?: boolean | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "base_price"?: number | null;
          "driver_share_percentage"?: number | null;
          "purchase_price"?: number | null;
          "vendor_invoice_amount"?: number | null;
          "advance_amount"?: number | null;
          "driver_payment_amount"?: number | null;
          "vendor_id"?: string | null;
          "total_stops"?: number | null;
          "tracking_token"?: string | null;
          "driver_phone"?: string | null;
          "estimated_margin"?: number | null;
          "wa_token"?: string | null;
          "driver_link_token"?: string | null;
          "advance_status"?: string | null;
          "completed_at"?: string | null;
          "pod_photo_url"?: string | null;
          "pod_status"?: string | null;
          "advance_receipt_url"?: string | null;
          "driver_revenue_share"?: number | null;
          "driver_payment_status"?: string | null;
          "driver_paid_at"?: string | null;
          "wa_link_sent_at"?: string | null;
          "driver_response"?: string | null;
          "transfer_proof_url"?: string | null;
          "physical_doc_files"?: Json | null;
          "physical_doc_notes"?: string | null;
          "accepted_at"?: string | null;
          "started_at"?: string | null;
          "loaded_at"?: string | null;
          "unloaded_at"?: string | null;
          "driver_response_at"?: string | null;
          "rejection_note"?: string | null;
          "cost_account_id"?: string | null;
          "updated_by"?: string | null;
          "sbu_type"?: string | null;
          "sbu_metadata"?: Json | null;
          "warehouse_id"?: string | null;
          "container_number"?: string | null;
          "assignment_documents"?: Json | null;
          "assigned_warehouse_id"?: string | null;
          "assigned_at"?: string | null;
          "departure_detected_at"?: string | null;
          "dispatch_ready_at"?: string | null;
          "dispatch_ready"?: boolean | null;
          "vendor_tenant_id"?: string | null;
          "gps_status"?: string | null;
          "device_health"?: string | null;
          "last_device_health_ping_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_job_orders_driver";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "md_drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_job_orders_fleet";
            columns: ["fleet_id"];
            isOneToOne: false;
            referencedRelation: "md_fleets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_job_orders_transporter";
            columns: ["transporter_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_job_orders_vendor";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_orders_cost_account_id_fkey";
            columns: ["cost_account_id"];
            isOneToOne: false;
            referencedRelation: "finance_coa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_orders_vendor_tenant_id_fkey";
            columns: ["vendor_tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_orders_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_orders_wo_item_id_fkey";
            columns: ["wo_item_id"];
            isOneToOne: false;
            referencedRelation: "wo_items";
            referencedColumns: ["id"];
          }
        ];
      };
      "job_routes": {
        Row: {
          "id": string;
          "job_order_id": string | null;
          "sequence": number;
          "stop_type": string;
          "source_type": string;
          "source_id": string;
          "location_name": string;
          "address": string;
          "latitude": number | null;
          "longitude": number | null;
          "contact_name": string | null;
          "contact_phone": string | null;
          "distance_km": number | null;
          "duration_minutes": number | null;
          "polyline": string | null;
          "status": string | null;
          "actual_arrival": string | null;
          "actual_departure": string | null;
          "quantity": number | null;
          "uom": string | null;
          "pod_photo_url": string | null;
          "notes": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "geofence_triggered_at": string | null;
        };
        Insert: {
          "id"?: string;
          "job_order_id"?: string | null;
          "sequence": number;
          "stop_type": string;
          "source_type": string;
          "source_id": string;
          "location_name": string;
          "address": string;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "contact_name"?: string | null;
          "contact_phone"?: string | null;
          "distance_km"?: number | null;
          "duration_minutes"?: number | null;
          "polyline"?: string | null;
          "status"?: string | null;
          "actual_arrival"?: string | null;
          "actual_departure"?: string | null;
          "quantity"?: number | null;
          "uom"?: string | null;
          "pod_photo_url"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "geofence_triggered_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string | null;
          "sequence"?: number;
          "stop_type"?: string;
          "source_type"?: string;
          "source_id"?: string;
          "location_name"?: string;
          "address"?: string;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "contact_name"?: string | null;
          "contact_phone"?: string | null;
          "distance_km"?: number | null;
          "duration_minutes"?: number | null;
          "polyline"?: string | null;
          "status"?: string | null;
          "actual_arrival"?: string | null;
          "actual_departure"?: string | null;
          "quantity"?: number | null;
          "uom"?: string | null;
          "pod_photo_url"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "geofence_triggered_at"?: string | null;
        };
        Relationships: [];
      };
      "job_status_history": {
        Row: {
          "id": string;
          "job_order_id": string;
          "old_status": string | null;
          "new_status": string;
          "changed_by": string | null;
          "changed_at": string;
          "correlation_id": string | null;
          "notes": string | null;
        };
        Insert: {
          "id"?: string;
          "job_order_id": string;
          "old_status"?: string | null;
          "new_status": string;
          "changed_by"?: string | null;
          "changed_at"?: string;
          "correlation_id"?: string | null;
          "notes"?: string | null;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string;
          "old_status"?: string | null;
          "new_status"?: string;
          "changed_by"?: string | null;
          "changed_at"?: string;
          "correlation_id"?: string | null;
          "notes"?: string | null;
        };
        Relationships: [];
      };
      "job_tracking": {
        Row: {
          "id": string;
          "job_order_id": string | null;
          "status_update": string | null;
          "created_at": string | null;
          "latitude": number | null;
          "longitude": number | null;
          "notes": string | null;
          "job_route_id": string | null;
          "photo_url": string | null;
          "recorded_at": string | null;
          "source": string | null;
          "accuracy": number | null;
          "speed": number | null;
          "heading": number | null;
          "battery_level": number | null;
          "client_ping_id": string | null;
        };
        Insert: {
          "id"?: string;
          "job_order_id"?: string | null;
          "status_update"?: string | null;
          "created_at"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "notes"?: string | null;
          "job_route_id"?: string | null;
          "photo_url"?: string | null;
          "recorded_at"?: string | null;
          "source"?: string | null;
          "accuracy"?: number | null;
          "speed"?: number | null;
          "heading"?: number | null;
          "battery_level"?: number | null;
          "client_ping_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string | null;
          "status_update"?: string | null;
          "created_at"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "notes"?: string | null;
          "job_route_id"?: string | null;
          "photo_url"?: string | null;
          "recorded_at"?: string | null;
          "source"?: string | null;
          "accuracy"?: number | null;
          "speed"?: number | null;
          "heading"?: number | null;
          "battery_level"?: number | null;
          "client_ping_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_tracking_job_route_id_fkey";
            columns: ["job_route_id"];
            isOneToOne: false;
            referencedRelation: "job_routes";
            referencedColumns: ["id"];
          }
        ];
      };
      "locations": {
        Row: {
          "id": string;
          "name": string;
          "address": string;
          "city": string | null;
          "created_at": string | null;
          "latitude": number | null;
          "longitude": number | null;
          "district": string | null;
          "province": string | null;
          "zipcode": string | null;
          "notes": string | null;
          "organization_id": string | null;
        };
        Insert: {
          "id"?: string;
          "name": string;
          "address": string;
          "city"?: string | null;
          "created_at"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "district"?: string | null;
          "province"?: string | null;
          "zipcode"?: string | null;
          "notes"?: string | null;
          "organization_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "address"?: string;
          "city"?: string | null;
          "created_at"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "district"?: string | null;
          "province"?: string | null;
          "zipcode"?: string | null;
          "notes"?: string | null;
          "organization_id"?: string | null;
        };
        Relationships: [];
      };
      "master_contacts": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "name": string;
          "contact_code": string | null;
          "email": string | null;
          "phone": string | null;
          "address": string | null;
          "city": string | null;
          "is_customer": boolean | null;
          "is_shipper": boolean | null;
          "is_recipient": boolean | null;
          "is_transporter": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name": string;
          "contact_code"?: string | null;
          "email"?: string | null;
          "phone"?: string | null;
          "address"?: string | null;
          "city"?: string | null;
          "is_customer"?: boolean | null;
          "is_shipper"?: boolean | null;
          "is_recipient"?: boolean | null;
          "is_transporter"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name"?: string;
          "contact_code"?: string | null;
          "email"?: string | null;
          "phone"?: string | null;
          "address"?: string | null;
          "city"?: string | null;
          "is_customer"?: boolean | null;
          "is_shipper"?: boolean | null;
          "is_recipient"?: boolean | null;
          "is_transporter"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "master_contacts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_bill_of_materials": {
        Row: {
          "id": string;
          "tenant_id": string;
          "kit_sku_id": string;
          "bom_number": string;
          "name": string | null;
          "notes": string | null;
          "is_active": boolean | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "kit_sku_id": string;
          "bom_number": string;
          "name"?: string | null;
          "notes"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "kit_sku_id"?: string;
          "bom_number"?: string;
          "name"?: string | null;
          "notes"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_bill_of_materials_kit_sku_id_fkey";
            columns: ["kit_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_billing_rates": {
        Row: {
          "id": string;
          "contract_id": string;
          "tenant_id": string;
          "charge_code": string;
          "rate_value": number;
          "uom": string;
          "valid_from": string;
          "valid_to": string | null;
          "is_active": boolean;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
          "warehouse_id": string | null;
        };
        Insert: {
          "id"?: string;
          "contract_id": string;
          "tenant_id": string;
          "charge_code": string;
          "rate_value": number;
          "uom": string;
          "valid_from": string;
          "valid_to"?: string | null;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "warehouse_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "contract_id"?: string;
          "tenant_id"?: string;
          "charge_code"?: string;
          "rate_value"?: number;
          "uom"?: string;
          "valid_from"?: string;
          "valid_to"?: string | null;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "warehouse_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_billing_rates_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "md_storage_contracts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_billing_rates_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_bom_items": {
        Row: {
          "id": string;
          "bom_id": string;
          "component_sku_id": string;
          "quantity_required": number;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "bom_id": string;
          "component_sku_id": string;
          "quantity_required": number;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "bom_id"?: string;
          "component_sku_id"?: string;
          "quantity_required"?: number;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "md_bom_items_bom_id_fkey";
            columns: ["bom_id"];
            isOneToOne: false;
            referencedRelation: "md_bill_of_materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_bom_items_component_sku_id_fkey";
            columns: ["component_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_contacts": {
        Row: {
          "id": string;
          "contact_type": string;
          "code": string;
          "name": string;
          "legal_name": string | null;
          "tax_id": string | null;
          "email": string | null;
          "phone": string | null;
          "mobile": string | null;
          "whatsapp": string | null;
          "address": Json | null;
          "parent_contact_id": string | null;
          "tenant_id": string | null;
          "is_active": boolean | null;
          "notes": string | null;
          "created_by": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "contact_type": string;
          "code": string;
          "name": string;
          "legal_name"?: string | null;
          "tax_id"?: string | null;
          "email"?: string | null;
          "phone"?: string | null;
          "mobile"?: string | null;
          "whatsapp"?: string | null;
          "address"?: Json | null;
          "parent_contact_id"?: string | null;
          "tenant_id"?: string | null;
          "is_active"?: boolean | null;
          "notes"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "contact_type"?: string;
          "code"?: string;
          "name"?: string;
          "legal_name"?: string | null;
          "tax_id"?: string | null;
          "email"?: string | null;
          "phone"?: string | null;
          "mobile"?: string | null;
          "whatsapp"?: string | null;
          "address"?: Json | null;
          "parent_contact_id"?: string | null;
          "tenant_id"?: string | null;
          "is_active"?: boolean | null;
          "notes"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_contacts_parent_contact_id_fkey";
            columns: ["parent_contact_id"];
            isOneToOne: false;
            referencedRelation: "md_contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_contacts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_contract_warehouses": {
        Row: {
          "id": string;
          "tenant_id": string;
          "contract_id": string;
          "warehouse_id": string;
          "committed_space": number | null;
          "uom_space": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "contract_id": string;
          "warehouse_id": string;
          "committed_space"?: number | null;
          "uom_space"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "contract_id"?: string;
          "warehouse_id"?: string;
          "committed_space"?: number | null;
          "uom_space"?: string | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "md_contract_warehouses_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "md_storage_contracts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_contract_warehouses_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_customer_users": {
        Row: {
          "id": string;
          "tenant_id": string;
          "customer_id": string;
          "user_id": string | null;
          "email": string;
          "full_name": string | null;
          "whatsapp": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
          "portal_password": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "customer_id": string;
          "user_id"?: string | null;
          "email": string;
          "full_name"?: string | null;
          "whatsapp"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "portal_password"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "customer_id"?: string;
          "user_id"?: string | null;
          "email"?: string;
          "full_name"?: string | null;
          "whatsapp"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "portal_password"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_customer_users_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_customer_users_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_customer_users_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_driver_allowances": {
        Row: {
          "id": string;
          "tenant_id": string;
          "origin_city": string;
          "destination_city": string;
          "fleet_type_id": string;
          "amount": number;
          "is_active": boolean;
          "created_at": string;
          "updated_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "origin_city": string;
          "destination_city": string;
          "fleet_type_id": string;
          "amount"?: number;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "origin_city"?: string;
          "destination_city"?: string;
          "fleet_type_id"?: string;
          "amount"?: number;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "md_driver_allowances_fleet_type_id_fkey";
            columns: ["fleet_type_id"];
            isOneToOne: false;
            referencedRelation: "md_fleet_types";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_drivers": {
        Row: {
          "id": string;
          "entity_id": string | null;
          "driver_code": string;
          "name": string;
          "phone": string;
          "whatsapp": string | null;
          "address": string | null;
          "sim_number": string | null;
          "sim_class": string | null;
          "sim_expiry": string;
          "status": string | null;
          "is_active": boolean | null;
          "created_by": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "tenant_id": string | null;
          "bank_name": string | null;
          "bank_account": string | null;
          "bank_account_name": string | null;
          "pin": string | null;
          "photo_url": string | null;
          "trust_score": number | null;
          "total_jobs_completed": number | null;
          "total_km_driven": number | null;
          "incident_count": number | null;
          "last_review_date": string | null;
          "is_working": boolean | null;
          "last_check_in": string | null;
          "total_absensi": number | null;
          "avg_inspection_score": number | null;
          "total_inspections": number | null;
          "last_inspection_date": string | null;
          "avg_review_score": number | null;
          "total_reviews": number | null;
          "total_distance_km": number | null;
          "sim_photo_url": string | null;
          "ktp_photo_url": string | null;
          "stnk_photo_url": string | null;
          "push_subscription": Json | null;
          "device_fingerprint": string | null;
          "last_device_login": string | null;
          "has_native_app": boolean | null;
          "last_app_version": string | null;
          "last_app_open_at": string | null;
        };
        Insert: {
          "id"?: string;
          "entity_id"?: string | null;
          "driver_code": string;
          "name": string;
          "phone": string;
          "whatsapp"?: string | null;
          "address"?: string | null;
          "sim_number"?: string | null;
          "sim_class"?: string | null;
          "sim_expiry": string;
          "status"?: string | null;
          "is_active"?: boolean | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "tenant_id"?: string | null;
          "bank_name"?: string | null;
          "bank_account"?: string | null;
          "bank_account_name"?: string | null;
          "pin"?: string | null;
          "photo_url"?: string | null;
          "trust_score"?: number | null;
          "total_jobs_completed"?: number | null;
          "total_km_driven"?: number | null;
          "incident_count"?: number | null;
          "last_review_date"?: string | null;
          "is_working"?: boolean | null;
          "last_check_in"?: string | null;
          "total_absensi"?: number | null;
          "avg_inspection_score"?: number | null;
          "total_inspections"?: number | null;
          "last_inspection_date"?: string | null;
          "avg_review_score"?: number | null;
          "total_reviews"?: number | null;
          "total_distance_km"?: number | null;
          "sim_photo_url"?: string | null;
          "ktp_photo_url"?: string | null;
          "stnk_photo_url"?: string | null;
          "push_subscription"?: Json | null;
          "device_fingerprint"?: string | null;
          "last_device_login"?: string | null;
          "has_native_app"?: boolean | null;
          "last_app_version"?: string | null;
          "last_app_open_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "entity_id"?: string | null;
          "driver_code"?: string;
          "name"?: string;
          "phone"?: string;
          "whatsapp"?: string | null;
          "address"?: string | null;
          "sim_number"?: string | null;
          "sim_class"?: string | null;
          "sim_expiry"?: string;
          "status"?: string | null;
          "is_active"?: boolean | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "tenant_id"?: string | null;
          "bank_name"?: string | null;
          "bank_account"?: string | null;
          "bank_account_name"?: string | null;
          "pin"?: string | null;
          "photo_url"?: string | null;
          "trust_score"?: number | null;
          "total_jobs_completed"?: number | null;
          "total_km_driven"?: number | null;
          "incident_count"?: number | null;
          "last_review_date"?: string | null;
          "is_working"?: boolean | null;
          "last_check_in"?: string | null;
          "total_absensi"?: number | null;
          "avg_inspection_score"?: number | null;
          "total_inspections"?: number | null;
          "last_inspection_date"?: string | null;
          "avg_review_score"?: number | null;
          "total_reviews"?: number | null;
          "total_distance_km"?: number | null;
          "sim_photo_url"?: string | null;
          "ktp_photo_url"?: string | null;
          "stnk_photo_url"?: string | null;
          "push_subscription"?: Json | null;
          "device_fingerprint"?: string | null;
          "last_device_login"?: string | null;
          "has_native_app"?: boolean | null;
          "last_app_version"?: string | null;
          "last_app_open_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_drivers_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_drivers_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_drivers_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_entities": {
        Row: {
          "id": string;
          "entity_code": string;
          "name": string;
          "legal_name": string | null;
          "tax_id": string | null;
          "email": string | null;
          "phone": string | null;
          "mobile": string | null;
          "whatsapp": string | null;
          "is_customer": boolean | null;
          "is_supplier": boolean | null;
          "is_vendor": boolean | null;
          "is_broker": boolean | null;
          "vendor_type": string | null;
          "billing_address": string | null;
          "billing_city": string | null;
          "billing_province": string | null;
          "billing_postal_code": string | null;
          "billing_latitude": number | null;
          "billing_longitude": number | null;
          "tenant_id": string;
          "is_active": boolean | null;
          "notes": string | null;
          "created_by": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "billing_directions": string | null;
          "billing_method": string | null;
          "parent_id": string | null;
          "is_own": boolean | null;
          "payment_terms_days": number | null;
          "payment_terms_type": string | null;
          "logo_url": string | null;
          "crm_status": "NEW" | "CONTACTED" | "QUALIFIED" | "UNQUALIFIED" | null;
          "sales_rep_id": string | null;
          "vendor_tenant_id": string | null;
        };
        Insert: {
          "id"?: string;
          "entity_code": string;
          "name": string;
          "legal_name"?: string | null;
          "tax_id"?: string | null;
          "email"?: string | null;
          "phone"?: string | null;
          "mobile"?: string | null;
          "whatsapp"?: string | null;
          "is_customer"?: boolean | null;
          "is_supplier"?: boolean | null;
          "is_vendor"?: boolean | null;
          "is_broker"?: boolean | null;
          "vendor_type"?: string | null;
          "billing_address"?: string | null;
          "billing_city"?: string | null;
          "billing_province"?: string | null;
          "billing_postal_code"?: string | null;
          "billing_latitude"?: number | null;
          "billing_longitude"?: number | null;
          "tenant_id": string;
          "is_active"?: boolean | null;
          "notes"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "billing_directions"?: string | null;
          "billing_method"?: string | null;
          "parent_id"?: string | null;
          "is_own"?: boolean | null;
          "payment_terms_days"?: number | null;
          "payment_terms_type"?: string | null;
          "logo_url"?: string | null;
          "crm_status"?: "NEW" | "CONTACTED" | "QUALIFIED" | "UNQUALIFIED" | null;
          "sales_rep_id"?: string | null;
          "vendor_tenant_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "entity_code"?: string;
          "name"?: string;
          "legal_name"?: string | null;
          "tax_id"?: string | null;
          "email"?: string | null;
          "phone"?: string | null;
          "mobile"?: string | null;
          "whatsapp"?: string | null;
          "is_customer"?: boolean | null;
          "is_supplier"?: boolean | null;
          "is_vendor"?: boolean | null;
          "is_broker"?: boolean | null;
          "vendor_type"?: string | null;
          "billing_address"?: string | null;
          "billing_city"?: string | null;
          "billing_province"?: string | null;
          "billing_postal_code"?: string | null;
          "billing_latitude"?: number | null;
          "billing_longitude"?: number | null;
          "tenant_id"?: string;
          "is_active"?: boolean | null;
          "notes"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "billing_directions"?: string | null;
          "billing_method"?: string | null;
          "parent_id"?: string | null;
          "is_own"?: boolean | null;
          "payment_terms_days"?: number | null;
          "payment_terms_type"?: string | null;
          "logo_url"?: string | null;
          "crm_status"?: "NEW" | "CONTACTED" | "QUALIFIED" | "UNQUALIFIED" | null;
          "sales_rep_id"?: string | null;
          "vendor_tenant_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_entities_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_entities_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_entities_sales_rep_id_fkey";
            columns: ["sales_rep_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_entities_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_entities_vendor_tenant_id_fkey";
            columns: ["vendor_tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_entity_addresses": {
        Row: {
          "id": string;
          "entity_id": string | null;
          "address_name": string;
          "address_type": string | null;
          "address": string;
          "city": string | null;
          "province": string | null;
          "postal_code": string | null;
          "latitude": number | null;
          "longitude": number | null;
          "contact_person": string | null;
          "contact_phone": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "address_directions": string | null;
        };
        Insert: {
          "id"?: string;
          "entity_id"?: string | null;
          "address_name": string;
          "address_type"?: string | null;
          "address": string;
          "city"?: string | null;
          "province"?: string | null;
          "postal_code"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "contact_person"?: string | null;
          "contact_phone"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "address_directions"?: string | null;
        };
        Update: {
          "id"?: string;
          "entity_id"?: string | null;
          "address_name"?: string;
          "address_type"?: string | null;
          "address"?: string;
          "city"?: string | null;
          "province"?: string | null;
          "postal_code"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "contact_person"?: string | null;
          "contact_phone"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "address_directions"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_entity_addresses_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_fleet_master": {
        Row: {
          "id": string;
          "fleet_type": string;
          "fleet_code": string;
          "fleet_brand": string | null;
          "fleet_model": string | null;
          "capacity_ton": number | null;
          "capacity_cbm": number | null;
          "dimension": Json | null;
          "is_active": boolean | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "fleet_type": string;
          "fleet_code": string;
          "fleet_brand"?: string | null;
          "fleet_model"?: string | null;
          "capacity_ton"?: number | null;
          "capacity_cbm"?: number | null;
          "dimension"?: Json | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "fleet_type"?: string;
          "fleet_code"?: string;
          "fleet_brand"?: string | null;
          "fleet_model"?: string | null;
          "capacity_ton"?: number | null;
          "capacity_cbm"?: number | null;
          "dimension"?: Json | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "md_fleet_types": {
        Row: {
          "id": string;
          "type_code": string;
          "type_name": string;
          "capacity_ton": number | null;
          "capacity_cbm": number | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "tenant_id": string | null;
          "time_multiplier": number | null;
          "fuel_consumption": number | null;
          "updated_at": string | null;
          "icon_url": string | null;
        };
        Insert: {
          "id"?: string;
          "type_code": string;
          "type_name": string;
          "capacity_ton"?: number | null;
          "capacity_cbm"?: number | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "tenant_id"?: string | null;
          "time_multiplier"?: number | null;
          "fuel_consumption"?: number | null;
          "updated_at"?: string | null;
          "icon_url"?: string | null;
        };
        Update: {
          "id"?: string;
          "type_code"?: string;
          "type_name"?: string;
          "capacity_ton"?: number | null;
          "capacity_cbm"?: number | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "tenant_id"?: string | null;
          "time_multiplier"?: number | null;
          "fuel_consumption"?: number | null;
          "updated_at"?: string | null;
          "icon_url"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_fleet_types_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_fleets": {
        Row: {
          "id": string;
          "entity_id": string | null;
          "fleet_type_id": string | null;
          "fleet_code": string;
          "plate_number": string;
          "brand": string | null;
          "model": string | null;
          "year": number | null;
          "stnk_number": string | null;
          "stnk_expiry": string;
          "kir_expiry": string;
          "status": string | null;
          "is_active": boolean | null;
          "created_by": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "tenant_id": string | null;
          "engine_number": string | null;
          "chassis_number": string | null;
          "color": string | null;
          "last_inspection_date": string | null;
          "easygo_vehicle_id": string | null;
          "easygo_nopol": string | null;
          "vendor_tenant_id": string | null;
        };
        Insert: {
          "id"?: string;
          "entity_id"?: string | null;
          "fleet_type_id"?: string | null;
          "fleet_code": string;
          "plate_number": string;
          "brand"?: string | null;
          "model"?: string | null;
          "year"?: number | null;
          "stnk_number"?: string | null;
          "stnk_expiry": string;
          "kir_expiry": string;
          "status"?: string | null;
          "is_active"?: boolean | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "tenant_id"?: string | null;
          "engine_number"?: string | null;
          "chassis_number"?: string | null;
          "color"?: string | null;
          "last_inspection_date"?: string | null;
          "easygo_vehicle_id"?: string | null;
          "easygo_nopol"?: string | null;
          "vendor_tenant_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "entity_id"?: string | null;
          "fleet_type_id"?: string | null;
          "fleet_code"?: string;
          "plate_number"?: string;
          "brand"?: string | null;
          "model"?: string | null;
          "year"?: number | null;
          "stnk_number"?: string | null;
          "stnk_expiry"?: string;
          "kir_expiry"?: string;
          "status"?: string | null;
          "is_active"?: boolean | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "tenant_id"?: string | null;
          "engine_number"?: string | null;
          "chassis_number"?: string | null;
          "color"?: string | null;
          "last_inspection_date"?: string | null;
          "easygo_vehicle_id"?: string | null;
          "easygo_nopol"?: string | null;
          "vendor_tenant_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_fleets_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_fleets_entity_id_fkey";
            columns: ["entity_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_fleets_fleet_type_id_fkey";
            columns: ["fleet_type_id"];
            isOneToOne: false;
            referencedRelation: "md_fleet_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_fleets_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_fleets_vendor_tenant_id_fkey";
            columns: ["vendor_tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_locations": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "location_code": string;
          "name": string;
          "address": string;
          "address_notes": string | null;
          "city": string | null;
          "province": string | null;
          "postal_code": string | null;
          "country": string | null;
          "latitude": number | null;
          "longitude": number | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "location_code": string;
          "name": string;
          "address": string;
          "address_notes"?: string | null;
          "city"?: string | null;
          "province"?: string | null;
          "postal_code"?: string | null;
          "country"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "location_code"?: string;
          "name"?: string;
          "address"?: string;
          "address_notes"?: string | null;
          "city"?: string | null;
          "province"?: string | null;
          "postal_code"?: string | null;
          "country"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_locations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_product_categories": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "parent_id": string | null;
          "name": string;
          "code": string | null;
          "description": string | null;
          "created_at": string;
          "updated_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "parent_id"?: string | null;
          "name": string;
          "code"?: string | null;
          "description"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "parent_id"?: string | null;
          "name"?: string;
          "code"?: string | null;
          "description"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "md_product_categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "md_product_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_product_categories_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_product_skus": {
        Row: {
          "id": string;
          "tenant_id": string;
          "sku_code": string;
          "name": string;
          "description": string | null;
          "category": string | null;
          "unit": string;
          "weight_kg": number | null;
          "length_cm": number | null;
          "width_cm": number | null;
          "height_cm": number | null;
          "volume_m3": number | null;
          "storage_rule": string | null;
          "is_hazardous": boolean;
          "requires_cold_storage": boolean;
          "min_stock_level": number | null;
          "max_stock_level": number | null;
          "is_active": boolean;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
          "parent_sku_id": string | null;
          "sku_level": string | null;
          "commodity_type": string | null;
          "conversion_to_base": number | null;
          "is_sellable": boolean;
          "is_stockable": boolean;
          "dimension_cm": string | null;
          "stack_limit": number | null;
          "customer_id": string | null;
          "upc_code": string | null;
          "ean_code": string | null;
          "hs_code": string | null;
          "brand_name": string | null;
          "manufacturer": string | null;
          "image_urls": Json | null;
          "handling_rules": Json | null;
          "base_uom": string | null;
          "default_inbound_uom": string | null;
          "default_outbound_uom": string | null;
          "uom_conversions": Json | null;
          "reorder_point": number | null;
          "lead_time_days": number | null;
          "category_id": string | null;
          "dynamic_attributes": Json | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "sku_code": string;
          "name": string;
          "description"?: string | null;
          "category"?: string | null;
          "unit"?: string;
          "weight_kg"?: number | null;
          "length_cm"?: number | null;
          "width_cm"?: number | null;
          "height_cm"?: number | null;
          "volume_m3"?: number | null;
          "storage_rule"?: string | null;
          "is_hazardous"?: boolean;
          "requires_cold_storage"?: boolean;
          "min_stock_level"?: number | null;
          "max_stock_level"?: number | null;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "parent_sku_id"?: string | null;
          "sku_level"?: string | null;
          "commodity_type"?: string | null;
          "conversion_to_base"?: number | null;
          "is_sellable"?: boolean;
          "is_stockable"?: boolean;
          "dimension_cm"?: string | null;
          "stack_limit"?: number | null;
          "customer_id"?: string | null;
          "upc_code"?: string | null;
          "ean_code"?: string | null;
          "hs_code"?: string | null;
          "brand_name"?: string | null;
          "manufacturer"?: string | null;
          "image_urls"?: Json | null;
          "handling_rules"?: Json | null;
          "base_uom"?: string | null;
          "default_inbound_uom"?: string | null;
          "default_outbound_uom"?: string | null;
          "uom_conversions"?: Json | null;
          "reorder_point"?: number | null;
          "lead_time_days"?: number | null;
          "category_id"?: string | null;
          "dynamic_attributes"?: Json | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "sku_code"?: string;
          "name"?: string;
          "description"?: string | null;
          "category"?: string | null;
          "unit"?: string;
          "weight_kg"?: number | null;
          "length_cm"?: number | null;
          "width_cm"?: number | null;
          "height_cm"?: number | null;
          "volume_m3"?: number | null;
          "storage_rule"?: string | null;
          "is_hazardous"?: boolean;
          "requires_cold_storage"?: boolean;
          "min_stock_level"?: number | null;
          "max_stock_level"?: number | null;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "parent_sku_id"?: string | null;
          "sku_level"?: string | null;
          "commodity_type"?: string | null;
          "conversion_to_base"?: number | null;
          "is_sellable"?: boolean;
          "is_stockable"?: boolean;
          "dimension_cm"?: string | null;
          "stack_limit"?: number | null;
          "customer_id"?: string | null;
          "upc_code"?: string | null;
          "ean_code"?: string | null;
          "hs_code"?: string | null;
          "brand_name"?: string | null;
          "manufacturer"?: string | null;
          "image_urls"?: Json | null;
          "handling_rules"?: Json | null;
          "base_uom"?: string | null;
          "default_inbound_uom"?: string | null;
          "default_outbound_uom"?: string | null;
          "uom_conversions"?: Json | null;
          "reorder_point"?: number | null;
          "lead_time_days"?: number | null;
          "category_id"?: string | null;
          "dynamic_attributes"?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_product_skus_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "md_product_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_product_skus_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_product_skus_parent_sku_id_fkey";
            columns: ["parent_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_services": {
        Row: {
          "id": string;
          "tenant_id": string;
          "sbu_type": string;
          "charge_code": string;
          "service_name": string;
          "category": string;
          "default_uom": string | null;
          "description": string | null;
          "income_account_id": string | null;
          "expense_account_id": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "sbu_type": string;
          "charge_code": string;
          "service_name": string;
          "category": string;
          "default_uom"?: string | null;
          "description"?: string | null;
          "income_account_id"?: string | null;
          "expense_account_id"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "sbu_type"?: string;
          "charge_code"?: string;
          "service_name"?: string;
          "category"?: string;
          "default_uom"?: string | null;
          "description"?: string | null;
          "income_account_id"?: string | null;
          "expense_account_id"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_services_expense_account_id_fkey";
            columns: ["expense_account_id"];
            isOneToOne: false;
            referencedRelation: "finance_coa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_services_income_account_id_fkey";
            columns: ["income_account_id"];
            isOneToOne: false;
            referencedRelation: "finance_coa";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_storage_contracts": {
        Row: {
          "id": string;
          "tenant_id": string;
          "contract_number": string;
          "customer_id": string | null;
          "warehouse_id": string | null;
          "area_id": string | null;
          "start_date": string;
          "end_date": string;
          "committed_space": number | null;
          "uom_space": string | null;
          "max_overflow": number | null;
          "billing_method": string;
          "status": string;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "contract_number": string;
          "customer_id"?: string | null;
          "warehouse_id"?: string | null;
          "area_id"?: string | null;
          "start_date": string;
          "end_date": string;
          "committed_space"?: number | null;
          "uom_space"?: string | null;
          "max_overflow"?: number | null;
          "billing_method"?: string;
          "status"?: string;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "contract_number"?: string;
          "customer_id"?: string | null;
          "warehouse_id"?: string | null;
          "area_id"?: string | null;
          "start_date"?: string;
          "end_date"?: string;
          "committed_space"?: number | null;
          "uom_space"?: string | null;
          "max_overflow"?: number | null;
          "billing_method"?: string;
          "status"?: string;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_storage_contracts_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_storage_contracts_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_storage_contracts_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_taxes": {
        Row: {
          "id": string;
          "name": string;
          "rate": number;
          "type": string | null;
          "description": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "code": string;
          "tenant_id": string | null;
        };
        Insert: {
          "id"?: string;
          "name": string;
          "rate"?: number;
          "type"?: string | null;
          "description"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "code": string;
          "tenant_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "rate"?: number;
          "type"?: string | null;
          "description"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "code"?: string;
          "tenant_id"?: string | null;
        };
        Relationships: [];
      };
      "md_transporter_drivers": {
        Row: {
          "id": string;
          "transporter_id": string | null;
          "driver_id": string | null;
          "assigned_at": string | null;
        };
        Insert: {
          "id"?: string;
          "transporter_id"?: string | null;
          "driver_id"?: string | null;
          "assigned_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "transporter_id"?: string | null;
          "driver_id"?: string | null;
          "assigned_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_transporter_drivers_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "md_drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_transporter_drivers_transporter_id_fkey";
            columns: ["transporter_id"];
            isOneToOne: false;
            referencedRelation: "md_transporters";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_transporter_fleets": {
        Row: {
          "id": string;
          "transporter_id": string | null;
          "fleet_id": string | null;
          "assigned_at": string | null;
        };
        Insert: {
          "id"?: string;
          "transporter_id"?: string | null;
          "fleet_id"?: string | null;
          "assigned_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "transporter_id"?: string | null;
          "fleet_id"?: string | null;
          "assigned_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_transporter_fleets_fleet_id_fkey";
            columns: ["fleet_id"];
            isOneToOne: false;
            referencedRelation: "md_fleets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_transporter_fleets_transporter_id_fkey";
            columns: ["transporter_id"];
            isOneToOne: false;
            referencedRelation: "md_transporters";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_transporters": {
        Row: {
          "id": string;
          "contact_id": string | null;
          "transporter_type": string | null;
          "vendor_contract_no": string | null;
          "contract_start_date": string | null;
          "contract_end_date": string | null;
          "payment_terms": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
          "transporter_name": string | null;
        };
        Insert: {
          "id"?: string;
          "contact_id"?: string | null;
          "transporter_type"?: string | null;
          "vendor_contract_no"?: string | null;
          "contract_start_date"?: string | null;
          "contract_end_date"?: string | null;
          "payment_terms"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "transporter_name"?: string | null;
        };
        Update: {
          "id"?: string;
          "contact_id"?: string | null;
          "transporter_type"?: string | null;
          "vendor_contract_no"?: string | null;
          "contract_start_date"?: string | null;
          "contract_end_date"?: string | null;
          "payment_terms"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "transporter_name"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_transporters_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "md_contacts";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_trucking_regions": {
        Row: {
          "id": string;
          "tenant_id": string;
          "name": string;
          "level": string;
          "parent_id": string | null;
          "is_active": boolean;
          "created_at": string;
          "updated_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "name": string;
          "level": string;
          "parent_id"?: string | null;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "name"?: string;
          "level"?: string;
          "parent_id"?: string | null;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "md_trucking_regions_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "md_trucking_regions";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_uoms": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "name": string;
          "description": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name": string;
          "description"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name"?: string;
          "description"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_uoms_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_vehicle_types": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "name": string;
          "is_active": boolean | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name": string;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name"?: string;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "md_warehouse_areas": {
        Row: {
          "id": string;
          "warehouse_id": string;
          "tenant_id": string;
          "area_code": string;
          "area_name": string;
          "area_type": string;
          "area_category": string | null;
          "storage_type": string | null;
          "total_capacity": number | null;
          "uom_capacity": string | null;
          "temperature_min": number | null;
          "temperature_max": number | null;
          "humidity_max": number | null;
          "is_hazmat_certified": boolean;
          "is_bonded_zone": boolean;
          "is_active": boolean;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "warehouse_id": string;
          "tenant_id": string;
          "area_code": string;
          "area_name": string;
          "area_type": string;
          "area_category"?: string | null;
          "storage_type"?: string | null;
          "total_capacity"?: number | null;
          "uom_capacity"?: string | null;
          "temperature_min"?: number | null;
          "temperature_max"?: number | null;
          "humidity_max"?: number | null;
          "is_hazmat_certified"?: boolean;
          "is_bonded_zone"?: boolean;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "warehouse_id"?: string;
          "tenant_id"?: string;
          "area_code"?: string;
          "area_name"?: string;
          "area_type"?: string;
          "area_category"?: string | null;
          "storage_type"?: string | null;
          "total_capacity"?: number | null;
          "uom_capacity"?: string | null;
          "temperature_min"?: number | null;
          "temperature_max"?: number | null;
          "humidity_max"?: number | null;
          "is_hazmat_certified"?: boolean;
          "is_bonded_zone"?: boolean;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_warehouse_areas_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_warehouse_locations": {
        Row: {
          "id": string;
          "warehouse_id": string;
          "tenant_id": string;
          "code": string;
          "zone": string | null;
          "rack": string | null;
          "shelf": string | null;
          "bin": string | null;
          "location_type": string;
          "max_weight_kg": number | null;
          "max_volume_m3": number | null;
          "is_active": boolean;
          "created_at": string;
          "updated_at": string;
          "area_id": string | null;
          "zone_id": string | null;
          "bin_type": string | null;
          "aisle": string | null;
          "bay": string | null;
          "level": string | null;
          "position": string | null;
          "bin_status": string;
          "length_m": number | null;
          "width_m": number | null;
          "height_m": number | null;
          "storage_method": string | null;
        };
        Insert: {
          "id"?: string;
          "warehouse_id": string;
          "tenant_id": string;
          "code": string;
          "zone"?: string | null;
          "rack"?: string | null;
          "shelf"?: string | null;
          "bin"?: string | null;
          "location_type"?: string;
          "max_weight_kg"?: number | null;
          "max_volume_m3"?: number | null;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "area_id"?: string | null;
          "zone_id"?: string | null;
          "bin_type"?: string | null;
          "aisle"?: string | null;
          "bay"?: string | null;
          "level"?: string | null;
          "position"?: string | null;
          "bin_status"?: string;
          "length_m"?: number | null;
          "width_m"?: number | null;
          "height_m"?: number | null;
          "storage_method"?: string | null;
        };
        Update: {
          "id"?: string;
          "warehouse_id"?: string;
          "tenant_id"?: string;
          "code"?: string;
          "zone"?: string | null;
          "rack"?: string | null;
          "shelf"?: string | null;
          "bin"?: string | null;
          "location_type"?: string;
          "max_weight_kg"?: number | null;
          "max_volume_m3"?: number | null;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "area_id"?: string | null;
          "zone_id"?: string | null;
          "bin_type"?: string | null;
          "aisle"?: string | null;
          "bay"?: string | null;
          "level"?: string | null;
          "position"?: string | null;
          "bin_status"?: string;
          "length_m"?: number | null;
          "width_m"?: number | null;
          "height_m"?: number | null;
          "storage_method"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_mwl_area";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_mwl_zone";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_zones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_warehouse_locations_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_warehouse_staff": {
        Row: {
          "id": string;
          "tenant_id": string;
          "sbu_id": string;
          "warehouse_id": string | null;
          "name": string;
          "whatsapp": string;
          "pin": string;
          "role": string;
          "is_active": boolean;
          "created_at": string;
          "updated_at": string;
          "roles": string[] | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "sbu_id": string;
          "warehouse_id"?: string | null;
          "name": string;
          "whatsapp": string;
          "pin": string;
          "role": string;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "roles"?: string[] | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "sbu_id"?: string;
          "warehouse_id"?: string | null;
          "name"?: string;
          "whatsapp"?: string;
          "pin"?: string;
          "role"?: string;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "roles"?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_warehouse_staff_sbu_id_fkey";
            columns: ["sbu_id"];
            isOneToOne: false;
            referencedRelation: "tenant_sbus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_warehouse_staff_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_warehouse_zones": {
        Row: {
          "id": string;
          "area_id": string;
          "tenant_id": string;
          "zone_code": string;
          "zone_name": string;
          "zone_status": string;
          "is_active": boolean;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "area_id": string;
          "tenant_id": string;
          "zone_code": string;
          "zone_name": string;
          "zone_status"?: string;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "area_id"?: string;
          "tenant_id"?: string;
          "zone_code"?: string;
          "zone_name"?: string;
          "zone_status"?: string;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_warehouse_zones_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_areas";
            referencedColumns: ["id"];
          }
        ];
      };
      "md_warehouses": {
        Row: {
          "id": string;
          "tenant_id": string;
          "code": string;
          "name": string;
          "address": string | null;
          "city": string | null;
          "province": string | null;
          "latitude": number | null;
          "longitude": number | null;
          "contact_person": string | null;
          "contact_phone": string | null;
          "is_active": boolean;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
          "warehouse_type": string | null;
          "ownership": string | null;
          "parent_warehouse_id": string | null;
          "status": string;
          "total_capacity_sqm": number | null;
          "total_capacity_cbm": number | null;
          "organization_id": string | null;
          "sbu_id": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "code": string;
          "name": string;
          "address"?: string | null;
          "city"?: string | null;
          "province"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "contact_person"?: string | null;
          "contact_phone"?: string | null;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "warehouse_type"?: string | null;
          "ownership"?: string | null;
          "parent_warehouse_id"?: string | null;
          "status"?: string;
          "total_capacity_sqm"?: number | null;
          "total_capacity_cbm"?: number | null;
          "organization_id"?: string | null;
          "sbu_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "code"?: string;
          "name"?: string;
          "address"?: string | null;
          "city"?: string | null;
          "province"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "contact_person"?: string | null;
          "contact_phone"?: string | null;
          "is_active"?: boolean;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "warehouse_type"?: string | null;
          "ownership"?: string | null;
          "parent_warehouse_id"?: string | null;
          "status"?: string;
          "total_capacity_sqm"?: number | null;
          "total_capacity_cbm"?: number | null;
          "organization_id"?: string | null;
          "sbu_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "md_warehouses_parent_warehouse_id_fkey";
            columns: ["parent_warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "md_warehouses_sbu_id_fkey";
            columns: ["sbu_id"];
            isOneToOne: false;
            referencedRelation: "tenant_sbus";
            referencedColumns: ["id"];
          }
        ];
      };
      "monitoring_checks": {
        Row: {
          "id": string;
          "check_type": string;
          "status": string;
          "module": string | null;
          "message": string | null;
          "details": Json | null;
          "checked_at": string;
        };
        Insert: {
          "id"?: string;
          "check_type": string;
          "status": string;
          "module"?: string | null;
          "message"?: string | null;
          "details"?: Json | null;
          "checked_at"?: string;
        };
        Update: {
          "id"?: string;
          "check_type"?: string;
          "status"?: string;
          "module"?: string | null;
          "message"?: string | null;
          "details"?: Json | null;
          "checked_at"?: string;
        };
        Relationships: [];
      };
      "notifications": {
        Row: {
          "id": string;
          "user_id": string | null;
          "role": string | null;
          "title": string;
          "message": string;
          "type": string | null;
          "is_read": boolean | null;
          "metadata": Json | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "user_id"?: string | null;
          "role"?: string | null;
          "title": string;
          "message": string;
          "type"?: string | null;
          "is_read"?: boolean | null;
          "metadata"?: Json | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "user_id"?: string | null;
          "role"?: string | null;
          "title"?: string;
          "message"?: string;
          "type"?: string | null;
          "is_read"?: boolean | null;
          "metadata"?: Json | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "product_batches": {
        Row: {
          "id": string;
          "product_id": string;
          "customer_id": string;
          "warehouse_id": string | null;
          "batch_number": string;
          "lot_number": string | null;
          "manufacture_date": string | null;
          "expiry_date": string | null;
          "received_date": string | null;
          "initial_quantity": number | null;
          "remaining_quantity": number | null;
          "uom_id": string | null;
          "status": string | null;
          "expiry_priority": number | null;
          "received_priority": number | null;
          "alert_sent_30d": boolean | null;
          "alert_sent_7d": boolean | null;
          "alert_sent_expired": boolean | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "product_id": string;
          "customer_id": string;
          "warehouse_id"?: string | null;
          "batch_number": string;
          "lot_number"?: string | null;
          "manufacture_date"?: string | null;
          "expiry_date"?: string | null;
          "received_date"?: string | null;
          "initial_quantity"?: number | null;
          "remaining_quantity"?: number | null;
          "uom_id"?: string | null;
          "status"?: string | null;
          "expiry_priority"?: number | null;
          "received_priority"?: number | null;
          "alert_sent_30d"?: boolean | null;
          "alert_sent_7d"?: boolean | null;
          "alert_sent_expired"?: boolean | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "product_id"?: string;
          "customer_id"?: string;
          "warehouse_id"?: string | null;
          "batch_number"?: string;
          "lot_number"?: string | null;
          "manufacture_date"?: string | null;
          "expiry_date"?: string | null;
          "received_date"?: string | null;
          "initial_quantity"?: number | null;
          "remaining_quantity"?: number | null;
          "uom_id"?: string | null;
          "status"?: string | null;
          "expiry_priority"?: number | null;
          "received_priority"?: number | null;
          "alert_sent_30d"?: boolean | null;
          "alert_sent_7d"?: boolean | null;
          "alert_sent_expired"?: boolean | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_batches_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_batches_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_batches_uom_id_fkey";
            columns: ["uom_id"];
            isOneToOne: false;
            referencedRelation: "uom_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_batches_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "product_brands": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "name": string;
          "logo_url": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name": string;
          "logo_url"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name"?: string;
          "logo_url"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_brands_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "product_categories": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "parent_id": string | null;
          "name": string;
          "description": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "parent_id"?: string | null;
          "name": string;
          "description"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "parent_id"?: string | null;
          "name"?: string;
          "description"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_categories_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "product_custom_attributes": {
        Row: {
          "id": string;
          "product_id": string;
          "attribute_name": string;
          "attribute_value": string | null;
          "attribute_type": string | null;
          "is_required": boolean | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "product_id": string;
          "attribute_name": string;
          "attribute_value"?: string | null;
          "attribute_type"?: string | null;
          "is_required"?: boolean | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "product_id"?: string;
          "attribute_name"?: string;
          "attribute_value"?: string | null;
          "attribute_type"?: string | null;
          "is_required"?: boolean | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_custom_attributes_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      "product_uom_conversions": {
        Row: {
          "id": string;
          "product_id": string;
          "from_uom_id": string;
          "to_uom_id": string;
          "conversion_qty": number;
          "is_default": boolean | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "product_id": string;
          "from_uom_id": string;
          "to_uom_id": string;
          "conversion_qty": number;
          "is_default"?: boolean | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "product_id"?: string;
          "from_uom_id"?: string;
          "to_uom_id"?: string;
          "conversion_qty"?: number;
          "is_default"?: boolean | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_uom_conversions_from_uom_id_fkey";
            columns: ["from_uom_id"];
            isOneToOne: false;
            referencedRelation: "uom_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_uom_conversions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_uom_conversions_to_uom_id_fkey";
            columns: ["to_uom_id"];
            isOneToOne: false;
            referencedRelation: "uom_types";
            referencedColumns: ["id"];
          }
        ];
      };
      "product_variants": {
        Row: {
          "id": string;
          "product_id": string;
          "variant_type": string;
          "variant_value": string;
          "sku_suffix": string | null;
          "barcode": string | null;
          "additional_price": number | null;
          "is_active": boolean | null;
          "sort_order": number | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "product_id": string;
          "variant_type": string;
          "variant_value": string;
          "sku_suffix"?: string | null;
          "barcode"?: string | null;
          "additional_price"?: number | null;
          "is_active"?: boolean | null;
          "sort_order"?: number | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "product_id"?: string;
          "variant_type"?: string;
          "variant_value"?: string;
          "sku_suffix"?: string | null;
          "barcode"?: string | null;
          "additional_price"?: number | null;
          "is_active"?: boolean | null;
          "sort_order"?: number | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      "products": {
        Row: {
          "id": string;
          "customer_id": string;
          "sku": string;
          "name": string;
          "category": string | null;
          "length_cm": number | null;
          "width_cm": number | null;
          "height_cm": number | null;
          "weight_kg": number | null;
          "created_at": string | null;
          "packaging_type": string | null;
          "packaging_qty": number | null;
          "content_qty": number | null;
          "total_weight_kg": number | null;
          "total_volume_m3": number | null;
          "tenant_id": string | null;
          "barcode": string | null;
          "description": string | null;
          "sub_category": string | null;
          "brand": string | null;
          "image_url": string | null;
          "image_urls": string[] | null;
          "base_uom_id": string | null;
          "default_inbound_uom_id": string | null;
          "default_outbound_uom_id": string | null;
          "cbm_override": number | null;
          "cbm": number | null;
          "enable_serial_tracking": boolean | null;
          "enable_weight_tracking": boolean | null;
          "enable_expiry_tracking": boolean | null;
          "enable_batch_tracking": boolean | null;
          "enable_variant_tracking": boolean | null;
          "enable_custom_attributes": boolean | null;
          "default_outbound_strategy": string | null;
          "is_active": boolean | null;
          "is_hazardous": boolean | null;
          "requires_temperature_control": boolean | null;
          "min_temperature": number | null;
          "max_temperature": number | null;
          "created_by": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "customer_id": string;
          "sku": string;
          "name": string;
          "category"?: string | null;
          "length_cm"?: number | null;
          "width_cm"?: number | null;
          "height_cm"?: number | null;
          "weight_kg"?: number | null;
          "created_at"?: string | null;
          "packaging_type"?: string | null;
          "packaging_qty"?: number | null;
          "content_qty"?: number | null;
          "total_weight_kg"?: number | null;
          "total_volume_m3"?: number | null;
          "tenant_id"?: string | null;
          "barcode"?: string | null;
          "description"?: string | null;
          "sub_category"?: string | null;
          "brand"?: string | null;
          "image_url"?: string | null;
          "image_urls"?: string[] | null;
          "base_uom_id"?: string | null;
          "default_inbound_uom_id"?: string | null;
          "default_outbound_uom_id"?: string | null;
          "cbm_override"?: number | null;
          "cbm"?: number | null;
          "enable_serial_tracking"?: boolean | null;
          "enable_weight_tracking"?: boolean | null;
          "enable_expiry_tracking"?: boolean | null;
          "enable_batch_tracking"?: boolean | null;
          "enable_variant_tracking"?: boolean | null;
          "enable_custom_attributes"?: boolean | null;
          "default_outbound_strategy"?: string | null;
          "is_active"?: boolean | null;
          "is_hazardous"?: boolean | null;
          "requires_temperature_control"?: boolean | null;
          "min_temperature"?: number | null;
          "max_temperature"?: number | null;
          "created_by"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "customer_id"?: string;
          "sku"?: string;
          "name"?: string;
          "category"?: string | null;
          "length_cm"?: number | null;
          "width_cm"?: number | null;
          "height_cm"?: number | null;
          "weight_kg"?: number | null;
          "created_at"?: string | null;
          "packaging_type"?: string | null;
          "packaging_qty"?: number | null;
          "content_qty"?: number | null;
          "total_weight_kg"?: number | null;
          "total_volume_m3"?: number | null;
          "tenant_id"?: string | null;
          "barcode"?: string | null;
          "description"?: string | null;
          "sub_category"?: string | null;
          "brand"?: string | null;
          "image_url"?: string | null;
          "image_urls"?: string[] | null;
          "base_uom_id"?: string | null;
          "default_inbound_uom_id"?: string | null;
          "default_outbound_uom_id"?: string | null;
          "cbm_override"?: number | null;
          "cbm"?: number | null;
          "enable_serial_tracking"?: boolean | null;
          "enable_weight_tracking"?: boolean | null;
          "enable_expiry_tracking"?: boolean | null;
          "enable_batch_tracking"?: boolean | null;
          "enable_variant_tracking"?: boolean | null;
          "enable_custom_attributes"?: boolean | null;
          "default_outbound_strategy"?: string | null;
          "is_active"?: boolean | null;
          "is_hazardous"?: boolean | null;
          "requires_temperature_control"?: boolean | null;
          "min_temperature"?: number | null;
          "max_temperature"?: number | null;
          "created_by"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "products_base_uom_id_fkey";
            columns: ["base_uom_id"];
            isOneToOne: false;
            referencedRelation: "uom_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_default_inbound_uom_id_fkey";
            columns: ["default_inbound_uom_id"];
            isOneToOne: false;
            referencedRelation: "uom_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_default_outbound_uom_id_fkey";
            columns: ["default_outbound_uom_id"];
            isOneToOne: false;
            referencedRelation: "uom_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "profiles": {
        Row: {
          "id": string;
          "full_name": string | null;
          "email": string | null;
          "role": string | null;
          "sbu_access": string[] | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
          "company_id": string | null;
          "organization_id": string | null;
          "whatsapp": string | null;
          "region_id": string | null;
        };
        Insert: {
          "id": string;
          "full_name"?: string | null;
          "email"?: string | null;
          "role"?: string | null;
          "sbu_access"?: string[] | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "company_id"?: string | null;
          "organization_id"?: string | null;
          "whatsapp"?: string | null;
          "region_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "full_name"?: string | null;
          "email"?: string | null;
          "role"?: string | null;
          "sbu_access"?: string[] | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "company_id"?: string | null;
          "organization_id"?: string | null;
          "whatsapp"?: string | null;
          "region_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "md_trucking_regions";
            referencedColumns: ["id"];
          }
        ];
      };
      "putaway_assignments": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "inbound_detail_id": string | null;
          "condition": string | null;
          "suggested_location_id": string | null;
          "actual_location_id": string | null;
          "quantity": number | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "inbound_detail_id"?: string | null;
          "condition"?: string | null;
          "suggested_location_id"?: string | null;
          "actual_location_id"?: string | null;
          "quantity"?: number | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "inbound_detail_id"?: string | null;
          "condition"?: string | null;
          "suggested_location_id"?: string | null;
          "actual_location_id"?: string | null;
          "quantity"?: number | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "putaway_assignments_actual_location_id_fkey";
            columns: ["actual_location_id"];
            isOneToOne: false;
            referencedRelation: "storage_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "putaway_assignments_inbound_detail_id_fkey";
            columns: ["inbound_detail_id"];
            isOneToOne: false;
            referencedRelation: "inbound_details";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "putaway_assignments_suggested_location_id_fkey";
            columns: ["suggested_location_id"];
            isOneToOne: false;
            referencedRelation: "storage_locations";
            referencedColumns: ["id"];
          }
        ];
      };
      "recipients": {
        Row: {
          "id": string;
          "tenant_id": string;
          "code": string | null;
          "name": string;
          "address": string | null;
          "pic_name": string | null;
          "pic_phone": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "code"?: string | null;
          "name": string;
          "address"?: string | null;
          "pic_name"?: string | null;
          "pic_phone"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "code"?: string | null;
          "name"?: string;
          "address"?: string | null;
          "pic_name"?: string | null;
          "pic_phone"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [];
      };
      "reset_password_requests": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "tenant_code": string | null;
          "tenant_name": string | null;
          "admin_email": string | null;
          "status": string | null;
          "requested_at": string | null;
          "processed_by": string | null;
          "processed_at": string | null;
          "notes": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "tenant_code"?: string | null;
          "tenant_name"?: string | null;
          "admin_email"?: string | null;
          "status"?: string | null;
          "requested_at"?: string | null;
          "processed_by"?: string | null;
          "processed_at"?: string | null;
          "notes"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "tenant_code"?: string | null;
          "tenant_name"?: string | null;
          "admin_email"?: string | null;
          "status"?: string | null;
          "requested_at"?: string | null;
          "processed_by"?: string | null;
          "processed_at"?: string | null;
          "notes"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reset_password_requests_processed_by_fkey";
            columns: ["processed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reset_password_requests_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "roles": {
        Row: {
          "id": string;
          "name": string;
          "description": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "name": string;
          "description"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "description"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "routes": {
        Row: {
          "id": string;
          "name": string;
          "origin_city": string;
          "destination_city": string;
          "distance_km": number | null;
          "estimated_hours": number | null;
          "last_used_at": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "name": string;
          "origin_city": string;
          "destination_city": string;
          "distance_km"?: number | null;
          "estimated_hours"?: number | null;
          "last_used_at"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "origin_city"?: string;
          "destination_city"?: string;
          "distance_km"?: number | null;
          "estimated_hours"?: number | null;
          "last_used_at"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "sbu_token_rates": {
        Row: {
          "id": string;
          "sbu_type": string;
          "tokens_per_jo": number;
          "updated_at": string | null;
          "updated_by": string | null;
        };
        Insert: {
          "id"?: string;
          "sbu_type": string;
          "tokens_per_jo"?: number;
          "updated_at"?: string | null;
          "updated_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "sbu_type"?: string;
          "tokens_per_jo"?: number;
          "updated_at"?: string | null;
          "updated_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sbu_token_rates_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "sbu_token_transactions": {
        Row: {
          "id": string;
          "sbu_id": string | null;
          "tenant_id": string | null;
          "amount": number;
          "transaction_type": string | null;
          "job_order_id": string | null;
          "description": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "sbu_id"?: string | null;
          "tenant_id"?: string | null;
          "amount": number;
          "transaction_type"?: string | null;
          "job_order_id"?: string | null;
          "description"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "sbu_id"?: string | null;
          "tenant_id"?: string | null;
          "amount"?: number;
          "transaction_type"?: string | null;
          "job_order_id"?: string | null;
          "description"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sbu_token_transactions_sbu_id_fkey";
            columns: ["sbu_id"];
            isOneToOne: false;
            referencedRelation: "tenant_sbus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sbu_token_transactions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "serial_numbers": {
        Row: {
          "id": string;
          "product_id": string;
          "customer_id": string;
          "warehouse_id": string | null;
          "serial_number": string;
          "batch_id": string | null;
          "status": string | null;
          "condition": string | null;
          "received_at": string | null;
          "sold_at": string | null;
          "returned_at": string | null;
          "last_location": string | null;
          "last_moved_at": string | null;
          "notes": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "product_id": string;
          "customer_id": string;
          "warehouse_id"?: string | null;
          "serial_number": string;
          "batch_id"?: string | null;
          "status"?: string | null;
          "condition"?: string | null;
          "received_at"?: string | null;
          "sold_at"?: string | null;
          "returned_at"?: string | null;
          "last_location"?: string | null;
          "last_moved_at"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "product_id"?: string;
          "customer_id"?: string;
          "warehouse_id"?: string | null;
          "serial_number"?: string;
          "batch_id"?: string | null;
          "status"?: string | null;
          "condition"?: string | null;
          "received_at"?: string | null;
          "sold_at"?: string | null;
          "returned_at"?: string | null;
          "last_location"?: string | null;
          "last_moved_at"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "serial_numbers_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "product_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "serial_numbers_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "serial_numbers_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "serial_numbers_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "shipment_status_history": {
        Row: {
          "id": string;
          "shipment_id": string | null;
          "old_status": string | null;
          "new_status": string;
          "changed_by": string | null;
          "changed_at": string;
          "correlation_id": string | null;
          "notes": string | null;
        };
        Insert: {
          "id"?: string;
          "shipment_id"?: string | null;
          "old_status"?: string | null;
          "new_status": string;
          "changed_by"?: string | null;
          "changed_at"?: string;
          "correlation_id"?: string | null;
          "notes"?: string | null;
        };
        Update: {
          "id"?: string;
          "shipment_id"?: string | null;
          "old_status"?: string | null;
          "new_status"?: string;
          "changed_by"?: string | null;
          "changed_at"?: string;
          "correlation_id"?: string | null;
          "notes"?: string | null;
        };
        Relationships: [];
      };
      "shippers": {
        Row: {
          "id": string;
          "tenant_id": string;
          "code": string | null;
          "name": string;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "code"?: string | null;
          "name": string;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "code"?: string | null;
          "name"?: string;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [];
      };
      "sla_daily_snapshots": {
        Row: {
          "id": string;
          "tenant_id": string;
          "snapshot_date": string;
          "sla_stage": string;
          "total_count": number | null;
          "pass_count": number | null;
          "fail_count": number | null;
          "compliance_pct": number | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "snapshot_date"?: string;
          "sla_stage": string;
          "total_count"?: number | null;
          "pass_count"?: number | null;
          "fail_count"?: number | null;
          "compliance_pct"?: number | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "snapshot_date"?: string;
          "sla_stage"?: string;
          "total_count"?: number | null;
          "pass_count"?: number | null;
          "fail_count"?: number | null;
          "compliance_pct"?: number | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sla_daily_snapshots_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "sla_escalations": {
        Row: {
          "id": string;
          "tenant_id": string;
          "wo_id": string | null;
          "jo_id": string | null;
          "sla_stage": string;
          "breach_type": string;
          "escalation_level": number;
          "notified_role": string | null;
          "notified_at": string | null;
          "resolved_at": string | null;
          "resolved_by": string | null;
          "details": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "wo_id"?: string | null;
          "jo_id"?: string | null;
          "sla_stage": string;
          "breach_type": string;
          "escalation_level"?: number;
          "notified_role"?: string | null;
          "notified_at"?: string | null;
          "resolved_at"?: string | null;
          "resolved_by"?: string | null;
          "details"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "wo_id"?: string | null;
          "jo_id"?: string | null;
          "sla_stage"?: string;
          "breach_type"?: string;
          "escalation_level"?: number;
          "notified_role"?: string | null;
          "notified_at"?: string | null;
          "resolved_at"?: string | null;
          "resolved_by"?: string | null;
          "details"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "staff": {
        Row: {
          "id": string;
          "tenant_id": string;
          "full_name": string;
          "email": string | null;
          "phone": string | null;
          "photo_url": string | null;
          "status": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "user_id": string | null;
          "role_id": string | null;
          "warehouse_id": string | null;
          "is_active": boolean | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "full_name": string;
          "email"?: string | null;
          "phone"?: string | null;
          "photo_url"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "user_id"?: string | null;
          "role_id"?: string | null;
          "warehouse_id"?: string | null;
          "is_active"?: boolean | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "full_name"?: string;
          "email"?: string | null;
          "phone"?: string | null;
          "photo_url"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "user_id"?: string | null;
          "role_id"?: string | null;
          "warehouse_id"?: string | null;
          "is_active"?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "storage_areas": {
        Row: {
          "id": string;
          "tenant_id": string;
          "code": string | null;
          "name": string | null;
          "zone": string | null;
          "rack": string | null;
          "shelf": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "code"?: string | null;
          "name"?: string | null;
          "zone"?: string | null;
          "rack"?: string | null;
          "shelf"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "code"?: string | null;
          "name"?: string | null;
          "zone"?: string | null;
          "rack"?: string | null;
          "shelf"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "storage_locations": {
        Row: {
          "id": string;
          "zone_id": string | null;
          "code": string;
          "max_cbm": number | null;
          "current_cbm": number | null;
          "status": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "zone_id"?: string | null;
          "code": string;
          "max_cbm"?: number | null;
          "current_cbm"?: number | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "zone_id"?: string | null;
          "code"?: string;
          "max_cbm"?: number | null;
          "current_cbm"?: number | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "storage_locations_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "storage_zones";
            referencedColumns: ["id"];
          }
        ];
      };
      "storage_zones": {
        Row: {
          "id": string;
          "warehouse_id": string | null;
          "name": string;
          "code": string;
          "zone_type": string;
          "capacity_cbm": number | null;
          "max_weight_kg": number | null;
          "length": number | null;
          "width": number | null;
          "height": number | null;
          "temp_min": number | null;
          "temp_max": number | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "warehouse_id"?: string | null;
          "name": string;
          "code": string;
          "zone_type": string;
          "capacity_cbm"?: number | null;
          "max_weight_kg"?: number | null;
          "length"?: number | null;
          "width"?: number | null;
          "height"?: number | null;
          "temp_min"?: number | null;
          "temp_max"?: number | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "warehouse_id"?: string | null;
          "name"?: string;
          "code"?: string;
          "zone_type"?: string;
          "capacity_cbm"?: number | null;
          "max_weight_kg"?: number | null;
          "length"?: number | null;
          "width"?: number | null;
          "height"?: number | null;
          "temp_min"?: number | null;
          "temp_max"?: number | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "storage_zones_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "tax_rates": {
        Row: {
          "id": string;
          "hs_code": string;
          "country_code": string;
          "import_duty_percent": number | null;
          "vat_percent": number | null;
          "luxury_tax_percent": number | null;
          "other_taxes": Json | null;
          "fta_scheme": string | null;
          "fta_duty_percent": number | null;
          "currency": string | null;
          "source_id": string | null;
          "effective_from": string | null;
          "effective_to": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
          "hs_level": string | null;
        };
        Insert: {
          "id"?: string;
          "hs_code": string;
          "country_code": string;
          "import_duty_percent"?: number | null;
          "vat_percent"?: number | null;
          "luxury_tax_percent"?: number | null;
          "other_taxes"?: Json | null;
          "fta_scheme"?: string | null;
          "fta_duty_percent"?: number | null;
          "currency"?: string | null;
          "source_id"?: string | null;
          "effective_from"?: string | null;
          "effective_to"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "hs_level"?: string | null;
        };
        Update: {
          "id"?: string;
          "hs_code"?: string;
          "country_code"?: string;
          "import_duty_percent"?: number | null;
          "vat_percent"?: number | null;
          "luxury_tax_percent"?: number | null;
          "other_taxes"?: Json | null;
          "fta_scheme"?: string | null;
          "fta_duty_percent"?: number | null;
          "currency"?: string | null;
          "source_id"?: string | null;
          "effective_from"?: string | null;
          "effective_to"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "hs_level"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tax_rates_country_code_fkey";
            columns: ["country_code"];
            isOneToOne: false;
            referencedRelation: "country_master";
            referencedColumns: ["country_code"];
          }
        ];
      };
      "tenant_roles": {
        Row: {
          "id": string;
          "role_code": string;
          "role_name": string;
          "role_level": number | null;
          "sbu_type": string | null;
          "permissions": string[] | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "role_code": string;
          "role_name": string;
          "role_level"?: number | null;
          "sbu_type"?: string | null;
          "permissions"?: string[] | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "role_code"?: string;
          "role_name"?: string;
          "role_level"?: number | null;
          "sbu_type"?: string | null;
          "permissions"?: string[] | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "tenant_sbus": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "sbu_type": string;
          "sbu_code": string;
          "sbu_name": string;
          "status": string | null;
          "token_balance": number | null;
          "config": Json | null;
          "created_by": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "sbu_type": string;
          "sbu_code": string;
          "sbu_name": string;
          "status"?: string | null;
          "token_balance"?: number | null;
          "config"?: Json | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "sbu_type"?: string;
          "sbu_code"?: string;
          "sbu_name"?: string;
          "status"?: string | null;
          "token_balance"?: number | null;
          "config"?: Json | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_sbus_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_sbus_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "tenant_users": {
        Row: {
          "id": string;
          "user_id": string | null;
          "tenant_id": string | null;
          "role_code": string | null;
          "sbu_id": string | null;
          "full_name": string | null;
          "whatsapp": string | null;
          "is_active": boolean | null;
          "created_by": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "warehouse_id": string | null;
          "division": string | null;
          "region_id": string | null;
        };
        Insert: {
          "id"?: string;
          "user_id"?: string | null;
          "tenant_id"?: string | null;
          "role_code"?: string | null;
          "sbu_id"?: string | null;
          "full_name"?: string | null;
          "whatsapp"?: string | null;
          "is_active"?: boolean | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "warehouse_id"?: string | null;
          "division"?: string | null;
          "region_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "user_id"?: string | null;
          "tenant_id"?: string | null;
          "role_code"?: string | null;
          "sbu_id"?: string | null;
          "full_name"?: string | null;
          "whatsapp"?: string | null;
          "is_active"?: boolean | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "warehouse_id"?: string | null;
          "division"?: string | null;
          "region_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_users_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_users_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "md_trucking_regions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_users_role_code_fkey";
            columns: ["role_code"];
            isOneToOne: false;
            referencedRelation: "tenant_roles";
            referencedColumns: ["role_code"];
          },
          {
            foreignKeyName: "tenant_users_sbu_id_fkey";
            columns: ["sbu_id"];
            isOneToOne: false;
            referencedRelation: "tenant_sbus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_users_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_users_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_users_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "tenants": {
        Row: {
          "id": string;
          "warehouse_id": string;
          "name": string;
          "email": string | null;
          "phone": string | null;
          "sla_tier": string | null;
          "status": string | null;
          "created_at": string | null;
          "user_id": string | null;
          "tenant_code": string | null;
          "subscription_tier": string | null;
          "token_balance": number | null;
          "total_tokens_used": number | null;
          "updated_at": string | null;
          "initial": string | null;
          "logo_url": string | null;
        };
        Insert: {
          "id"?: string;
          "warehouse_id": string;
          "name": string;
          "email"?: string | null;
          "phone"?: string | null;
          "sla_tier"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "user_id"?: string | null;
          "tenant_code"?: string | null;
          "subscription_tier"?: string | null;
          "token_balance"?: number | null;
          "total_tokens_used"?: number | null;
          "updated_at"?: string | null;
          "initial"?: string | null;
          "logo_url"?: string | null;
        };
        Update: {
          "id"?: string;
          "warehouse_id"?: string;
          "name"?: string;
          "email"?: string | null;
          "phone"?: string | null;
          "sla_tier"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "user_id"?: string | null;
          "tenant_code"?: string | null;
          "subscription_tier"?: string | null;
          "token_balance"?: number | null;
          "total_tokens_used"?: number | null;
          "updated_at"?: string | null;
          "initial"?: string | null;
          "logo_url"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tenants_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenants_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "token_price_history": {
        Row: {
          "id": string;
          "old_price": number;
          "new_price": number;
          "changed_by": string | null;
          "reason": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "old_price": number;
          "new_price": number;
          "changed_by"?: string | null;
          "reason"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "old_price"?: number;
          "new_price"?: number;
          "changed_by"?: string | null;
          "reason"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "token_price_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "token_prices": {
        Row: {
          "id": string;
          "price_per_token": number;
          "currency": string | null;
          "effective_from": string | null;
          "effective_to": string | null;
          "updated_by": string | null;
          "notes": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "price_per_token"?: number;
          "currency"?: string | null;
          "effective_from"?: string | null;
          "effective_to"?: string | null;
          "updated_by"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "price_per_token"?: number;
          "currency"?: string | null;
          "effective_from"?: string | null;
          "effective_to"?: string | null;
          "updated_by"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "token_prices_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "token_transactions": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "tenant_code": string | null;
          "amount": number | null;
          "transaction_type": string | null;
          "description": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "tenant_code"?: string | null;
          "amount"?: number | null;
          "transaction_type"?: string | null;
          "description"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "tenant_code"?: string | null;
          "amount"?: number | null;
          "transaction_type"?: string | null;
          "description"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "token_transactions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "topup_requests": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "tenant_code": string | null;
          "amount": number;
          "total_price": number | null;
          "proof_url": string | null;
          "status": string | null;
          "created_at": string | null;
          "rejection_reason": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "tenant_code"?: string | null;
          "amount": number;
          "total_price"?: number | null;
          "proof_url"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "rejection_reason"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "tenant_code"?: string | null;
          "amount"?: number;
          "total_price"?: number | null;
          "proof_url"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
          "rejection_reason"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "topup_requests_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "tracking_points": {
        Row: {
          "id": string;
          "session_id": string | null;
          "latitude": number;
          "longitude": number;
          "accuracy": number | null;
          "heading": number | null;
          "speed": number | null;
          "recorded_at": string;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "session_id"?: string | null;
          "latitude": number;
          "longitude": number;
          "accuracy"?: number | null;
          "heading"?: number | null;
          "speed"?: number | null;
          "recorded_at": string;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "session_id"?: string | null;
          "latitude"?: number;
          "longitude"?: number;
          "accuracy"?: number | null;
          "heading"?: number | null;
          "speed"?: number | null;
          "recorded_at"?: string;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tracking_points_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "tracking_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      "tracking_sessions": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "reference_type": string;
          "reference_id": string;
          "status": string | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "reference_type": string;
          "reference_id": string;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "reference_type"?: string;
          "reference_id"?: string;
          "status"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tracking_sessions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "tracking_updates": {
        Row: {
          "id": string;
          "job_order_id": string | null;
          "location": string | null;
          "status_update": string | null;
          "whatsapp_sent": boolean | null;
          "created_at": string | null;
          "latitude": number | null;
          "longitude": number | null;
          "recorded_at": string | null;
        };
        Insert: {
          "id"?: string;
          "job_order_id"?: string | null;
          "location"?: string | null;
          "status_update"?: string | null;
          "whatsapp_sent"?: boolean | null;
          "created_at"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "recorded_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string | null;
          "location"?: string | null;
          "status_update"?: string | null;
          "whatsapp_sent"?: boolean | null;
          "created_at"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "recorded_at"?: string | null;
        };
        Relationships: [];
      };
      "transporters": {
        Row: {
          "id": string;
          "tenant_id": string;
          "code": string | null;
          "name": string;
          "pic_name": string | null;
          "pic_phone": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
          "updated_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "code"?: string | null;
          "name": string;
          "pic_name"?: string | null;
          "pic_phone"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "code"?: string | null;
          "name"?: string;
          "pic_name"?: string | null;
          "pic_phone"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
        };
        Relationships: [];
      };
      "truck_types": {
        Row: {
          "id": string;
          "name": string;
          "description": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "name": string;
          "description"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "description"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "uom_types": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "name": string;
          "code": string;
          "level": number | null;
          "is_base": boolean | null;
          "is_active": boolean | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name": string;
          "code": string;
          "level"?: number | null;
          "is_base"?: boolean | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name"?: string;
          "code"?: string;
          "level"?: number | null;
          "is_base"?: boolean | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "uom_types_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "user_roles": {
        Row: {
          "id": string;
          "role": string;
          "created_at": string | null;
        };
        Insert: {
          "id": string;
          "role"?: string;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "role"?: string;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      "variant_types": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "name": string;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name": string;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "name"?: string;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "variant_types_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "variant_values": {
        Row: {
          "id": string;
          "variant_type_id": string | null;
          "value": string;
          "sku_suffix": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "variant_type_id"?: string | null;
          "value": string;
          "sku_suffix"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "variant_type_id"?: string | null;
          "value"?: string;
          "sku_suffix"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "variant_values_variant_type_id_fkey";
            columns: ["variant_type_id"];
            isOneToOne: false;
            referencedRelation: "variant_types";
            referencedColumns: ["id"];
          }
        ];
      };
      "vendor_invoices": {
        Row: {
          "id": string;
          "vendor_id": string;
          "wo_id": string | null;
          "jo_id": string | null;
          "invoice_number": string | null;
          "invoice_url": string | null;
          "invoice_amount": number | null;
          "invoice_date": string | null;
          "matched_at": string | null;
          "received_at": string | null;
          "paid_at": string | null;
          "status": string;
          "matched_by": string | null;
          "verified_by": string | null;
          "rejection_reason": string | null;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
        };
        Insert: {
          "id"?: string;
          "vendor_id": string;
          "wo_id"?: string | null;
          "jo_id"?: string | null;
          "invoice_number"?: string | null;
          "invoice_url"?: string | null;
          "invoice_amount"?: number | null;
          "invoice_date"?: string | null;
          "matched_at"?: string | null;
          "received_at"?: string | null;
          "paid_at"?: string | null;
          "status"?: string;
          "matched_by"?: string | null;
          "verified_by"?: string | null;
          "rejection_reason"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Update: {
          "id"?: string;
          "vendor_id"?: string;
          "wo_id"?: string | null;
          "jo_id"?: string | null;
          "invoice_number"?: string | null;
          "invoice_url"?: string | null;
          "invoice_amount"?: number | null;
          "invoice_date"?: string | null;
          "matched_at"?: string | null;
          "received_at"?: string | null;
          "paid_at"?: string | null;
          "status"?: string;
          "matched_by"?: string | null;
          "verified_by"?: string | null;
          "rejection_reason"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_invoices_matched_by_fkey";
            columns: ["matched_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendor_invoices_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendor_invoices_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      "warehouse_staff_attendance": {
        Row: {
          "id": string;
          "tenant_id": string;
          "warehouse_id": string;
          "user_id": string;
          "check_in_time": string;
          "check_out_time": string | null;
          "status": string | null;
          "latitude": number | null;
          "longitude": number | null;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "warehouse_id": string;
          "user_id": string;
          "check_in_time"?: string;
          "check_out_time"?: string | null;
          "status"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "warehouse_id"?: string;
          "user_id"?: string;
          "check_in_time"?: string;
          "check_out_time"?: string | null;
          "status"?: string | null;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_staff_attendance_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "warehouse_users": {
        Row: {
          "id": string;
          "warehouse_id": string;
          "staff_id": string;
          "role": string | null;
          "is_active": boolean | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "warehouse_id": string;
          "staff_id": string;
          "role"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "warehouse_id"?: string;
          "staff_id"?: string;
          "role"?: string | null;
          "is_active"?: boolean | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_users_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_users_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "warehouses": {
        Row: {
          "id": string;
          "name": string;
          "address": string | null;
          "city": string | null;
          "province": string | null;
          "tenant_id": string | null;
          "warehouse_type": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "name": string;
          "address"?: string | null;
          "city"?: string | null;
          "province"?: string | null;
          "tenant_id"?: string | null;
          "warehouse_type"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "name"?: string;
          "address"?: string | null;
          "city"?: string | null;
          "province"?: string | null;
          "tenant_id"?: string | null;
          "warehouse_type"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "weight_tracking": {
        Row: {
          "id": string;
          "product_id": string;
          "batch_id": string | null;
          "warehouse_id": string | null;
          "inbound_weight_kg": number | null;
          "current_weight_kg": number | null;
          "shrinkage_kg": number | null;
          "shrinkage_percent": number | null;
          "tolerance_percent": number | null;
          "alert_sent": boolean | null;
          "last_weighed_at": string | null;
          "last_weighed_by": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "product_id": string;
          "batch_id"?: string | null;
          "warehouse_id"?: string | null;
          "inbound_weight_kg"?: number | null;
          "current_weight_kg"?: number | null;
          "shrinkage_kg"?: number | null;
          "shrinkage_percent"?: number | null;
          "tolerance_percent"?: number | null;
          "alert_sent"?: boolean | null;
          "last_weighed_at"?: string | null;
          "last_weighed_by"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "product_id"?: string;
          "batch_id"?: string | null;
          "warehouse_id"?: string | null;
          "inbound_weight_kg"?: number | null;
          "current_weight_kg"?: number | null;
          "shrinkage_kg"?: number | null;
          "shrinkage_percent"?: number | null;
          "tolerance_percent"?: number | null;
          "alert_sent"?: boolean | null;
          "last_weighed_at"?: string | null;
          "last_weighed_by"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "weight_tracking_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "product_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weight_tracking_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weight_tracking_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_billing_invoice_details": {
        Row: {
          "id": string;
          "tenant_id": string;
          "invoice_id": string;
          "charge_code": string;
          "charge_name": string | null;
          "rate_value": number | null;
          "quantity": number | null;
          "uom": string | null;
          "amount": number | null;
          "reference_id": string | null;
          "notes": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "invoice_id": string;
          "charge_code": string;
          "charge_name"?: string | null;
          "rate_value"?: number | null;
          "quantity"?: number | null;
          "uom"?: string | null;
          "amount"?: number | null;
          "reference_id"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "invoice_id"?: string;
          "charge_code"?: string;
          "charge_name"?: string | null;
          "rate_value"?: number | null;
          "quantity"?: number | null;
          "uom"?: string | null;
          "amount"?: number | null;
          "reference_id"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_billing_invoice_details_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "wh_billing_invoices";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_billing_invoices": {
        Row: {
          "id": string;
          "tenant_id": string;
          "invoice_number": string;
          "contract_id": string;
          "customer_id": string | null;
          "billing_period_start": string;
          "billing_period_end": string;
          "total_amount": number | null;
          "tax_amount": number | null;
          "grand_total": number | null;
          "status": string;
          "due_date": string | null;
          "paid_date": string | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "invoice_number": string;
          "contract_id": string;
          "customer_id"?: string | null;
          "billing_period_start": string;
          "billing_period_end": string;
          "total_amount"?: number | null;
          "tax_amount"?: number | null;
          "grand_total"?: number | null;
          "status"?: string;
          "due_date"?: string | null;
          "paid_date"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "invoice_number"?: string;
          "contract_id"?: string;
          "customer_id"?: string | null;
          "billing_period_start"?: string;
          "billing_period_end"?: string;
          "total_amount"?: number | null;
          "tax_amount"?: number | null;
          "grand_total"?: number | null;
          "status"?: string;
          "due_date"?: string | null;
          "paid_date"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_billing_invoices_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "md_storage_contracts";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_daily_stock_snapshots": {
        Row: {
          "id": string;
          "tenant_id": string;
          "contract_id": string;
          "snapshot_date": string;
          "warehouse_id": string;
          "area_id": string | null;
          "total_pallets": number | null;
          "total_cbm": number | null;
          "total_sqm": number | null;
          "sku_count": number | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "contract_id": string;
          "snapshot_date": string;
          "warehouse_id": string;
          "area_id"?: string | null;
          "total_pallets"?: number | null;
          "total_cbm"?: number | null;
          "total_sqm"?: number | null;
          "sku_count"?: number | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "contract_id"?: string;
          "snapshot_date"?: string;
          "warehouse_id"?: string;
          "area_id"?: string | null;
          "total_pallets"?: number | null;
          "total_cbm"?: number | null;
          "total_sqm"?: number | null;
          "sku_count"?: number | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_daily_stock_snapshots_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_daily_stock_snapshots_contract_id_fkey";
            columns: ["contract_id"];
            isOneToOne: false;
            referencedRelation: "md_storage_contracts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_daily_stock_snapshots_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_inbound_damage_records": {
        Row: {
          "id": string;
          "receipt_id": string;
          "receipt_item_id": string;
          "qty": number;
          "damage_source": string;
          "source_notes": string | null;
          "source_photo_url": string | null;
          "damage_condition": string;
          "condition_notes": string | null;
          "condition_photo_url": string | null;
          "decision": string;
          "decision_by": string | null;
          "decision_at": string | null;
          "decision_notes": string | null;
          "quarantine_location_id": string | null;
          "reported_by": string;
          "created_at": string;
          "planned_quarantine_location_id": string | null;
        };
        Insert: {
          "id"?: string;
          "receipt_id": string;
          "receipt_item_id": string;
          "qty": number;
          "damage_source": string;
          "source_notes"?: string | null;
          "source_photo_url"?: string | null;
          "damage_condition": string;
          "condition_notes"?: string | null;
          "condition_photo_url"?: string | null;
          "decision"?: string;
          "decision_by"?: string | null;
          "decision_at"?: string | null;
          "decision_notes"?: string | null;
          "quarantine_location_id"?: string | null;
          "reported_by": string;
          "created_at"?: string;
          "planned_quarantine_location_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "receipt_id"?: string;
          "receipt_item_id"?: string;
          "qty"?: number;
          "damage_source"?: string;
          "source_notes"?: string | null;
          "source_photo_url"?: string | null;
          "damage_condition"?: string;
          "condition_notes"?: string | null;
          "condition_photo_url"?: string | null;
          "decision"?: string;
          "decision_by"?: string | null;
          "decision_at"?: string | null;
          "decision_notes"?: string | null;
          "quarantine_location_id"?: string | null;
          "reported_by"?: string;
          "created_at"?: string;
          "planned_quarantine_location_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_inbound_damage_records_decision_by_fkey";
            columns: ["decision_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_damage_records_planned_quarantine_location_id_fkey";
            columns: ["planned_quarantine_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_damage_records_quarantine_location_id_fkey";
            columns: ["quarantine_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_damage_records_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "wh_inbound_receipts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_damage_records_receipt_item_id_fkey";
            columns: ["receipt_item_id"];
            isOneToOne: false;
            referencedRelation: "wh_inbound_receipt_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_damage_records_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_staff";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_inbound_receipt_items": {
        Row: {
          "id": string;
          "receipt_id": string;
          "product_sku_id": string;
          "expected_qty": number;
          "actual_good_qty": number;
          "quarantine_qty": number;
          "rejected_qty": number;
          "damage_source": string | null;
          "damage_condition": string | null;
          "damage_notes": string | null;
          "batch_number": string | null;
          "expiry_date": string | null;
          "created_at": string;
          "damage_photo_url": string | null;
          "over_decision": string | null;
          "over_notes": string | null;
          "putaway_location_id": string | null;
          "putaway_at": string | null;
          "planned_putaway_location_id": string | null;
          "putaway_entries": Json | null;
        };
        Insert: {
          "id"?: string;
          "receipt_id": string;
          "product_sku_id": string;
          "expected_qty"?: number;
          "actual_good_qty"?: number;
          "quarantine_qty"?: number;
          "rejected_qty"?: number;
          "damage_source"?: string | null;
          "damage_condition"?: string | null;
          "damage_notes"?: string | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "created_at"?: string;
          "damage_photo_url"?: string | null;
          "over_decision"?: string | null;
          "over_notes"?: string | null;
          "putaway_location_id"?: string | null;
          "putaway_at"?: string | null;
          "planned_putaway_location_id"?: string | null;
          "putaway_entries"?: Json | null;
        };
        Update: {
          "id"?: string;
          "receipt_id"?: string;
          "product_sku_id"?: string;
          "expected_qty"?: number;
          "actual_good_qty"?: number;
          "quarantine_qty"?: number;
          "rejected_qty"?: number;
          "damage_source"?: string | null;
          "damage_condition"?: string | null;
          "damage_notes"?: string | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "created_at"?: string;
          "damage_photo_url"?: string | null;
          "over_decision"?: string | null;
          "over_notes"?: string | null;
          "putaway_location_id"?: string | null;
          "putaway_at"?: string | null;
          "planned_putaway_location_id"?: string | null;
          "putaway_entries"?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_inbound_receipt_items_planned_putaway_location_id_fkey";
            columns: ["planned_putaway_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_receipt_items_product_sku_id_fkey";
            columns: ["product_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_receipt_items_putaway_location_id_fkey";
            columns: ["putaway_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_receipt_items_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "wh_inbound_receipts";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_inbound_receipts": {
        Row: {
          "id": string;
          "tenant_id": string;
          "warehouse_id": string;
          "wo_item_id": string | null;
          "receipt_number": string;
          "status": string;
          "expected_arrival": string | null;
          "actual_arrival": string | null;
          "transporter_id": string | null;
          "fleet_id": string | null;
          "driver_id": string | null;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
          "transporter_name_manual": string | null;
          "driver_name_manual": string | null;
          "driver_phone": string | null;
          "vehicle_photo_url": string | null;
          "pod_document_url": string | null;
          "batb_document_url": string | null;
          "unloading_start_time": string | null;
          "unloading_end_time": string | null;
          "total_unloading_minutes": number | null;
          "customer_id": string | null;
          "shipper_id": string | null;
          "transfer_id": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "warehouse_id": string;
          "wo_item_id"?: string | null;
          "receipt_number": string;
          "status"?: string;
          "expected_arrival"?: string | null;
          "actual_arrival"?: string | null;
          "transporter_id"?: string | null;
          "fleet_id"?: string | null;
          "driver_id"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "transporter_name_manual"?: string | null;
          "driver_name_manual"?: string | null;
          "driver_phone"?: string | null;
          "vehicle_photo_url"?: string | null;
          "pod_document_url"?: string | null;
          "batb_document_url"?: string | null;
          "unloading_start_time"?: string | null;
          "unloading_end_time"?: string | null;
          "total_unloading_minutes"?: number | null;
          "customer_id"?: string | null;
          "shipper_id"?: string | null;
          "transfer_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "warehouse_id"?: string;
          "wo_item_id"?: string | null;
          "receipt_number"?: string;
          "status"?: string;
          "expected_arrival"?: string | null;
          "actual_arrival"?: string | null;
          "transporter_id"?: string | null;
          "fleet_id"?: string | null;
          "driver_id"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "transporter_name_manual"?: string | null;
          "driver_name_manual"?: string | null;
          "driver_phone"?: string | null;
          "vehicle_photo_url"?: string | null;
          "pod_document_url"?: string | null;
          "batb_document_url"?: string | null;
          "unloading_start_time"?: string | null;
          "unloading_end_time"?: string | null;
          "total_unloading_minutes"?: number | null;
          "customer_id"?: string | null;
          "shipper_id"?: string | null;
          "transfer_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_inbound_receipts_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_receipts_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "md_drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_receipts_fleet_id_fkey";
            columns: ["fleet_id"];
            isOneToOne: false;
            referencedRelation: "md_fleets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_receipts_shipper_id_fkey";
            columns: ["shipper_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_receipts_transfer_id_fkey";
            columns: ["transfer_id"];
            isOneToOne: false;
            referencedRelation: "wh_transfer_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_receipts_transporter_id_fkey";
            columns: ["transporter_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inbound_receipts_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_internal_movements": {
        Row: {
          "id": string;
          "tenant_id": string;
          "warehouse_id": string;
          "product_sku_id": string;
          "from_location_id": string;
          "to_location_id": string;
          "quantity": number;
          "movement_date": string;
          "status": string;
          "notes": string | null;
          "reference_type": string | null;
          "reference_id": string | null;
          "created_by": string | null;
          "created_at": string;
          "updated_at": string;
          "executed_by": string | null;
          "executed_at": string | null;
          "assigned_to": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "warehouse_id": string;
          "product_sku_id": string;
          "from_location_id": string;
          "to_location_id": string;
          "quantity": number;
          "movement_date"?: string;
          "status"?: string;
          "notes"?: string | null;
          "reference_type"?: string | null;
          "reference_id"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "executed_by"?: string | null;
          "executed_at"?: string | null;
          "assigned_to"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "warehouse_id"?: string;
          "product_sku_id"?: string;
          "from_location_id"?: string;
          "to_location_id"?: string;
          "quantity"?: number;
          "movement_date"?: string;
          "status"?: string;
          "notes"?: string | null;
          "reference_type"?: string | null;
          "reference_id"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "executed_by"?: string | null;
          "executed_at"?: string | null;
          "assigned_to"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_internal_movements_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_internal_movements_from_location_id_fkey";
            columns: ["from_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_internal_movements_product_sku_id_fkey";
            columns: ["product_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_internal_movements_to_location_id_fkey";
            columns: ["to_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_internal_movements_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_inventory": {
        Row: {
          "id": string;
          "tenant_id": string;
          "warehouse_id": string;
          "location_id": string | null;
          "product_sku_id": string;
          "quantity": number;
          "reserved_quantity": number;
          "available_quantity": number | null;
          "batch_number": string | null;
          "expiry_date": string | null;
          "received_date": string;
          "unit_cost": number | null;
          "status": string;
          "created_at": string;
          "updated_at": string;
          "inventory_code": string | null;
          "parent_inventory_id": string | null;
          "serial_number": string | null;
          "customer_id": string | null;
          "lpn_code": string | null;
          "parent_lpn_code": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "warehouse_id": string;
          "location_id"?: string | null;
          "product_sku_id": string;
          "quantity"?: number;
          "reserved_quantity"?: number;
          "available_quantity"?: number | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "received_date"?: string;
          "unit_cost"?: number | null;
          "status"?: string;
          "created_at"?: string;
          "updated_at"?: string;
          "inventory_code"?: string | null;
          "parent_inventory_id"?: string | null;
          "serial_number"?: string | null;
          "customer_id"?: string | null;
          "lpn_code"?: string | null;
          "parent_lpn_code"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "warehouse_id"?: string;
          "location_id"?: string | null;
          "product_sku_id"?: string;
          "quantity"?: number;
          "reserved_quantity"?: number;
          "available_quantity"?: number | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "received_date"?: string;
          "unit_cost"?: number | null;
          "status"?: string;
          "created_at"?: string;
          "updated_at"?: string;
          "inventory_code"?: string | null;
          "parent_inventory_id"?: string | null;
          "serial_number"?: string | null;
          "customer_id"?: string | null;
          "lpn_code"?: string | null;
          "parent_lpn_code"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_inventory_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inventory_parent_inventory_id_fkey";
            columns: ["parent_inventory_id"];
            isOneToOne: false;
            referencedRelation: "wh_inventory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inventory_product_sku_id_fkey";
            columns: ["product_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inventory_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_inventory_movements": {
        Row: {
          "id": string;
          "tenant_id": string;
          "inventory_id": string;
          "movement_type": string;
          "from_location_id": string | null;
          "to_location_id": string | null;
          "quantity": number;
          "reference_type": string | null;
          "reference_id": string | null;
          "notes": string | null;
          "created_at": string;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "inventory_id": string;
          "movement_type": string;
          "from_location_id"?: string | null;
          "to_location_id"?: string | null;
          "quantity": number;
          "reference_type"?: string | null;
          "reference_id"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "inventory_id"?: string;
          "movement_type"?: string;
          "from_location_id"?: string | null;
          "to_location_id"?: string | null;
          "quantity"?: number;
          "reference_type"?: string | null;
          "reference_id"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_inventory_movements_from_location_id_fkey";
            columns: ["from_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inventory_movements_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "wh_inventory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_inventory_movements_to_location_id_fkey";
            columns: ["to_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_item_packaging": {
        Row: {
          "id": string;
          "parent_type": string | null;
          "parent_id": string;
          "item_id": string | null;
          "quantity": number | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "parent_type"?: string | null;
          "parent_id": string;
          "item_id"?: string | null;
          "quantity"?: number | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "parent_type"?: string | null;
          "parent_id"?: string;
          "item_id"?: string | null;
          "quantity"?: number | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_item_packaging_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "wh_items";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_items": {
        Row: {
          "id": string;
          "sku": string | null;
          "name": string;
          "description": string | null;
          "hs_code_id": string | null;
          "base_qty": number | null;
          "uom": string | null;
          "weight_kg": number | null;
          "length_cm": number | null;
          "width_cm": number | null;
          "height_cm": number | null;
          "cbm": number | null;
          "owner_id": string | null;
          "status": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "sku"?: string | null;
          "name": string;
          "description"?: string | null;
          "hs_code_id"?: string | null;
          "base_qty"?: number | null;
          "uom"?: string | null;
          "weight_kg"?: number | null;
          "length_cm"?: number | null;
          "width_cm"?: number | null;
          "height_cm"?: number | null;
          "cbm"?: number | null;
          "owner_id"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "sku"?: string | null;
          "name"?: string;
          "description"?: string | null;
          "hs_code_id"?: string | null;
          "base_qty"?: number | null;
          "uom"?: string | null;
          "weight_kg"?: number | null;
          "length_cm"?: number | null;
          "width_cm"?: number | null;
          "height_cm"?: number | null;
          "cbm"?: number | null;
          "owner_id"?: string | null;
          "status"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_items_hs_code_id_fkey";
            columns: ["hs_code_id"];
            isOneToOne: false;
            referencedRelation: "fw_hs_codes";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_jo_staff_assignments": {
        Row: {
          "id": string;
          "tenant_id": string;
          "jo_id": string;
          "receipt_id": string | null;
          "shipment_id": string | null;
          "staff_id": string;
          "assigned_role": string;
          "status": string;
          "assigned_by": string | null;
          "created_at": string;
          "updated_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "jo_id": string;
          "receipt_id"?: string | null;
          "shipment_id"?: string | null;
          "staff_id": string;
          "assigned_role": string;
          "status"?: string;
          "assigned_by"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "jo_id"?: string;
          "receipt_id"?: string | null;
          "shipment_id"?: string | null;
          "staff_id"?: string;
          "assigned_role"?: string;
          "status"?: string;
          "assigned_by"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_jo_staff_assignments_jo_id_fkey";
            columns: ["jo_id"];
            isOneToOne: false;
            referencedRelation: "job_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_jo_staff_assignments_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "wh_inbound_receipts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_jo_staff_assignments_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "wh_outbound_shipments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_jo_staff_assignments_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_staff";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_loading_sessions": {
        Row: {
          "id": string;
          "shipment_id": string;
          "session_number": number;
          "start_time": string;
          "end_time": string | null;
          "pause_reason": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "shipment_id": string;
          "session_number": number;
          "start_time": string;
          "end_time"?: string | null;
          "pause_reason"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "shipment_id"?: string;
          "session_number"?: number;
          "start_time"?: string;
          "end_time"?: string | null;
          "pause_reason"?: string | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_loading_sessions_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "wh_outbound_shipments";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_master_boxes": {
        Row: {
          "id": string;
          "tenant_id": string;
          "warehouse_id": string;
          "job_order_id": string | null;
          "master_box_code": string;
          "destination_city": string;
          "consignee_name": string;
          "consignee_address": string | null;
          "total_parcels": number | null;
          "total_weight_kg": number | null;
          "total_cbm": number | null;
          "packing_material": string | null;
          "status": string;
          "notes": string | null;
          "created_by": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "location_id": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "warehouse_id": string;
          "job_order_id"?: string | null;
          "master_box_code": string;
          "destination_city": string;
          "consignee_name": string;
          "consignee_address"?: string | null;
          "total_parcels"?: number | null;
          "total_weight_kg"?: number | null;
          "total_cbm"?: number | null;
          "packing_material"?: string | null;
          "status"?: string;
          "notes"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "location_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "warehouse_id"?: string;
          "job_order_id"?: string | null;
          "master_box_code"?: string;
          "destination_city"?: string;
          "consignee_name"?: string;
          "consignee_address"?: string | null;
          "total_parcels"?: number | null;
          "total_weight_kg"?: number | null;
          "total_cbm"?: number | null;
          "packing_material"?: string | null;
          "status"?: string;
          "notes"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "location_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_master_boxes_job_order_id_fkey";
            columns: ["job_order_id"];
            isOneToOne: false;
            referencedRelation: "job_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_master_boxes_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_master_boxes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_master_boxes_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_milestone_logs": {
        Row: {
          "id": string;
          "tenant_id": string;
          "reference_type": string;
          "reference_id": string;
          "milestone_event": string;
          "notes": string | null;
          "performed_by": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "reference_type": string;
          "reference_id": string;
          "milestone_event": string;
          "notes"?: string | null;
          "performed_by"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "reference_type"?: string;
          "reference_id"?: string;
          "milestone_event"?: string;
          "notes"?: string | null;
          "performed_by"?: string | null;
          "created_at"?: string;
        };
        Relationships: [];
      };
      "wh_outbound_damage_records": {
        Row: {
          "id": string;
          "shipment_item_id": string;
          "damage_qty": number;
          "damage_source": string | null;
          "damage_condition": string | null;
          "damage_notes": string | null;
          "photo_url": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "shipment_item_id": string;
          "damage_qty": number;
          "damage_source"?: string | null;
          "damage_condition"?: string | null;
          "damage_notes"?: string | null;
          "photo_url"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "shipment_item_id"?: string;
          "damage_qty"?: number;
          "damage_source"?: string | null;
          "damage_condition"?: string | null;
          "damage_notes"?: string | null;
          "photo_url"?: string | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_outbound_damage_records_shipment_item_id_fkey";
            columns: ["shipment_item_id"];
            isOneToOne: false;
            referencedRelation: "wh_outbound_shipment_items";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_outbound_shipment_items": {
        Row: {
          "id": string;
          "shipment_id": string;
          "product_sku_id": string;
          "requested_qty": number;
          "picked_qty": number;
          "loaded_qty": number;
          "created_at": string;
          "picking_entries": Json | null;
          "checked_qty": number | null;
          "damage_qty": number | null;
        };
        Insert: {
          "id"?: string;
          "shipment_id": string;
          "product_sku_id": string;
          "requested_qty"?: number;
          "picked_qty"?: number;
          "loaded_qty"?: number;
          "created_at"?: string;
          "picking_entries"?: Json | null;
          "checked_qty"?: number | null;
          "damage_qty"?: number | null;
        };
        Update: {
          "id"?: string;
          "shipment_id"?: string;
          "product_sku_id"?: string;
          "requested_qty"?: number;
          "picked_qty"?: number;
          "loaded_qty"?: number;
          "created_at"?: string;
          "picking_entries"?: Json | null;
          "checked_qty"?: number | null;
          "damage_qty"?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_outbound_shipment_items_product_sku_id_fkey";
            columns: ["product_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_outbound_shipment_items_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "wh_outbound_shipments";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_outbound_shipments": {
        Row: {
          "id": string;
          "tenant_id": string;
          "warehouse_id": string;
          "wo_item_id": string | null;
          "shipment_number": string;
          "status": string;
          "transporter_id": string | null;
          "fleet_id": string | null;
          "driver_id": string | null;
          "dispatched_at": string | null;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
          "surat_jalan_url": string | null;
          "bast_url": string | null;
          "total_loading_minutes": number | null;
          "customer_id": string | null;
          "consignee_id": string | null;
          "transfer_id": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "warehouse_id": string;
          "wo_item_id"?: string | null;
          "shipment_number": string;
          "status"?: string;
          "transporter_id"?: string | null;
          "fleet_id"?: string | null;
          "driver_id"?: string | null;
          "dispatched_at"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "surat_jalan_url"?: string | null;
          "bast_url"?: string | null;
          "total_loading_minutes"?: number | null;
          "customer_id"?: string | null;
          "consignee_id"?: string | null;
          "transfer_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "warehouse_id"?: string;
          "wo_item_id"?: string | null;
          "shipment_number"?: string;
          "status"?: string;
          "transporter_id"?: string | null;
          "fleet_id"?: string | null;
          "driver_id"?: string | null;
          "dispatched_at"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "surat_jalan_url"?: string | null;
          "bast_url"?: string | null;
          "total_loading_minutes"?: number | null;
          "customer_id"?: string | null;
          "consignee_id"?: string | null;
          "transfer_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_outbound_shipments_consignee_id_fkey";
            columns: ["consignee_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_outbound_shipments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_outbound_shipments_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "md_drivers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_outbound_shipments_fleet_id_fkey";
            columns: ["fleet_id"];
            isOneToOne: false;
            referencedRelation: "md_fleets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_outbound_shipments_transfer_id_fkey";
            columns: ["transfer_id"];
            isOneToOne: false;
            referencedRelation: "wh_transfer_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_outbound_shipments_transporter_id_fkey";
            columns: ["transporter_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_outbound_shipments_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_outbound_shipments_wo_item_id_fkey";
            columns: ["wo_item_id"];
            isOneToOne: false;
            referencedRelation: "wo_items";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_packages": {
        Row: {
          "id": string;
          "package_code": string | null;
          "name": string | null;
          "weight_kg": number | null;
          "cbm": number | null;
          "status": string | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "package_code"?: string | null;
          "name"?: string | null;
          "weight_kg"?: number | null;
          "cbm"?: number | null;
          "status"?: string | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "package_code"?: string | null;
          "name"?: string | null;
          "weight_kg"?: number | null;
          "cbm"?: number | null;
          "status"?: string | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "wh_pallets": {
        Row: {
          "id": string;
          "pallet_code": string | null;
          "status": string | null;
          "total_weight_kg": number | null;
          "total_cbm": number | null;
          "created_at": string | null;
        };
        Insert: {
          "id"?: string;
          "pallet_code"?: string | null;
          "status"?: string | null;
          "total_weight_kg"?: number | null;
          "total_cbm"?: number | null;
          "created_at"?: string | null;
        };
        Update: {
          "id"?: string;
          "pallet_code"?: string | null;
          "status"?: string | null;
          "total_weight_kg"?: number | null;
          "total_cbm"?: number | null;
          "created_at"?: string | null;
        };
        Relationships: [];
      };
      "wh_parcel_inbound": {
        Row: {
          "id": string;
          "tenant_id": string;
          "warehouse_id": string;
          "customer_id": string | null;
          "parcel_code": string;
          "shipper_name": string;
          "consignee_name": string;
          "destination_city": string;
          "consignee_address": string | null;
          "qty": number | null;
          "weight_kg": number | null;
          "length_cm": number | null;
          "width_cm": number | null;
          "height_cm": number | null;
          "cbm": number | null;
          "location_id": string | null;
          "status": string;
          "master_box_id": string | null;
          "notes": string | null;
          "created_at": string | null;
          "updated_at": string | null;
          "photo_url": string | null;
          "items": Json | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "warehouse_id": string;
          "customer_id"?: string | null;
          "parcel_code": string;
          "shipper_name": string;
          "consignee_name": string;
          "destination_city": string;
          "consignee_address"?: string | null;
          "qty"?: number | null;
          "weight_kg"?: number | null;
          "length_cm"?: number | null;
          "width_cm"?: number | null;
          "height_cm"?: number | null;
          "cbm"?: number | null;
          "location_id"?: string | null;
          "status"?: string;
          "master_box_id"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "photo_url"?: string | null;
          "items"?: Json | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "warehouse_id"?: string;
          "customer_id"?: string | null;
          "parcel_code"?: string;
          "shipper_name"?: string;
          "consignee_name"?: string;
          "destination_city"?: string;
          "consignee_address"?: string | null;
          "qty"?: number | null;
          "weight_kg"?: number | null;
          "length_cm"?: number | null;
          "width_cm"?: number | null;
          "height_cm"?: number | null;
          "cbm"?: number | null;
          "location_id"?: string | null;
          "status"?: string;
          "master_box_id"?: string | null;
          "notes"?: string | null;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "photo_url"?: string | null;
          "items"?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_parcel_inbound_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_parcel_inbound_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_parcel_inbound_master_box_id_fkey";
            columns: ["master_box_id"];
            isOneToOne: false;
            referencedRelation: "wh_master_boxes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_parcel_inbound_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_parcel_inbound_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_picking_details": {
        Row: {
          "id": string;
          "tenant_id": string;
          "picking_list_id": string;
          "inventory_id": string;
          "product_sku_id": string;
          "requested_quantity": number | null;
          "picked_quantity": number | null;
          "from_location_id": string | null;
          "status": string;
          "fefo_override": boolean;
          "override_reason": string | null;
          "override_by": string | null;
          "picked_at": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "picking_list_id": string;
          "inventory_id": string;
          "product_sku_id": string;
          "requested_quantity"?: number | null;
          "picked_quantity"?: number | null;
          "from_location_id"?: string | null;
          "status"?: string;
          "fefo_override"?: boolean;
          "override_reason"?: string | null;
          "override_by"?: string | null;
          "picked_at"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "picking_list_id"?: string;
          "inventory_id"?: string;
          "product_sku_id"?: string;
          "requested_quantity"?: number | null;
          "picked_quantity"?: number | null;
          "from_location_id"?: string | null;
          "status"?: string;
          "fefo_override"?: boolean;
          "override_reason"?: string | null;
          "override_by"?: string | null;
          "picked_at"?: string | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_picking_details_from_location_id_fkey";
            columns: ["from_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_picking_details_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "wh_inventory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_picking_details_picking_list_id_fkey";
            columns: ["picking_list_id"];
            isOneToOne: false;
            referencedRelation: "wh_picking_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_picking_details_product_sku_id_fkey";
            columns: ["product_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_picking_lists": {
        Row: {
          "id": string;
          "tenant_id": string;
          "picking_number": string;
          "source_type": string;
          "source_id": string | null;
          "customer_id": string | null;
          "warehouse_id": string;
          "scheduled_date": string | null;
          "status": string;
          "assigned_picker": string | null;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "picking_number": string;
          "source_type": string;
          "source_id"?: string | null;
          "customer_id"?: string | null;
          "warehouse_id": string;
          "scheduled_date"?: string | null;
          "status"?: string;
          "assigned_picker"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "picking_number"?: string;
          "source_type"?: string;
          "source_id"?: string | null;
          "customer_id"?: string | null;
          "warehouse_id"?: string;
          "scheduled_date"?: string | null;
          "status"?: string;
          "assigned_picker"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_picking_lists_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_receipt_details": {
        Row: {
          "id": string;
          "tenant_id": string;
          "receipt_id": string;
          "product_sku_id": string;
          "expected_quantity": number | null;
          "actual_quantity": number | null;
          "uom": string | null;
          "lot_number": string | null;
          "expiry_date": string | null;
          "status": string;
          "damage_notes": string | null;
          "photo_url": string | null;
          "generated_inventory_id": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "receipt_id": string;
          "product_sku_id": string;
          "expected_quantity"?: number | null;
          "actual_quantity"?: number | null;
          "uom"?: string | null;
          "lot_number"?: string | null;
          "expiry_date"?: string | null;
          "status"?: string;
          "damage_notes"?: string | null;
          "photo_url"?: string | null;
          "generated_inventory_id"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "receipt_id"?: string;
          "product_sku_id"?: string;
          "expected_quantity"?: number | null;
          "actual_quantity"?: number | null;
          "uom"?: string | null;
          "lot_number"?: string | null;
          "expiry_date"?: string | null;
          "status"?: string;
          "damage_notes"?: string | null;
          "photo_url"?: string | null;
          "generated_inventory_id"?: string | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_receipt_details_generated_inventory_id_fkey";
            columns: ["generated_inventory_id"];
            isOneToOne: false;
            referencedRelation: "wh_inventory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_receipt_details_product_sku_id_fkey";
            columns: ["product_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_receipt_details_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "wh_receipt_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_receipt_orders": {
        Row: {
          "id": string;
          "tenant_id": string;
          "receipt_number": string;
          "source_type": string;
          "source_id": string | null;
          "customer_id": string | null;
          "warehouse_id": string;
          "expected_date": string | null;
          "status": string;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "receipt_number": string;
          "source_type": string;
          "source_id"?: string | null;
          "customer_id"?: string | null;
          "warehouse_id": string;
          "expected_date"?: string | null;
          "status"?: string;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "receipt_number"?: string;
          "source_type"?: string;
          "source_id"?: string | null;
          "customer_id"?: string | null;
          "warehouse_id"?: string;
          "expected_date"?: string | null;
          "status"?: string;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_receipt_orders_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_repacking_conversions": {
        Row: {
          "id": string;
          "tenant_id": string | null;
          "customer_id": string | null;
          "source_product_id": string | null;
          "source_qty": number;
          "target_product_id": string | null;
          "target_qty": number;
          "created_at": string | null;
          "updated_at": string | null;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id"?: string | null;
          "customer_id"?: string | null;
          "source_product_id"?: string | null;
          "source_qty": number;
          "target_product_id"?: string | null;
          "target_qty": number;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string | null;
          "customer_id"?: string | null;
          "source_product_id"?: string | null;
          "source_qty"?: number;
          "target_product_id"?: string | null;
          "target_qty"?: number;
          "created_at"?: string | null;
          "updated_at"?: string | null;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_repacking_conversions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_repacking_conversions_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_repacking_conversions_source_product_id_fkey";
            columns: ["source_product_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_repacking_conversions_target_product_id_fkey";
            columns: ["target_product_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_repacking_conversions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_repacking_items": {
        Row: {
          "id": string;
          "repacking_order_id": string;
          "tenant_id": string;
          "warehouse_id": string;
          "product_sku_id": string;
          "item_type": string;
          "quantity": number;
          "unit_cost": number | null;
          "source_location_id": string | null;
          "target_location_id": string | null;
          "batch_number": string | null;
          "expiry_date": string | null;
          "notes": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "repacking_order_id": string;
          "tenant_id": string;
          "warehouse_id": string;
          "product_sku_id": string;
          "item_type": string;
          "quantity": number;
          "unit_cost"?: number | null;
          "source_location_id"?: string | null;
          "target_location_id"?: string | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "repacking_order_id"?: string;
          "tenant_id"?: string;
          "warehouse_id"?: string;
          "product_sku_id"?: string;
          "item_type"?: string;
          "quantity"?: number;
          "unit_cost"?: number | null;
          "source_location_id"?: string | null;
          "target_location_id"?: string | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_repacking_items_product_sku_id_fkey";
            columns: ["product_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_repacking_items_repacking_order_id_fkey";
            columns: ["repacking_order_id"];
            isOneToOne: false;
            referencedRelation: "wh_repacking_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_repacking_items_source_location_id_fkey";
            columns: ["source_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_repacking_items_target_location_id_fkey";
            columns: ["target_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_repacking_items_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_repacking_orders": {
        Row: {
          "id": string;
          "tenant_id": string;
          "warehouse_id": string;
          "order_number": string;
          "order_type": string;
          "description": string | null;
          "status": string;
          "priority": string | null;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
          "executed_by": string | null;
          "executed_at": string | null;
          "completed_at": string | null;
          "reference_id": string | null;
          "customer_id": string | null;
          "current_stage": number | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "warehouse_id": string;
          "order_number": string;
          "order_type": string;
          "description"?: string | null;
          "status"?: string;
          "priority"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "executed_by"?: string | null;
          "executed_at"?: string | null;
          "completed_at"?: string | null;
          "reference_id"?: string | null;
          "customer_id"?: string | null;
          "current_stage"?: number | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "warehouse_id"?: string;
          "order_number"?: string;
          "order_type"?: string;
          "description"?: string | null;
          "status"?: string;
          "priority"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "executed_by"?: string | null;
          "executed_at"?: string | null;
          "completed_at"?: string | null;
          "reference_id"?: string | null;
          "customer_id"?: string | null;
          "current_stage"?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_repacking_orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_repacking_orders_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_staff_attendance": {
        Row: {
          "id": string;
          "tenant_id": string;
          "staff_id": string;
          "check_in_time": string;
          "check_out_time": string | null;
          "status": string;
          "latitude": number | null;
          "longitude": number | null;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "staff_id": string;
          "check_in_time"?: string;
          "check_out_time"?: string | null;
          "status"?: string;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "staff_id"?: string;
          "check_in_time"?: string;
          "check_out_time"?: string | null;
          "status"?: string;
          "latitude"?: number | null;
          "longitude"?: number | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_staff_attendance_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_staff";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_task_items": {
        Row: {
          "id": string;
          "task_id": string;
          "product_sku_id": string;
          "from_location_id": string | null;
          "to_location_id": string | null;
          "expected_quantity": number;
          "actual_quantity": number | null;
          "batch_number": string | null;
          "expiry_date": string | null;
          "unit_cost": number | null;
          "notes": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "task_id": string;
          "product_sku_id": string;
          "from_location_id"?: string | null;
          "to_location_id"?: string | null;
          "expected_quantity": number;
          "actual_quantity"?: number | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "unit_cost"?: number | null;
          "notes"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "task_id"?: string;
          "product_sku_id"?: string;
          "from_location_id"?: string | null;
          "to_location_id"?: string | null;
          "expected_quantity"?: number;
          "actual_quantity"?: number | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "unit_cost"?: number | null;
          "notes"?: string | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_task_items_from_location_id_fkey";
            columns: ["from_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_task_items_product_sku_id_fkey";
            columns: ["product_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_task_items_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "wh_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_task_items_to_location_id_fkey";
            columns: ["to_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_tasks": {
        Row: {
          "id": string;
          "tenant_id": string;
          "wo_item_id": string | null;
          "warehouse_id": string;
          "task_number": string;
          "task_type": string;
          "status": string;
          "assigned_to": string | null;
          "priority": string | null;
          "notes": string | null;
          "completed_at": string | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "wo_item_id"?: string | null;
          "warehouse_id": string;
          "task_number": string;
          "task_type": string;
          "status"?: string;
          "assigned_to"?: string | null;
          "priority"?: string | null;
          "notes"?: string | null;
          "completed_at"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "wo_item_id"?: string | null;
          "warehouse_id"?: string;
          "task_number"?: string;
          "task_type"?: string;
          "status"?: string;
          "assigned_to"?: string | null;
          "priority"?: string | null;
          "notes"?: string | null;
          "completed_at"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_tasks_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_temperature_alerts": {
        Row: {
          "id": string;
          "zone_id": string | null;
          "tenant_id": string;
          "alert_type": string;
          "threshold_value": number | null;
          "actual_value": number | null;
          "duration_minutes": number | null;
          "is_resolved": boolean;
          "resolved_by": string | null;
          "resolved_at": string | null;
          "notes": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "zone_id"?: string | null;
          "tenant_id": string;
          "alert_type": string;
          "threshold_value"?: number | null;
          "actual_value"?: number | null;
          "duration_minutes"?: number | null;
          "is_resolved"?: boolean;
          "resolved_by"?: string | null;
          "resolved_at"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "zone_id"?: string | null;
          "tenant_id"?: string;
          "alert_type"?: string;
          "threshold_value"?: number | null;
          "actual_value"?: number | null;
          "duration_minutes"?: number | null;
          "is_resolved"?: boolean;
          "resolved_by"?: string | null;
          "resolved_at"?: string | null;
          "notes"?: string | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_temperature_alerts_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_zones";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_temperature_logs": {
        Row: {
          "id": string;
          "zone_id": string | null;
          "tenant_id": string;
          "recorded_at": string;
          "temperature_c": number;
          "humidity_pct": number | null;
          "sensor_id": string | null;
          "status": string;
        };
        Insert: {
          "id"?: string;
          "zone_id"?: string | null;
          "tenant_id": string;
          "recorded_at"?: string;
          "temperature_c": number;
          "humidity_pct"?: number | null;
          "sensor_id"?: string | null;
          "status"?: string;
        };
        Update: {
          "id"?: string;
          "zone_id"?: string | null;
          "tenant_id"?: string;
          "recorded_at"?: string;
          "temperature_c"?: number;
          "humidity_pct"?: number | null;
          "sensor_id"?: string | null;
          "status"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_temperature_logs_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_zones";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_transfer_details": {
        Row: {
          "id": string;
          "tenant_id": string;
          "transfer_id": string;
          "inventory_id": string;
          "product_sku_id": string;
          "quantity": number;
          "from_location_id": string | null;
          "to_location_id": string | null;
          "status": string;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "transfer_id": string;
          "inventory_id": string;
          "product_sku_id": string;
          "quantity": number;
          "from_location_id"?: string | null;
          "to_location_id"?: string | null;
          "status"?: string;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "transfer_id"?: string;
          "inventory_id"?: string;
          "product_sku_id"?: string;
          "quantity"?: number;
          "from_location_id"?: string | null;
          "to_location_id"?: string | null;
          "status"?: string;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_transfer_details_from_location_id_fkey";
            columns: ["from_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_transfer_details_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "wh_inventory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_transfer_details_product_sku_id_fkey";
            columns: ["product_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_transfer_details_to_location_id_fkey";
            columns: ["to_location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_transfer_details_transfer_id_fkey";
            columns: ["transfer_id"];
            isOneToOne: false;
            referencedRelation: "wh_transfer_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_transfer_orders": {
        Row: {
          "id": string;
          "tenant_id": string;
          "transfer_number": string;
          "from_warehouse_id": string;
          "to_warehouse_id": string;
          "transfer_type": string | null;
          "customer_id": string | null;
          "status": string;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
          "consignee_id": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "transfer_number": string;
          "from_warehouse_id": string;
          "to_warehouse_id": string;
          "transfer_type"?: string | null;
          "customer_id"?: string | null;
          "status"?: string;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "consignee_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "transfer_number"?: string;
          "from_warehouse_id"?: string;
          "to_warehouse_id"?: string;
          "transfer_type"?: string | null;
          "customer_id"?: string | null;
          "status"?: string;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "consignee_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_transfer_orders_consignee_id_fkey";
            columns: ["consignee_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_transfer_orders_from_warehouse_id_fkey";
            columns: ["from_warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_transfer_orders_to_warehouse_id_fkey";
            columns: ["to_warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_transformation_components": {
        Row: {
          "id": string;
          "tenant_id": string;
          "transformation_order_id": string;
          "inventory_id": string;
          "product_sku_id": string;
          "planned_quantity": number | null;
          "consumed_quantity": number | null;
          "status": string;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "transformation_order_id": string;
          "inventory_id": string;
          "product_sku_id": string;
          "planned_quantity"?: number | null;
          "consumed_quantity"?: number | null;
          "status"?: string;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "transformation_order_id"?: string;
          "inventory_id"?: string;
          "product_sku_id"?: string;
          "planned_quantity"?: number | null;
          "consumed_quantity"?: number | null;
          "status"?: string;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_transformation_components_inventory_id_fkey";
            columns: ["inventory_id"];
            isOneToOne: false;
            referencedRelation: "wh_inventory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_transformation_components_product_sku_id_fkey";
            columns: ["product_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_transformation_components_transformation_order_id_fkey";
            columns: ["transformation_order_id"];
            isOneToOne: false;
            referencedRelation: "wh_transformation_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_transformation_orders": {
        Row: {
          "id": string;
          "tenant_id": string;
          "to_number": string;
          "to_type": string;
          "status": string;
          "output_sku_id": string | null;
          "planned_output_qty": number | null;
          "actual_output_qty": number | null;
          "input_bom": Json | null;
          "location_id": string | null;
          "assigned_to": string | null;
          "notes": string | null;
          "completed_at": string | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "to_number": string;
          "to_type": string;
          "status"?: string;
          "output_sku_id"?: string | null;
          "planned_output_qty"?: number | null;
          "actual_output_qty"?: number | null;
          "input_bom"?: Json | null;
          "location_id"?: string | null;
          "assigned_to"?: string | null;
          "notes"?: string | null;
          "completed_at"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "to_number"?: string;
          "to_type"?: string;
          "status"?: string;
          "output_sku_id"?: string | null;
          "planned_output_qty"?: number | null;
          "actual_output_qty"?: number | null;
          "input_bom"?: Json | null;
          "location_id"?: string | null;
          "assigned_to"?: string | null;
          "notes"?: string | null;
          "completed_at"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_transformation_orders_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouse_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_transformation_orders_output_sku_id_fkey";
            columns: ["output_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_transformation_outputs": {
        Row: {
          "id": string;
          "tenant_id": string;
          "transformation_order_id": string;
          "generated_inventory_id": string;
          "product_sku_id": string;
          "quantity": number;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "transformation_order_id": string;
          "generated_inventory_id": string;
          "product_sku_id": string;
          "quantity": number;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "transformation_order_id"?: string;
          "generated_inventory_id"?: string;
          "product_sku_id"?: string;
          "quantity"?: number;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_transformation_outputs_generated_inventory_id_fkey";
            columns: ["generated_inventory_id"];
            isOneToOne: false;
            referencedRelation: "wh_inventory";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_transformation_outputs_product_sku_id_fkey";
            columns: ["product_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_transformation_outputs_transformation_order_id_fkey";
            columns: ["transformation_order_id"];
            isOneToOne: false;
            referencedRelation: "wh_transformation_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_unloading_sessions": {
        Row: {
          "id": string;
          "receipt_id": string;
          "session_number": number;
          "start_time": string;
          "end_time": string | null;
          "pause_reason": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "receipt_id": string;
          "session_number": number;
          "start_time": string;
          "end_time"?: string | null;
          "pause_reason"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "receipt_id"?: string;
          "session_number"?: number;
          "start_time"?: string;
          "end_time"?: string | null;
          "pause_reason"?: string | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_unloading_sessions_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "wh_inbound_receipts";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_vas_orders": {
        Row: {
          "id": string;
          "tenant_id": string;
          "warehouse_id": string;
          "vas_number": string;
          "vas_type": string;
          "status": string;
          "bom_id": string | null;
          "target_sku_id": string | null;
          "target_qty": number | null;
          "completed_qty": number | null;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "warehouse_id": string;
          "vas_number": string;
          "vas_type": string;
          "status"?: string;
          "bom_id"?: string | null;
          "target_sku_id"?: string | null;
          "target_qty"?: number | null;
          "completed_qty"?: number | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "warehouse_id"?: string;
          "vas_number"?: string;
          "vas_type"?: string;
          "status"?: string;
          "bom_id"?: string | null;
          "target_sku_id"?: string | null;
          "target_qty"?: number | null;
          "completed_qty"?: number | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "wh_vas_orders_bom_id_fkey";
            columns: ["bom_id"];
            isOneToOne: false;
            referencedRelation: "md_bill_of_materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_vas_orders_target_sku_id_fkey";
            columns: ["target_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wh_vas_orders_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "md_warehouses";
            referencedColumns: ["id"];
          }
        ];
      };
      "wh_wa_notifications": {
        Row: {
          "id": string;
          "receipt_id": string;
          "receipt_number": string | null;
          "recipient": string;
          "recipient_name": string | null;
          "message_type": string;
          "message_body": string;
          "status": string;
          "error_message": string | null;
          "sent_at": string;
        };
        Insert: {
          "id"?: string;
          "receipt_id": string;
          "receipt_number"?: string | null;
          "recipient": string;
          "recipient_name"?: string | null;
          "message_type": string;
          "message_body": string;
          "status"?: string;
          "error_message"?: string | null;
          "sent_at"?: string;
        };
        Update: {
          "id"?: string;
          "receipt_id"?: string;
          "receipt_number"?: string | null;
          "recipient"?: string;
          "recipient_name"?: string | null;
          "message_type"?: string;
          "message_body"?: string;
          "status"?: string;
          "error_message"?: string | null;
          "sent_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wh_wa_notifications_receipt_id_fkey";
            columns: ["receipt_id"];
            isOneToOne: false;
            referencedRelation: "wh_inbound_receipts";
            referencedColumns: ["id"];
          }
        ];
      };
      "wo_audit_logs": {
        Row: {
          "id": number;
          "tenant_id": string | null;
          "correlation_id": string | null;
          "entity_type": string;
          "entity_id": string;
          "operation": string;
          "old_data": Json | null;
          "new_data": Json | null;
          "changed_fields": string[] | null;
          "performed_by": string | null;
          "performed_at": string;
          "ip_address": string | null;
          "user_agent": string | null;
        };
        Insert: {
          "id"?: number;
          "tenant_id"?: string | null;
          "correlation_id"?: string | null;
          "entity_type": string;
          "entity_id": string;
          "operation": string;
          "old_data"?: Json | null;
          "new_data"?: Json | null;
          "changed_fields"?: string[] | null;
          "performed_by"?: string | null;
          "performed_at"?: string;
          "ip_address"?: string | null;
          "user_agent"?: string | null;
        };
        Update: {
          "id"?: number;
          "tenant_id"?: string | null;
          "correlation_id"?: string | null;
          "entity_type"?: string;
          "entity_id"?: string;
          "operation"?: string;
          "old_data"?: Json | null;
          "new_data"?: Json | null;
          "changed_fields"?: string[] | null;
          "performed_by"?: string | null;
          "performed_at"?: string;
          "ip_address"?: string | null;
          "user_agent"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_audit_performed_by";
            columns: ["performed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      "wo_inventory_ledger": {
        Row: {
          "id": number;
          "correlation_id": string;
          "tenant_id": string;
          "product_sku_id": string;
          "warehouse_id": string;
          "bin_id": string | null;
          "movement_type": string;
          "movement_reason": string | null;
          "quantity_change": number;
          "quantity_before": number | null;
          "quantity_after": number | null;
          "batch_number": string | null;
          "expiry_date": string | null;
          "lot_number": string | null;
          "pallet_id": string | null;
          "unit_cost": number | null;
          "total_cost": number | null;
          "source_document_type": string | null;
          "source_document_id": string | null;
          "job_order_id": string | null;
          "job_order_item_id": string | null;
          "created_by": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: number;
          "correlation_id": string;
          "tenant_id": string;
          "product_sku_id": string;
          "warehouse_id": string;
          "bin_id"?: string | null;
          "movement_type": string;
          "movement_reason"?: string | null;
          "quantity_change": number;
          "quantity_before"?: number | null;
          "quantity_after"?: number | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "lot_number"?: string | null;
          "pallet_id"?: string | null;
          "unit_cost"?: number | null;
          "total_cost"?: number | null;
          "source_document_type"?: string | null;
          "source_document_id"?: string | null;
          "job_order_id"?: string | null;
          "job_order_item_id"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: number;
          "correlation_id"?: string;
          "tenant_id"?: string;
          "product_sku_id"?: string;
          "warehouse_id"?: string;
          "bin_id"?: string | null;
          "movement_type"?: string;
          "movement_reason"?: string | null;
          "quantity_change"?: number;
          "quantity_before"?: number | null;
          "quantity_after"?: number | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "lot_number"?: string | null;
          "pallet_id"?: string | null;
          "unit_cost"?: number | null;
          "total_cost"?: number | null;
          "source_document_type"?: string | null;
          "source_document_id"?: string | null;
          "job_order_id"?: string | null;
          "job_order_item_id"?: string | null;
          "created_by"?: string | null;
          "created_at"?: string;
        };
        Relationships: [];
      };
      "wo_item_manifests": {
        Row: {
          "id": string;
          "wo_item_id": string;
          "tenant_id": string;
          "product_sku_id": string;
          "quantity": number;
          "unit_weight_kg": number | null;
          "unit_volume_m3": number | null;
          "total_weight_kg": number | null;
          "total_volume_m3": number | null;
          "notes": string | null;
          "created_at": string;
          "updated_at": string;
          "job_order_id": string | null;
          "custom_fields": Json | null;
        };
        Insert: {
          "id"?: string;
          "wo_item_id": string;
          "tenant_id": string;
          "product_sku_id": string;
          "quantity"?: number;
          "unit_weight_kg"?: number | null;
          "unit_volume_m3"?: number | null;
          "total_weight_kg"?: number | null;
          "total_volume_m3"?: number | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "job_order_id"?: string | null;
          "custom_fields"?: Json | null;
        };
        Update: {
          "id"?: string;
          "wo_item_id"?: string;
          "tenant_id"?: string;
          "product_sku_id"?: string;
          "quantity"?: number;
          "unit_weight_kg"?: number | null;
          "unit_volume_m3"?: number | null;
          "total_weight_kg"?: number | null;
          "total_volume_m3"?: number | null;
          "notes"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "job_order_id"?: string | null;
          "custom_fields"?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "wo_item_manifests_job_order_id_fkey";
            columns: ["job_order_id"];
            isOneToOne: false;
            referencedRelation: "job_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wo_item_manifests_product_sku_id_fkey";
            columns: ["product_sku_id"];
            isOneToOne: false;
            referencedRelation: "md_product_skus";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wo_item_manifests_wo_item_id_fkey";
            columns: ["wo_item_id"];
            isOneToOne: false;
            referencedRelation: "wo_items";
            referencedColumns: ["id"];
          }
        ];
      };
      "wo_items": {
        Row: {
          "id": string;
          "tenant_id": string;
          "wo_id": string | null;
          "item_code": string;
          "sbu_type": string;
          "item_data": Json;
          "status": string | null;
          "created_at": string | null;
          "handover_requested": boolean | null;
          "handover_reason": string | null;
          "handover_status": string | null;
          "handover_requested_at": string | null;
          "max_jo_count": number | null;
          "updated_at": string | null;
          "unit_price": number | null;
          "total_revenue": number | null;
          "sbu_metadata": Json | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "wo_id"?: string | null;
          "item_code": string;
          "sbu_type": string;
          "item_data"?: Json;
          "status"?: string | null;
          "created_at"?: string | null;
          "handover_requested"?: boolean | null;
          "handover_reason"?: string | null;
          "handover_status"?: string | null;
          "handover_requested_at"?: string | null;
          "max_jo_count"?: number | null;
          "updated_at"?: string | null;
          "unit_price"?: number | null;
          "total_revenue"?: number | null;
          "sbu_metadata"?: Json | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "wo_id"?: string | null;
          "item_code"?: string;
          "sbu_type"?: string;
          "item_data"?: Json;
          "status"?: string | null;
          "created_at"?: string | null;
          "handover_requested"?: boolean | null;
          "handover_reason"?: string | null;
          "handover_status"?: string | null;
          "handover_requested_at"?: string | null;
          "max_jo_count"?: number | null;
          "updated_at"?: string | null;
          "unit_price"?: number | null;
          "total_revenue"?: number | null;
          "sbu_metadata"?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "wo_items_wo_id_fkey";
            columns: ["wo_id"];
            isOneToOne: false;
            referencedRelation: "work_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      "wo_job_order_items": {
        Row: {
          "id": string;
          "job_order_id": string;
          "tenant_id": string;
          "inventory_id": string | null;
          "product_sku_id": string | null;
          "from_bin_id": string | null;
          "to_bin_id": string | null;
          "requested_quantity": number | null;
          "actual_quantity": number | null;
          "uom": string | null;
          "batch_number": string | null;
          "expiry_date": string | null;
          "lot_number": string | null;
          "pallet_id": string | null;
          "is_damaged": boolean | null;
          "damage_notes": string | null;
          "result": Json | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "job_order_id": string;
          "tenant_id": string;
          "inventory_id"?: string | null;
          "product_sku_id"?: string | null;
          "from_bin_id"?: string | null;
          "to_bin_id"?: string | null;
          "requested_quantity"?: number | null;
          "actual_quantity"?: number | null;
          "uom"?: string | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "lot_number"?: string | null;
          "pallet_id"?: string | null;
          "is_damaged"?: boolean | null;
          "damage_notes"?: string | null;
          "result"?: Json | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "job_order_id"?: string;
          "tenant_id"?: string;
          "inventory_id"?: string | null;
          "product_sku_id"?: string | null;
          "from_bin_id"?: string | null;
          "to_bin_id"?: string | null;
          "requested_quantity"?: number | null;
          "actual_quantity"?: number | null;
          "uom"?: string | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "lot_number"?: string | null;
          "pallet_id"?: string | null;
          "is_damaged"?: boolean | null;
          "damage_notes"?: string | null;
          "result"?: Json | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_order_items_job_order_id_fkey";
            columns: ["job_order_id"];
            isOneToOne: false;
            referencedRelation: "wo_job_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      "wo_job_orders": {
        Row: {
          "id": string;
          "correlation_id": string;
          "tenant_id": string;
          "work_order_id": string;
          "work_order_item_id": string | null;
          "originating_org_id": string;
          "executing_org_id": string;
          "assigned_warehouse_id": string | null;
          "jo_number": string;
          "jo_type": string;
          "sequence_order": number;
          "depends_on_jo_id": string | null;
          "status": string;
          "assigned_to": string | null;
          "assigned_fleet_id": string | null;
          "assigned_driver_id": string | null;
          "scheduled_start": string | null;
          "actual_start": string | null;
          "actual_end": string | null;
          "sla_minutes": number | null;
          "requires_approval": boolean | null;
          "approved_by": string | null;
          "approved_at": string | null;
          "notes": string | null;
          "result": Json | null;
          "metadata": Json | null;
          "created_at": string;
          "updated_at": string;
        };
        Insert: {
          "id"?: string;
          "correlation_id": string;
          "tenant_id": string;
          "work_order_id": string;
          "work_order_item_id"?: string | null;
          "originating_org_id": string;
          "executing_org_id": string;
          "assigned_warehouse_id"?: string | null;
          "jo_number": string;
          "jo_type": string;
          "sequence_order"?: number;
          "depends_on_jo_id"?: string | null;
          "status"?: string;
          "assigned_to"?: string | null;
          "assigned_fleet_id"?: string | null;
          "assigned_driver_id"?: string | null;
          "scheduled_start"?: string | null;
          "actual_start"?: string | null;
          "actual_end"?: string | null;
          "sla_minutes"?: number | null;
          "requires_approval"?: boolean | null;
          "approved_by"?: string | null;
          "approved_at"?: string | null;
          "notes"?: string | null;
          "result"?: Json | null;
          "metadata"?: Json | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Update: {
          "id"?: string;
          "correlation_id"?: string;
          "tenant_id"?: string;
          "work_order_id"?: string;
          "work_order_item_id"?: string | null;
          "originating_org_id"?: string;
          "executing_org_id"?: string;
          "assigned_warehouse_id"?: string | null;
          "jo_number"?: string;
          "jo_type"?: string;
          "sequence_order"?: number;
          "depends_on_jo_id"?: string | null;
          "status"?: string;
          "assigned_to"?: string | null;
          "assigned_fleet_id"?: string | null;
          "assigned_driver_id"?: string | null;
          "scheduled_start"?: string | null;
          "actual_start"?: string | null;
          "actual_end"?: string | null;
          "sla_minutes"?: number | null;
          "requires_approval"?: boolean | null;
          "approved_by"?: string | null;
          "approved_at"?: string | null;
          "notes"?: string | null;
          "result"?: Json | null;
          "metadata"?: Json | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_orders_executing_org_id_fkey";
            columns: ["executing_org_id"];
            isOneToOne: false;
            referencedRelation: "wo_organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_orders_originating_org_id_fkey";
            columns: ["originating_org_id"];
            isOneToOne: false;
            referencedRelation: "wo_organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_orders_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "wo_work_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      "wo_monitoring_events": {
        Row: {
          "id": number;
          "tenant_id": string | null;
          "correlation_id": string | null;
          "event_type": string;
          "severity": string;
          "source": string | null;
          "title": string;
          "description": string | null;
          "affected_entity_type": string | null;
          "affected_entity_id": string | null;
          "metric_name": string | null;
          "metric_value": number | null;
          "threshold": number | null;
          "payload": Json | null;
          "is_acknowledged": boolean | null;
          "acknowledged_by": string | null;
          "acknowledged_at": string | null;
          "resolved_at": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: number;
          "tenant_id"?: string | null;
          "correlation_id"?: string | null;
          "event_type": string;
          "severity": string;
          "source"?: string | null;
          "title": string;
          "description"?: string | null;
          "affected_entity_type"?: string | null;
          "affected_entity_id"?: string | null;
          "metric_name"?: string | null;
          "metric_value"?: number | null;
          "threshold"?: number | null;
          "payload"?: Json | null;
          "is_acknowledged"?: boolean | null;
          "acknowledged_by"?: string | null;
          "acknowledged_at"?: string | null;
          "resolved_at"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: number;
          "tenant_id"?: string | null;
          "correlation_id"?: string | null;
          "event_type"?: string;
          "severity"?: string;
          "source"?: string | null;
          "title"?: string;
          "description"?: string | null;
          "affected_entity_type"?: string | null;
          "affected_entity_id"?: string | null;
          "metric_name"?: string | null;
          "metric_value"?: number | null;
          "threshold"?: number | null;
          "payload"?: Json | null;
          "is_acknowledged"?: boolean | null;
          "acknowledged_by"?: string | null;
          "acknowledged_at"?: string | null;
          "resolved_at"?: string | null;
          "created_at"?: string;
        };
        Relationships: [];
      };
      "wo_organization_users": {
        Row: {
          "id": string;
          "tenant_id": string;
          "organization_id": string;
          "user_id": string;
          "role_code": string;
          "is_primary": boolean | null;
          "assigned_warehouse_id": string | null;
          "is_active": boolean;
          "joined_at": string;
          "created_at": string;
          "assigned_region_id": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "organization_id": string;
          "user_id": string;
          "role_code": string;
          "is_primary"?: boolean | null;
          "assigned_warehouse_id"?: string | null;
          "is_active"?: boolean;
          "joined_at"?: string;
          "created_at"?: string;
          "assigned_region_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "organization_id"?: string;
          "user_id"?: string;
          "role_code"?: string;
          "is_primary"?: boolean | null;
          "assigned_warehouse_id"?: string | null;
          "is_active"?: boolean;
          "joined_at"?: string;
          "created_at"?: string;
          "assigned_region_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organization_users_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "wo_organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wo_organization_users_assigned_region_id_fkey";
            columns: ["assigned_region_id"];
            isOneToOne: false;
            referencedRelation: "md_trucking_regions";
            referencedColumns: ["id"];
          }
        ];
      };
      "wo_organizations": {
        Row: {
          "id": string;
          "tenant_id": string;
          "parent_org_id": string | null;
          "code": string;
          "name": string;
          "org_type": string;
          "address": string | null;
          "city": string | null;
          "province": string | null;
          "is_active": boolean;
          "settings": Json | null;
          "created_at": string;
          "updated_at": string;
          "org_path": unknown | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "parent_org_id"?: string | null;
          "code": string;
          "name": string;
          "org_type": string;
          "address"?: string | null;
          "city"?: string | null;
          "province"?: string | null;
          "is_active"?: boolean;
          "settings"?: Json | null;
          "created_at"?: string;
          "updated_at"?: string;
          "org_path"?: unknown | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "parent_org_id"?: string | null;
          "code"?: string;
          "name"?: string;
          "org_type"?: string;
          "address"?: string | null;
          "city"?: string | null;
          "province"?: string | null;
          "is_active"?: boolean;
          "settings"?: Json | null;
          "created_at"?: string;
          "updated_at"?: string;
          "org_path"?: unknown | null;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_parent_org_id_fkey";
            columns: ["parent_org_id"];
            isOneToOne: false;
            referencedRelation: "wo_organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      "wo_status_history": {
        Row: {
          "id": number;
          "tenant_id": string;
          "correlation_id": string | null;
          "entity_type": string;
          "entity_id": string;
          "previous_status": string | null;
          "new_status": string;
          "reason": string | null;
          "performed_by": string | null;
          "duration_in_previous_state": string | null;
          "created_at": string;
        };
        Insert: {
          "id"?: number;
          "tenant_id": string;
          "correlation_id"?: string | null;
          "entity_type": string;
          "entity_id": string;
          "previous_status"?: string | null;
          "new_status": string;
          "reason"?: string | null;
          "performed_by"?: string | null;
          "duration_in_previous_state"?: string | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: number;
          "tenant_id"?: string;
          "correlation_id"?: string | null;
          "entity_type"?: string;
          "entity_id"?: string;
          "previous_status"?: string | null;
          "new_status"?: string;
          "reason"?: string | null;
          "performed_by"?: string | null;
          "duration_in_previous_state"?: string | null;
          "created_at"?: string;
        };
        Relationships: [];
      };
      "wo_work_order_items": {
        Row: {
          "id": string;
          "work_order_id": string;
          "tenant_id": string;
          "line_number": number;
          "product_sku_id": string | null;
          "item_description": string | null;
          "requested_quantity": number | null;
          "fulfilled_quantity": number | null;
          "uom": string | null;
          "from_warehouse_id": string | null;
          "from_bin_id": string | null;
          "to_warehouse_id": string | null;
          "to_bin_id": string | null;
          "batch_number": string | null;
          "expiry_date": string | null;
          "unit_cost": number | null;
          "metadata": Json | null;
          "created_at": string;
        };
        Insert: {
          "id"?: string;
          "work_order_id": string;
          "tenant_id": string;
          "line_number": number;
          "product_sku_id"?: string | null;
          "item_description"?: string | null;
          "requested_quantity"?: number | null;
          "fulfilled_quantity"?: number | null;
          "uom"?: string | null;
          "from_warehouse_id"?: string | null;
          "from_bin_id"?: string | null;
          "to_warehouse_id"?: string | null;
          "to_bin_id"?: string | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "unit_cost"?: number | null;
          "metadata"?: Json | null;
          "created_at"?: string;
        };
        Update: {
          "id"?: string;
          "work_order_id"?: string;
          "tenant_id"?: string;
          "line_number"?: number;
          "product_sku_id"?: string | null;
          "item_description"?: string | null;
          "requested_quantity"?: number | null;
          "fulfilled_quantity"?: number | null;
          "uom"?: string | null;
          "from_warehouse_id"?: string | null;
          "from_bin_id"?: string | null;
          "to_warehouse_id"?: string | null;
          "to_bin_id"?: string | null;
          "batch_number"?: string | null;
          "expiry_date"?: string | null;
          "unit_cost"?: number | null;
          "metadata"?: Json | null;
          "created_at"?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_order_items_work_order_id_fkey";
            columns: ["work_order_id"];
            isOneToOne: false;
            referencedRelation: "wo_work_orders";
            referencedColumns: ["id"];
          }
        ];
      };
      "wo_work_orders": {
        Row: {
          "id": string;
          "correlation_id": string;
          "tenant_id": string;
          "originating_org_id": string;
          "assigned_org_id": string | null;
          "wo_number": string;
          "wo_type": string;
          "priority": string | null;
          "status": string;
          "reference_type": string | null;
          "reference_id": string | null;
          "description": string | null;
          "notes": string | null;
          "requested_by": string | null;
          "approved_by": string | null;
          "approved_at": string | null;
          "target_date": string | null;
          "completed_at": string | null;
          "metadata": Json | null;
          "created_at": string;
          "updated_at": string;
          "updated_by": string | null;
        };
        Insert: {
          "id"?: string;
          "correlation_id"?: string;
          "tenant_id": string;
          "originating_org_id": string;
          "assigned_org_id"?: string | null;
          "wo_number": string;
          "wo_type": string;
          "priority"?: string | null;
          "status"?: string;
          "reference_type"?: string | null;
          "reference_id"?: string | null;
          "description"?: string | null;
          "notes"?: string | null;
          "requested_by"?: string | null;
          "approved_by"?: string | null;
          "approved_at"?: string | null;
          "target_date"?: string | null;
          "completed_at"?: string | null;
          "metadata"?: Json | null;
          "created_at"?: string;
          "updated_at"?: string;
          "updated_by"?: string | null;
        };
        Update: {
          "id"?: string;
          "correlation_id"?: string;
          "tenant_id"?: string;
          "originating_org_id"?: string;
          "assigned_org_id"?: string | null;
          "wo_number"?: string;
          "wo_type"?: string;
          "priority"?: string | null;
          "status"?: string;
          "reference_type"?: string | null;
          "reference_id"?: string | null;
          "description"?: string | null;
          "notes"?: string | null;
          "requested_by"?: string | null;
          "approved_by"?: string | null;
          "approved_at"?: string | null;
          "target_date"?: string | null;
          "completed_at"?: string | null;
          "metadata"?: Json | null;
          "created_at"?: string;
          "updated_at"?: string;
          "updated_by"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_org_id_fkey";
            columns: ["assigned_org_id"];
            isOneToOne: false;
            referencedRelation: "wo_organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_originating_org_id_fkey";
            columns: ["originating_org_id"];
            isOneToOne: false;
            referencedRelation: "wo_organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      "wo_workflow_instances": {
        Row: {
          "id": string;
          "tenant_id": string;
          "correlation_id": string;
          "workflow_name": string;
          "workflow_version": string;
          "trigger_entity_type": string | null;
          "trigger_entity_id": string | null;
          "status": string;
          "current_step": string | null;
          "steps_completed": number | null;
          "steps_total": number | null;
          "context": Json | null;
          "result": Json | null;
          "error_message": string | null;
          "started_at": string;
          "completed_at": string | null;
          "created_at": string;
          "updated_at": string;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "correlation_id": string;
          "workflow_name": string;
          "workflow_version": string;
          "trigger_entity_type"?: string | null;
          "trigger_entity_id"?: string | null;
          "status": string;
          "current_step"?: string | null;
          "steps_completed"?: number | null;
          "steps_total"?: number | null;
          "context"?: Json | null;
          "result"?: Json | null;
          "error_message"?: string | null;
          "started_at"?: string;
          "completed_at"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "correlation_id"?: string;
          "workflow_name"?: string;
          "workflow_version"?: string;
          "trigger_entity_type"?: string | null;
          "trigger_entity_id"?: string | null;
          "status"?: string;
          "current_step"?: string | null;
          "steps_completed"?: number | null;
          "steps_total"?: number | null;
          "context"?: Json | null;
          "result"?: Json | null;
          "error_message"?: string | null;
          "started_at"?: string;
          "completed_at"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
        };
        Relationships: [];
      };
      "work_orders": {
        Row: {
          "id": string;
          "tenant_id": string;
          "wo_number": string;
          "customer_id": string | null;
          "order_date": string | null;
          "execution_date": string | null;
          "execution_time": string | null;
          "status": string;
          "notes": string | null;
          "transporter_id": string | null;
          "created_at": string;
          "updated_at": string;
          "created_by": string | null;
          "physical_doc_received": boolean | null;
          "physical_doc_files": Json | null;
          "physical_doc_notes": string | null;
          "physical_doc_collected_at": string | null;
          "updated_by": string | null;
          "submitted_at": string | null;
          "assigned_at": string | null;
          "completed_at": string | null;
          "ready_billing_at": string | null;
          "invoiced_at": string | null;
          "paid_at": string | null;
          "assignment_documents": Json | null;
          "region_id": string | null;
        };
        Insert: {
          "id"?: string;
          "tenant_id": string;
          "wo_number": string;
          "customer_id"?: string | null;
          "order_date"?: string | null;
          "execution_date"?: string | null;
          "execution_time"?: string | null;
          "status"?: string;
          "notes"?: string | null;
          "transporter_id"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "physical_doc_received"?: boolean | null;
          "physical_doc_files"?: Json | null;
          "physical_doc_notes"?: string | null;
          "physical_doc_collected_at"?: string | null;
          "updated_by"?: string | null;
          "submitted_at"?: string | null;
          "assigned_at"?: string | null;
          "completed_at"?: string | null;
          "ready_billing_at"?: string | null;
          "invoiced_at"?: string | null;
          "paid_at"?: string | null;
          "assignment_documents"?: Json | null;
          "region_id"?: string | null;
        };
        Update: {
          "id"?: string;
          "tenant_id"?: string;
          "wo_number"?: string;
          "customer_id"?: string | null;
          "order_date"?: string | null;
          "execution_date"?: string | null;
          "execution_time"?: string | null;
          "status"?: string;
          "notes"?: string | null;
          "transporter_id"?: string | null;
          "created_at"?: string;
          "updated_at"?: string;
          "created_by"?: string | null;
          "physical_doc_received"?: boolean | null;
          "physical_doc_files"?: Json | null;
          "physical_doc_notes"?: string | null;
          "physical_doc_collected_at"?: string | null;
          "updated_by"?: string | null;
          "submitted_at"?: string | null;
          "assigned_at"?: string | null;
          "completed_at"?: string | null;
          "ready_billing_at"?: string | null;
          "invoiced_at"?: string | null;
          "paid_at"?: string | null;
          "assignment_documents"?: Json | null;
          "region_id"?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_work_orders_customer";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_work_orders_transporter";
            columns: ["transporter_id"];
            isOneToOne: false;
            referencedRelation: "md_entities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_orders_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "md_trucking_regions";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      "all_drivers": {
        Row: {
          "id": string | null;
          "name": string | null;
          "phone": string | null;
          "driver_type": string | null;
        };
        Relationships: [];
      };
      "customer_stock_summary": {
        Row: {
          "customer_id": string | null;
          "customer_name": string | null;
          "tenant_id": string | null;
          "warehouse_id": string | null;
          "warehouse_name": string | null;
          "product_id": string | null;
          "sku": string | null;
          "product_name": string | null;
          "quantity": number | null;
          "lot_number": string | null;
          "stock_status": string | null;
        };
        Relationships: [];
      };
      "v_gps_status_overview": {
        Row: {
          "tenant_id": string | null;
          "tenant_name": string | null;
          "active_jos": number | null;
          "gps_active": number | null;
          "gps_weak": number | null;
          "gps_stale": number | null;
          "gps_no_signal": number | null;
          "gps_health_pct": number | null;
        };
        Relationships: [];
      };
      "v_wh_customer_stock": {
        Row: {
          "tenant_id": string | null;
          "customer_id": string | null;
          "product_sku_id": string | null;
          "sku_code": string | null;
          "product_name": string | null;
          "warehouse_id": string | null;
          "warehouse_name": string | null;
          "area_type": string | null;
          "lot_number": string | null;
          "expiry_date": string | null;
          "status": string | null;
          "item_count": number | null;
          "total_quantity": number | null;
          "location_code": string | null;
        };
        Relationships: [];
      };
      "v_wh_utilization": {
        Row: {
          "warehouse_id": string | null;
          "warehouse_name": string | null;
          "area_id": string | null;
          "area_name": string | null;
          "area_type": string | null;
          "total_capacity": number | null;
          "uom_capacity": string | null;
          "occupied_units": number | null;
          "utilization_pct": number | null;
        };
        Relationships: [];
      };
      "vw_director_exceptions": {
        Row: {
          "id": string | null;
          "tenant_id": string | null;
          "cluster": string | null;
          "anomaly_type": string | null;
          "severity": string | null;
          "reference_id": string | null;
          "reference_number": string | null;
          "description": string | null;
          "detected_at": string | null;
        };
        Relationships: [];
      };
      "vw_location_capacity": {
        Row: {
          "location_id": string | null;
          "location_code": string | null;
          "warehouse_id": string | null;
          "tenant_id": string | null;
          "zone_id": string | null;
          "max_volume_m3": number | null;
          "max_weight_kg": number | null;
          "total_qty": number | null;
          "used_weight_kg": number | null;
          "used_volume_m3": number | null;
        };
        Relationships: [];
      };
      "vw_work_order_summary": {
        Row: {
          "id": string | null;
          "tenant_id": string | null;
          "wo_number": string | null;
          "order_date": string | null;
          "execution_date": string | null;
          "status": string | null;
          "total_items": number | null;
          "total_jo": number | null;
          "pending_jo": number | null;
          "assigned_jo": number | null;
          "started_jo": number | null;
          "completed_jo": number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      "_lt_q_regex": {
        Args: {

        };
        Returns: boolean;
      };
      "_lt_q_rregex": {
        Args: {

        };
        Returns: boolean;
      };
      "_ltq_extract_regex": {
        Args: {

        };
        Returns: unknown;
      };
      "_ltq_regex": {
        Args: {

        };
        Returns: boolean;
      };
      "_ltq_rregex": {
        Args: {

        };
        Returns: boolean;
      };
      "_ltree_compress": {
        Args: {

        };
        Returns: unknown;
      };
      "_ltree_consistent": {
        Args: {

        };
        Returns: boolean;
      };
      "_ltree_extract_isparent": {
        Args: {

        };
        Returns: unknown;
      };
      "_ltree_extract_risparent": {
        Args: {

        };
        Returns: unknown;
      };
      "_ltree_gist_options": {
        Args: {

        };
        Returns: undefined;
      };
      "_ltree_isparent": {
        Args: {

        };
        Returns: boolean;
      };
      "_ltree_penalty": {
        Args: {

        };
        Returns: unknown;
      };
      "_ltree_picksplit": {
        Args: {

        };
        Returns: unknown;
      };
      "_ltree_r_isparent": {
        Args: {

        };
        Returns: boolean;
      };
      "_ltree_r_risparent": {
        Args: {

        };
        Returns: boolean;
      };
      "_ltree_risparent": {
        Args: {

        };
        Returns: boolean;
      };
      "_ltree_same": {
        Args: {

        };
        Returns: unknown;
      };
      "_ltree_union": {
        Args: {

        };
        Returns: unknown;
      };
      "_ltxtq_exec": {
        Args: {

        };
        Returns: boolean;
      };
      "_ltxtq_extract_exec": {
        Args: {

        };
        Returns: unknown;
      };
      "_ltxtq_rexec": {
        Args: {

        };
        Returns: boolean;
      };
      "activate_repacking_order": {
        Args: {
          "p_order_id": string;
          "p_user_id": string;
        };
        Returns: string;
      };
      "add_tenant_staff": {
        Args: {
          "p_tenant_code": string;
          "p_email": string;
          "p_full_name": string;
          "p_role_code": string;
          "p_sbu_code": string;
          "p_whatsapp": string;
          "p_temp_password": string;
        };
        Returns: Json;
      };
      "array_to_halfvec": {
        Args: {

        };
        Returns: unknown;
      };
      "array_to_sparsevec": {
        Args: {

        };
        Returns: unknown;
      };
      "array_to_vector": {
        Args: {

        };
        Returns: unknown;
      };
      "backfill_driver_distances": {
        Args: {

        };
        Returns: { "jobs_processed": number | null; "total_km_added": number | null; "drivers_updated": number | null }[];
      };
      "binary_quantize": {
        Args: {

        };
        Returns: unknown;
      };
      "calc_gps_quality": {
        Args: {
          "p_driver_id": string;
        };
        Returns: { "quality_score": number | null; "avg_interval_sec": number | null; "coverage_pct": number | null; "last_gps_age_min": number | null; "total_pings": number | null; "gps_source": string | null }[];
      };
      "calc_tenant_gps_quality": {
        Args: {
          "p_tenant_id": string;
        };
        Returns: { "driver_id": string | null; "driver_name": string | null; "quality_score": number | null; "avg_interval_sec": number | null; "coverage_pct": number | null; "last_gps_age_min": number | null; "total_pings": number | null; "gps_source": string | null }[];
      };
      "calculate_sla_compliance": {
        Args: {
          "p_tenant_id": string;
          "p_days_back": number;
        };
        Returns: { "sla_stage": string | null; "total_count": number | null; "pass_count": number | null; "fail_count": number | null; "compliance_pct": number | null; "target_minutes": number | null }[];
      };
      "capture_sla_snapshot": {
        Args: {
          "p_tenant_id": string;
          "p_date": string;
        };
        Returns: undefined;
      };
      "check_wo_readiness": {
        Args: {
          "p_wo_id": string;
        };
        Returns: { "wo_id": string | null; "total_jo": number | null; "completed_jo": number | null; "doc_complete_jo": number | null; "cost_complete_jo": number | null; "all_ready": boolean | null; "missing_jo_details": string | null }[];
      };
      "complete_repacking_order": {
        Args: {
          "p_order_id": string;
          "p_user_id": string;
        };
        Returns: string;
      };
      "cosine_distance": {
        Args: {

        };
        Returns: number;
      };
      "create_customer_v2": {
        Args: {
          "p_tenant_id": string;
          "p_auth_user_id": string;
          "p_customer_code": string;
          "p_name": string;
          "p_email": string;
          "p_phone": string;
          "p_address": string;
          "p_billing_address": string;
          "p_city": string;
          "p_pic_name": string;
          "p_created_by": string;
        };
        Returns: Json;
      };
      "create_driver": {
        Args: {
          "p_tenant_id": string;
          "p_entity_id": string;
          "p_name": string;
          "p_whatsapp": string;
          "p_pin": string;
          "p_address": string;
          "p_sim_number": string;
          "p_sim_class": string;
          "p_sim_expiry": string;
          "p_status": string;
          "p_is_active": boolean;
          "p_driver_code": string;
        };
        Returns: Json;
      };
      "create_stock_opname": {
        Args: {
          "p_tenant_id": string;
          "p_warehouse_id": string;
          "p_opname_type": string;
          "p_schedule_date": string;
          "p_user_id": string;
          "p_notes": string;
          "p_location_id": string;
        };
        Returns: string;
      };
      "create_transfer_from_hq_wo": {
        Args: {
          "p_tenant_id": string;
          "p_wo_id": string;
          "p_wo_number": string;
          "p_from_warehouse_id": string;
          "p_to_warehouse_id": string;
          "p_items": Json;
          "p_notes": string;
          "p_user_id": string;
          "p_sbu_type": string;
          "p_deal_price": number;
        };
        Returns: string;
      };
      "create_warehouse_transfer": {
        Args: {
          "p_tenant_id": string;
          "p_from_warehouse_id": string;
          "p_to_warehouse_id": string;
          "p_items": Json;
          "p_notes": string;
          "p_user_id": string;
        };
        Returns: string;
      };
      "current_tenant_id": {
        Args: {

        };
        Returns: string;
      };
      "deactivate_driver": {
        Args: {
          "p_driver_id": string;
          "p_tenant_id": string;
        };
        Returns: Json;
      };
      "detect_stale_gps": {
        Args: {
          "p_tenant_id": string;
        };
        Returns: { "driver_id": string | null; "driver_name": string | null; "driver_phone": string | null; "jo_id": string | null; "jo_number": string | null; "jo_status": string | null; "last_gps_time": string | null; "stale_minutes": number | null; "last_lat": number | null; "last_lng": number | null; "gps_source": string | null; "alert_level": string | null }[];
      };
      "exec_raw_query": {
        Args: {
          "sql_query": string;
        };
        Returns: Json;
      };
      "exec_sql_manual": {
        Args: {
          "sql_query": string;
        };
        Returns: Json;
      };
      "execute_internal_movement": {
        Args: {
          "p_movement_id": string;
        };
        Returns: string;
      };
      "execute_repacking_order": {
        Args: {
          "p_order_id": string;
          "p_user_id": string;
        };
        Returns: string;
      };
      "finalize_stock_opname": {
        Args: {
          "p_opname_id": string;
          "p_user_id": string;
        };
        Returns: undefined;
      };
      "fn_convert_quotation_to_contract": {
        Args: {
          "p_quotation_id": string;
          "p_contract_number": string;
          "p_start_date": string;
          "p_end_date": string;
        };
        Returns: Json;
      };
      "fn_create_default_groups": {
        Args: {
          "tenant_uuid": string;
        };
        Returns: undefined;
      };
      "fn_get_user_tenant_id": {
        Args: {

        };
        Returns: string;
      };
      "fn_wh_calculate_storage_charge": {
        Args: {
          "p_contract_id": string;
          "p_period_start": string;
          "p_period_end": string;
        };
        Returns: number;
      };
      "fn_wh_fefo_pick": {
        Args: {
          "p_sku_id": string;
          "p_quantity": number;
        };
        Returns: { "inventory_id": string | null; "lot_number": string | null; "expiry_date": string | null; "location_id": string | null; "available_qty": number | null }[];
      };
      "get_active_customers_in_warehouse": {
        Args: {
          "p_warehouse_id": string;
        };
        Returns: { "id": string | null; "name": string | null }[];
      };
      "get_active_products_in_warehouse": {
        Args: {
          "p_warehouse_id": string;
          "p_customer_id": string;
        };
        Returns: { "id": string | null; "name": string | null; "sku_code": string | null }[];
      };
      "get_active_sla_breaches": {
        Args: {
          "p_tenant_id": string;
        };
        Returns: { "breach_id": string | null; "breach_type": string | null; "stage": string | null; "wo_number": string | null; "jo_number": string | null; "overdue_minutes": number | null; "customer_name": string | null; "vendor_name": string | null; "details": string | null; "severity": string | null; "created_at": string | null }[];
      };
      "get_all_tenants": {
        Args: {

        };
        Returns: { "tenant_code": string | null; "tenant_name": string | null; "admin_email": string | null; "admin_name": string | null; "subscription_tier": string | null; "token_balance": number | null; "created_at": string | null }[];
      };
      "get_all_warehouses_for_test": {
        Args: {

        };
        Returns: warehouses_Row[];
      };
      "get_auth_tenant_id": {
        Args: {

        };
        Returns: string;
      };
      "get_driver_performance_summary": {
        Args: {
          "p_driver_id": string;
        };
        Returns: { "driver_id": string | null; "driver_name": string | null; "total_jobs": number | null; "total_km": number | null; "avg_review": number | null; "total_reviews": number | null; "last_job_date": string | null; "last_review_score": number | null }[];
      };
      "get_hs_breadcrumb": {
        Args: {
          "target_code": string;
        };
        Returns: hs_codes_Row[];
      };
      "get_hs_children": {
        Args: {
          "p_code": string;
        };
        Returns: hs_codes_Row[];
      };
      "get_my_tenant_id": {
        Args: {

        };
        Returns: string;
      };
      "get_pending_reset_requests": {
        Args: {

        };
        Returns: { "id": string | null; "tenant_code": string | null; "tenant_name": string | null; "admin_email": string | null; "requested_at": string | null; "user_id": string | null }[];
      };
      "get_rls_status_report": {
        Args: {

        };
        Returns: Json;
      };
      "get_sla_breach_summary": {
        Args: {
          "p_tenant_id": string;
        };
        Returns: { "stage": string | null; "total_breaches": number | null; "avg_overdue_minutes": number | null; "worst_overdue_minutes": number | null; "unresolved_count": number | null }[];
      };
      "grant_tokens_to_tenant": {
        Args: {
          "p_tenant_code": string;
          "p_token_amount": number;
        };
        Returns: Json;
      };
      "halfvec": {
        Args: {

        };
        Returns: unknown;
      };
      "halfvec_accum": {
        Args: {

        };
        Returns: number[];
      };
      "halfvec_add": {
        Args: {

        };
        Returns: unknown;
      };
      "halfvec_avg": {
        Args: {

        };
        Returns: unknown;
      };
      "halfvec_cmp": {
        Args: {

        };
        Returns: number;
      };
      "halfvec_combine": {
        Args: {

        };
        Returns: number[];
      };
      "halfvec_concat": {
        Args: {

        };
        Returns: unknown;
      };
      "halfvec_eq": {
        Args: {

        };
        Returns: boolean;
      };
      "halfvec_ge": {
        Args: {

        };
        Returns: boolean;
      };
      "halfvec_gt": {
        Args: {

        };
        Returns: boolean;
      };
      "halfvec_in": {
        Args: {

        };
        Returns: unknown;
      };
      "halfvec_l2_squared_distance": {
        Args: {

        };
        Returns: number;
      };
      "halfvec_le": {
        Args: {

        };
        Returns: boolean;
      };
      "halfvec_lt": {
        Args: {

        };
        Returns: boolean;
      };
      "halfvec_mul": {
        Args: {

        };
        Returns: unknown;
      };
      "halfvec_ne": {
        Args: {

        };
        Returns: boolean;
      };
      "halfvec_negative_inner_product": {
        Args: {

        };
        Returns: number;
      };
      "halfvec_out": {
        Args: {

        };
        Returns: unknown;
      };
      "halfvec_recv": {
        Args: {

        };
        Returns: unknown;
      };
      "halfvec_send": {
        Args: {

        };
        Returns: string;
      };
      "halfvec_spherical_distance": {
        Args: {

        };
        Returns: number;
      };
      "halfvec_sub": {
        Args: {

        };
        Returns: unknown;
      };
      "halfvec_to_float4": {
        Args: {

        };
        Returns: number[];
      };
      "halfvec_to_sparsevec": {
        Args: {

        };
        Returns: unknown;
      };
      "halfvec_to_vector": {
        Args: {

        };
        Returns: unknown;
      };
      "halfvec_typmod_in": {
        Args: {

        };
        Returns: number;
      };
      "hamming_distance": {
        Args: {

        };
        Returns: number;
      };
      "has_tenant_access": {
        Args: {
          "p_tenant_id": string;
        };
        Returns: boolean;
      };
      "hash_ltree": {
        Args: {

        };
        Returns: number;
      };
      "hash_ltree_extended": {
        Args: {

        };
        Returns: number;
      };
      "hnsw_bit_support": {
        Args: {

        };
        Returns: unknown;
      };
      "hnsw_halfvec_support": {
        Args: {

        };
        Returns: unknown;
      };
      "hnsw_sparsevec_support": {
        Args: {

        };
        Returns: unknown;
      };
      "hnswhandler": {
        Args: {

        };
        Returns: unknown;
      };
      "increment_hs_pattern": {
        Args: {
          "p_keyword": string;
          "p_hs": string;
        };
        Returns: undefined;
      };
      "index": {
        Args: {

        };
        Returns: number;
      };
      "inner_product": {
        Args: {

        };
        Returns: number;
      };
      "insert_new_customer": {
        Args: {
          "t_id": string;
          "a_id": string;
          "c_code": string;
          "c_name": string;
          "c_email": string;
          "c_phone": string;
          "c_address": string;
          "c_billing": string;
          "c_city": string;
          "c_pic": string;
          "c_by": string;
        };
        Returns: Json;
      };
      "insert_transporter": {
        Args: {
          "p_entity_code": string;
          "p_name": string;
          "p_phone": string;
          "p_email": string;
          "p_billing_address": string;
          "p_billing_method": string;
          "p_tenant_id": string;
        };
        Returns: string;
      };
      "is_auth_superadmin": {
        Args: {

        };
        Returns: boolean;
      };
      "is_driver_ready_for_assignment": {
        Args: {
          "p_driver_id": string;
        };
        Returns: { "ready": boolean | null; "reason": string | null; "has_attendance_today": boolean | null; "has_inspection_today": boolean | null; "fleet_inspection_status": string | null }[];
      };
      "is_superadmin": {
        Args: {

        };
        Returns: boolean;
      };
      "is_tenant_superadmin": {
        Args: {

        };
        Returns: boolean;
      };
      "ivfflat_bit_support": {
        Args: {

        };
        Returns: unknown;
      };
      "ivfflat_halfvec_support": {
        Args: {

        };
        Returns: unknown;
      };
      "ivfflathandler": {
        Args: {

        };
        Returns: unknown;
      };
      "jaccard_distance": {
        Args: {

        };
        Returns: number;
      };
      "l1_distance": {
        Args: {

        };
        Returns: number;
      };
      "l2_distance": {
        Args: {

        };
        Returns: number;
      };
      "l2_norm": {
        Args: {

        };
        Returns: number;
      };
      "l2_normalize": {
        Args: {

        };
        Returns: unknown;
      };
      "lca": {
        Args: {

        };
        Returns: unknown;
      };
      "lquery_in": {
        Args: {

        };
        Returns: unknown;
      };
      "lquery_out": {
        Args: {

        };
        Returns: unknown;
      };
      "lquery_recv": {
        Args: {

        };
        Returns: unknown;
      };
      "lquery_send": {
        Args: {

        };
        Returns: string;
      };
      "lt_q_regex": {
        Args: {

        };
        Returns: boolean;
      };
      "lt_q_rregex": {
        Args: {

        };
        Returns: boolean;
      };
      "ltq_regex": {
        Args: {

        };
        Returns: boolean;
      };
      "ltq_rregex": {
        Args: {

        };
        Returns: boolean;
      };
      "ltree2text": {
        Args: {

        };
        Returns: string;
      };
      "ltree_addltree": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_addtext": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_cmp": {
        Args: {

        };
        Returns: number;
      };
      "ltree_compress": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_consistent": {
        Args: {

        };
        Returns: boolean;
      };
      "ltree_decompress": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_eq": {
        Args: {

        };
        Returns: boolean;
      };
      "ltree_ge": {
        Args: {

        };
        Returns: boolean;
      };
      "ltree_gist_in": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_gist_options": {
        Args: {

        };
        Returns: undefined;
      };
      "ltree_gist_out": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_gt": {
        Args: {

        };
        Returns: boolean;
      };
      "ltree_in": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_isparent": {
        Args: {

        };
        Returns: boolean;
      };
      "ltree_le": {
        Args: {

        };
        Returns: boolean;
      };
      "ltree_lt": {
        Args: {

        };
        Returns: boolean;
      };
      "ltree_ne": {
        Args: {

        };
        Returns: boolean;
      };
      "ltree_out": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_penalty": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_picksplit": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_recv": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_risparent": {
        Args: {

        };
        Returns: boolean;
      };
      "ltree_same": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_send": {
        Args: {

        };
        Returns: string;
      };
      "ltree_textadd": {
        Args: {

        };
        Returns: unknown;
      };
      "ltree_union": {
        Args: {

        };
        Returns: unknown;
      };
      "ltreeparentsel": {
        Args: {

        };
        Returns: number;
      };
      "ltxtq_exec": {
        Args: {

        };
        Returns: boolean;
      };
      "ltxtq_in": {
        Args: {

        };
        Returns: unknown;
      };
      "ltxtq_out": {
        Args: {

        };
        Returns: unknown;
      };
      "ltxtq_recv": {
        Args: {

        };
        Returns: unknown;
      };
      "ltxtq_rexec": {
        Args: {

        };
        Returns: boolean;
      };
      "ltxtq_send": {
        Args: {

        };
        Returns: string;
      };
      "manual_reset_password": {
        Args: {
          "p_request_id": string;
          "p_new_password": string;
        };
        Returns: Json;
      };
      "manual_topup_tokens": {
        Args: {
          "p_tenant_code": string;
          "p_amount_received": number;
          "p_note": string;
        };
        Returns: Json;
      };
      "match_hs_embeddings": {
        Args: {
          "query_embedding": unknown;
          "match_threshold": number;
          "match_count": number;
        };
        Returns: { "hs_code": string | null; "description": string | null; "similarity": number | null }[];
      };
      "merge_driver_profile": {
        Args: {
          "p_source_profile_id": string;
          "p_target_profile_id": string;
        };
        Returns: Json;
      };
      "nlevel": {
        Args: {

        };
        Returns: number;
      };
      "normalize_phone": {
        Args: {
          "p_phone": string;
        };
        Returns: string;
      };
      "ops_reject_reassign_jo": {
        Args: {
          "p_jo_id": string;
          "p_rejection_reason": string;
          "p_new_transporter_id": string;
          "p_new_fleet_id": string;
          "p_new_driver_id": string;
          "p_rejection_note": string;
        };
        Returns: Json;
      };
      "penalize_hs_pattern": {
        Args: {
          "p_keyword": string;
        };
        Returns: undefined;
      };
      "process_internal_movement": {
        Args: {
          "p_tenant_id": string;
          "p_warehouse_id": string;
          "p_product_sku_id": string;
          "p_from_location_id": string;
          "p_to_location_id": string;
          "p_quantity": number;
          "p_notes": string;
          "p_user_id": string;
          "p_reference_type": string;
          "p_reference_id": string;
        };
        Returns: string;
      };
      "record_global_hs_pattern": {
        Args: {
          "p_wco": string;
          "p_country": string;
          "p_local": string;
        };
        Returns: undefined;
      };
      "register_tenant": {
        Args: {
          "p_tenant_name": string;
          "p_tenant_code": string;
          "p_admin_email": string;
          "p_admin_full_name": string;
          "p_subscription_tier": string;
        };
        Returns: Json;
      };
      "register_tenant_test": {
        Args: {
          "p_tenant_name": string;
          "p_tenant_code": string;
          "p_admin_email": string;
          "p_admin_full_name": string;
          "p_subscription_tier": string;
        };
        Returns: Json;
      };
      "request_password_reset": {
        Args: {
          "p_email": string;
        };
        Returns: Json;
      };
      "request_password_reset_v2": {
        Args: {
          "p_email": string;
        };
        Returns: Json;
      };
      "resolve_driver_collision": {
        Args: {
          "p_driver_id": string;
          "p_tenant_id": string;
          "p_action": string;
          "p_reason": string;
          "p_conflicting_driver_id": string;
          "p_new_phone": string;
        };
        Returns: Json;
      };
      "rpc_guest_get_messages": {
        Args: {
          "p_token": string;
        };
        Returns: chat_messages_Row[];
      };
      "rpc_guest_send_message": {
        Args: {
          "p_token": string;
          "p_message": string;
        };
        Returns: Json;
      };
      "search_hs_code": {
        Args: {
          "query_text": string;
        };
        Returns: hs_codes_Row[];
      };
      "sparsevec": {
        Args: {

        };
        Returns: unknown;
      };
      "sparsevec_cmp": {
        Args: {

        };
        Returns: number;
      };
      "sparsevec_eq": {
        Args: {

        };
        Returns: boolean;
      };
      "sparsevec_ge": {
        Args: {

        };
        Returns: boolean;
      };
      "sparsevec_gt": {
        Args: {

        };
        Returns: boolean;
      };
      "sparsevec_in": {
        Args: {

        };
        Returns: unknown;
      };
      "sparsevec_l2_squared_distance": {
        Args: {

        };
        Returns: number;
      };
      "sparsevec_le": {
        Args: {

        };
        Returns: boolean;
      };
      "sparsevec_lt": {
        Args: {

        };
        Returns: boolean;
      };
      "sparsevec_ne": {
        Args: {

        };
        Returns: boolean;
      };
      "sparsevec_negative_inner_product": {
        Args: {

        };
        Returns: number;
      };
      "sparsevec_out": {
        Args: {

        };
        Returns: unknown;
      };
      "sparsevec_recv": {
        Args: {

        };
        Returns: unknown;
      };
      "sparsevec_send": {
        Args: {

        };
        Returns: string;
      };
      "sparsevec_to_halfvec": {
        Args: {

        };
        Returns: unknown;
      };
      "sparsevec_to_vector": {
        Args: {

        };
        Returns: unknown;
      };
      "sparsevec_typmod_in": {
        Args: {

        };
        Returns: number;
      };
      "subltree": {
        Args: {

        };
        Returns: unknown;
      };
      "subpath": {
        Args: {

        };
        Returns: unknown;
      };
      "subvector": {
        Args: {

        };
        Returns: unknown;
      };
      "sync_stuck_statuses": {
        Args: {

        };
        Returns: { "drivers_reset": number | null; "fleets_reset": number | null; "details": Json | null }[];
      };
      "text2ltree": {
        Args: {

        };
        Returns: unknown;
      };
      "traverse_hs_graph": {
        Args: {
          "start_node_name": string;
          "max_depth": number;
        };
        Returns: { "path": string[] | null; "target_node_name": string | null; "target_hs_code": string | null; "total_weight": number | null; "depth": number | null }[];
      };
      "update_agent_weights": {
        Args: {
          "p_ai": number;
          "p_vector": number;
          "p_btki": number;
          "p_graph": number;
        };
        Returns: undefined;
      };
      "update_driver": {
        Args: {
          "p_driver_id": string;
          "p_tenant_id": string;
          "p_name": string;
          "p_whatsapp": string;
          "p_is_active": boolean;
          "p_address": string;
          "p_sim_number": string;
          "p_sim_class": string;
          "p_sim_expiry": string;
          "p_status": string;
          "p_entity_id": string;
        };
        Returns: Json;
      };
      "vector": {
        Args: {

        };
        Returns: unknown;
      };
      "vector_accum": {
        Args: {

        };
        Returns: number[];
      };
      "vector_add": {
        Args: {

        };
        Returns: unknown;
      };
      "vector_avg": {
        Args: {

        };
        Returns: unknown;
      };
      "vector_cmp": {
        Args: {

        };
        Returns: number;
      };
      "vector_combine": {
        Args: {

        };
        Returns: number[];
      };
      "vector_concat": {
        Args: {

        };
        Returns: unknown;
      };
      "vector_dims": {
        Args: {

        };
        Returns: number;
      };
      "vector_eq": {
        Args: {

        };
        Returns: boolean;
      };
      "vector_ge": {
        Args: {

        };
        Returns: boolean;
      };
      "vector_gt": {
        Args: {

        };
        Returns: boolean;
      };
      "vector_in": {
        Args: {

        };
        Returns: unknown;
      };
      "vector_l2_squared_distance": {
        Args: {

        };
        Returns: number;
      };
      "vector_le": {
        Args: {

        };
        Returns: boolean;
      };
      "vector_lt": {
        Args: {

        };
        Returns: boolean;
      };
      "vector_mul": {
        Args: {

        };
        Returns: unknown;
      };
      "vector_ne": {
        Args: {

        };
        Returns: boolean;
      };
      "vector_negative_inner_product": {
        Args: {

        };
        Returns: number;
      };
      "vector_norm": {
        Args: {

        };
        Returns: number;
      };
      "vector_out": {
        Args: {

        };
        Returns: unknown;
      };
      "vector_recv": {
        Args: {

        };
        Returns: unknown;
      };
      "vector_send": {
        Args: {

        };
        Returns: string;
      };
      "vector_spherical_distance": {
        Args: {

        };
        Returns: number;
      };
      "vector_sub": {
        Args: {

        };
        Returns: unknown;
      };
      "vector_to_float4": {
        Args: {

        };
        Returns: number[];
      };
      "vector_to_halfvec": {
        Args: {

        };
        Returns: unknown;
      };
      "vector_to_sparsevec": {
        Args: {

        };
        Returns: unknown;
      };
      "vector_typmod_in": {
        Args: {

        };
        Returns: number;
      };
      "vendor_job_confirmation": {
        Args: {
          "p_jo_id": string;
          "p_is_accepted": boolean;
          "p_is_timeout": boolean;
          "p_rejection_reason": string;
          "p_lat": number;
          "p_lng": number;
        };
        Returns: Json;
      };
    };
    Enums: {
      "crm_activity_type": "CALL" | "MEETING" | "WHATSAPP" | "EMAIL" | "NOTE";
      "crm_deal_stage": "PROSPECTING" | "NEGOTIATION" | "QUOTATION" | "WON" | "LOST";
      "crm_fee_type": "NOMINAL" | "PERCENTAGE";
      "crm_lead_status": "NEW" | "CONTACTED" | "QUALIFIED" | "UNQUALIFIED";
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export type _wo_renumber_temp_Row = Database["public"]["Tables"]["_wo_renumber_temp"]["Row"];
export type add_costs_Row = Database["public"]["Tables"]["add_costs"]["Row"];
export type addresses_Row = Database["public"]["Tables"]["addresses"]["Row"];
export type all_drivers_Row = Database["public"]["Views"]["all_drivers"]["Row"];
export type armada_Row = Database["public"]["Tables"]["armada"]["Row"];
export type attribute_types_Row = Database["public"]["Tables"]["attribute_types"]["Row"];
export type backup_customers_Row = Database["public"]["Tables"]["backup_customers"]["Row"];
export type backup_inventory_Row = Database["public"]["Tables"]["backup_inventory"]["Row"];
export type backup_products_Row = Database["public"]["Tables"]["backup_products"]["Row"];
export type btki_codes_Row = Database["public"]["Tables"]["btki_codes"]["Row"];
export type cash_advances_Row = Database["public"]["Tables"]["cash_advances"]["Row"];
export type chat_attachments_Row = Database["public"]["Tables"]["chat_attachments"]["Row"];
export type chat_channels_Row = Database["public"]["Tables"]["chat_channels"]["Row"];
export type chat_group_members_Row = Database["public"]["Tables"]["chat_group_members"]["Row"];
export type chat_groups_Row = Database["public"]["Tables"]["chat_groups"]["Row"];
export type chat_messages_Row = Database["public"]["Tables"]["chat_messages"]["Row"];
export type chat_participants_Row = Database["public"]["Tables"]["chat_participants"]["Row"];
export type companies_Row = Database["public"]["Tables"]["companies"]["Row"];
export type country_master_Row = Database["public"]["Tables"]["country_master"]["Row"];
export type crm_activities_Row = Database["public"]["Tables"]["crm_activities"]["Row"];
export type crm_deals_Row = Database["public"]["Tables"]["crm_deals"]["Row"];
export type crm_guest_links_Row = Database["public"]["Tables"]["crm_guest_links"]["Row"];
export type crm_quotation_items_Row = Database["public"]["Tables"]["crm_quotation_items"]["Row"];
export type crm_quotation_sections_Row = Database["public"]["Tables"]["crm_quotation_sections"]["Row"];
export type crm_quotations_Row = Database["public"]["Tables"]["crm_quotations"]["Row"];
export type crm_sbu_customer_rates_Row = Database["public"]["Tables"]["crm_sbu_customer_rates"]["Row"];
export type customer_requests_Row = Database["public"]["Tables"]["customer_requests"]["Row"];
export type customer_stock_summary_Row = Database["public"]["Views"]["customer_stock_summary"]["Row"];
export type customers_Row = Database["public"]["Tables"]["customers"]["Row"];
export type debug_traces_Row = Database["public"]["Tables"]["debug_traces"]["Row"];
export type documents_Row = Database["public"]["Tables"]["documents"]["Row"];
export type driver_attendance_Row = Database["public"]["Tables"]["driver_attendance"]["Row"];
export type driver_kpi_history_Row = Database["public"]["Tables"]["driver_kpi_history"]["Row"];
export type driver_performance_logs_Row = Database["public"]["Tables"]["driver_performance_logs"]["Row"];
export type driver_profiles_Row = Database["public"]["Tables"]["driver_profiles"]["Row"];
export type driver_requests_Row = Database["public"]["Tables"]["driver_requests"]["Row"];
export type driver_resolution_audit_logs_Row = Database["public"]["Tables"]["driver_resolution_audit_logs"]["Row"];
export type driver_tenant_links_Row = Database["public"]["Tables"]["driver_tenant_links"]["Row"];
export type drivers_Row = Database["public"]["Tables"]["drivers"]["Row"];
export type extra_costs_Row = Database["public"]["Tables"]["extra_costs"]["Row"];
export type finance_coa_Row = Database["public"]["Tables"]["finance_coa"]["Row"];
export type finance_journal_entries_Row = Database["public"]["Tables"]["finance_journal_entries"]["Row"];
export type finance_journals_Row = Database["public"]["Tables"]["finance_journals"]["Row"];
export type finance_transactions_Row = Database["public"]["Tables"]["finance_transactions"]["Row"];
export type fleet_driver_history_Row = Database["public"]["Tables"]["fleet_driver_history"]["Row"];
export type fleet_gps_status_Row = Database["public"]["Tables"]["fleet_gps_status"]["Row"];
export type fleet_inspections_Row = Database["public"]["Tables"]["fleet_inspections"]["Row"];
export type fleets_Row = Database["public"]["Tables"]["fleets"]["Row"];
export type fw_consolidation_manifest_Row = Database["public"]["Tables"]["fw_consolidation_manifest"]["Row"];
export type fw_consolidations_Row = Database["public"]["Tables"]["fw_consolidations"]["Row"];
export type fw_container_assignments_Row = Database["public"]["Tables"]["fw_container_assignments"]["Row"];
export type fw_container_items_Row = Database["public"]["Tables"]["fw_container_items"]["Row"];
export type fw_hs_codes_Row = Database["public"]["Tables"]["fw_hs_codes"]["Row"];
export type fw_price_master_Row = Database["public"]["Tables"]["fw_price_master"]["Row"];
export type general_ledger_Row = Database["public"]["Tables"]["general_ledger"]["Row"];
export type geofence_events_Row = Database["public"]["Tables"]["geofence_events"]["Row"];
export type geofence_zones_Row = Database["public"]["Tables"]["geofence_zones"]["Row"];
export type gps_provider_configs_Row = Database["public"]["Tables"]["gps_provider_configs"]["Row"];
export type ground_assignment_pics_Row = Database["public"]["Tables"]["ground_assignment_pics"]["Row"];
export type ground_documents_Row = Database["public"]["Tables"]["ground_documents"]["Row"];
export type ground_event_types_Row = Database["public"]["Tables"]["ground_event_types"]["Row"];
export type ground_events_Row = Database["public"]["Tables"]["ground_events"]["Row"];
export type ground_sites_Row = Database["public"]["Tables"]["ground_sites"]["Row"];
export type ground_staff_profiles_Row = Database["public"]["Tables"]["ground_staff_profiles"]["Row"];
export type hs_agent_config_Row = Database["public"]["Tables"]["hs_agent_config"]["Row"];
export type hs_agent_memory_Row = Database["public"]["Tables"]["hs_agent_memory"]["Row"];
export type hs_codes_Row = Database["public"]["Tables"]["hs_codes"]["Row"];
export type hs_codes_temp_Row = Database["public"]["Tables"]["hs_codes_temp"]["Row"];
export type hs_country_registry_Row = Database["public"]["Tables"]["hs_country_registry"]["Row"];
export type hs_edges_Row = Database["public"]["Tables"]["hs_edges"]["Row"];
export type hs_embeddings_Row = Database["public"]["Tables"]["hs_embeddings"]["Row"];
export type hs_feedback_Row = Database["public"]["Tables"]["hs_feedback"]["Row"];
export type hs_global_patterns_Row = Database["public"]["Tables"]["hs_global_patterns"]["Row"];
export type hs_job_tracking_Row = Database["public"]["Tables"]["hs_job_tracking"]["Row"];
export type hs_nodes_Row = Database["public"]["Tables"]["hs_nodes"]["Row"];
export type hs_pattern_memory_Row = Database["public"]["Tables"]["hs_pattern_memory"]["Row"];
export type hs_requests_log_Row = Database["public"]["Tables"]["hs_requests_log"]["Row"];
export type hs_search_requests_Row = Database["public"]["Tables"]["hs_search_requests"]["Row"];
export type hs_tariff_rates_Row = Database["public"]["Tables"]["hs_tariff_rates"]["Row"];
export type inbound_damages_Row = Database["public"]["Tables"]["inbound_damages"]["Row"];
export type inbound_details_Row = Database["public"]["Tables"]["inbound_details"]["Row"];
export type inbound_headers_Row = Database["public"]["Tables"]["inbound_headers"]["Row"];
export type inbound_putaway_Row = Database["public"]["Tables"]["inbound_putaway"]["Row"];
export type intr_endpoint_cache_Row = Database["public"]["Tables"]["intr_endpoint_cache"]["Row"];
export type intr_rules_Row = Database["public"]["Tables"]["intr_rules"]["Row"];
export type intr_test_log_Row = Database["public"]["Tables"]["intr_test_log"]["Row"];
export type inventory_Row = Database["public"]["Tables"]["inventory"]["Row"];
export type inventory_movement_history_Row = Database["public"]["Tables"]["inventory_movement_history"]["Row"];
export type inventory_movements_Row = Database["public"]["Tables"]["inventory_movements"]["Row"];
export type invoice_line_items_Row = Database["public"]["Tables"]["invoice_line_items"]["Row"];
export type invoice_lines_Row = Database["public"]["Tables"]["invoice_lines"]["Row"];
export type invoices_Row = Database["public"]["Tables"]["invoices"]["Row"];
export type jo_warehouse_assignments_Row = Database["public"]["Tables"]["jo_warehouse_assignments"]["Row"];
export type job_order_payments_Row = Database["public"]["Tables"]["job_order_payments"]["Row"];
export type job_orders_Row = Database["public"]["Tables"]["job_orders"]["Row"];
export type job_routes_Row = Database["public"]["Tables"]["job_routes"]["Row"];
export type job_status_history_Row = Database["public"]["Tables"]["job_status_history"]["Row"];
export type job_tracking_Row = Database["public"]["Tables"]["job_tracking"]["Row"];
export type locations_Row = Database["public"]["Tables"]["locations"]["Row"];
export type master_contacts_Row = Database["public"]["Tables"]["master_contacts"]["Row"];
export type md_bill_of_materials_Row = Database["public"]["Tables"]["md_bill_of_materials"]["Row"];
export type md_billing_rates_Row = Database["public"]["Tables"]["md_billing_rates"]["Row"];
export type md_bom_items_Row = Database["public"]["Tables"]["md_bom_items"]["Row"];
export type md_contacts_Row = Database["public"]["Tables"]["md_contacts"]["Row"];
export type md_contract_warehouses_Row = Database["public"]["Tables"]["md_contract_warehouses"]["Row"];
export type md_customer_users_Row = Database["public"]["Tables"]["md_customer_users"]["Row"];
export type md_driver_allowances_Row = Database["public"]["Tables"]["md_driver_allowances"]["Row"];
export type md_drivers_Row = Database["public"]["Tables"]["md_drivers"]["Row"];
export type md_entities_Row = Database["public"]["Tables"]["md_entities"]["Row"];
export type md_entity_addresses_Row = Database["public"]["Tables"]["md_entity_addresses"]["Row"];
export type md_fleet_master_Row = Database["public"]["Tables"]["md_fleet_master"]["Row"];
export type md_fleet_types_Row = Database["public"]["Tables"]["md_fleet_types"]["Row"];
export type md_fleets_Row = Database["public"]["Tables"]["md_fleets"]["Row"];
export type md_locations_Row = Database["public"]["Tables"]["md_locations"]["Row"];
export type md_product_categories_Row = Database["public"]["Tables"]["md_product_categories"]["Row"];
export type md_product_skus_Row = Database["public"]["Tables"]["md_product_skus"]["Row"];
export type md_services_Row = Database["public"]["Tables"]["md_services"]["Row"];
export type md_storage_contracts_Row = Database["public"]["Tables"]["md_storage_contracts"]["Row"];
export type md_taxes_Row = Database["public"]["Tables"]["md_taxes"]["Row"];
export type md_transporter_drivers_Row = Database["public"]["Tables"]["md_transporter_drivers"]["Row"];
export type md_transporter_fleets_Row = Database["public"]["Tables"]["md_transporter_fleets"]["Row"];
export type md_transporters_Row = Database["public"]["Tables"]["md_transporters"]["Row"];
export type md_trucking_regions_Row = Database["public"]["Tables"]["md_trucking_regions"]["Row"];
export type md_uoms_Row = Database["public"]["Tables"]["md_uoms"]["Row"];
export type md_vehicle_types_Row = Database["public"]["Tables"]["md_vehicle_types"]["Row"];
export type md_warehouse_areas_Row = Database["public"]["Tables"]["md_warehouse_areas"]["Row"];
export type md_warehouse_locations_Row = Database["public"]["Tables"]["md_warehouse_locations"]["Row"];
export type md_warehouse_staff_Row = Database["public"]["Tables"]["md_warehouse_staff"]["Row"];
export type md_warehouse_zones_Row = Database["public"]["Tables"]["md_warehouse_zones"]["Row"];
export type md_warehouses_Row = Database["public"]["Tables"]["md_warehouses"]["Row"];
export type monitoring_checks_Row = Database["public"]["Tables"]["monitoring_checks"]["Row"];
export type notifications_Row = Database["public"]["Tables"]["notifications"]["Row"];
export type product_batches_Row = Database["public"]["Tables"]["product_batches"]["Row"];
export type product_brands_Row = Database["public"]["Tables"]["product_brands"]["Row"];
export type product_categories_Row = Database["public"]["Tables"]["product_categories"]["Row"];
export type product_custom_attributes_Row = Database["public"]["Tables"]["product_custom_attributes"]["Row"];
export type product_uom_conversions_Row = Database["public"]["Tables"]["product_uom_conversions"]["Row"];
export type product_variants_Row = Database["public"]["Tables"]["product_variants"]["Row"];
export type products_Row = Database["public"]["Tables"]["products"]["Row"];
export type profiles_Row = Database["public"]["Tables"]["profiles"]["Row"];
export type putaway_assignments_Row = Database["public"]["Tables"]["putaway_assignments"]["Row"];
export type recipients_Row = Database["public"]["Tables"]["recipients"]["Row"];
export type reset_password_requests_Row = Database["public"]["Tables"]["reset_password_requests"]["Row"];
export type roles_Row = Database["public"]["Tables"]["roles"]["Row"];
export type routes_Row = Database["public"]["Tables"]["routes"]["Row"];
export type sbu_token_rates_Row = Database["public"]["Tables"]["sbu_token_rates"]["Row"];
export type sbu_token_transactions_Row = Database["public"]["Tables"]["sbu_token_transactions"]["Row"];
export type serial_numbers_Row = Database["public"]["Tables"]["serial_numbers"]["Row"];
export type shipment_status_history_Row = Database["public"]["Tables"]["shipment_status_history"]["Row"];
export type shippers_Row = Database["public"]["Tables"]["shippers"]["Row"];
export type sla_daily_snapshots_Row = Database["public"]["Tables"]["sla_daily_snapshots"]["Row"];
export type sla_escalations_Row = Database["public"]["Tables"]["sla_escalations"]["Row"];
export type staff_Row = Database["public"]["Tables"]["staff"]["Row"];
export type storage_areas_Row = Database["public"]["Tables"]["storage_areas"]["Row"];
export type storage_locations_Row = Database["public"]["Tables"]["storage_locations"]["Row"];
export type storage_zones_Row = Database["public"]["Tables"]["storage_zones"]["Row"];
export type tax_rates_Row = Database["public"]["Tables"]["tax_rates"]["Row"];
export type tenant_roles_Row = Database["public"]["Tables"]["tenant_roles"]["Row"];
export type tenant_sbus_Row = Database["public"]["Tables"]["tenant_sbus"]["Row"];
export type tenant_users_Row = Database["public"]["Tables"]["tenant_users"]["Row"];
export type tenants_Row = Database["public"]["Tables"]["tenants"]["Row"];
export type token_price_history_Row = Database["public"]["Tables"]["token_price_history"]["Row"];
export type token_prices_Row = Database["public"]["Tables"]["token_prices"]["Row"];
export type token_transactions_Row = Database["public"]["Tables"]["token_transactions"]["Row"];
export type topup_requests_Row = Database["public"]["Tables"]["topup_requests"]["Row"];
export type tracking_points_Row = Database["public"]["Tables"]["tracking_points"]["Row"];
export type tracking_sessions_Row = Database["public"]["Tables"]["tracking_sessions"]["Row"];
export type tracking_updates_Row = Database["public"]["Tables"]["tracking_updates"]["Row"];
export type transporters_Row = Database["public"]["Tables"]["transporters"]["Row"];
export type truck_types_Row = Database["public"]["Tables"]["truck_types"]["Row"];
export type uom_types_Row = Database["public"]["Tables"]["uom_types"]["Row"];
export type user_roles_Row = Database["public"]["Tables"]["user_roles"]["Row"];
export type v_gps_status_overview_Row = Database["public"]["Views"]["v_gps_status_overview"]["Row"];
export type v_wh_customer_stock_Row = Database["public"]["Views"]["v_wh_customer_stock"]["Row"];
export type v_wh_utilization_Row = Database["public"]["Views"]["v_wh_utilization"]["Row"];
export type variant_types_Row = Database["public"]["Tables"]["variant_types"]["Row"];
export type variant_values_Row = Database["public"]["Tables"]["variant_values"]["Row"];
export type vendor_invoices_Row = Database["public"]["Tables"]["vendor_invoices"]["Row"];
export type vw_director_exceptions_Row = Database["public"]["Views"]["vw_director_exceptions"]["Row"];
export type vw_location_capacity_Row = Database["public"]["Views"]["vw_location_capacity"]["Row"];
export type vw_work_order_summary_Row = Database["public"]["Views"]["vw_work_order_summary"]["Row"];
export type warehouse_staff_attendance_Row = Database["public"]["Tables"]["warehouse_staff_attendance"]["Row"];
export type warehouse_users_Row = Database["public"]["Tables"]["warehouse_users"]["Row"];
export type warehouses_Row = Database["public"]["Tables"]["warehouses"]["Row"];
export type weight_tracking_Row = Database["public"]["Tables"]["weight_tracking"]["Row"];
export type wh_billing_invoice_details_Row = Database["public"]["Tables"]["wh_billing_invoice_details"]["Row"];
export type wh_billing_invoices_Row = Database["public"]["Tables"]["wh_billing_invoices"]["Row"];
export type wh_daily_stock_snapshots_Row = Database["public"]["Tables"]["wh_daily_stock_snapshots"]["Row"];
export type wh_inbound_damage_records_Row = Database["public"]["Tables"]["wh_inbound_damage_records"]["Row"];
export type wh_inbound_receipt_items_Row = Database["public"]["Tables"]["wh_inbound_receipt_items"]["Row"];
export type wh_inbound_receipts_Row = Database["public"]["Tables"]["wh_inbound_receipts"]["Row"];
export type wh_internal_movements_Row = Database["public"]["Tables"]["wh_internal_movements"]["Row"];
export type wh_inventory_Row = Database["public"]["Tables"]["wh_inventory"]["Row"];
export type wh_inventory_movements_Row = Database["public"]["Tables"]["wh_inventory_movements"]["Row"];
export type wh_item_packaging_Row = Database["public"]["Tables"]["wh_item_packaging"]["Row"];
export type wh_items_Row = Database["public"]["Tables"]["wh_items"]["Row"];
export type wh_jo_staff_assignments_Row = Database["public"]["Tables"]["wh_jo_staff_assignments"]["Row"];
export type wh_loading_sessions_Row = Database["public"]["Tables"]["wh_loading_sessions"]["Row"];
export type wh_master_boxes_Row = Database["public"]["Tables"]["wh_master_boxes"]["Row"];
export type wh_milestone_logs_Row = Database["public"]["Tables"]["wh_milestone_logs"]["Row"];
export type wh_outbound_damage_records_Row = Database["public"]["Tables"]["wh_outbound_damage_records"]["Row"];
export type wh_outbound_shipment_items_Row = Database["public"]["Tables"]["wh_outbound_shipment_items"]["Row"];
export type wh_outbound_shipments_Row = Database["public"]["Tables"]["wh_outbound_shipments"]["Row"];
export type wh_packages_Row = Database["public"]["Tables"]["wh_packages"]["Row"];
export type wh_pallets_Row = Database["public"]["Tables"]["wh_pallets"]["Row"];
export type wh_parcel_inbound_Row = Database["public"]["Tables"]["wh_parcel_inbound"]["Row"];
export type wh_picking_details_Row = Database["public"]["Tables"]["wh_picking_details"]["Row"];
export type wh_picking_lists_Row = Database["public"]["Tables"]["wh_picking_lists"]["Row"];
export type wh_receipt_details_Row = Database["public"]["Tables"]["wh_receipt_details"]["Row"];
export type wh_receipt_orders_Row = Database["public"]["Tables"]["wh_receipt_orders"]["Row"];
export type wh_repacking_conversions_Row = Database["public"]["Tables"]["wh_repacking_conversions"]["Row"];
export type wh_repacking_items_Row = Database["public"]["Tables"]["wh_repacking_items"]["Row"];
export type wh_repacking_orders_Row = Database["public"]["Tables"]["wh_repacking_orders"]["Row"];
export type wh_staff_attendance_Row = Database["public"]["Tables"]["wh_staff_attendance"]["Row"];
export type wh_task_items_Row = Database["public"]["Tables"]["wh_task_items"]["Row"];
export type wh_tasks_Row = Database["public"]["Tables"]["wh_tasks"]["Row"];
export type wh_temperature_alerts_Row = Database["public"]["Tables"]["wh_temperature_alerts"]["Row"];
export type wh_temperature_logs_Row = Database["public"]["Tables"]["wh_temperature_logs"]["Row"];
export type wh_transfer_details_Row = Database["public"]["Tables"]["wh_transfer_details"]["Row"];
export type wh_transfer_orders_Row = Database["public"]["Tables"]["wh_transfer_orders"]["Row"];
export type wh_transformation_components_Row = Database["public"]["Tables"]["wh_transformation_components"]["Row"];
export type wh_transformation_orders_Row = Database["public"]["Tables"]["wh_transformation_orders"]["Row"];
export type wh_transformation_outputs_Row = Database["public"]["Tables"]["wh_transformation_outputs"]["Row"];
export type wh_unloading_sessions_Row = Database["public"]["Tables"]["wh_unloading_sessions"]["Row"];
export type wh_vas_orders_Row = Database["public"]["Tables"]["wh_vas_orders"]["Row"];
export type wh_wa_notifications_Row = Database["public"]["Tables"]["wh_wa_notifications"]["Row"];
export type wo_audit_logs_Row = Database["public"]["Tables"]["wo_audit_logs"]["Row"];
export type wo_inventory_ledger_Row = Database["public"]["Tables"]["wo_inventory_ledger"]["Row"];
export type wo_item_manifests_Row = Database["public"]["Tables"]["wo_item_manifests"]["Row"];
export type wo_items_Row = Database["public"]["Tables"]["wo_items"]["Row"];
export type wo_job_order_items_Row = Database["public"]["Tables"]["wo_job_order_items"]["Row"];
export type wo_job_orders_Row = Database["public"]["Tables"]["wo_job_orders"]["Row"];
export type wo_monitoring_events_Row = Database["public"]["Tables"]["wo_monitoring_events"]["Row"];
export type wo_organization_users_Row = Database["public"]["Tables"]["wo_organization_users"]["Row"];
export type wo_organizations_Row = Database["public"]["Tables"]["wo_organizations"]["Row"];
export type wo_status_history_Row = Database["public"]["Tables"]["wo_status_history"]["Row"];
export type wo_work_order_items_Row = Database["public"]["Tables"]["wo_work_order_items"]["Row"];
export type wo_work_orders_Row = Database["public"]["Tables"]["wo_work_orders"]["Row"];
export type wo_workflow_instances_Row = Database["public"]["Tables"]["wo_workflow_instances"]["Row"];
export type work_orders_Row = Database["public"]["Tables"]["work_orders"]["Row"];
