import { createBuildClient } from "@/lib/supabase/server";
const createClient = createBuildClient;
import type { Database } from "@/lib/database.types";

export type Author = Database["public"]["Tables"]["authors"]["Row"];

export async function getAuthors(): Promise<Author[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("authors")
    .select("*")
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("authors")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}
