export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          approved_at: string | null
          created_at: string | null
          estimated_scope: string
          files_to_change: Json
          issue_number: number
          proposed_plan: Json
          raw_output: string
          risk_factors: Json
          session_id: string
          summary: string
          user_messages: Json
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          estimated_scope: string
          files_to_change?: Json
          issue_number: number
          proposed_plan?: Json
          raw_output: string
          risk_factors?: Json
          session_id: string
          summary: string
          user_messages?: Json
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          estimated_scope?: string
          files_to_change?: Json
          issue_number?: number
          proposed_plan?: Json
          raw_output?: string
          risk_factors?: Json
          session_id?: string
          summary?: string
          user_messages?: Json
        }
        Relationships: [
          {
            foreignKeyName: "analyses_issue_number_fkey"
            columns: ["issue_number"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["number"]
          },
          {
            foreignKeyName: "analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["devin_session_id"]
          },
        ]
      }
      issues: {
        Row: {
          body: string | null
          classified_as: string | null
          created_at: string | null
          number: number
          title: string
          url: string
        }
        Insert: {
          body?: string | null
          classified_as?: string | null
          created_at?: string | null
          number: number
          title: string
          url: string
        }
        Update: {
          body?: string | null
          classified_as?: string | null
          created_at?: string | null
          number?: number
          title?: string
          url?: string
        }
        Relationships: []
      }
      knowledge_entries: {
        Row: {
          devin_id: string
          seeded_at: string | null
          tag: string
        }
        Insert: {
          devin_id: string
          seeded_at?: string | null
          tag: string
        }
        Update: {
          devin_id?: string
          seeded_at?: string | null
          tag?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          acu_cost: number | null
          auto_approved: boolean | null
          created_at: string | null
          devin_session_id: string
          devin_url: string
          error_message: string | null
          issue_number: number
          kind: string
          parent_session_id: string | null
          pr_url: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          acu_cost?: number | null
          auto_approved?: boolean | null
          created_at?: string | null
          devin_session_id: string
          devin_url: string
          error_message?: string | null
          issue_number: number
          kind: string
          parent_session_id?: string | null
          pr_url?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          acu_cost?: number | null
          auto_approved?: boolean | null
          created_at?: string | null
          devin_session_id?: string
          devin_url?: string
          error_message?: string | null
          issue_number?: number
          kind?: string
          parent_session_id?: string | null
          pr_url?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_issue_number_fkey"
            columns: ["issue_number"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["number"]
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
