"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Browser Supabase client (same session cookies as the server), used for direct image uploads. */
export function browserClient() {
  client ??= createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  return client;
}

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type UploadResult = { ok: true; path: string } | { ok: false; reason: "tooLarge" | "type" | "failed" };

/** Uploads an image into the user's own folder of the private media bucket. */
export async function uploadImage(file: File, userId: string, folder: string): Promise<UploadResult> {
  if (file.size > MAX_BYTES) return { ok: false, reason: "tooLarge" };
  if (!TYPES.includes(file.type)) return { ok: false, reason: "type" };
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await browserClient().storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
  return error ? { ok: false, reason: "failed" } : { ok: true, path };
}
