import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Giris Yap",
  description: "Afrika Haberleri hesabiniza giris yapin.",
};

interface GirisPageProps {
  searchParams: { redirect?: string };
}

export default function GirisPage({ searchParams }: GirisPageProps) {
  return (
    <main className="container mx-auto px-4 py-16 max-w-sm">
      <div className="bg-surface-container rounded-xl shadow-card p-8">
        <h1 className="font-headline text-2xl text-on-surface mb-2">Giris Yap</h1>
        <p className="font-body text-sm text-on-surface/60 mb-6">
          Haberleri kaydetmek icin hesabiniza giris yapin.
        </p>

        <LoginForm redirectTo={searchParams.redirect ?? "/panel"} />

        <p className="mt-5 text-center font-body text-sm text-on-surface/60">
          Hesabiniz yok mu?{" "}
          <Link
            href="/kayit"
            className="text-primary hover:text-tertiary font-medium transition-colors"
          >
            Kayit Ol
          </Link>
        </p>
      </div>
    </main>
  );
}
