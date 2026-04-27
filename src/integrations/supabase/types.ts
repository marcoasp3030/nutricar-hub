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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ad_contract_history: {
        Row: {
          changed_by: string | null
          contract_id: string
          created_at: string
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
        }
        Insert: {
          changed_by?: string | null
          contract_id: string
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          changed_by?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_contract_history_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ad_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_contracts: {
        Row: {
          created_at: string
          end_date: string | null
          fornecedor: string
          id: string
          notes: string | null
          package_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          fornecedor: string
          id?: string
          notes?: string | null
          package_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          fornecedor?: string
          id?: string
          notes?: string | null
          package_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_contracts_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "ad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_field_definitions: {
        Row: {
          applies_to: string
          created_at: string
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          name: string
          options: string[] | null
          sort_order: number
        }
        Insert: {
          applies_to?: string
          created_at?: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          name: string
          options?: string[] | null
          sort_order?: number
        }
        Update: {
          applies_to?: string
          created_at?: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          name?: string
          options?: string[] | null
          sort_order?: number
        }
        Relationships: []
      }
      ad_package_fornecedores: {
        Row: {
          created_at: string
          fornecedor: string
          id: string
          package_id: string
        }
        Insert: {
          created_at?: string
          fornecedor: string
          id?: string
          package_id: string
        }
        Update: {
          created_at?: string
          fornecedor?: string
          id?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_package_fornecedores_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "ad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_package_templates: {
        Row: {
          content_format: string | null
          created_at: string
          custom_fields: Json | null
          description: string | null
          display_frequency: string
          display_schedule: string | null
          duration_months: number
          id: string
          is_active: boolean
          media_type: string | null
          monthly_value: number
          name: string
          screen_position: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          content_format?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          display_frequency?: string
          display_schedule?: string | null
          duration_months?: number
          id?: string
          is_active?: boolean
          media_type?: string | null
          monthly_value?: number
          name: string
          screen_position?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          content_format?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          display_frequency?: string
          display_schedule?: string | null
          duration_months?: number
          id?: string
          is_active?: boolean
          media_type?: string | null
          monthly_value?: number
          name?: string
          screen_position?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      ad_packages: {
        Row: {
          content_format: string | null
          created_at: string
          custom_fields: Json | null
          description: string | null
          display_frequency: string
          display_schedule: string | null
          duration_months: number
          id: string
          is_active: boolean
          media_type: string | null
          monthly_value: number
          name: string
          playlist_id: string | null
          screen_position: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          content_format?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          display_frequency?: string
          display_schedule?: string | null
          duration_months?: number
          id?: string
          is_active?: boolean
          media_type?: string | null
          monthly_value?: number
          name: string
          playlist_id?: string | null
          screen_position?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          content_format?: string | null
          created_at?: string
          custom_fields?: Json | null
          description?: string | null
          display_frequency?: string
          display_schedule?: string | null
          duration_months?: number
          id?: string
          is_active?: boolean
          media_type?: string | null
          monthly_value?: number
          name?: string
          playlist_id?: string | null
          screen_position?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_packages_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_packages_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "public_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_payments: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          id: string
          month_ref: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          receipt_url: string | null
          status: string
        }
        Insert: {
          amount?: number
          contract_id: string
          created_at?: string
          id?: string
          month_ref: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          id?: string
          month_ref?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ad_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_audit_log: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          details: Json | null
          id: string
          instance_id: string | null
          template_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          instance_id?: string | null
          template_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          instance_id?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_audit_log_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "checklist_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_audit_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_instances: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          is_public: boolean
          location: string | null
          name: string
          ok_count: number
          pending_count: number
          priority: Database["public"]["Enums"]["checklist_priority"]
          problem_count: number
          progress: number
          start_date: string | null
          status: Database["public"]["Enums"]["checklist_status"]
          store: string | null
          team: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          name: string
          ok_count?: number
          pending_count?: number
          priority?: Database["public"]["Enums"]["checklist_priority"]
          problem_count?: number
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["checklist_status"]
          store?: string | null
          team?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          name?: string
          ok_count?: number
          pending_count?: number
          priority?: Database["public"]["Enums"]["checklist_priority"]
          problem_count?: number
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["checklist_status"]
          store?: string | null
          team?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_response_items: {
        Row: {
          actual_quantity: number | null
          created_at: string
          evidence_urls: string[] | null
          id: string
          instance_id: string
          is_blocking: boolean
          is_required: boolean
          item_name: string
          item_type: Database["public"]["Enums"]["checklist_item_type"]
          observation: string | null
          requires_action: boolean
          section_name: string | null
          signed_by: string | null
          sort_order: number
          status: Database["public"]["Enums"]["checklist_item_status"]
          template_item_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_quantity?: number | null
          created_at?: string
          evidence_urls?: string[] | null
          id?: string
          instance_id: string
          is_blocking?: boolean
          is_required?: boolean
          item_name: string
          item_type?: Database["public"]["Enums"]["checklist_item_type"]
          observation?: string | null
          requires_action?: boolean
          section_name?: string | null
          signed_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["checklist_item_status"]
          template_item_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_quantity?: number | null
          created_at?: string
          evidence_urls?: string[] | null
          id?: string
          instance_id?: string
          is_blocking?: boolean
          is_required?: boolean
          item_name?: string
          item_type?: Database["public"]["Enums"]["checklist_item_type"]
          observation?: string | null
          requires_action?: boolean
          section_name?: string | null
          signed_by?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["checklist_item_status"]
          template_item_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_response_items_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "checklist_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_response_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_items: {
        Row: {
          created_at: string
          default_observation: string | null
          default_quantity: number | null
          default_responsible: string | null
          id: string
          is_required: boolean
          item_type: Database["public"]["Enums"]["checklist_item_type"]
          name: string
          requires_attachments: boolean
          section_id: string
          sort_order: number
          unit: string | null
        }
        Insert: {
          created_at?: string
          default_observation?: string | null
          default_quantity?: number | null
          default_responsible?: string | null
          id?: string
          is_required?: boolean
          item_type?: Database["public"]["Enums"]["checklist_item_type"]
          name: string
          requires_attachments?: boolean
          section_id: string
          sort_order?: number
          unit?: string | null
        }
        Update: {
          created_at?: string
          default_observation?: string | null
          default_quantity?: number | null
          default_responsible?: string | null
          id?: string
          is_required?: boolean
          item_type?: Database["public"]["Enums"]["checklist_item_type"]
          name?: string
          requires_attachments?: boolean
          section_id?: string
          sort_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "checklist_template_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_sections: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          template_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          template_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      event_jobs: {
        Row: {
          address: string | null
          attachment_urls: string[] | null
          cache_type: Database["public"]["Enums"]["cache_type"]
          cache_value: number
          checklist_template_id: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          end_time: string | null
          event_type_id: string | null
          has_meals: boolean | null
          has_transport: boolean | null
          id: string
          leader_bonus: number
          map_link: string | null
          photo_urls: string[] | null
          promoter_slots: number
          requirements: string | null
          response_deadline_hours: number | null
          start_date: string
          start_time: string | null
          status: Database["public"]["Enums"]["job_status"]
          store_unit: string | null
          title: string
          travel_allowance: number | null
          uniform_notes: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["job_visibility"]
        }
        Insert: {
          address?: string | null
          attachment_urls?: string[] | null
          cache_type?: Database["public"]["Enums"]["cache_type"]
          cache_value?: number
          checklist_template_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          end_time?: string | null
          event_type_id?: string | null
          has_meals?: boolean | null
          has_transport?: boolean | null
          id?: string
          leader_bonus?: number
          map_link?: string | null
          photo_urls?: string[] | null
          promoter_slots?: number
          requirements?: string | null
          response_deadline_hours?: number | null
          start_date: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          store_unit?: string | null
          title: string
          travel_allowance?: number | null
          uniform_notes?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["job_visibility"]
        }
        Update: {
          address?: string | null
          attachment_urls?: string[] | null
          cache_type?: Database["public"]["Enums"]["cache_type"]
          cache_value?: number
          checklist_template_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          end_time?: string | null
          event_type_id?: string | null
          has_meals?: boolean | null
          has_transport?: boolean | null
          id?: string
          leader_bonus?: number
          map_link?: string | null
          photo_urls?: string[] | null
          promoter_slots?: number
          requirements?: string | null
          response_deadline_hours?: number | null
          start_date?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          store_unit?: string | null
          title?: string
          travel_allowance?: number | null
          uniform_notes?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["job_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "event_jobs_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_jobs_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          color: string | null
          created_at: string
          default_requirements: Json
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          default_requirements?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          default_requirements?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      fornecedor_tables: {
        Row: {
          created_at: string
          fornecedor: string
          id: string
          table_name: string
        }
        Insert: {
          created_at?: string
          fornecedor: string
          id?: string
          table_name: string
        }
        Update: {
          created_at?: string
          fornecedor?: string
          id?: string
          table_name?: string
        }
        Relationships: []
      }
      job_assignments: {
        Row: {
          admin_comment: string | null
          admin_rating: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          checkin_at: string | null
          checkin_photo_url: string | null
          checkout_at: string | null
          checkout_photo_url: string | null
          created_at: string
          evidence_urls: string[] | null
          execution_notes: string | null
          id: string
          job_id: string
          promoter_comment: string | null
          promoter_id: string
          promoter_rating: number | null
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
        }
        Insert: {
          admin_comment?: string | null
          admin_rating?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checkin_at?: string | null
          checkin_photo_url?: string | null
          checkout_at?: string | null
          checkout_photo_url?: string | null
          created_at?: string
          evidence_urls?: string[] | null
          execution_notes?: string | null
          id?: string
          job_id: string
          promoter_comment?: string | null
          promoter_id: string
          promoter_rating?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Update: {
          admin_comment?: string | null
          admin_rating?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checkin_at?: string | null
          checkin_photo_url?: string | null
          checkout_at?: string | null
          checkout_photo_url?: string | null
          created_at?: string
          evidence_urls?: string[] | null
          execution_notes?: string | null
          id?: string
          job_id?: string
          promoter_comment?: string | null
          promoter_id?: string
          promoter_rating?: number | null
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "event_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "promoter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_audit_log: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          details: Json | null
          id: string
          job_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          job_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_audit_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "event_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          job_id: string
          promoter_id: string
          rejected_at: string | null
          rejection_reason: string | null
          response: Database["public"]["Enums"]["invite_response"]
          type: Database["public"]["Enums"]["invite_type"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          job_id: string
          promoter_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          response?: Database["public"]["Enums"]["invite_response"]
          type?: Database["public"]["Enums"]["invite_type"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          job_id?: string
          promoter_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          response?: Database["public"]["Enums"]["invite_response"]
          type?: Database["public"]["Enums"]["invite_type"]
        }
        Relationships: [
          {
            foreignKeyName: "job_invites_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "event_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_invites_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "promoter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_payments: {
        Row: {
          amount: number
          assignment_id: string
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          notes: string | null
          paid_at: string | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          assignment_id: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_at?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          assignment_id?: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          notes?: string | null
          paid_at?: string | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_payments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "job_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      lgpd_consents: {
        Row: {
          consent_type: string
          consented_at: string
          id: string
          ip_address: string | null
          revoked_at: string | null
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          consent_type?: string
          consented_at?: string
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
          version?: string
        }
        Update: {
          consent_type?: string
          consented_at?: string
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      lgpd_documents: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          type: string
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          type: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: []
      }
      lgpd_requests: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          id: string
          reason: string | null
          request_type: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          id?: string
          reason?: string | null
          request_type?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          id?: string
          reason?: string | null
          request_type?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          created_at: string
          duration_seconds: number
          file_name: string | null
          id: string
          media_type: string
          media_url: string
          playlist_id: string
          rotation: number
          slide_data: Json | null
          sort_order: number
          transition: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          file_name?: string | null
          id?: string
          media_type: string
          media_url: string
          playlist_id: string
          rotation?: number
          slide_data?: Json | null
          sort_order?: number
          transition?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          file_name?: string | null
          id?: string
          media_type?: string
          media_url?: string
          playlist_id?: string
          rotation?: number
          slide_data?: Json | null
          sort_order?: number
          transition?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "public_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          bg_color: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          logo_opacity: number | null
          logo_position: string | null
          logo_size: number | null
          logo_url: string | null
          media_fit: string
          name: string
          orientation: string
          schedule_end: string | null
          schedule_start: string | null
          tags: string[] | null
          updated_at: string
          volume: number
        }
        Insert: {
          bg_color?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_opacity?: number | null
          logo_position?: string | null
          logo_size?: number | null
          logo_url?: string | null
          media_fit?: string
          name: string
          orientation?: string
          schedule_end?: string | null
          schedule_start?: string | null
          tags?: string[] | null
          updated_at?: string
          volume?: number
        }
        Update: {
          bg_color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_opacity?: number | null
          logo_position?: string | null
          logo_size?: number | null
          logo_url?: string | null
          media_fit?: string
          name?: string
          orientation?: string
          schedule_end?: string | null
          schedule_start?: string | null
          tags?: string[] | null
          updated_at?: string
          volume?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cnpj: string | null
          created_at: string
          financial_email: string | null
          fornecedor: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          registration_status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          financial_email?: string | null
          fornecedor?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          registration_status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          financial_email?: string | null
          fornecedor?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          registration_status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promoter_profiles: {
        Row: {
          avg_rating: number | null
          bio: string | null
          city: string | null
          created_at: string
          doc_urls: string[] | null
          id: string
          is_leader: boolean
          portfolio_urls: string[] | null
          service_radius_km: number | null
          stage_name: string | null
          state: string | null
          status: Database["public"]["Enums"]["promoter_status"]
          total_jobs: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_rating?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string
          doc_urls?: string[] | null
          id?: string
          is_leader?: boolean
          portfolio_urls?: string[] | null
          service_radius_km?: number | null
          stage_name?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["promoter_status"]
          total_jobs?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_rating?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string
          doc_urls?: string[] | null
          id?: string
          is_leader?: boolean
          portfolio_urls?: string[] | null
          service_radius_km?: number | null
          stage_name?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["promoter_status"]
          total_jobs?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_tv_units: {
        Row: {
          created_at: string
          id: string
          is_online: boolean
          label: string
          last_seen_at: string | null
          notes: string | null
          playlist_id: string | null
          store_id: string
          tv_format: string
          tv_inches: number | null
          tv_model: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_online?: boolean
          label?: string
          last_seen_at?: string | null
          notes?: string | null
          playlist_id?: string | null
          store_id: string
          tv_format?: string
          tv_inches?: number | null
          tv_model?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_online?: boolean
          label?: string
          last_seen_at?: string | null
          notes?: string | null
          playlist_id?: string | null
          store_id?: string
          tv_format?: string
          tv_inches?: number | null
          tv_model?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_tv_units_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_tv_units_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "public_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_tv_units_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "store_tvs"
            referencedColumns: ["id"]
          },
        ]
      }
      store_tvs: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          notes: string | null
          playlist_id: string | null
          store_name: string
          tv_format: string
          tv_inches: number | null
          tv_model: string | null
          tv_quantity: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          playlist_id?: string | null
          store_name: string
          tv_format?: string
          tv_inches?: number | null
          tv_model?: string | null
          tv_quantity?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          playlist_id?: string | null
          store_name?: string
          tv_format?: string
          tv_inches?: number | null
          tv_model?: string | null
          tv_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_tvs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_tvs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "public_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_api_keys: {
        Row: {
          api_key: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          label: string
          last_used_at: string | null
        }
        Insert: {
          api_key?: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string
          last_used_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string
          last_used_at?: string | null
        }
        Relationships: []
      }
      tv_api_rate_limits: {
        Row: {
          api_key_id: string
          id: string
          request_count: number
          window_start: string
        }
        Insert: {
          api_key_id: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Update: {
          api_key_id?: string
          id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_api_rate_limits_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "tv_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_commands: {
        Row: {
          acknowledged_at: string | null
          command: string
          created_at: string
          created_by: string | null
          id: string
          payload: Json | null
          status: string
          unit_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          command: string
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json | null
          status?: string
          unit_id: string
        }
        Update: {
          acknowledged_at?: string | null
          command?: string
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json | null
          status?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_commands_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "store_tv_units"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_connectivity_log: {
        Row: {
          created_at: string
          id: string
          status: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status: string
          unit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_connectivity_log_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "store_tv_units"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_logs: {
        Row: {
          created_at: string
          details: Json | null
          event: string
          id: string
          level: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event: string
          id?: string
          level?: string
          unit_id: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event?: string
          id?: string
          level?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_logs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "store_tv_units"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_ota_releases: {
        Row: {
          channel: string
          checksum_sha256: string | null
          created_at: string
          created_by: string
          file_size_bytes: number | null
          file_url: string | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          min_version_code: number | null
          release_notes: string | null
          updated_at: string
          version: string
          version_code: number
        }
        Insert: {
          channel?: string
          checksum_sha256?: string | null
          created_at?: string
          created_by: string
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          min_version_code?: number | null
          release_notes?: string | null
          updated_at?: string
          version: string
          version_code: number
        }
        Update: {
          channel?: string
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          min_version_code?: number | null
          release_notes?: string | null
          updated_at?: string
          version?: string
          version_code?: number
        }
        Relationships: []
      }
      user_fornecedores: {
        Row: {
          created_at: string
          fornecedor: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fornecedor: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fornecedor?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_playlists: {
        Row: {
          bg_color: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          logo_opacity: number | null
          logo_position: string | null
          logo_size: number | null
          logo_url: string | null
          media_fit: string | null
          name: string | null
          orientation: string | null
          schedule_end: string | null
          schedule_start: string | null
          tags: string[] | null
          volume: number | null
        }
        Insert: {
          bg_color?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_opacity?: number | null
          logo_position?: string | null
          logo_size?: number | null
          logo_url?: string | null
          media_fit?: string | null
          name?: string | null
          orientation?: string | null
          schedule_end?: string | null
          schedule_start?: string | null
          tags?: string[] | null
          volume?: number | null
        }
        Update: {
          bg_color?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_opacity?: number | null
          logo_position?: string | null
          logo_size?: number | null
          logo_url?: string | null
          media_fit?: string | null
          name?: string | null
          orientation?: string | null
          schedule_end?: string | null
          schedule_start?: string | null
          tags?: string[] | null
          volume?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_fornecedor: { Args: { _user_id: string }; Returns: string }
      get_user_fornecedores: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "fornecedor" | "gerente" | "funcionario"
      assignment_status:
        | "reservado"
        | "confirmado"
        | "substituicao"
        | "cancelado"
      cache_type: "por_hora" | "por_dia" | "fechado"
      checklist_item_status:
        | "pendente"
        | "em_execucao"
        | "ok"
        | "nao_aplicavel"
        | "problema"
      checklist_item_type:
        | "checkbox"
        | "quantidade"
        | "texto"
        | "sim_nao"
        | "data_hora"
        | "foto"
        | "assinatura"
      checklist_priority: "baixa" | "media" | "alta" | "urgente"
      checklist_status:
        | "rascunho"
        | "em_andamento"
        | "concluido"
        | "aprovado"
        | "reprovado"
        | "arquivado"
      invite_response:
        | "pendente"
        | "aceito"
        | "recusado"
        | "expirado"
        | "cancelado"
      invite_type: "convite" | "candidatura"
      job_status:
        | "rascunho"
        | "publicado"
        | "em_negociacao"
        | "confirmado"
        | "em_execucao"
        | "concluido"
        | "cancelado"
      job_visibility: "aberto" | "convidadas" | "atribuido_direto"
      payment_method: "pix" | "transferencia" | "outro"
      payment_status: "pendente" | "aprovado" | "pago" | "contestado"
      promoter_status: "pendente" | "aprovado" | "bloqueado"
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
      app_role: ["admin", "fornecedor", "gerente", "funcionario"],
      assignment_status: [
        "reservado",
        "confirmado",
        "substituicao",
        "cancelado",
      ],
      cache_type: ["por_hora", "por_dia", "fechado"],
      checklist_item_status: [
        "pendente",
        "em_execucao",
        "ok",
        "nao_aplicavel",
        "problema",
      ],
      checklist_item_type: [
        "checkbox",
        "quantidade",
        "texto",
        "sim_nao",
        "data_hora",
        "foto",
        "assinatura",
      ],
      checklist_priority: ["baixa", "media", "alta", "urgente"],
      checklist_status: [
        "rascunho",
        "em_andamento",
        "concluido",
        "aprovado",
        "reprovado",
        "arquivado",
      ],
      invite_response: [
        "pendente",
        "aceito",
        "recusado",
        "expirado",
        "cancelado",
      ],
      invite_type: ["convite", "candidatura"],
      job_status: [
        "rascunho",
        "publicado",
        "em_negociacao",
        "confirmado",
        "em_execucao",
        "concluido",
        "cancelado",
      ],
      job_visibility: ["aberto", "convidadas", "atribuido_direto"],
      payment_method: ["pix", "transferencia", "outro"],
      payment_status: ["pendente", "aprovado", "pago", "contestado"],
      promoter_status: ["pendente", "aprovado", "bloqueado"],
    },
  },
} as const
