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
      archived_quiz_results: {
        Row: {
          archived_at: string | null
          demographics: Json | null
          id: string
          likert_responses: Json | null
          open_ended_responses: Json | null
          primary_virtue: string | null
          secondary_virtue: string | null
          user_id: string
          virtue_scores: Json | null
        }
        Insert: {
          archived_at?: string | null
          demographics?: Json | null
          id?: string
          likert_responses?: Json | null
          open_ended_responses?: Json | null
          primary_virtue?: string | null
          secondary_virtue?: string | null
          user_id: string
          virtue_scores?: Json | null
        }
        Update: {
          archived_at?: string | null
          demographics?: Json | null
          id?: string
          likert_responses?: Json | null
          open_ended_responses?: Json | null
          primary_virtue?: string | null
          secondary_virtue?: string | null
          user_id?: string
          virtue_scores?: Json | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      blogs: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          id: string
          image_url: string | null
          is_published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      circle_members: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_admin: boolean | null
          circle_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          status: string | null
          suggested_by_system: boolean | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_admin?: boolean | null
          circle_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          status?: string | null
          suggested_by_system?: boolean | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_admin?: boolean | null
          circle_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          status?: string | null
          suggested_by_system?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_members_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circle_messages: {
        Row: {
          circle_id: string
          content: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          circle_id: string
          content: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          circle_id?: string
          content?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "circle_messages_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      circles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          event_id: string | null
          id: string
          max_members: number | null
          name: string
          primary_virtue: string | null
          status: Database["public"]["Enums"]["circle_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          max_members?: number | null
          name: string
          primary_virtue?: string | null
          status?: Database["public"]["Enums"]["circle_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          max_members?: number | null
          name?: string
          primary_virtue?: string | null
          status?: Database["public"]["Enums"]["circle_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "circles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          launched_at: string | null
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          launched_at?: string | null
          name: string
          state: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          launched_at?: string | null
          name?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          email_type: string
          error_message: string | null
          id: string
          recipient_count: number
          recipient_emails: string[] | null
          sent_at: string
          sent_by: string | null
          status: string
          subject: string
        }
        Insert: {
          email_type: string
          error_message?: string | null
          id?: string
          recipient_count?: number
          recipient_emails?: string[] | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject: string
        }
        Update: {
          email_type?: string
          error_message?: string | null
          id?: string
          recipient_count?: number
          recipient_emails?: string[] | null
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "safe_member_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_feedback: {
        Row: {
          created_at: string | null
          event_id: string
          feedback: string | null
          id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          feedback?: string | null
          id?: string
          rating?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          feedback?: string | null
          id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_feedback_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          attended_at: string | null
          created_at: string | null
          event_id: string
          id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["rsvp_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attended_at?: string | null
          created_at?: string | null
          event_id: string
          id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attended_at?: string | null
          created_at?: string | null
          event_id?: string
          id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          circle_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          event_date: string
          event_notes: string | null
          id: string
          image_url: string | null
          is_completed: boolean | null
          lead_guide_id: string | null
          location: string | null
          max_participants: number | null
          meetup_type: string | null
          status: Database["public"]["Enums"]["event_status"] | null
          title: string
          updated_at: string | null
          venue_address: string | null
          venue_city: string | null
          venue_name: string | null
        }
        Insert: {
          circle_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          event_date: string
          event_notes?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean | null
          lead_guide_id?: string | null
          location?: string | null
          max_participants?: number | null
          meetup_type?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          title: string
          updated_at?: string | null
          venue_address?: string | null
          venue_city?: string | null
          venue_name?: string | null
        }
        Update: {
          circle_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          event_date?: string
          event_notes?: string | null
          id?: string
          image_url?: string | null
          is_completed?: boolean | null
          lead_guide_id?: string | null
          location?: string | null
          max_participants?: number | null
          meetup_type?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          title?: string
          updated_at?: string | null
          venue_address?: string | null
          venue_city?: string | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          category: string
          created_at: string
          date_label: string | null
          display_order: number
          id: string
          image_url: string
          is_visible: boolean
          title: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          date_label?: string | null
          display_order?: number
          id?: string
          image_url: string
          is_visible?: boolean
          title: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          date_label?: string | null
          display_order?: number
          id?: string
          image_url?: string
          is_visible?: boolean
          title?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      guide_applications: {
        Row: {
          admin_notes: string | null
          availability: string | null
          city: string | null
          created_at: string
          email: string
          experience: string | null
          first_name: string
          honeypot: string | null
          id: string
          last_name: string
          linkedin_url: string | null
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string | null
          why_guide: string
        }
        Insert: {
          admin_notes?: string | null
          availability?: string | null
          city?: string | null
          created_at?: string
          email: string
          experience?: string | null
          first_name: string
          honeypot?: string | null
          id?: string
          last_name: string
          linkedin_url?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
          why_guide: string
        }
        Update: {
          admin_notes?: string | null
          availability?: string | null
          city?: string | null
          created_at?: string
          email?: string
          experience?: string | null
          first_name?: string
          honeypot?: string | null
          id?: string
          last_name?: string
          linkedin_url?: string | null
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
          why_guide?: string
        }
        Relationships: []
      }
      guide_circle_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          circle_id: string
          guide_id: string
          id: string
          is_active: boolean | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          circle_id: string
          guide_id: string
          id?: string
          is_active?: boolean | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          circle_id?: string
          guide_id?: string
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_circle_assignments_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_events: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      manager_regions: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          region_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          region_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          region_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_regions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      meetup_attendance: {
        Row: {
          attended: boolean | null
          checked_in_at: string | null
          checked_in_by: string | null
          circle_id: string | null
          created_at: string | null
          event_id: string
          guide_id: string | null
          id: string
          notes: string | null
          rsvp_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attended?: boolean | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          circle_id?: string | null
          created_at?: string | null
          event_id: string
          guide_id?: string | null
          id?: string
          notes?: string | null
          rsvp_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attended?: boolean | null
          checked_in_at?: string | null
          checked_in_by?: string | null
          circle_id?: string | null
          created_at?: string | null
          event_id?: string
          guide_id?: string | null
          id?: string
          notes?: string | null
          rsvp_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetup_attendance_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetup_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      message_flags: {
        Row: {
          flagged_at: string | null
          flagged_by: string
          id: string
          message_id: string
          reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          flagged_at?: string | null
          flagged_by: string
          id?: string
          message_id: string
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          flagged_at?: string | null
          flagged_by?: string
          id?: string
          message_id?: string
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_flags_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "circle_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      partner_applications: {
        Row: {
          additional_info: string | null
          address: string | null
          admin_notes: string | null
          business_name: string
          business_type: string | null
          city: string | null
          contact_name: string
          created_at: string
          email: string
          honeypot: string | null
          id: string
          partnership_interest: string
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          additional_info?: string | null
          address?: string | null
          admin_notes?: string | null
          business_name: string
          business_type?: string | null
          city?: string | null
          contact_name: string
          created_at?: string
          email: string
          honeypot?: string | null
          id?: string
          partnership_interest: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          additional_info?: string | null
          address?: string | null
          admin_notes?: string | null
          business_name?: string
          business_type?: string | null
          city?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          honeypot?: string | null
          id?: string
          partnership_interest?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      pii_access_log: {
        Row: {
          access_type: string
          accessed_at: string
          accessed_by: string
          accessed_by_role: string | null
          fields_accessed: string[] | null
          id: string
          ip_address: string | null
          member_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string
          accessed_by: string
          accessed_by_role?: string | null
          fields_accessed?: string[] | null
          id?: string
          ip_address?: string | null
          member_id?: string | null
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string
          accessed_by?: string
          accessed_by_role?: string | null
          fields_accessed?: string[] | null
          id?: string
          ip_address?: string | null
          member_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          annual_income: string | null
          availability: Json | null
          city: string | null
          city_id: string | null
          communication_preference:
            | Database["public"]["Enums"]["communication_preference"]
            | null
          created_at: string
          current_plan: Database["public"]["Enums"]["subscription_plan"] | null
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          flag_reason: string | null
          flagged_for_review: boolean
          founding_100: boolean | null
          founding_discount_until: string | null
          gender_identity: string | null
          id: string
          id_verified: boolean | null
          id_verified_at: string | null
          last_name: string | null
          manually_assigned: boolean
          manually_assigned_at: string | null
          occupation: string | null
          orientation: string | null
          phone: string | null
          plan_started_at: string | null
          primary_virtue: string | null
          quiz_attempt_count: number
          region_id: string | null
          secondary_virtue: string | null
          state: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string
          virtue_scores: Json | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          annual_income?: string | null
          availability?: Json | null
          city?: string | null
          city_id?: string | null
          communication_preference?:
            | Database["public"]["Enums"]["communication_preference"]
            | null
          created_at?: string
          current_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          flag_reason?: string | null
          flagged_for_review?: boolean
          founding_100?: boolean | null
          founding_discount_until?: string | null
          gender_identity?: string | null
          id: string
          id_verified?: boolean | null
          id_verified_at?: string | null
          last_name?: string | null
          manually_assigned?: boolean
          manually_assigned_at?: string | null
          occupation?: string | null
          orientation?: string | null
          phone?: string | null
          plan_started_at?: string | null
          primary_virtue?: string | null
          quiz_attempt_count?: number
          region_id?: string | null
          secondary_virtue?: string | null
          state?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          virtue_scores?: Json | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          annual_income?: string | null
          availability?: Json | null
          city?: string | null
          city_id?: string | null
          communication_preference?:
            | Database["public"]["Enums"]["communication_preference"]
            | null
          created_at?: string
          current_plan?: Database["public"]["Enums"]["subscription_plan"] | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          flag_reason?: string | null
          flagged_for_review?: boolean
          founding_100?: boolean | null
          founding_discount_until?: string | null
          gender_identity?: string | null
          id?: string
          id_verified?: boolean | null
          id_verified_at?: string | null
          last_name?: string | null
          manually_assigned?: boolean
          manually_assigned_at?: string | null
          occupation?: string | null
          orientation?: string | null
          phone?: string | null
          plan_started_at?: string | null
          primary_virtue?: string | null
          quiz_attempt_count?: number
          region_id?: string | null
          secondary_virtue?: string | null
          state?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
          virtue_scores?: Json | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_usages: {
        Row: {
          checkout_session_id: string | null
          id: string
          promo_code_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          checkout_session_id?: string | null
          id?: string
          promo_code_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          checkout_session_id?: string | null
          id?: string
          promo_code_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usages_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          applicable_prices: string[] | null
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          stripe_coupon_id: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_prices?: string[] | null
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          stripe_coupon_id: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_prices?: string[] | null
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          stripe_coupon_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      quiz_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number
          demographics: Json | null
          id: string
          likert_responses: Json | null
          open_ended_responses: Json | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          demographics?: Json | null
          id: string
          likert_responses?: Json | null
          open_ended_responses?: Json | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          demographics?: Json | null
          id?: string
          likert_responses?: Json | null
          open_ended_responses?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          endpoint: string
          id: string
          last_request_at: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          endpoint: string
          id?: string
          last_request_at?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          endpoint?: string
          id?: string
          last_request_at?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      retest_permissions: {
        Row: {
          circle_id: string | null
          created_at: string | null
          enabled: boolean | null
          enabled_at: string | null
          enabled_by: string | null
          expires_at: string | null
          id: string
          is_system_wide: boolean | null
          notes: string | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          circle_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          enabled_at?: string | null
          enabled_by?: string | null
          expires_at?: string | null
          id?: string
          is_system_wide?: boolean | null
          notes?: string | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          circle_id?: string | null
          created_at?: string | null
          enabled?: boolean | null
          enabled_at?: string | null
          enabled_by?: string | null
          expires_at?: string | null
          id?: string
          is_system_wide?: boolean | null
          notes?: string | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retest_permissions_circle_id_fkey"
            columns: ["circle_id"]
            isOneToOne: false
            referencedRelation: "circles"
            referencedColumns: ["id"]
          },
        ]
      }
      soulmate_waitlist: {
        Row: {
          age_range: string | null
          city: string | null
          created_at: string | null
          email: string
          first_name: string | null
          gender: string | null
          honeypot: string | null
          id: string
          last_name: string | null
          looking_for: string | null
          notes: string | null
          phone: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          age_range?: string | null
          city?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          gender?: string | null
          honeypot?: string | null
          id?: string
          last_name?: string | null
          looking_for?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          age_range?: string | null
          city?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          gender?: string | null
          honeypot?: string | null
          id?: string
          last_name?: string | null
          looking_for?: string | null
          notes?: string | null
          phone?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          image_url: string | null
          is_visible: boolean | null
          location: string | null
          name: string
          rating: number | null
          review: string
          updated_at: string
          virtue: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_visible?: boolean | null
          location?: string | null
          name: string
          rating?: number | null
          review: string
          updated_at?: string
          virtue?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_visible?: boolean | null
          location?: string | null
          name?: string
          rating?: number | null
          review?: string
          updated_at?: string
          virtue?: string | null
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
      user_waivers: {
        Row: {
          id: string
          ip_address: string | null
          signed_at: string | null
          user_id: string
          waiver_type: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          signed_at?: string | null
          user_id: string
          waiver_type: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          signed_at?: string | null
          user_id?: string
          waiver_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      safe_member_profiles: {
        Row: {
          city: string | null
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          primary_virtue: string | null
          secondary_virtue: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          primary_virtue?: string | null
          secondary_virtue?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          primary_virtue?: string | null
          secondary_virtue?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_user_data: {
        Args: { _accessor_id: string; _target_user_id: string }
        Returns: boolean
      }
      can_user_retest: { Args: { user_uuid: string }; Returns: boolean }
      circle_member_user_ids: { Args: { _user_id: string }; Returns: string[] }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_guide_for_event: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      manager_has_region_access: {
        Args: { _region_id: string; _user_id: string }
        Returns: boolean
      }
      user_circle_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "super_admin"
        | "vc_manager"
        | "vc_guide"
        | "vc_member"
      circle_status: "forming" | "active" | "completed" | "archived"
      communication_preference: "email" | "sms" | "both"
      event_status: "upcoming" | "active" | "completed" | "cancelled"
      notification_type:
        | "event_reminder"
        | "schedule_update"
        | "retest_available"
        | "announcement"
        | "circle_assignment"
        | "message"
      rsvp_status: "pending" | "confirmed" | "declined" | "attended" | "no_show"
      subscription_plan: "pathfinder" | "virtue_circles" | "soulmatch_ai"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "super_admin",
        "vc_manager",
        "vc_guide",
        "vc_member",
      ],
      circle_status: ["forming", "active", "completed", "archived"],
      communication_preference: ["email", "sms", "both"],
      event_status: ["upcoming", "active", "completed", "cancelled"],
      notification_type: [
        "event_reminder",
        "schedule_update",
        "retest_available",
        "announcement",
        "circle_assignment",
        "message",
      ],
      rsvp_status: ["pending", "confirmed", "declined", "attended", "no_show"],
      subscription_plan: ["pathfinder", "virtue_circles", "soulmatch_ai"],
    },
  },
} as const
