"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/sifre-sifirla`,
    });

    if (error) {
      setErrorMsg("E-posta gönderilirken hata oluştu. Lütfen tekrar deneyin.");
      setStatus("error");
    } else {
      setStatus("success");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <div
          role="status"
          className="px-4 py-4 bg-green-50 border border-green-200 rounded-lg font-body text-sm text-green-800 leading-relaxed"
        >
          <p className="font-semibold mb-1">Sıfırlama linki gönderildi!</p>
          <p>E-postanızı kontrol edin. Birkaç dakika içinde gelmezse <strong>spam / gereksiz</strong> klasörüne bakın.</p>
        </div>
        <Link
          href="/giris"
          className="text-center font-body text-sm text-primary hover:text-tertiary transition-colors"
        >
          Giriş sayfasına dön
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {status === "error" && (
        <div
          role="alert"
          className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg font-body text-sm text-red-700"
        >
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-body text-sm font-medium text-on-surface">
          E-posta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ornek@eposta.com"
          className="px-3 py-2.5 border border-outline-variant rounded-lg font-body text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-primary text-white font-body font-medium py-2.5 rounded-lg hover:bg-tertiary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "Gönderiliyor..." : "Sıfırlama Linki Gönder"}
      </button>
    </form>
  );
}
