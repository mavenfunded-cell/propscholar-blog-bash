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
      admin_campaign_access: {
        Row: {
          admin_email: string
          granted_at: string
          granted_by: string | null
          has_access: boolean | null
          id: string
        }
        Insert: {
          admin_email: string
          granted_at?: string
          granted_by?: string | null
          has_access?: boolean | null
          id?: string
        }
        Update: {
          admin_email?: string
          granted_at?: string
          granted_by?: string | null
          has_access?: boolean | null
          id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          action_url: string | null
          admin_id: string
          cta_text: string | null
          id: string
          message: string
          recipient_count: number | null
          sent_at: string
          target_type: string
          target_users: string[] | null
          title: string
        }
        Insert: {
          action_url?: string | null
          admin_id: string
          cta_text?: string | null
          id?: string
          message: string
          recipient_count?: number | null
          sent_at?: string
          target_type?: string
          target_users?: string[] | null
          title: string
        }
        Update: {
          action_url?: string | null
          admin_id?: string
          cta_text?: string | null
          id?: string
          message?: string
          recipient_count?: number | null
          sent_at?: string
          target_type?: string
          target_users?: string[] | null
          title?: string
        }
        Relationships: []
      }
      admin_otp_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp: string
          used: boolean | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp: string
          used?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp?: string
          used?: boolean | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_accessed_at: string | null
          session_token: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          session_token: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_accessed_at?: string | null
          session_token?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      ai_knowledge_base: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          source: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          source?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          source?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          admin_id: string
          created_at: string
          error_message: string | null
          id: string
          request_type: string
          status: string
          ticket_id: string | null
          tokens_estimated: number
        }
        Insert: {
          admin_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          request_type?: string
          status?: string
          ticket_id?: string | null
          tokens_estimated?: number
        }
        Update: {
          admin_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          request_type?: string
          status?: string
          ticket_id?: string | null
          tokens_estimated?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_tags: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      audience_users: {
        Row: {
          created_at: string
          email: string
          engagement_score: number | null
          first_name: string | null
          id: string
          is_marketing_allowed: boolean | null
          last_engaged_at: string | null
          last_name: string | null
          source: string | null
          tags: string[] | null
          total_clicks: number | null
          total_opens: number | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          engagement_score?: number | null
          first_name?: string | null
          id?: string
          is_marketing_allowed?: boolean | null
          last_engaged_at?: string | null
          last_name?: string | null
          source?: string | null
          tags?: string[] | null
          total_clicks?: number | null
          total_opens?: number | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          engagement_score?: number | null
          first_name?: string | null
          id?: string
          is_marketing_allowed?: boolean | null
          last_engaged_at?: string | null
          last_name?: string | null
          source?: string | null
          tags?: string[] | null
          total_clicks?: number | null
          total_opens?: number | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blog_votes: {
        Row: {
          created_at: string
          id: string
          submission_id: string
          user_id: string | null
          voter_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          submission_id: string
          user_id?: string | null
          voter_name: string
        }
        Update: {
          created_at?: string
          id?: string
          submission_id?: string
          user_id?: string | null
          voter_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "public_winner_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_events: {
        Row: {
          audience_user_id: string | null
          campaign_id: string
          city: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          ip_address: string | null
          link_url: string | null
          recipient_id: string | null
          user_agent: string | null
        }
        Insert: {
          audience_user_id?: string | null
          campaign_id: string
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          recipient_id?: string | null
          user_agent?: string | null
        }
        Update: {
          audience_user_id?: string | null
          campaign_id?: string
          city?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          recipient_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_audience_user_id_fkey"
            columns: ["audience_user_id"]
            isOneToOne: false
            referencedRelation: "audience_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "campaign_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          audience_user_id: string
          campaign_id: string
          clicked_at: string | null
          created_at: string
          email: string
          error_message: string | null
          first_name: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          status: string
          tracking_id: string | null
        }
        Insert: {
          audience_user_id: string
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          email: string
          error_message?: string | null
          first_name?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          tracking_id?: string | null
        }
        Update: {
          audience_user_id?: string
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          email?: string
          error_message?: string | null
          first_name?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          tracking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_audience_user_id_fkey"
            columns: ["audience_user_id"]
            isOneToOne: false
            referencedRelation: "audience_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          bounce_count: number | null
          click_count: number | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          exclude_tags: string[] | null
          html_content: string
          id: string
          name: string
          open_count: number | null
          plain_text_content: string | null
          preheader: string | null
          scheduled_at: string | null
          sender_email: string | null
          sender_name: string | null
          sent_count: number | null
          spam_count: number | null
          started_at: string | null
          status: string
          subject: string
          target_tags: string[] | null
          test_sent_at: string | null
          test_sent_to: string | null
          total_recipients: number | null
          unsubscribe_count: number | null
          updated_at: string
        }
        Insert: {
          bounce_count?: number | null
          click_count?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          exclude_tags?: string[] | null
          html_content: string
          id?: string
          name: string
          open_count?: number | null
          plain_text_content?: string | null
          preheader?: string | null
          scheduled_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sent_count?: number | null
          spam_count?: number | null
          started_at?: string | null
          status?: string
          subject: string
          target_tags?: string[] | null
          test_sent_at?: string | null
          test_sent_to?: string | null
          total_recipients?: number | null
          unsubscribe_count?: number | null
          updated_at?: string
        }
        Update: {
          bounce_count?: number | null
          click_count?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          exclude_tags?: string[] | null
          html_content?: string
          id?: string
          name?: string
          open_count?: number | null
          plain_text_content?: string | null
          preheader?: string | null
          scheduled_at?: string | null
          sender_email?: string | null
          sender_name?: string | null
          sent_count?: number | null
          spam_count?: number | null
          started_at?: string | null
          status?: string
          subject?: string
          target_tags?: string[] | null
          test_sent_at?: string | null
          test_sent_to?: string | null
          total_recipients?: number | null
          unsubscribe_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      canned_messages: {
        Row: {
          category: string | null
          content: string
          created_at: string
          id: string
          shortcut: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          id?: string
          shortcut?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          id?: string
          shortcut?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      course_videos: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          is_preview: boolean | null
          order_index: number | null
          resources: Json | null
          seo_description: string | null
          seo_title: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          transcript: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_preview?: boolean | null
          order_index?: number | null
          resources?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          transcript?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_preview?: boolean | null
          order_index?: number | null
          resources?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          transcript?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_videos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          difficulty: string | null
          duration_minutes: number | null
          id: string
          instructor_avatar: string | null
          instructor_bio: string | null
          instructor_name: string | null
          is_locked: boolean | null
          is_published: boolean | null
          order_index: number | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          slug: string | null
          thumbnail_url: string | null
          title: string
          unlock_coins: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          instructor_avatar?: string | null
          instructor_bio?: string | null
          instructor_name?: string | null
          is_locked?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug?: string | null
          thumbnail_url?: string | null
          title: string
          unlock_coins?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          instructor_avatar?: string | null
          instructor_bio?: string | null
          instructor_name?: string | null
          is_locked?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug?: string | null
          thumbnail_url?: string | null
          title?: string
          unlock_coins?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          event_id: string | null
          id: string
          message_body: string | null
          recipient_email: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          message_body?: string | null
          recipient_email: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          event_id?: string | null
          id?: string
          message_body?: string | null
          recipient_email?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
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
          prizes: Json | null
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
          prizes?: Json | null
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
          prizes?: Json | null
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
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          cta_text: string | null
          id: string
          is_persistent: boolean
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          cta_text?: string | null
          id?: string
          is_persistent?: boolean
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          cta_text?: string | null
          id?: string
          is_persistent?: boolean
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      og_images: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_default: boolean | null
          page_identifier: string | null
          page_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_default?: boolean | null
          page_identifier?: string | null
          page_type: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_default?: boolean | null
          page_identifier?: string | null
          page_type?: string
          title?: string | null
          updated_at?: string
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
      scholar_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          id: string
          keywords: string | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          page_name: string
          page_path: string
          robots: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_name: string
          page_path: string
          robots?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          keywords?: string | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          page_name?: string
          page_path?: string
          robots?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sitemap_urls: {
        Row: {
          changefreq: string
          created_at: string
          id: string
          priority: string
          updated_at: string
          url: string
        }
        Insert: {
          changefreq?: string
          created_at?: string
          id?: string
          priority?: string
          updated_at?: string
          url: string
        }
        Update: {
          changefreq?: string
          created_at?: string
          id?: string
          priority?: string
          updated_at?: string
          url?: string
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
      support_messages: {
        Row: {
          attachments: Json | null
          body: string
          body_html: string | null
          created_at: string
          id: string
          in_reply_to: string | null
          is_internal_note: boolean | null
          message_id: string | null
          sender_email: string
          sender_name: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          body: string
          body_html?: string | null
          created_at?: string
          id?: string
          in_reply_to?: string | null
          is_internal_note?: boolean | null
          message_id?: string | null
          sender_email: string
          sender_name?: string | null
          sender_type?: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          body_html?: string | null
          created_at?: string
          id?: string
          in_reply_to?: string | null
          is_internal_note?: boolean | null
          message_id?: string | null
          sender_email?: string
          sender_name?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          last_reply_at: string | null
          last_reply_by: string | null
          original_message_id: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: number
          updated_at: string
          user_email: string
          user_id: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          last_reply_at?: string | null
          last_reply_by?: string | null
          original_message_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number?: number
          updated_at?: string
          user_email: string
          user_id?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          last_reply_at?: string | null
          last_reply_by?: string | null
          original_message_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: number
          updated_at?: string
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ticket_reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          ticket_id: string
          user_email: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          ticket_id: string
          user_email: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          ticket_id?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_reviews_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
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
      user_course_progress: {
        Row: {
          completed_at: string | null
          completed_videos: string[] | null
          course_id: string
          id: string
          last_watched_at: string | null
          progress_percent: number | null
          started_at: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_videos?: string[] | null
          course_id: string
          id?: string
          last_watched_at?: string | null
          progress_percent?: number | null
          started_at?: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_videos?: string[] | null
          course_id?: string
          id?: string
          last_watched_at?: string | null
          progress_percent?: number | null
          started_at?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "course_videos"
            referencedColumns: ["id"]
          },
        ]
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
      user_sessions: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          ip_address: string | null
          last_active_at: string
          page_views: number
          session_id: string
          started_at: string
          total_seconds: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          page_views?: number
          session_id: string
          started_at?: string
          total_seconds?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          page_views?: number
          session_id?: string
          started_at?: string
          total_seconds?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      winner_claims: {
        Row: {
          admin_notes: string | null
          claim_email: string | null
          claim_name: string | null
          claimed_at: string | null
          created_at: string
          event_id: string
          id: string
          issued_at: string | null
          position: number
          status: string
          submission_id: string
          user_email: string
          winner_id: string
          winner_type: string
        }
        Insert: {
          admin_notes?: string | null
          claim_email?: string | null
          claim_name?: string | null
          claimed_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          issued_at?: string | null
          position?: number
          status?: string
          submission_id: string
          user_email: string
          winner_id: string
          winner_type: string
        }
        Update: {
          admin_notes?: string | null
          claim_email?: string | null
          claim_name?: string | null
          claimed_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          issued_at?: string | null
          position?: number
          status?: string
          submission_id?: string
          user_email?: string
          winner_id?: string
          winner_type?: string
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
            referencedRelation: "public_winner_submissions"
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
      public_winner_submissions: {
        Row: {
          blog: string | null
          blog_title: string | null
          display_name: string | null
          event_id: string | null
          id: string | null
          submitted_at: string | null
          word_count: number | null
        }
        Insert: {
          blog?: string | null
          blog_title?: string | null
          display_name?: never
          event_id?: string | null
          id?: string | null
          submitted_at?: string | null
          word_count?: number | null
        }
        Update: {
          blog?: string | null
          blog_title?: string | null
          display_name?: never
          event_id?: string | null
          id?: string | null
          submitted_at?: string | null
          word_count?: number | null
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
      admin_create_reward: {
        Args: {
          _coin_cost: number
          _description: string
          _expiry_days: number
          _is_enabled: boolean
          _max_claims_per_user: number
          _name: string
          _reward_type: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "rewards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_delete_reward: { Args: { _id: string }; Returns: boolean }
      admin_update_reward: {
        Args: {
          _coin_cost: number
          _description: string
          _expiry_days: number
          _id: string
          _is_enabled: boolean
          _max_claims_per_user: number
          _name: string
          _reward_type: string
        }
        Returns: boolean
      }
      admin_update_reward_setting: {
        Args: { _id: string; _setting_value: Json }
        Returns: boolean
      }
      apply_referral_code: { Args: { _referral_code: string }; Returns: Json }
      approve_social_follow: { Args: { _follow_id: string }; Returns: boolean }
      can_claim_winner: {
        Args: { _winner_id: string; _winner_type: string }
        Returns: boolean
      }
      claim_coupon: {
        Args: { _expiry_days?: number; _reward_type: string }
        Returns: Json
      }
      claim_signup_coins: { Args: { _user_id: string }; Returns: Json }
      claim_social_coins: {
        Args: { _platform: string; _screenshot_url?: string }
        Returns: Json
      }
      create_notification: {
        Args: {
          _action_url?: string
          _message: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      current_user_email: { Args: never; Returns: string }
      find_ticket_by_message_ref: {
        Args: { _in_reply_to: string; _message_id: string; _references: string }
        Returns: string
      }
      generate_slug: { Args: { title: string }; Returns: string }
      get_admin_notifications_log: {
        Args: never
        Returns: {
          action_url: string
          admin_id: string
          cta_text: string
          id: string
          message: string
          recipient_count: number
          sent_at: string
          target_type: string
          title: string
        }[]
      }
      get_all_ai_knowledge: {
        Args: never
        Returns: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          source: string
          title: string
        }[]
      }
      get_all_canned_messages: {
        Args: never
        Returns: {
          category: string
          content: string
          created_at: string
          id: string
          shortcut: string
          title: string
        }[]
      }
      get_all_coupons: {
        Args: never
        Returns: {
          assigned_at: string
          assigned_email: string
          assigned_to: string
          coupon_code: string
          created_at: string
          expires_at: string
          id: string
          revoke_reason: string
          reward_type: string
          status: string
          used_at: string
        }[]
      }
      get_all_courses: {
        Args: never
        Returns: {
          category: string
          created_at: string
          description: string
          difficulty: string
          duration_minutes: number
          id: string
          instructor_avatar: string
          instructor_bio: string
          instructor_name: string
          is_locked: boolean
          is_published: boolean
          order_index: number
          seo_description: string
          seo_keywords: string
          seo_title: string
          slug: string
          thumbnail_url: string
          title: string
          unlock_coins: number
          video_count: number
        }[]
      }
      get_all_email_logs: {
        Args: never
        Returns: {
          created_at: string
          email_type: string
          error_message: string
          event_id: string
          id: string
          message_body: string
          recipient_email: string
          status: string
          subject: string
        }[]
      }
      get_all_events: {
        Args: never
        Returns: {
          competition_type: string
          created_at: string
          description: string
          end_date: string
          featured_image_url: string
          id: string
          min_words: number
          prizes: Json
          rewards: string
          slug: string
          start_date: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      get_all_og_images: {
        Args: never
        Returns: {
          created_at: string
          description: string
          id: string
          image_url: string
          is_default: boolean
          page_identifier: string
          page_type: string
          title: string
          updated_at: string
        }[]
      }
      get_all_reel_submissions_for_event: {
        Args: { _event_id: string }
        Returns: {
          description: string
          email: string
          event_id: string
          id: string
          name: string
          phone: string
          submitted_at: string
          thumbnail_url: string
          title: string
          video_url: string
        }[]
      }
      get_all_referrals: {
        Args: never
        Returns: {
          coins_rewarded: number
          created_at: string
          id: string
          qualified_at: string
          referred_email: string
          referred_id: string
          referrer_id: string
          rewarded_at: string
          status: string
        }[]
      }
      get_all_reward_claims: {
        Args: never
        Returns: {
          coins_spent: number
          coupon_code: string
          coupon_id: string
          created_at: string
          expires_at: string
          fulfilled_at: string
          id: string
          notes: string
          reward_id: string
          status: string
          user_id: string
        }[]
      }
      get_all_reward_settings: {
        Args: never
        Returns: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "reward_settings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_all_rewards: {
        Args: never
        Returns: {
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
        }[]
        SetofOptions: {
          from: "*"
          to: "rewards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_all_scholar_categories: {
        Args: never
        Returns: {
          color: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          name: string
          order_index: number
          slug: string
        }[]
      }
      get_all_seo_settings: {
        Args: never
        Returns: {
          canonical_url: string
          created_at: string
          description: string
          id: string
          keywords: string
          og_description: string
          og_image: string
          og_title: string
          page_name: string
          page_path: string
          robots: string
          title: string
          updated_at: string
        }[]
      }
      get_all_social_follows: {
        Args: never
        Returns: {
          claimed_at: string
          coins_earned: number
          id: string
          platform: string
          screenshot_url: string
          status: string
          user_id: string
        }[]
      }
      get_all_submissions_for_event: {
        Args: { _event_id: string }
        Returns: {
          blog: string
          blog_title: string
          email: string
          event_id: string
          id: string
          name: string
          phone: string
          submitted_at: string
          time_spent_seconds: number
          word_count: number
        }[]
      }
      get_all_support_tickets: {
        Args: { _priority_filter?: string; _status_filter?: string }
        Returns: {
          created_at: string
          id: string
          last_reply_at: string
          last_reply_by: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: number
          updated_at: string
          user_email: string
        }[]
      }
      get_all_ticket_reviews: {
        Args: never
        Returns: {
          created_at: string
          id: string
          rating: number
          ticket_id: string
          user_email: string
        }[]
      }
      get_all_user_coins: {
        Args: never
        Returns: {
          balance: number
          created_at: string
          email: string
          id: string
          referral_code: string
          referred_by: string
          signup_coins_claimed: boolean
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }[]
      }
      get_all_winner_claims: {
        Args: never
        Returns: {
          admin_notes: string
          claim_email: string
          claim_name: string
          claim_position: number
          claimed_at: string
          created_at: string
          event_id: string
          id: string
          issued_at: string
          status: string
          submission_id: string
          user_email: string
          winner_id: string
          winner_type: string
        }[]
      }
      get_course_videos: {
        Args: { _course_id: string }
        Returns: {
          course_id: string
          created_at: string
          description: string
          duration_seconds: number
          id: string
          is_preview: boolean
          order_index: number
          thumbnail_url: string
          title: string
          video_url: string
        }[]
      }
      get_event_submission_counts: {
        Args: never
        Returns: {
          count: number
          event_id: string
        }[]
      }
      get_event_submissions: {
        Args: { _event_id: string }
        Returns: {
          submission_blog: string
          submission_id: string
          submission_name: string
          submission_title: string
        }[]
      }
      get_event_winners: {
        Args: { _event_id: string }
        Returns: {
          submission_name: string
          winner_id: string
          winner_position: number
        }[]
      }
      get_live_event_submissions: {
        Args: { _event_id: string }
        Returns: {
          submission_blog: string
          submission_id: string
          submission_name: string
          submission_title: string
          vote_count: number
        }[]
      }
      get_reel_event_submission_counts: {
        Args: never
        Returns: {
          count: number
          event_id: string
        }[]
      }
      get_submissions_with_votes: {
        Args: { _event_id: string }
        Returns: {
          blog_title: string
          email: string
          id: string
          name: string
          vote_count: number
        }[]
      }
      get_task_notifications: { Args: { _user_id: string }; Returns: Json }
      get_ticket_details: {
        Args: { _ticket_id: string }
        Returns: {
          closed_at: string
          created_at: string
          id: string
          last_reply_at: string
          last_reply_by: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: number
          updated_at: string
          user_email: string
          user_id: string
        }[]
      }
      get_ticket_messages: {
        Args: { _ticket_id: string }
        Returns: {
          attachments: Json
          body: string
          body_html: string
          created_at: string
          id: string
          is_internal_note: boolean
          sender_email: string
          sender_name: string
          sender_type: string
          ticket_id: string
        }[]
      }
      get_user_coin_transactions: {
        Args: { _user_id: string }
        Returns: {
          amount: number
          created_at: string
          description: string
          id: string
          source: string
          source_id: string
          transaction_type: string
          user_id: string
        }[]
      }
      get_votes_for_event: {
        Args: { _event_id: string }
        Returns: {
          blog_title: string
          created_at: string
          submission_id: string
          submission_name: string
          vote_id: string
          voter_name: string
        }[]
      }
      grant_participation_coins: {
        Args: { _email: string; _participation_type: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_audience_clicks: {
        Args: { user_id: string }
        Returns: undefined
      }
      increment_audience_opens: {
        Args: { user_id: string }
        Returns: undefined
      }
      increment_campaign_bounce: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      increment_campaign_click: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      increment_campaign_failed: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      increment_campaign_open: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      increment_campaign_sent: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      increment_campaign_unsubscribe: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      is_event_accepting_submissions: {
        Args: { _event_id: string }
        Returns: boolean
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: {
        Args: { _notification_id: string }
        Returns: boolean
      }
      reject_social_follow: { Args: { _follow_id: string }; Returns: boolean }
      send_admin_notification: {
        Args: {
          _action_url?: string
          _cta_text?: string
          _message: string
          _target_type?: string
          _target_users?: string[]
          _title: string
        }
        Returns: Json
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
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "awaiting_support" | "awaiting_user" | "closed"
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
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "awaiting_support", "awaiting_user", "closed"],
    },
  },
} as const
