"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ViewCountIncrementerProps {
  articleId: string;
}

export default function ViewCountIncrementer({ articleId }: ViewCountIncrementerProps) {
  useEffect(() => {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)("increment_view_count", { article_id: articleId }).then(() => {});
  }, [articleId]);

  return null;
}
