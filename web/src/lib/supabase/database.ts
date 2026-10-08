type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      salon_accounts: Table<
        { id: string; name: string; created_at: string },
        { id?: string; name: string; created_at?: string }
      >;
      locations: Table<
        { id: string; salon_account_id: string; name: string; timezone: string; created_at: string },
        { id?: string; salon_account_id: string; name: string; timezone?: string; created_at?: string }
      >;
      content_schedule_entries: Table<
        {
          id: string;
          location_id: string;
          cycle_number: number;
          scheduled_for: string;
          season: "Fall" | "Winter" | "Spring" | "Summer";
          style_name: string;
          technique_and_finish: string;
          color_palette: string;
          approx_date: string | null;
          theme_name: string | null;
          content_style_name: string | null;
          content_hook: string | null;
          event_anchors: string[] | null;
          research_window: string | null;
          research_prompts: string[] | null;
          timing_note: string | null;
          created_at: string;
        },
        {
          id?: string;
          location_id: string;
          cycle_number: number;
          scheduled_for: string;
          season: "Fall" | "Winter" | "Spring" | "Summer";
          style_name: string;
          technique_and_finish: string;
          color_palette: string;
          approx_date?: string | null;
          theme_name?: string | null;
          content_style_name?: string | null;
          content_hook?: string | null;
          event_anchors?: string[] | null;
          research_window?: string | null;
          research_prompts?: string[] | null;
          timing_note?: string | null;
          created_at?: string;
        }
      >;
      location_memberships: Table<
        { id: string; location_id: string; user_id: string; role: "technician" | "leadership"; created_at: string },
        { id?: string; location_id: string; user_id: string; role: "technician" | "leadership"; created_at?: string }
      >;
      media_assets: Table<
        {
          id: string;
          location_id: string;
          uploaded_by: string;
          object_path: string;
          original_name: string;
          mime_type: string;
          size_bytes: number;
          ai_consent_confirmed: boolean;
          status: "uploaded" | "processing" | "ready" | "needs_attention" | "failed";
          preview_object_path: string | null;
          created_at: string;
        },
        {
          id?: string;
          location_id: string;
          uploaded_by: string;
          object_path: string;
          original_name: string;
          mime_type: string;
          size_bytes: number;
          ai_consent_confirmed?: boolean;
          status?: "uploaded" | "processing" | "ready" | "needs_attention" | "failed";
          preview_object_path?: string | null;
          created_at?: string;
        }
      >;
      content_jobs: Table<
        {
          id: string;
          location_id: string;
          media_asset_id: string;
          created_by: string;
          status: "queued" | "processing" | "ready_for_review" | "approved" | "rejected" | "failed";
          stage: string;
          generated_object_path: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          attempt_count: number;
          last_error: string | null;
          next_attempt_at: string;
          locked_at: string | null;
          lease_token: string | null;
          derived_object_path: string | null;
          processed_at: string | null;
          created_at: string;
        },
        {
          id?: string;
          location_id: string;
          media_asset_id: string;
          created_by: string;
          status?: "queued" | "processing" | "ready_for_review" | "approved" | "rejected" | "failed";
          stage?: string;
          generated_object_path?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          attempt_count?: number;
          last_error?: string | null;
          next_attempt_at?: string;
          locked_at?: string | null;
          lease_token?: string | null;
          derived_object_path?: string | null;
          processed_at?: string | null;
          created_at?: string;
        }
      >;
      content_job_reviews: Table<
        {
          id: string;
          content_job_id: string;
          generated_object_path: string;
          reviewer_id: string;
          decision: "approved" | "rejected" | "changes_requested";
          note: string | null;
          created_at: string;
        },
        {
          id?: string;
          content_job_id: string;
          generated_object_path: string;
          reviewer_id: string;
          decision: "approved" | "rejected" | "changes_requested";
          note?: string | null;
          created_at?: string;
        }
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      review_content_job: {
        Args: { p_job_id: string; p_decision: "approved" | "rejected" | "changes_requested"; p_note?: string | null };
        Returns: Database["public"]["Tables"]["content_jobs"]["Row"];
      };
      claim_next_media_job: {
        Args: Record<PropertyKey, never>;
        Returns: {
          job_id: string;
          location_id: string;
          media_asset_id: string;
          uploaded_by: string;
          object_path: string;
          original_name: string;
          declared_mime_type: string;
          size_bytes: number;
          attempt_count: number;
          worker_lease: string;
        }[];
      };
      finish_media_job: {
        Args: { p_job_id: string; p_worker_lease: string; p_preview_object_path?: string | null; p_error?: string | null };
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
