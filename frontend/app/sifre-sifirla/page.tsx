import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Şifre Sıfırla",
  description: "Afrika Haberleri hesabınız için yeni şifre belirleyin.",
};

export default async function SifreSifirlaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sifremi-unuttum?error=link_gecersiz");
  }

  return (
    <main className="container mx-auto px-4 py-16 max-w-sm">
      <div className="bg-surface-container rounded-xl shadow-card p-8">
        <h1 className="font-headline text-2xl text-on-surface mb-2">Yeni Şifre Belirle</h1>
        <p className="font-body text-sm text-on-surface/60 mb-6">
          Hesabınız için yeni bir şifre oluşturun.
        </p>

        <ResetPasswordForm />
      </div>
    </main>
  );
}
