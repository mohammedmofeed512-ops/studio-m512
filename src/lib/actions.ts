"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";
import { LOCALE_COOKIE } from "@/lib/i18n/server";
import {
  CONTACT_KINDS,
  PROJECT_STAGES,
  PROJECT_TYPES,
  TASK_STATUSES,
  type ContactKind,
  type ProjectStage,
  type ProjectType,
  type TaskStatus,
} from "@/lib/database.types";

// ───────────── helpers ─────────────
const str = (fd: FormData, key: string, max = 500) => {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim().slice(0, max);
  return trimmed.length ? trimmed : null;
};
const oneOf = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
const isoDate = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null);

export type FormState = { error?: string; message?: string } | undefined;

/** Only same-site paths are allowed as a place to return to after signing in. */
function safeNext(value: FormDataEntryValue | string | null | undefined) {
  return typeof value === "string" && /^\/(?!\/)[\w\-./?=&%]*$/.test(value) ? value : "/";
}

// ───────────── auth ─────────────
export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email", 320);
  const password = fd.get("password");
  if (!email || typeof password !== "string" || !password) return { error: "invalid" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.code === "email_not_confirmed" ? "notConfirmed" : "invalid" };
  redirect(safeNext(fd.get("next")));
}

export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email", 320);
  const password = fd.get("password");
  const fullName = str(fd, "full_name", 120);
  if (!email || typeof password !== "string" || password.length < 8) return { error: "failed" };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext(fd.get("next")))}` },
  });
  if (error) {
    if (error.code === "weak_password") return { error: "weakPassword" };
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") return { error: "rateLimit" };
    // The account could not be saved because the confirmation email failed to send (mail server settings).
    if (error.status === 500 || /email/i.test(error.message)) return { error: "emailSend" };
    return { error: "failed" };
  }
  // Supabase answers a repeated sign-up with a user that has no identities, and sends nothing.
  if (data.user && data.user.identities?.length === 0) return { error: "alreadyRegistered" };
  if (data.session) redirect(safeNext(fd.get("next")));
  return { message: "checkEmail" };
}

/** Sends the sign-up confirmation email again (for an account that exists but isn't confirmed). */
export async function resendConfirmation(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email", 320);
  if (!email) return { error: "failed" };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext(fd.get("next")))}` },
  });
  if (error) return { error: error.code === "over_email_send_rate_limit" || error.status === 429 ? "rateLimit" : "failed" };
  return { message: "resent" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ───────────── language ─────────────
export async function setLocale(fd: FormData) {
  const locale = oneOf<Locale>(str(fd, "locale"), LOCALES, "ar");
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (userId) await supabase.from("profiles").update({ locale }).eq("id", userId);
  revalidatePath("/", "layout");
}

// ───────────── profile ─────────────
export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: str(fd, "full_name", 120), company_name: str(fd, "company_name", 120) })
    .eq("id", userId);
  if (error) return { error: "failed" };
  revalidatePath("/", "layout");
  return { message: "saved" };
}

// ───────────── projects ─────────────
function projectFields(fd: FormData) {
  return {
    name: str(fd, "name", 160),
    type: oneOf<ProjectType>(str(fd, "type"), PROJECT_TYPES, "short"),
    stage: oneOf<ProjectStage>(str(fd, "stage"), PROJECT_STAGES, "development"),
    client_name: str(fd, "client_name", 160),
    start_date: isoDate(str(fd, "start_date")),
    delivery_date: isoDate(str(fd, "delivery_date")),
    notes: str(fd, "notes", 4000),
  };
}

const COVER_COLORS = ["#2B3240", "#6B4A2B", "#2F4A3E", "#4A2F45", "#2F3E5C", "#5C3A2F"];

export async function createProject(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const fields = projectFields(fd);
  if (!fields.name) return { error: "name" };
  const cover_color = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)];
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...fields, name: fields.name, cover_color })
    .select("id")
    .single();
  if (error?.message.includes("plan_limit:projects")) return { error: "limitProjects" };
  if (error || !data) return { error: "failed" };
  revalidatePath("/", "layout");
  redirect(`/projects/${data.id}`);
}

export async function updateProject(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const id = str(fd, "id", 64);
  const fields = projectFields(fd);
  if (!id || !fields.name) return { error: "name" };
  const { error } = await supabase.from("projects").update({ ...fields, name: fields.name }).eq("id", id);
  if (error?.message.includes("plan_limit:projects")) return { error: "limitProjects" };
  if (error) return { error: "failed" };
  revalidatePath("/", "layout");
  return { message: "saved" };
}

export async function deleteProject(fd: FormData) {
  const { supabase } = await requireUser();
  const id = str(fd, "id", 64);
  if (id) await supabase.from("projects").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/projects");
}

// ───────────── tasks ─────────────
export async function createTask(fd: FormData) {
  const { supabase } = await requireUser();
  const title = str(fd, "title", 300);
  if (!title) return;
  await supabase.from("tasks").insert({
    title,
    project_id: str(fd, "project_id", 64),
    due_date: isoDate(str(fd, "due_date")),
    position: Date.now(),
  });
  revalidatePath("/", "layout");
}

export async function setTaskStatus(fd: FormData) {
  const { supabase } = await requireUser();
  const id = str(fd, "id", 64);
  const status = oneOf<TaskStatus>(str(fd, "status"), TASK_STATUSES, "todo");
  if (id) await supabase.from("tasks").update({ status }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteTask(fd: FormData) {
  const { supabase } = await requireUser();
  const id = str(fd, "id", 64);
  if (id) await supabase.from("tasks").delete().eq("id", id);
  revalidatePath("/", "layout");
}

// ───────────── contacts ─────────────
export async function createContact(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const full_name = str(fd, "full_name", 160);
  if (!full_name) return { error: "name" };
  const { error } = await supabase.from("contacts").insert({
    full_name,
    kind: oneOf<ContactKind>(str(fd, "kind"), CONTACT_KINDS, "crew"),
    role: str(fd, "role", 120),
    phone: str(fd, "phone", 40),
    email: str(fd, "email", 320),
  });
  if (error) return { error: "failed" };
  revalidatePath("/contacts");
  return { message: "saved" };
}

export async function deleteContact(fd: FormData) {
  const { supabase } = await requireUser();
  const id = str(fd, "id", 64);
  if (id) await supabase.from("contacts").delete().eq("id", id);
  revalidatePath("/contacts");
}
