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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          crypto_asset: string
          crypto_network: string
          id: boolean
          min_payment_usd: number
          paybis_enabled: boolean
          updated_at: string
          updated_by: string | null
          usd_rate_sar: number
          wallet_configured: boolean
        }
        Insert: {
          crypto_asset?: string
          crypto_network?: string
          id?: boolean
          min_payment_usd?: number
          paybis_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
          usd_rate_sar?: number
          wallet_configured?: boolean
        }
        Update: {
          crypto_asset?: string
          crypto_network?: string
          id?: boolean
          min_payment_usd?: number
          paybis_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
          usd_rate_sar?: number
          wallet_configured?: boolean
        }
        Relationships: []
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          adults: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          children: number
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          currency: string
          date: string
          destination_airport: Database["public"]["Enums"]["destination_airport"]
          driver_id: string | null
          hand_luggage: number
          id: string
          large_luggage: number
          luggage: number
          offer_id: string | null
          passenger_id: string | null
          passengers: number
          pickup_city: Database["public"]["Enums"]["pickup_city"]
          pickup_location: string
          previous_status: Database["public"]["Enums"]["booking_status"] | null
          price: number
          ride_type: Database["public"]["Enums"]["ride_type"]
          status: Database["public"]["Enums"]["booking_status"]
          time: string
          updated_at: string
        }
        Insert: {
          adults?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          children?: number
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          date: string
          destination_airport: Database["public"]["Enums"]["destination_airport"]
          driver_id?: string | null
          hand_luggage?: number
          id?: string
          large_luggage?: number
          luggage?: number
          offer_id?: string | null
          passenger_id?: string | null
          passengers: number
          pickup_city: Database["public"]["Enums"]["pickup_city"]
          pickup_location: string
          previous_status?: Database["public"]["Enums"]["booking_status"] | null
          price: number
          ride_type: Database["public"]["Enums"]["ride_type"]
          status?: Database["public"]["Enums"]["booking_status"]
          time: string
          updated_at?: string
        }
        Update: {
          adults?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          children?: number
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          currency?: string
          date?: string
          destination_airport?: Database["public"]["Enums"]["destination_airport"]
          driver_id?: string | null
          hand_luggage?: number
          id?: string
          large_luggage?: number
          luggage?: number
          offer_id?: string | null
          passenger_id?: string | null
          passengers?: number
          pickup_city?: Database["public"]["Enums"]["pickup_city"]
          pickup_location?: string
          previous_status?: Database["public"]["Enums"]["booking_status"] | null
          price?: number
          ride_type?: Database["public"]["Enums"]["ride_type"]
          status?: Database["public"]["Enums"]["booking_status"]
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "driver_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "public_driver_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_transactions: {
        Row: {
          amount_sar: number
          amount_usd: number | null
          booking_id: string | null
          created_at: string
          driver_id: string
          id: string
          payment_provider: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["commission_txn_status"]
          type: Database["public"]["Enums"]["commission_txn_type"]
          updated_at: string
        }
        Insert: {
          amount_sar: number
          amount_usd?: number | null
          booking_id?: string | null
          created_at?: string
          driver_id: string
          id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["commission_txn_status"]
          type: Database["public"]["Enums"]["commission_txn_type"]
          updated_at?: string
        }
        Update: {
          amount_sar?: number
          amount_usd?: number | null
          booking_id?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["commission_txn_status"]
          type?: Database["public"]["Enums"]["commission_txn_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_offers: {
        Row: {
          created_at: string
          date: string
          destination_airport: Database["public"]["Enums"]["destination_airport"]
          driver_id: string
          id: string
          pickup_city: Database["public"]["Enums"]["pickup_city"]
          pickup_location: string | null
          price: number
          ride_type: Database["public"]["Enums"]["ride_type"]
          status: Database["public"]["Enums"]["offer_status"]
          time: string
        }
        Insert: {
          created_at?: string
          date: string
          destination_airport: Database["public"]["Enums"]["destination_airport"]
          driver_id: string
          id?: string
          pickup_city: Database["public"]["Enums"]["pickup_city"]
          pickup_location?: string | null
          price: number
          ride_type: Database["public"]["Enums"]["ride_type"]
          status?: Database["public"]["Enums"]["offer_status"]
          time: string
        }
        Update: {
          created_at?: string
          date?: string
          destination_airport?: Database["public"]["Enums"]["destination_airport"]
          driver_id?: string
          id?: string
          pickup_city?: Database["public"]["Enums"]["pickup_city"]
          pickup_location?: string | null
          price?: number
          ride_type?: Database["public"]["Enums"]["ride_type"]
          status?: Database["public"]["Enums"]["offer_status"]
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          block_reason: string | null
          blocked_by_commission: boolean
          commission_balance: number
          commission_balance_sar: number
          commission_rate: number
          created_at: string
          exterior_photo: string | null
          id: string
          interior_photo: string | null
          luggage_capacity: number
          plate_number: string | null
          rating: number | null
          seats: number
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
          user_id: string
          vehicle_class: Database["public"]["Enums"]["vehicle_class"]
          vehicle_model: string | null
          vehicle_type: string
        }
        Insert: {
          block_reason?: string | null
          blocked_by_commission?: boolean
          commission_balance?: number
          commission_balance_sar?: number
          commission_rate?: number
          created_at?: string
          exterior_photo?: string | null
          id?: string
          interior_photo?: string | null
          luggage_capacity?: number
          plate_number?: string | null
          rating?: number | null
          seats?: number
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id: string
          vehicle_class?: Database["public"]["Enums"]["vehicle_class"]
          vehicle_model?: string | null
          vehicle_type: string
        }
        Update: {
          block_reason?: string | null
          blocked_by_commission?: boolean
          commission_balance?: number
          commission_balance_sar?: number
          commission_rate?: number
          created_at?: string
          exterior_photo?: string | null
          id?: string
          interior_photo?: string | null
          luggage_capacity?: number
          plate_number?: string | null
          rating?: number | null
          seats?: number
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id?: string
          vehicle_class?: Database["public"]["Enums"]["vehicle_class"]
          vehicle_model?: string | null
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount_sar: number
          amount_usd: number | null
          commission_transaction_id: string | null
          created_at: string
          crypto_asset: string
          crypto_network: string
          destination_wallet: string | null
          driver_id: string
          id: string
          provider: string
          provider_reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tx_hash: string | null
          updated_at: string
        }
        Insert: {
          amount_sar: number
          amount_usd?: number | null
          commission_transaction_id?: string | null
          created_at?: string
          crypto_asset?: string
          crypto_network?: string
          destination_wallet?: string | null
          driver_id: string
          id?: string
          provider?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tx_hash?: string | null
          updated_at?: string
        }
        Update: {
          amount_sar?: number
          amount_usd?: number | null
          commission_transaction_id?: string | null
          created_at?: string
          crypto_asset?: string
          crypto_network?: string
          destination_wallet?: string | null
          driver_id?: string
          id?: string
          provider?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tx_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_commission_transaction_id_fkey"
            columns: ["commission_transaction_id"]
            isOneToOne: false
            referencedRelation: "commission_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          language: string
          name: string | null
          phone: string | null
          phone_verified: boolean
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          language?: string
          name?: string | null
          phone?: string | null
          phone_verified?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          language?: string
          name?: string | null
          phone?: string | null
          phone_verified?: boolean
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_driver_offers: {
        Row: {
          date: string | null
          destination_airport:
            | Database["public"]["Enums"]["destination_airport"]
            | null
          driver_avatar_url: string | null
          driver_id: string | null
          driver_name: string | null
          id: string | null
          luggage_capacity: number | null
          pickup_city: Database["public"]["Enums"]["pickup_city"] | null
          pickup_location: string | null
          price: number | null
          rating: number | null
          ride_type: Database["public"]["Enums"]["ride_type"] | null
          seats: number | null
          time: string | null
          vehicle_class: Database["public"]["Enums"]["vehicle_class"] | null
          vehicle_model: string | null
          vehicle_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_offers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_status: "active" | "suspended"
      app_role: "passenger" | "driver" | "admin"
      booking_status:
        | "pending"
        | "driver_accepted"
        | "driver_arriving"
        | "driver_arrived"
        | "trip_started"
        | "completed"
        | "cancelled"
        | "rejected"
      commission_txn_status: "pending" | "confirmed" | "failed"
      commission_txn_type: "commission_charge" | "payment"
      destination_airport: "jeddah" | "madinah" | "taif"
      driver_status: "pending" | "approved" | "suspended" | "active" | "blocked"
      offer_status: "active" | "paused" | "expired"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      pickup_city: "makkah" | "madinah"
      ride_type: "private" | "shared"
      vehicle_class: "economy" | "standard" | "comfort"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended"],
      app_role: ["passenger", "driver", "admin"],
      booking_status: [
        "pending",
        "driver_accepted",
        "driver_arriving",
        "driver_arrived",
        "trip_started",
        "completed",
        "cancelled",
        "rejected",
      ],
      commission_txn_status: ["pending", "confirmed", "failed"],
      commission_txn_type: ["commission_charge", "payment"],
      destination_airport: ["jeddah", "madinah", "taif"],
      driver_status: ["pending", "approved", "suspended", "active", "blocked"],
      offer_status: ["active", "paused", "expired"],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      pickup_city: ["makkah", "madinah"],
      ride_type: ["private", "shared"],
      vehicle_class: ["economy", "standard", "comfort"],
    },
  },
} as const
