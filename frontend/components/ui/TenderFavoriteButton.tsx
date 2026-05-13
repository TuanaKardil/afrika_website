"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface TenderFavoriteButtonProps {
  tenderId: string;
}

export default function TenderFavoriteButton({ tenderId }: TenderFavoriteButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        supabase
          .from("saved_tenders")
          .select("tender_id")
          .eq("user_id", uid)
          .eq("tender_id", tenderId)
          .maybeSingle()
          .then(({ data: row }) => setIsSaved(!!row));
      }
    });
  }, [tenderId]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) {
      setShowModal(true);
      return;
    }

    const supabase = createClient();
    setLoading(true);
    try {
      if (isSaved) {
        await supabase
          .from("saved_tenders")
          .delete()
          .eq("user_id", userId)
          .eq("tender_id", tenderId);
        setIsSaved(false);
      } else {
        // Type cast needed: supabase-js@2.103 + ssr@0.5 mismatches __InternalSupabase.PostgrestVersion
        await (supabase as any)
          .from("saved_tenders")
          .insert({ user_id: userId, tender_id: tenderId });
        setIsSaved(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={isSaved ? "Favorilerden çıkar" : "Favorilere ekle"}
        className={`shrink-0 p-1.5 rounded-full transition-all duration-150 hover:scale-110 active:scale-95 ${
          isSaved
            ? "text-red-500 hover:text-red-600"
            : "text-on-surface/30 hover:text-red-400"
        } disabled:opacity-50`}
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill={isSaved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={isSaved ? 0 : 2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-surface-container rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="font-headline text-lg text-center text-on-surface mb-1">
              Favorilere Ekle
            </h3>
            <p className="font-body text-sm text-center text-on-surface/60 mb-6">
              İhaleleri favorilere eklemek için giriş yapmanız gerekiyor.
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href="/giris"
                className="w-full py-2.5 rounded-lg bg-primary text-white font-body text-sm font-semibold text-center hover:bg-primary/90 transition-colors"
              >
                Giriş Yap
              </Link>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 rounded-lg border border-outline-variant font-body text-sm text-on-surface/70 hover:bg-surface-container-high transition-colors"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
