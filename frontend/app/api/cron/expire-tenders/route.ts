import { NextResponse } from "next/server";
import { createBuildClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createBuildClient();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("tenders")
    .update({ is_suppressed: true })
    .eq("is_suppressed", false)
    .not("deadline_at", "is", null)
    .lt("deadline_at", sixtyDaysAgo)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ suppressed: data?.length ?? 0, ts: new Date().toISOString() });
}
