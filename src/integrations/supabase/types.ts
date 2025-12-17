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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          source: string
          source_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          source: string
          source_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          source?: string
          source_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      coupon_pools: {
        Row: {
          assigned_at: string | null
          assigned_email: string | null
          assigned_to: string | null
          coupon_code: string
          created_at: string
          expires_at: string | null
          id: string
          revoke_reason: string | null
          reward_type: string
          status: string
          used_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_email?: string | null
          assigned_to?: string | null
          coupon_code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          revoke_reason?: string | null
          reward_type: string
          status?: string
          used_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_email?: string | null
          assigned_to?: string | null
          coupon_code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          revoke_reason?: string | null
          reward_type?: string
          status?: string
          used_at?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          competition_type: string
          created_at: string
          description: string
          end_date: string
          featured_image_url: string | null
          id: string
          min_words: number
          rewards: string | null
          slug: string
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          competition_type?: string
          created_at?: string
          description: string
          end_date: string
          featured_image_url?: string | null
          id?: string
          min_words?: number
          rewards?: string | null
          slug: string
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          competition_type?: string
          created_at?: string
          description?: string
          end_date?: string
          featured_image_url?: string | null
          id?: string
          min_words?: number
          rewards?: string | null
          slug?: string
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      magic_link_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reel_submissions: {
        Row: {
          description: string | null
          email: string
          event_id: string
          id: string
          name: string
          phone: string
          submitted_at: string
          thumbnail_url: string | null
          title: string
          video_url: string
        }
        Insert: {
          description?: string | null
          email: string
          event_id: string
          id?: string
          name: string
          phone: string
          submitted_at?: string
          thumbnail_url?: string | null
          title: string
          video_url: string
        }
        Update: {
          description?: string | null
          email?: string
          event_id?: string
          id?: string
          name?: string
          phone?: string
          submitted_at?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_winners: {
        Row: {
          created_at: string
          event_id: string
          id: string
          position: number
          submission_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          position?: number
          submission_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          position?: number
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_winners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_winners_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "reel_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          coins_rewarded: number | null
          created_at: string
          id: string
          qualified_at: string | null
          referred_email: string
          referred_id: string
          referrer_id: string
          rewarded_at: string | null
          status: string
        }
        Insert: {
          coins_rewarded?: number | null
          created_at?: string
          id?: string
          qualified_at?: string | null
          referred_email: string
          referred_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          coins_rewarded?: number | null
          created_at?: string
          id?: string
          qualified_at?: string | null
          referred_email?: string
          referred_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      reward_claims: {
        Row: {
          coins_spent: number
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          expires_at: string | null
          fulfilled_at: string | null
          id: string
          notes: string | null
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          coins_spent: number
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          expires_at?: string | null
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          coins_spent?: number
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          expires_at?: string | null
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_claims_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupon_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_claims_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      rewards: {
        Row: {
          coin_cost: number
          created_at: string
          description: string | null
          expiry_days: number | null
          id: string
          is_enabled: boolean | null
          max_claims_per_user: number | null
          name: string
          reward_type: string
          updated_at: string
        }
        Insert: {
          coin_cost: number
          created_at?: string
          description?: string | null
          expiry_days?: number | null
          id?: string
          is_enabled?: boolean | null
          max_claims_per_user?: number | null
          name: string
          reward_type: string
          updated_at?: string
        }
        Update: {
          coin_cost?: number
          created_at?: string
          description?: string | null
          expiry_days?: number | null
          id?: string
          is_enabled?: boolean | null
          max_claims_per_user?: number | null
          name?: string
          reward_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_follows: {
        Row: {
          claimed_at: string
          coins_earned: number
          id: string
          platform: string
          screenshot_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          coins_earned: number
          id?: string
          platform: string
          screenshot_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          coins_earned?: number
          id?: string
          platform?: string
          screenshot_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      submission_rate_limit: {
        Row: {
          identifier: string
          submission_count: number | null
          window_start: string | null
        }
        Insert: {
          identifier: string
          submission_count?: number | null
          window_start?: string | null
        }
        Update: {
          identifier?: string
          submission_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          blog: string
          blog_title: string | null
          email: string
          event_id: string
          id: string
          name: string
          phone: string
          submitted_at: string
          time_spent_seconds: number | null
          word_count: number
        }
        Insert: {
          blog: string
          blog_title?: string | null
          email: string
          event_id: string
          id?: string
          name: string
          phone: string
          submitted_at?: string
          time_spent_seconds?: number | null
          word_count: number
        }
        Update: {
          blog?: string
          blog_title?: string | null
          email?: string
          event_id?: string
          id?: string
          name?: string
          phone?: string
          submitted_at?: string
          time_spent_seconds?: number | null
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "submissions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coins: {
        Row: {
          balance: number
          created_at: string
          email: string
          id: string
          referral_code: string
          referred_by: string | null
          signup_coins_claimed: boolean | null
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          email: string
          id?: string
          referral_code?: string
          referred_by?: string | null
          signup_coins_claimed?: boolean | null
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          email?: string
          id?: string
          referral_code?: string
          referred_by?: string | null
          signup_coins_claimed?: boolean | null
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
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
      winners: {
        Row: {
          created_at: string
          event_id: string
          id: string
          position: number
          submission_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          position?: number
          submission_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          position?: number
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "winners_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_coins: {
        Args: {
          _amount: number
          _description?: string
          _source: string
          _source_id?: string
          _user_id: string
        }
        Returns: boolean
      }
      claim_signup_coins: { Args: { _user_id: string }; Returns: Json }
      claim_social_coins: {
        Args: { _platform: string; _user_id: string }
        Returns: Json
      }
      generate_slug: { Args: { title: string }; Returns: string }
      get_event_winners: {
        Args: { _event_id: string }
        Returns: {
          submission_name: string
          winner_id: string
          winner_position: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_event_accepting_submissions: {
        Args: { _event_id: string }
        Returns: boolean
      }
      spend_coins: {
        Args: {
          _amount: number
          _description?: string
          _source: string
          _source_id?: string
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
