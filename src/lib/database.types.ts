// Generated from the Supabase schema (phase 1 tables). Regenerate with:
//   npx supabase gen types typescript --project-id qpccdnhznxtwklctyzgz > src/lib/database.types.ts
// Later phases add scripts, scenes, shots, shoot days and call sheets here.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Enums = {
  contact_kind: "crew" | "cast" | "client" | "vendor" | "location" | "other";
  project_stage: "development" | "pre_production" | "production" | "post_production" | "delivered" | "archived";
  project_type: "feature" | "short" | "commercial" | "documentary" | "corporate" | "music_video" | "series" | "other";
  task_status: "todo" | "in_progress" | "done";
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
export type ProjectType = Enums["project_type"];
export type ProjectStage = Enums["project_stage"];
export type TaskStatus = Enums["task_status"];
export type ContactKind = Enums["contact_kind"];

export const PROJECT_TYPES: ProjectType[] = ["short", "feature", "commercial", "documentary", "corporate", "music_video", "series", "other"];
export const PROJECT_STAGES: ProjectStage[] = ["development", "pre_production", "production", "post_production", "delivered", "archived"];
export const TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"];
export const CONTACT_KINDS: ContactKind[] = ["crew", "cast", "client", "vendor", "location", "other"];
