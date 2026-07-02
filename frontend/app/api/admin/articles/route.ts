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

export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 30));
  const q = searchParams.get("q") ?? "";
  const offset = (page - 1) * limit;

  const supabase = adminSupabase();
  let query = supabase
    .from("articles")
    .select("id,slug,title_tr,meta_description_tr,score,view_count,published_at,source,is_suppressed", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.ilike("title_tr", `%${q}%`);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ articles: data, total: count ?? 0 });
}

export async function PATCH(request: NextRequest) {
  if (!await requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...updates } = body as { id: string; [k: string]: unknown };

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const allowed: Array<keyof Database["public"]["Tables"]["articles"]["Update"]> = [
    "meta_description_tr",
    "is_suppressed",
    "is_featured",
  ];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k as never))
  ) as Database["public"]["Tables"]["articles"]["Update"];

  const supabase = adminSupabase();
  const { error } = await supabase.from("articles").update(filtered).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
