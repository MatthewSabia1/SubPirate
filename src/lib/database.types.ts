export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'read' | 'edit' | 'owner'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: 'read' | 'edit' | 'owner'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'read' | 'edit' | 'owner'
          created_at?: string
          updated_at?: string
        }
      }
      subreddits: {
        Row: {
          id: string
          name: string
          subscriber_count: number
          active_users: number
          marketing_friendly_score: number
          posting_requirements: Json
          posting_frequency: Json
          allowed_content: string[]
          best_practices: string[]
          rules_summary: string | null
          title_template: string | null
          last_analyzed_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          subscriber_count?: number
          active_users?: number
          marketing_friendly_score?: number
          posting_requirements?: Json
          posting_frequency?: Json
          allowed_content?: string[]
          best_practices?: string[]
          rules_summary?: string | null
          title_template?: string | null
          last_analyzed_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          subscriber_count?: number
          active_users?: number
          marketing_friendly_score?: number
          posting_requirements?: Json
          posting_frequency?: Json
          allowed_content?: string[]
          best_practices?: string[]
          rules_summary?: string | null
          title_template?: string | null
          last_analyzed_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      project_subreddits: {
        Row: {
          id: string
          project_id: string
          subreddit_id: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          subreddit_id: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          subreddit_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_project_role: {
        Args: {
          project_uuid: string
        }
        Returns: 'read' | 'edit' | 'owner'
      }
    }
    Enums: {
      project_role: 'read' | 'edit' | 'owner'
    }
  }
}