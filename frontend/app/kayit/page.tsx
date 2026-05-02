import type { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Kayıt Ol",
  description: "Afrika Haberleri için ücretsiz hesap oluşturun.",
};

export default function KayitPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-sm">
      <div className="bg-surface-container rounded-xl shadow-card p-8">
        <h1 className="font-headline text-2xl text-on-surface mb-2">Kayıt Ol</h1>
        <p className="font-body text-sm text-on-surface/60 mb-6">
          Ücretsiz hesap oluşturun ve haberleri kaydedin.
        </p>

        <RegisterForm />

        <p className="mt-5 text-center font-body text-sm text-on-surface/60">
          Zaten hesabınız var mı?{" "}
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
