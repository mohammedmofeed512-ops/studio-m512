import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing page for the email-confirmation link Supabase sends after sign-up.
 * The email template links here with token_hash, which works on any device; `code` (PKCE) only
 * works in the browser that started sign-up, so it is kept for older links.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const next = searchParams.get("next");
  const safe = next && /^\/(?!\/)[\w\-./?=&%]*$/.test(next) ? next : "/";
  if (ok) return NextResponse.redirect(`${origin}${safe}`);
  const back = new URL("/login", origin);
  back.searchParams.set("error", "link");
  if (safe !== "/") back.searchParams.set("next", safe);
  return NextResponse.redirect(back);
}
