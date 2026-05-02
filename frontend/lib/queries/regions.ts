import { createBuildClient } from "@/lib/supabase/server";
const createClient = createBuildClient;
import type { Database } from "@/lib/database.types";

export type Region = Database["public"]["Tables"]["regions"]["Row"];

export async function getRegions(): Promise<Region[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("regions")
    .select("*");
  return data ?? [];
}

export async function getRegionBySlug(slug: string): Promise<Region | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("regions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}
