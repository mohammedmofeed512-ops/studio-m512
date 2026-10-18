// Generated from the Supabase schema (phase 1 tables). Regenerate with:
//   npx supabase gen types typescript --project-id qpccdnhznxtwklctyzgz > src/lib/database.types.ts
// Later phases add shoot days and call sheets here.

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
        Row: { content: Json; created_at: string; id: string; owner_id: string; revision_color: string; script_id: string; version_number: number };
        Insert: { content?: Json; created_at?: string; id?: string; owner_id?: string; revision_color?: string; script_id: string; version_number: number };
        Update: { content?: Json; created_at?: string; id?: string; owner_id?: string; revision_color?: string; script_id?: string; version_number?: number };
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
    Functions: { [_ in never]: never };
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
