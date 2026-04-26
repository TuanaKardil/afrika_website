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
      articles: {
        Row: {
          author_original: string | null
          content_hash: string
          content_original: string | null
          content_tr: string | null
          excerpt_original: string | null
          excerpt_tr: string | null
          featured_image_source_url: string | null
          featured_image_url: string | null
          hashtags: string[]
          id: string
          image_credit: string | null
          is_featured: boolean
          is_suppressed: boolean
          nav_tab_slug: string | null
          published_at: string
          reading_time_minutes: number | null
          region_slug: string | null
          scraped_at: string
          sector_slugs: string[]
          slug: string
          source: string
          source_url: string
          title_original: string | null
          title_tr: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          author_original?: string | null
          content_hash: string
          content_original?: string | null
          content_tr?: string | null
          excerpt_original?: string | null
          excerpt_tr?: string | null
          featured_image_source_url?: string | null
          featured_image_url?: string | null
          hashtags?: string[]
          id?: string
          image_credit?: string | null
          is_featured?: boolean
          is_suppressed?: boolean
          nav_tab_slug?: string | null
          published_at: string
          reading_time_minutes?: number | null
          region_slug?: string | null
          scraped_at?: string
          sector_slugs?: string[]
          slug: string
          source: string
          source_url: string
          title_original?: string | null
          title_tr?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_original?: string | null
          content_hash?: string
          content_original?: string | null
          content_tr?: string | null
          excerpt_original?: string | null
          excerpt_tr?: string | null
          featured_image_source_url?: string | null
          featured_image_url?: string | null
          hashtags?: string[]
          id?: string
          image_credit?: string | null
          is_featured?: boolean
          is_suppressed?: boolean
          nav_tab_slug?: string | null
          published_at?: string
          reading_time_minutes?: number | null
          region_slug?: string | null
          scraped_at?: string
          sector_slugs?: string[]
          slug?: string
          source?: string
          source_url?: string
          title_original?: string | null
          title_tr?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_nav_tab_slug_fkey"
            columns: ["nav_tab_slug"]
            isOneToOne: false
            referencedRelation: "nav_tabs"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "articles_region_slug_fkey"
            columns: ["region_slug"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["slug"]
          },
        ]
      }
      nav_tabs: {
        Row: {
          display_order: number
          name_tr: string
          slug: string
        }
        Insert: {
          display_order?: number
          name_tr: string
          slug: string
        }
        Update: {
          display_order?: number
          name_tr?: string
          slug?: string
        }
        Relationships: []
      }
      sectors: {
        Row: {
          display_order: number
          is_dropdown_featured: boolean
          name_tr: string
          slug: string
        }
        Insert: {
          display_order?: number
          is_dropdown_featured?: boolean
          name_tr: string
          slug: string
        }
        Update: {
          display_order?: number
          is_dropdown_featured?: boolean
          name_tr?: string
          slug?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          name_tr: string
          slug: string
        }
        Insert: {
          name_tr: string
          slug: string
        }
        Update: {
          name_tr?: string
          slug?: string
        }
        Relationships: []
      }
      saved_articles: {
        Row: {
          article_id: string
          saved_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_articles_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_view_count: { Args: { article_id: string }; Returns: undefined }
      search_articles: {
        Args: { lim?: number; off?: number; query: string }
        Returns: {
          author_original: string | null
          content_hash: string
          content_original: string | null
          content_tr: string | null
          excerpt_original: string | null
          excerpt_tr: string | null
          featured_image_source_url: string | null
          featured_image_url: string | null
          hashtags: string[]
          id: string
          image_credit: string | null
          is_featured: boolean
          is_suppressed: boolean
          nav_tab_slug: string | null
          published_at: string
          reading_time_minutes: number | null
          region_slug: string | null
          scraped_at: string
          sector_slugs: string[]
          slug: string
          source: string
          source_url: string
          title_original: string | null
          title_tr: string | null
          updated_at: string
          view_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "articles"
          isOneToOne: false
          isSetofReturn: true
        }
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
