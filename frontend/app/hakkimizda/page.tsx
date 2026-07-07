import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "Afrika Haberleri, Türk iş dünyası için Afrika kıtasından derlenen güncel ekonomi, ticaret ve yatırım haberlerini Türkçe olarak sunan bir yayın platformudur.",
  ...canonicalMeta("/hakkimizda"),
};

export default function HakkimizdaPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-headline text-3xl text-on-surface mb-8">Hakkımızda</h1>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Yayın Misyonumuz</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed mb-4">
          Afrika Haberleri, Türk iş insanları, yatırımcılar, ihracatçılar ve araştırmacılar için
          Afrika kıtasındaki güncel ekonomi, ticaret ve yatırım haberlerini Türkçe olarak sunan
          editoryal bir haber platformudur.
        </p>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Kıtanın 54 ülkesindeki ekonomik gelişmeleri, sektörel fırsatları ve iş dünyasına yönelik
          kritik bilgileri erişilebilir ve güvenilir biçimde aktarmayı amaçlıyoruz.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">İçerik Kaynakları</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed mb-4">
          Haberlerimizi aşağıdaki uluslararası kaynakların editöryal içeriklerinden derliyoruz:
        </p>
        <ul className="font-body text-base text-on-surface/80 leading-relaxed list-disc pl-5 space-y-1">
          <li>The Conversation Africa</li>
          <li>The Africa Report</li>
          <li>CNBC Africa</li>
          <li>Anadolu Ajansı Afrika</li>
          <li>Business Insider Africa</li>
        </ul>
        <p className="font-body text-base text-on-surface/80 leading-relaxed mt-4">
          Her haber, kaynak gösterilerek yayınlanır ve orijinal içeriğe bağlantı içerir.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Hedef Kitlesi</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Platformumuz; Türk müteahhitlik ve altyapı yatırımcılarını, ihracatçı KOBİ&apos;leri,
          savunma ve güvenlik sektörü profesyonellerini, diplomatları ve akademisyenleri
          Afrika pazarlarındaki gelişmeler hakkında bilgilendirmeyi hedefler.
        </p>
      </section>

      <section>
        <h2 className="font-headline text-xl text-on-surface mb-3">İletişim</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Yayın ile ilgili soru ve geri bildirimleriniz için{" "}
          <a href="/iletisim" className="text-primary hover:underline">
            iletişim sayfamızı
          </a>{" "}
          ziyaret edebilirsiniz.
        </p>
      </section>
    </main>
  );
}
