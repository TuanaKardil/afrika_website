import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const storedState = req.cookies.get("google_oauth_state")?.value;
  const next = req.cookies.get("google_oauth_next")?.value ?? "/panel";

  const clearCookies = (res: NextResponse) => {
    res.cookies.delete("google_oauth_state");
    res.cookies.delete("google_oauth_next");
    return res;
  };

  if (oauthError || !code || !state || state !== storedState) {
    return clearCookies(NextResponse.redirect(`${origin}/giris?error=google_auth_failed`));
  }

  // Exchange authorization code for Google tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return clearCookies(NextResponse.redirect(`${origin}/giris?error=google_token_failed`));
  }

  const { id_token } = await tokenRes.json();

  // Pass the Google ID token to Supabase — creates or signs in the user
  const supabase = createClient();
  const { error: supabaseError } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: id_token,
  });

  if (supabaseError) {
    return clearCookies(NextResponse.redirect(`${origin}/giris?error=supabase_auth_failed`));
  }

  return clearCookies(NextResponse.redirect(`${origin}${next}`));
}
