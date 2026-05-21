export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      issues: {
        Row: {
          number: number;
          title: string;
          body: string | null;
          url: string;
          classified_as: string | null;
          created_at: string;
        };
        Insert: {
          number: number;
          title: string;
          body?: string | null;
          url: string;
          classified_as?: string | null;
          created_at?: string;
        };
        Update: {
          number?: number;
          title?: string;
          body?: string | null;
          url?: string;
          classified_as?: string | null;
        };
      };
      sessions: {
        Row: {
          devin_session_id: string;
          kind: string;
          parent_session_id: string | null;
          issue_number: number;
          status: string;
          pr_url: string | null;
          acu_cost: number | null;
          devin_url: string;
          auto_approved: boolean;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          devin_session_id: string;
          kind: string;
          parent_session_id?: string | null;
          issue_number: number;
          status: string;
          pr_url?: string | null;
          acu_cost?: number | null;
          devin_url: string;
          auto_approved?: boolean;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          pr_url?: string | null;
          acu_cost?: number | null;
          auto_approved?: boolean;
          error_message?: string | null;
          updated_at?: string;
        };
      };
      analyses: {
        Row: {
          session_id: string;
          issue_number: number;
          summary: string;
          proposed_plan: Json;
          files_to_change: Json;
          risk_factors: Json;
          estimated_scope: string;
          raw_output: string;
          user_messages: Json;
          approved_at: string | null;
          created_at: string;
        };
        Insert: {
          session_id: string;
          issue_number: number;
          summary: string;
          proposed_plan: Json;
          files_to_change: Json;
          risk_factors: Json;
          estimated_scope: string;
          raw_output: string;
          user_messages?: Json;
          approved_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_messages?: Json;
          approved_at?: string | null;
        };
      };
      knowledge_entries: {
        Row: {
          tag: string;
          devin_id: string;
          seeded_at: string;
        };
        Insert: {
          tag: string;
          devin_id: string;
          seeded_at?: string;
        };
        Update: {
          devin_id?: string;
        };
      };
    };
  };
};
