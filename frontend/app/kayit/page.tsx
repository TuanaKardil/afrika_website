import type { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Kayit Ol",
  description: "Afrika Haberleri icin ucretsiz hesap olusturun.",
};

export default function KayitPage() {
  return (
    <main className="container mx-auto px-4 py-16 max-w-sm">
      <div className="bg-surface-container rounded-xl shadow-card p-8">
        <h1 className="font-headline text-2xl text-on-surface mb-2">Kayit Ol</h1>
        <p className="font-body text-sm text-on-surface/60 mb-6">
          Ucretsiz hesap olusturun ve haberleri kaydedin.
        </p>

        <RegisterForm />

        <p className="mt-5 text-center font-body text-sm text-on-surface/60">
          Zaten hesabiniz var mi?{" "}
          <Link
            href="/giris"
            className="text-primary hover:text-tertiary font-medium transition-colors"
          >
            Giris Yap
          </Link>
        </p>
      </div>
    </main>
  );
}
