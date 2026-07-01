import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") ?? "/panel";
  const origin = req.nextUrl.origin;
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "select_account",
  });

  const response = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params}`);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });
  response.cookies.set("google_oauth_next", next, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });
  return response;
}
