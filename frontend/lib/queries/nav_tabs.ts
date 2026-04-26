import { createBuildClient } from "@/lib/supabase/server";
const createClient = createBuildClient;
import type { Database } from "@/lib/database.types";

export type NavTab = Database["public"]["Tables"]["nav_tabs"]["Row"];

export async function getNavTabs(): Promise<NavTab[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("nav_tabs")
    .select("*")
    .order("display_order", { ascending: true });
  return data ?? [];
}

export async function getNavTabBySlug(slug: string): Promise<NavTab | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("nav_tabs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}
