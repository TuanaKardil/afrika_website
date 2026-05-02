"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface SaveButtonProps {
  articleId: string;
}

export default function SaveButton({ articleId }: SaveButtonProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data } = await supabase
        .from("saved_articles")
        .select("article_id")
        .eq("user_id", user.id)
        .eq("article_id", articleId)
        .maybeSingle();

      setSaved(!!data);
      setLoading(false);
    }

    init();
  }, [articleId]);

  async function toggle() {
    if (!userId) {
      window.location.href = `/giris?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const supabase = createClient();
    const optimistic = !saved;
    setSaved(optimistic);

    if (optimistic) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from("saved_articles")
        .insert({ user_id: userId, article_id: articleId } as any);
      if (error) setSaved(!optimistic);
    } else {
      const { error } = await supabase
        .from("saved_articles")
        .delete()
        .eq("user_id", userId)
        .eq("article_id", articleId);
      if (error) setSaved(!optimistic);
    }
  }

  if (loading) {
    return (
      <div className="w-9 h-9 rounded-full bg-outline-variant animate-pulse" />
    );
  }

  if (!userId) {
    return (
      <button
        onClick={toggle}
        aria-label="Haberi kaydet"
        title="Kaydetmek icin giris yapin"
        className="p-2 rounded-full text-on-surface/40 hover:text-primary hover:bg-primary/10 transition-colors"
      >
        <BookmarkIcon filled={false} />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Kaydedilenlerden cikar" : "Haberi kaydet"}
      className={`p-2 rounded-full transition-colors ${
        saved
          ? "text-primary bg-primary/10 hover:bg-primary/20"
          : "text-on-surface/50 hover:text-primary hover:bg-primary/10"
      }`}
    >
      <BookmarkIcon filled={saved} />
    </button>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
