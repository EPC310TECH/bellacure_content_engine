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
          created_at: string;
        },
        {
          id?: string;
          location_id: string;
          media_asset_id: string;
          created_by: string;
          status?: "queued" | "processing" | "ready_for_review" | "approved" | "rejected" | "failed";
          stage?: string;
          created_at?: string;
        }
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
