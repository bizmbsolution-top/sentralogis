export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          company_name: string | null
          created_at: string | null
          id: string
          name: string | null
          phone: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          phone: string
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string | null
          doc_type: string | null
          file_url: string | null
          id: string
          job_order_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          doc_type?: string | null
          file_url?: string | null
          id?: string
          job_order_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          doc_type?: string | null
          file_url?: string | null
          id?: string
          job_order_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fleets: {
        Row: {
          driver_name: string | null
          driver_phone: string | null
          id: string
          last_updated: string | null
          plate_number: string
          status: string | null
          type: string
          vendor_name: string | null
        }
        Insert: {
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          last_updated?: string | null
          plate_number: string
          status?: string | null
          type: string
          vendor_name?: string | null
        }
        Update: {
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          last_updated?: string | null
          plate_number?: string
          status?: string | null
          type?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string | null
          id: string
          invoice_number: string | null
          paid_at: string | null
          payment_proof_url: string | null
          status: string | null
          total_amount: number | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          payment_proof_url?: string | null
          status?: string | null
          total_amount?: number | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          payment_proof_url?: string | null
          status?: string | null
          total_amount?: number | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      job_orders: {
        Row: {
          actual_delivery_time: string | null
          actual_pickup_time: string | null
          created_at: string | null
          driver_id: string | null
          driver_link_token: string | null
          fleet_id: string | null
          id: string
          jo_number: string | null
          status: string | null
          work_order_id: string | null
          work_order_item_id: string | null
        }
        Insert: {
          actual_delivery_time?: string | null
          actual_pickup_time?: string | null
          created_at?: string | null
          driver_id?: string | null
          driver_link_token?: string | null
          fleet_id?: string | null
          id?: string
          jo_number?: string | null
          status?: string | null
          work_order_id?: string | null
          work_order_item_id?: string | null
        }
        Update: {
          actual_delivery_time?: string | null
          actual_pickup_time?: string | null
          created_at?: string | null
          driver_id?: string | null
          driver_link_token?: string | null
          fleet_id?: string | null
          id?: string
          jo_number?: string | null
          status?: string | null
          work_order_id?: string | null
          work_order_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_orders_fleet_id_fkey"
            columns: ["fleet_id"]
            isOneToOne: false
            referencedRelation: "fleets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_orders_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_updates: {
        Row: {
          created_at: string | null
          id: string
          job_order_id: string | null
          location: string | null
          status_update: string | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_order_id?: string | null
          location?: string | null
          status_update?: string | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_order_id?: string | null
          location?: string | null
          status_update?: string | null
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_updates_job_order_id_fkey"
            columns: ["job_order_id"]
            isOneToOne: false
            referencedRelation: "job_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          approval_token: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          customer_phone: string
          dropoff_location: string
          id: string
          pickup_location: string
          required_units: number
          source: string | null
          status: string | null
          wo_number: string | null
        }
        Insert: {
          approval_token?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_phone: string
          dropoff_location: string
          id?: string
          pickup_location: string
          required_units: number
          source?: string | null
          status?: string | null
          wo_number?: string | null
        }
        Update: {
          approval_token?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          customer_phone?: string
          dropoff_location?: string
          id?: string
          pickup_location?: string
          required_units?: number
          source?: string | null
          status?: string | null
          wo_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const


// Helper Types for individual tables
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Fleet = Database['public']['Tables']['fleets']['Row'];
export type WorkOrder = Database['public']['Tables']['work_orders']['Row'];
export type JobOrder = Database['public']['Tables']['job_orders']['Row'];
export type TrackingUpdate = Database['public']['Tables']['tracking_updates']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type Invoice = Database['public']['Tables']['invoices']['Row'];
