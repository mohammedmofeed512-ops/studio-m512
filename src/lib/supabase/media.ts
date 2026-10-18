import "server-only";
import type { createClient } from "./server";

/** Short-lived links for private images, keyed by storage path. */
export async function signMedia(supabase: Awaited<ReturnType<typeof createClient>>, paths: Array<string | null | undefined>) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (!unique.length) return new Map<string, string>();
  const { data } = await supabase.storage.from("media").createSignedUrls(unique, 60 * 60);
  return new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl]));
}
