import type { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Şifremi Unuttum",
  description: "Afrika Haberleri hesabınız için şifre sıfırlama linki alın.",
  robots: { index: false, follow: false },
};

export default function SifremiUnuttumPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-sm">
      <div className="bg-surface-container rounded-xl shadow-card p-8">
        <h1 className="font-headline text-2xl text-on-surface mb-2">Şifremi Unuttum</h1>
        <p className="font-body text-sm text-on-surface/60 mb-6">
          E-posta adresinizi girin, size şifre sıfırlama linki gönderelim.
        </p>

        <ForgotPasswordForm />

        <p className="mt-5 text-center font-body text-sm text-on-surface/60">
          Şifrenizi hatırladınız mı?{" "}
          <Link
            href="/giris"
            className="text-primary hover:text-tertiary font-medium transition-colors"
          >
            Giriş Yap
          </Link>
        </p>
      </div>
    </main>
  );
}
