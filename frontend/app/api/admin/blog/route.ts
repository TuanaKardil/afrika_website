import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

function adminSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === process.env.ADMIN_EMAIL;
}

function makeSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/ş/g, "s").replace(/ç/g, "c").replace(/ı/g, "i")
    .replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const supabase = adminSupabase();

  if (id) {
    const { data, error } = await (supabase as ReturnType<typeof createClient>)
      .from("blog_posts").select("*").eq("id", id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ post: data });
  }

  const { data, count, error } = await (supabase as ReturnType<typeof createClient>)
    .from("blog_posts").select("id,slug,title,status,published_at,created_at", { count: "exact" })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data, total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, content, excerpt, featured_image_url, status } = body;
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const slug = makeSlug(title) + "-" + Date.now().toString(36);
  const publishedAt = status === "published" ? new Date().toISOString() : null;

  const supabase = adminSupabase();
  const { data, error } = await (supabase as ReturnType<typeof createClient>)
    .from("blog_posts")
    .insert({ title, slug, content: content ?? "", excerpt, featured_image_url, status: status ?? "draft", published_at: publishedAt })
    .select("id,slug").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}

export async function PATCH(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (updates.status === "published") {
    updates.published_at = updates.published_at ?? new Date().toISOString();
  }
  updates.updated_at = new Date().toISOString();

  const supabase = adminSupabase();
  const { error } = await (supabase as ReturnType<typeof createClient>)
    .from("blog_posts").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = adminSupabase();
  const { error } = await (supabase as ReturnType<typeof createClient>)
    .from("blog_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
