import { createBuildClient } from "@/lib/supabase/server";
const createClient = createBuildClient;
import type { Database } from "@/lib/database.types";

export type Sector = Database["public"]["Tables"]["sectors"]["Row"];

export async function getSectors(): Promise<Sector[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("sectors")
    .select("*")
    .order("display_order", { ascending: true });
  return data ?? [];
}

export async function getDropdownSectors(): Promise<Sector[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("sectors")
    .select("*")
    .eq("is_dropdown_featured", true)
    .order("display_order", { ascending: true });
  return data ?? [];
}

export async function getSectorBySlug(slug: string): Promise<Sector | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("sectors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}
