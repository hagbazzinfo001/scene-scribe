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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_usage_analytics: {
        Row: {
          cost_estimate: number
          created_at: string
          endpoint: string
          error_type: string | null
          id: string
          model: string
          project_id: string | null
          provider: string
          response_time_ms: number | null
          success: boolean
          tokens_used: number
          user_id: string
        }
        Insert: {
          cost_estimate?: number
          created_at?: string
          endpoint: string
          error_type?: string | null
          id?: string
          model: string
          project_id?: string | null
          provider?: string
          response_time_ms?: number | null
          success?: boolean
          tokens_used?: number
          user_id?: string
        }
        Update: {
          cost_estimate?: number
          created_at?: string
          endpoint?: string
          error_type?: string | null
          id?: string
          model?: string
          project_id?: string | null
          provider?: string
          response_time_ms?: number | null
          success?: boolean
          tokens_used?: number
          user_id?: string
        }
        Relationships: []
      }
      analysis_cache: {
        Row: {
          analysis_type: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          project_id: string | null
          result: Json | null
          script_hash: string | null
        }
        Insert: {
          analysis_type?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          project_id?: string | null
          result?: Json | null
          script_hash?: string | null
        }
        Update: {
          analysis_type?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          project_id?: string | null
          result?: Json | null
          script_hash?: string | null
        }
        Relationships: []
      }
      audio_files: {
        Row: {
          created_at: string | null
          duration: number | null
          file_size: number | null
          file_url: string
          filename: string
          id: string
          mime: string | null
          owner_id: string | null
          path: string | null
          project_id: string | null
          size: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          file_url: string
          filename: string
          id?: string
          mime?: string | null
          owner_id?: string | null
          path?: string | null
          project_id?: string | null
          size?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          file_url?: string
          filename?: string
          id?: string
          mime?: string | null
          owner_id?: string | null
          path?: string | null
          project_id?: string | null
          size?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      breakdowns: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          script_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
          script_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          script_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breakdowns_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_history: {
        Row: {
          created_at: string | null
          id: string
          is_ai_response: boolean | null
          message: string
          metadata: Json | null
          project_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_ai_response?: boolean | null
          message: string
          metadata?: Json | null
          project_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_ai_response?: boolean | null
          message?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          is_ai_response: boolean | null
          message: string
          metadata: Json | null
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_ai_response?: boolean | null
          message: string
          metadata?: Json | null
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_ai_response?: boolean | null
          message?: string
          metadata?: Json | null
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      dev_logs: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          level: string
          message: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          level: string
          message: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          level?: string
          message?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dev_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          ai_model: string | null
          ai_provider: string | null
          asset_id: string | null
          completed_at: string | null
          cost_estimate: number | null
          created_at: string | null
          error: string | null
          error_message: string | null
          id: string
          input_data: Json
          input_path: string | null
          output_data: Json | null
          output_path: string | null
          payload: Json | null
          processing_time_ms: number | null
          project_id: string | null
          result: Json | null
          status: string | null
          tokens_used: number | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_provider?: string | null
          asset_id?: string | null
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          error?: string | null
          error_message?: string | null
          id?: string
          input_data: Json
          input_path?: string | null
          output_data?: Json | null
          output_path?: string | null
          payload?: Json | null
          processing_time_ms?: number | null
          project_id?: string | null
          result?: Json | null
          status?: string | null
          tokens_used?: number | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string | null
          asset_id?: string | null
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          error?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json
          input_path?: string | null
          output_data?: Json | null
          output_path?: string | null
          payload?: Json | null
          processing_time_ms?: number | null
          project_id?: string | null
          result?: Json | null
          status?: string | null
          tokens_used?: number | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mesh_assets: {
        Row: {
          created_at: string | null
          credits_cost: number | null
          id: string
          input_image_path: string | null
          mime: string | null
          output_path: string | null
          owner_id: string
          project_id: string | null
          prompt: string | null
          result_meta: Json | null
          size: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits_cost?: number | null
          id?: string
          input_image_path?: string | null
          mime?: string | null
          output_path?: string | null
          owner_id: string
          project_id?: string | null
          prompt?: string | null
          result_meta?: Json | null
          size?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits_cost?: number | null
          id?: string
          input_image_path?: string | null
          mime?: string | null
          output_path?: string | null
          owner_id?: string
          project_id?: string | null
          prompt?: string | null
          result_meta?: Json | null
          size?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mesh_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      model_benchmarks: {
        Row: {
          accuracy_score: number | null
          analysis_type: string
          avg_latency_ms: number | null
          benchmark_date: string | null
          cost_per_unit: number | null
          created_at: string | null
          id: string
          model_name: string
          notes: string | null
          provider: string
          test_file_size: number | null
        }
        Insert: {
          accuracy_score?: number | null
          analysis_type: string
          avg_latency_ms?: number | null
          benchmark_date?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          model_name: string
          notes?: string | null
          provider: string
          test_file_size?: number | null
        }
        Update: {
          accuracy_score?: number | null
          analysis_type?: string
          avg_latency_ms?: number | null
          benchmark_date?: string | null
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          model_name?: string
          notes?: string | null
          provider?: string
          test_file_size?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          credits_remaining: number | null
          credits_used: number | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          credits_remaining?: number | null
          credits_used?: number | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          credits_remaining?: number | null
          credits_used?: number | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          id: string
          invited_at: string | null
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string | null
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string | null
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scripts: {
        Row: {
          content: string | null
          created_at: string | null
          file_type: string | null
          file_url: string | null
          id: string
          parsed_data: Json | null
          project_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          parsed_data?: Json | null
          project_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          parsed_data?: Json | null
          project_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_assets: {
        Row: {
          created_at: string | null
          file_size: number | null
          file_type: string
          file_url: string
          filename: string
          id: string
          metadata: Json | null
          mime_type: string | null
          processing_status: string | null
          project_id: string | null
          storage_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          filename: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          processing_status?: string | null
          project_id?: string | null
          storage_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          filename?: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          processing_status?: string | null
          project_id?: string | null
          storage_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          auto_save: boolean | null
          created_at: string | null
          email_notifications: boolean | null
          id: string
          language: string | null
          notifications_enabled: boolean | null
          settings_data: Json | null
          theme: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_save?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          settings_data?: Json | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_save?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          settings_data?: Json | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vfx_assets: {
        Row: {
          created_at: string | null
          file_size: number | null
          file_type: string
          file_url: string
          filename: string
          id: string
          meta: Json | null
          metadata: Json | null
          owner_id: string | null
          path: string | null
          project_id: string | null
          status: string | null
          thumbnail_url: string | null
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          filename: string
          id?: string
          meta?: Json | null
          metadata?: Json | null
          owner_id?: string | null
          path?: string | null
          project_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          filename?: string
          id?: string
          meta?: Json | null
          metadata?: Json | null
          owner_id?: string | null
          path?: string | null
          project_id?: string | null
          status?: string | null
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      video_files: {
        Row: {
          created_at: string | null
          duration: number | null
          file_size: number | null
          file_url: string
          filename: string
          id: string
          owner_id: string | null
          path: string | null
          project_id: string | null
          resolution: string | null
          status: string | null
          thumb_path: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          file_url: string
          filename: string
          id?: string
          owner_id?: string | null
          path?: string | null
          project_id?: string | null
          resolution?: string | null
          status?: string | null
          thumb_path?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          file_url?: string
          filename?: string
          id?: string
          owner_id?: string | null
          path?: string | null
          project_id?: string | null
          resolution?: string | null
          status?: string | null
          thumb_path?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      deduct_user_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      delete_user_asset: {
        Args: { asset_id: string }
        Returns: Json
      }
      trigger_job_worker: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      user_can_access_project: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      user_can_access_script: {
        Args: { p_script_id: string }
        Returns: boolean
      }
      user_can_edit_project: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      user_is_project_owner: {
        Args: { p_project_id: string }
        Returns: boolean
      }
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
