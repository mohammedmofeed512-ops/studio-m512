// Generated from the Supabase schema (phase 1 tables). Regenerate with:
//   npx supabase gen types typescript --project-id qpccdnhznxtwklctyzgz > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Enums = {
  contact_kind: "crew" | "cast" | "client" | "vendor" | "location" | "other";
  project_stage: "development" | "pre_production" | "production" | "post_production" | "delivered" | "archived";
  project_type: "feature" | "short" | "commercial" | "documentary" | "corporate" | "music_video" | "series" | "other";
  task_status: "todo" | "in_progress" | "done";
  script_kind: "screenplay" | "av";
  int_ext: "int" | "ext" | "int_ext";
  day_night: "day" | "night" | "dawn" | "dusk" | "continuous";
  element_category:
    | "cast" | "extras" | "props" | "wardrobe" | "makeup" | "vehicles" | "animals"
    | "sfx" | "vfx" | "sound" | "set_dressing" | "location" | "other";
  recipient_status: "pending" | "sent" | "opened" | "confirmed";
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      profiles: {
        Row: { company_name: string | null; created_at: string; full_name: string | null; id: string; locale: string; updated_at: string };
        Insert: { company_name?: string | null; created_at?: string; full_name?: string | null; id: string; locale?: string; updated_at?: string };
        Update: { company_name?: string | null; created_at?: string; full_name?: string | null; id?: string; locale?: string; updated_at?: string };
        Relationships: [];
      };
      projects: {
        Row: {
          client_name: string | null; cover_color: string | null; created_at: string; delivery_date: string | null; id: string;
          name: string; notes: string | null; owner_id: string; stage: Enums["project_stage"]; start_date: string | null;
          type: Enums["project_type"]; updated_at: string;
        };
        Insert: {
          client_name?: string | null; cover_color?: string | null; created_at?: string; delivery_date?: string | null; id?: string;
          name: string; notes?: string | null; owner_id?: string; stage?: Enums["project_stage"]; start_date?: string | null;
          type?: Enums["project_type"]; updated_at?: string;
        };
        Update: {
          client_name?: string | null; cover_color?: string | null; created_at?: string; delivery_date?: string | null; id?: string;
          name?: string; notes?: string | null; owner_id?: string; stage?: Enums["project_stage"]; start_date?: string | null;
          type?: Enums["project_type"]; updated_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          address: string | null; created_at: string; email: string | null; full_name: string; id: string; kind: Enums["contact_kind"];
          notes: string | null; owner_id: string; phone: string | null; role: string | null; updated_at: string;
        };
        Insert: {
          address?: string | null; created_at?: string; email?: string | null; full_name: string; id?: string; kind?: Enums["contact_kind"];
          notes?: string | null; owner_id?: string; phone?: string | null; role?: string | null; updated_at?: string;
        };
        Update: {
          address?: string | null; created_at?: string; email?: string | null; full_name?: string; id?: string; kind?: Enums["contact_kind"];
          notes?: string | null; owner_id?: string; phone?: string | null; role?: string | null; updated_at?: string;
        };
        Relationships: [];
      };
      scripts: {
        Row: {
          created_at: string; current_version_id: string | null; id: string; kind: Enums["script_kind"]; language: string;
          owner_id: string; project_id: string; title: string; updated_at: string;
        };
        Insert: {
          created_at?: string; current_version_id?: string | null; id?: string; kind?: Enums["script_kind"]; language?: string;
          owner_id?: string; project_id: string; title: string; updated_at?: string;
        };
        Update: {
          created_at?: string; current_version_id?: string | null; id?: string; kind?: Enums["script_kind"]; language?: string;
          owner_id?: string; project_id?: string; title?: string; updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "scripts_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "scripts_current_version_fk"; columns: ["current_version_id"]; isOneToOne: false; referencedRelation: "script_versions"; referencedColumns: ["id"] },
        ];
      };
      script_versions: {
        Row: {
          content: Json; content_updated_at: string; content_updated_by: string | null; created_at: string; id: string; owner_id: string | null;
          revision_color: string; script_id: string; version_number: number;
        };
        Insert: {
          content?: Json; content_updated_at?: string; content_updated_by?: string | null; created_at?: string; id?: string; owner_id?: string | null;
          revision_color?: string; script_id: string; version_number: number;
        };
        Update: {
          content?: Json; content_updated_at?: string; content_updated_by?: string | null; created_at?: string; id?: string; owner_id?: string | null;
          revision_color?: string; script_id?: string; version_number?: number;
        };
        Relationships: [
          { foreignKeyName: "script_versions_script_id_fkey"; columns: ["script_id"]; isOneToOne: false; referencedRelation: "scripts"; referencedColumns: ["id"] },
        ];
      };
      scenes: {
        Row: {
          created_at: string; day_night: Enums["day_night"]; id: string; int_ext: Enums["int_ext"]; location_name: string | null; owner_id: string;
          page_eighths: number; position: number; scene_number: string; script_id: string; synopsis: string | null; updated_at: string;
        };
        Insert: {
          created_at?: string; day_night?: Enums["day_night"]; id?: string; int_ext?: Enums["int_ext"]; location_name?: string | null; owner_id?: string;
          page_eighths?: number; position?: number; scene_number: string; script_id: string; synopsis?: string | null; updated_at?: string;
        };
        Update: {
          created_at?: string; day_night?: Enums["day_night"]; id?: string; int_ext?: Enums["int_ext"]; location_name?: string | null; owner_id?: string;
          page_eighths?: number; position?: number; scene_number?: string; script_id?: string; synopsis?: string | null; updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "scenes_script_id_fkey"; columns: ["script_id"]; isOneToOne: false; referencedRelation: "scripts"; referencedColumns: ["id"] },
        ];
      };
      elements: {
        Row: {
          cast_number: number | null; category: Enums["element_category"]; contact_id: string | null; created_at: string; id: string;
          name: string; owner_id: string; project_id: string; updated_at: string;
        };
        Insert: {
          cast_number?: number | null; category: Enums["element_category"]; contact_id?: string | null; created_at?: string; id?: string;
          name: string; owner_id?: string; project_id: string; updated_at?: string;
        };
        Update: {
          cast_number?: number | null; category?: Enums["element_category"]; contact_id?: string | null; created_at?: string; id?: string;
          name?: string; owner_id?: string; project_id?: string; updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "elements_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "elements_contact_id_fkey"; columns: ["contact_id"]; isOneToOne: false; referencedRelation: "contacts"; referencedColumns: ["id"] },
        ];
      };
      scene_elements: {
        Row: { element_id: string; owner_id: string; scene_id: string };
        Insert: { element_id: string; owner_id?: string; scene_id: string };
        Update: { element_id?: string; owner_id?: string; scene_id?: string };
        Relationships: [
          { foreignKeyName: "scene_elements_element_id_fkey"; columns: ["element_id"]; isOneToOne: false; referencedRelation: "elements"; referencedColumns: ["id"] },
          { foreignKeyName: "scene_elements_scene_id_fkey"; columns: ["scene_id"]; isOneToOne: false; referencedRelation: "scenes"; referencedColumns: ["id"] },
        ];
      };
      shots: {
        Row: {
          angle: string | null; created_at: string; description: string | null; duration_seconds: number | null; id: string; image_path: string | null;
          lens: string | null; movement: string | null; owner_id: string; position: number; scene_id: string; shot_number: string; size: string | null; updated_at: string;
        };
        Insert: {
          angle?: string | null; created_at?: string; description?: string | null; duration_seconds?: number | null; id?: string; image_path?: string | null;
          lens?: string | null; movement?: string | null; owner_id?: string; position?: number; scene_id: string; shot_number: string; size?: string | null; updated_at?: string;
        };
        Update: {
          angle?: string | null; created_at?: string; description?: string | null; duration_seconds?: number | null; id?: string; image_path?: string | null;
          lens?: string | null; movement?: string | null; owner_id?: string; position?: number; scene_id?: string; shot_number?: string; size?: string | null; updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "shots_scene_id_fkey"; columns: ["scene_id"]; isOneToOne: false; referencedRelation: "scenes"; referencedColumns: ["id"] },
        ];
      };
      lookbook_items: {
        Row: { category: string | null; created_at: string; id: string; image_path: string; note: string | null; owner_id: string; position: number; project_id: string };
        Insert: { category?: string | null; created_at?: string; id?: string; image_path: string; note?: string | null; owner_id?: string; position?: number; project_id: string };
        Update: { category?: string | null; created_at?: string; id?: string; image_path?: string; note?: string | null; owner_id?: string; position?: number; project_id?: string };
        Relationships: [
          { foreignKeyName: "lookbook_items_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
        ];
      };
      shoot_days: {
        Row: {
          created_at: string; day_number: number; general_call: string | null; id: string; location_contact_id: string | null;
          owner_id: string; project_id: string; shoot_date: string | null; updated_at: string; wrap_time: string | null;
        };
        Insert: {
          created_at?: string; day_number: number; general_call?: string | null; id?: string; location_contact_id?: string | null;
          owner_id?: string; project_id: string; shoot_date?: string | null; updated_at?: string; wrap_time?: string | null;
        };
        Update: {
          created_at?: string; day_number?: number; general_call?: string | null; id?: string; location_contact_id?: string | null;
          owner_id?: string; project_id?: string; shoot_date?: string | null; updated_at?: string; wrap_time?: string | null;
        };
        Relationships: [
          { foreignKeyName: "shoot_days_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
          { foreignKeyName: "shoot_days_location_contact_id_fkey"; columns: ["location_contact_id"]; isOneToOne: false; referencedRelation: "contacts"; referencedColumns: ["id"] },
        ];
      };
      shoot_day_scenes: {
        Row: { owner_id: string; position: number; scene_id: string; shoot_day_id: string };
        Insert: { owner_id?: string; position?: number; scene_id: string; shoot_day_id: string };
        Update: { owner_id?: string; position?: number; scene_id?: string; shoot_day_id?: string };
        Relationships: [
          { foreignKeyName: "shoot_day_scenes_shoot_day_id_fkey"; columns: ["shoot_day_id"]; isOneToOne: false; referencedRelation: "shoot_days"; referencedColumns: ["id"] },
          { foreignKeyName: "shoot_day_scenes_scene_id_fkey"; columns: ["scene_id"]; isOneToOne: false; referencedRelation: "scenes"; referencedColumns: ["id"] },
        ];
      };
      call_sheets: {
        Row: {
          created_at: string; general_notes: string | null; id: string; nearest_hospital: string | null; owner_id: string;
          sent_at: string | null; shoot_day_id: string; updated_at: string; weather: string | null;
        };
        Insert: {
          created_at?: string; general_notes?: string | null; id?: string; nearest_hospital?: string | null; owner_id?: string;
          sent_at?: string | null; shoot_day_id: string; updated_at?: string; weather?: string | null;
        };
        Update: {
          created_at?: string; general_notes?: string | null; id?: string; nearest_hospital?: string | null; owner_id?: string;
          sent_at?: string | null; shoot_day_id?: string; updated_at?: string; weather?: string | null;
        };
        Relationships: [
          { foreignKeyName: "call_sheets_shoot_day_id_fkey"; columns: ["shoot_day_id"]; isOneToOne: true; referencedRelation: "shoot_days"; referencedColumns: ["id"] },
        ];
      };
      call_sheet_recipients: {
        Row: {
          call_sheet_id: string; call_time: string | null; confirmed_at: string | null; contact_id: string; id: string; opened_at: string | null;
          owner_id: string; personal_note: string | null; status: Enums["recipient_status"]; token: string;
        };
        Insert: {
          call_sheet_id: string; call_time?: string | null; confirmed_at?: string | null; contact_id: string; id?: string; opened_at?: string | null;
          owner_id?: string; personal_note?: string | null; status?: Enums["recipient_status"]; token?: string;
        };
        Update: {
          call_sheet_id?: string; call_time?: string | null; confirmed_at?: string | null; contact_id?: string; id?: string; opened_at?: string | null;
          owner_id?: string; personal_note?: string | null; status?: Enums["recipient_status"]; token?: string;
        };
        Relationships: [
          { foreignKeyName: "call_sheet_recipients_call_sheet_id_fkey"; columns: ["call_sheet_id"]; isOneToOne: false; referencedRelation: "call_sheets"; referencedColumns: ["id"] },
          { foreignKeyName: "call_sheet_recipients_contact_id_fkey"; columns: ["contact_id"]; isOneToOne: false; referencedRelation: "contacts"; referencedColumns: ["id"] },
        ];
      };
      project_members: {
        Row: { created_at: string; invited_by: string | null; permissions: Json; project_id: string; role: string; updated_at: string; user_id: string };
        Insert: { created_at?: string; invited_by?: string | null; permissions?: Json; project_id: string; role?: string; updated_at?: string; user_id: string };
        Update: { created_at?: string; invited_by?: string | null; permissions?: Json; project_id?: string; role?: string; updated_at?: string; user_id?: string };
        Relationships: [
          { foreignKeyName: "project_members_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
        ];
      };
      project_invitations: {
        Row: {
          accepted_at: string | null; accepted_by: string | null; created_at: string; email: string; expires_at: string; id: string;
          invited_by: string | null; permissions: Json; project_id: string; role: string; token: string;
        };
        Insert: {
          accepted_at?: string | null; accepted_by?: string | null; created_at?: string; email: string; expires_at?: string; id?: string;
          invited_by?: string | null; permissions?: Json; project_id: string; role?: string; token?: string;
        };
        Update: {
          accepted_at?: string | null; accepted_by?: string | null; created_at?: string; email?: string; expires_at?: string; id?: string;
          invited_by?: string | null; permissions?: Json; project_id?: string; role?: string; token?: string;
        };
        Relationships: [
          { foreignKeyName: "project_invitations_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
        ];
      };
      activity_log: {
        Row: { action: string; created_at: string; id: string; project_id: string; summary: string | null; target_id: string | null; user_id: string | null };
        Insert: { action: string; created_at?: string; id?: string; project_id: string; summary?: string | null; target_id?: string | null; user_id?: string | null };
        Update: { action?: string; created_at?: string; id?: string; project_id?: string; summary?: string | null; target_id?: string | null; user_id?: string | null };
        Relationships: [
          { foreignKeyName: "activity_log_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
        ];
      };
      script_presence: {
        Row: { name: string; script_id: string; seen_at: string; user_id: string };
        Insert: { name: string; script_id: string; seen_at?: string; user_id?: string };
        Update: { name?: string; script_id?: string; seen_at?: string; user_id?: string };
        Relationships: [
          { foreignKeyName: "script_presence_script_id_fkey"; columns: ["script_id"]; isOneToOne: false; referencedRelation: "scripts"; referencedColumns: ["id"] },
        ];
      };
      plans: {
        Row: {
          created_at: string; features: Json; id: string; is_default: boolean; max_members_per_project: number | null; max_projects: number | null;
          name_ar: string; name_en: string; position: number; storage_mb: number | null; updated_at: string;
        };
        Insert: {
          created_at?: string; features?: Json; id: string; is_default?: boolean; max_members_per_project?: number | null; max_projects?: number | null;
          name_ar: string; name_en: string; position?: number; storage_mb?: number | null; updated_at?: string;
        };
        Update: {
          created_at?: string; features?: Json; id?: string; is_default?: boolean; max_members_per_project?: number | null; max_projects?: number | null;
          name_ar?: string; name_en?: string; position?: number; storage_mb?: number | null; updated_at?: string;
        };
        Relationships: [];
      };
      accounts: {
        Row: {
          created_at: string; extra_members: number; extra_projects: number; extra_storage_mb: number; feature_overrides: Json; notes: string | null;
          plan_expires_at: string | null; plan_id: string; role: string; suspended: boolean; updated_at: string; user_id: string;
        };
        Insert: { user_id: string; plan_id?: string };
        Update: { plan_id?: string };
        Relationships: [];
      };
      upgrade_requests: {
        Row: {
          created_at: string; handled_at: string | null; handled_by: string | null; id: string; message: string | null;
          plan_id: string; status: string; user_id: string;
        };
        Insert: { message?: string | null; plan_id: string; user_id?: string };
        Update: { status?: string };
        Relationships: [];
      };
      tasks: {
        Row: {
          assignee_contact_id: string | null; created_at: string; due_date: string | null; id: string; owner_id: string;
          position: number; project_id: string | null; status: Enums["task_status"]; title: string; updated_at: string;
        };
        Insert: {
          assignee_contact_id?: string | null; created_at?: string; due_date?: string | null; id?: string; owner_id?: string;
          position?: number; project_id?: string | null; status?: Enums["task_status"]; title: string; updated_at?: string;
        };
        Update: {
          assignee_contact_id?: string | null; created_at?: string; due_date?: string | null; id?: string; owner_id?: string;
          position?: number; project_id?: string | null; status?: Enums["task_status"]; title?: string; updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "tasks_assignee_contact_id_fkey"; columns: ["assignee_contact_id"]; isOneToOne: false; referencedRelation: "contacts"; referencedColumns: ["id"] },
          { foreignKeyName: "tasks_project_id_fkey"; columns: ["project_id"]; isOneToOne: false; referencedRelation: "projects"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      save_stripboard: { Args: { p_project: string; p_layout: Json }; Returns: undefined };
      call_sheet_for_day: { Args: { p_day: string }; Returns: Json };
      call_sheet_view: { Args: { p_token: string }; Returns: Json };
      call_sheet_opened: { Args: { p_token: string }; Returns: undefined };
      call_sheet_confirm: { Args: { p_token: string }; Returns: boolean };
      invitation_preview: { Args: { p_token: string }; Returns: Json };
      accept_invitation: { Args: { p_token: string }; Returns: Json };
      my_plan: { Args: Record<string, never>; Returns: Json };
      admin_handle_upgrade: { Args: { p_request: string; p_approve: boolean; p_months: number }; Returns: undefined };
      admin_stats: { Args: Record<string, never>; Returns: Json };
      admin_accounts: {
        Args: Record<string, never>;
        Returns: Array<{
          user_id: string; email: string; full_name: string | null; company_name: string | null; plan_id: string; plan_expires_at: string | null;
          role: string; suspended: boolean; extra_projects: number; extra_members: number; extra_storage_mb: number; notes: string | null;
          projects: number; storage_bytes: number; created_at: string; last_sign_in_at: string | null;
        }>;
      };
      admin_update_account: {
        Args: {
          p_user: string; p_plan: string; p_expires: string | null; p_role: string; p_suspended: boolean;
          p_extra_projects: number; p_extra_members: number; p_extra_storage_mb: number; p_notes: string;
        };
        Returns: undefined;
      };
    };
    Enums: Enums;
    CompositeTypes: { [_ in never]: never };
  };
};

type T = Database["public"]["Tables"];
export type Project = T["projects"]["Row"];
export type Task = T["tasks"]["Row"];
export type Contact = T["contacts"]["Row"];
export type Profile = T["profiles"]["Row"];
export type Script = T["scripts"]["Row"];
export type ScriptVersion = T["script_versions"]["Row"];
export type Scene = T["scenes"]["Row"];
export type ScriptKind = Enums["script_kind"];
export type Element = T["elements"]["Row"];
export type Shot = T["shots"]["Row"];
export type LookbookItem = T["lookbook_items"]["Row"];
export type ElementCategory = Enums["element_category"];
export type ShootDay = T["shoot_days"]["Row"];
export type Plan = T["plans"]["Row"];
export type CallSheet = T["call_sheets"]["Row"];
export type CallSheetRecipient = T["call_sheet_recipients"]["Row"];
export type RecipientStatus = Enums["recipient_status"];

export const ELEMENT_CATEGORIES: ElementCategory[] = [
  "cast", "extras", "props", "wardrobe", "makeup", "location", "set_dressing", "vehicles", "animals", "sfx", "vfx", "sound", "other",
];
export type ProjectType = Enums["project_type"];
export type ProjectStage = Enums["project_stage"];
export type TaskStatus = Enums["task_status"];
export type ContactKind = Enums["contact_kind"];

export const PROJECT_TYPES: ProjectType[] = ["short", "feature", "commercial", "documentary", "corporate", "music_video", "series", "other"];
export const PROJECT_STAGES: ProjectStage[] = ["development", "pre_production", "production", "post_production", "delivered", "archived"];
export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
export const CONTACT_KINDS: ContactKind[] = ["crew", "cast", "client", "vendor", "location", "other"];
