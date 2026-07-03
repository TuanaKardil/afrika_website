import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editoryal Politika",
  description:
    "Afrika Haberleri editoryal standartları, içerik seçim kriterleri ve düzeltme politikası hakkında bilgi edinin.",
  alternates: { canonical: "/editoryal-politika" },
};

export default function EditoryelPolitikaPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-headline text-3xl text-on-surface mb-8">Editoryal Politika</h1>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">İçerik Seçim Kriterleri</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed mb-4">
          Afrika Haberleri yalnızca Türk iş dünyasıyla doğrudan ilgili haberleri yayınlar.
          Editöryel ekibimiz, her haberi Afrika ile alaka düzeyi, güvenilirlik ve okuyucu
          değeri açısından değerlendirerek yayına alır.
        </p>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Türkiye veya Türk kuruluşlarını olumsuz biçimde öne çıkaran haberler yayınlanmaz.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Kaynak Şeffaflığı</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed mb-4">
          Tüm haberler orijinal kaynaktan derlenir; her içeriğin altında kaynak adı ve
          orijinal makaleye bağlantı yer alır. Kullandığımız kaynaklar:
        </p>
        <ul className="font-body text-base text-on-surface/80 list-disc pl-5 space-y-1 mb-4">
          <li>The Conversation Africa (theconversation.com/africa)</li>
          <li>The Africa Report (theafricareport.com)</li>
          <li>CNBC Africa (cnbcafrica.com)</li>
          <li>Anadolu Ajansı Afrika (aa.com.tr)</li>
          <li>Business Insider Africa (businessinsider.africa)</li>
        </ul>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          İçerikler Türk okuyucuya tarafsız biçimde aktarılmakta; tam metne erişmek için
          her zaman kaynak bağlantısı sağlanmaktadır.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Çeviri Süreci</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          İngilizce kaynak içerikler, editörlerimiz tarafından Türkçeye çevrilerek
          yayınlanmaktadır. Çevirilerde orijinal haberin anlamı, bağlamı ve tarafsızlığı
          titizlikle korunmaktadır.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Düzeltme Politikası</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Yayınlanan bir haberde olgusal hata tespit edilmesi halinde okuyucular{" "}
          <a href="/iletisim" className="text-primary hover:underline">
            iletişim sayfamız
          </a>{" "}
          aracılığıyla düzeltme talebinde bulunabilir. Doğrulanan hatalar en geç 24 saat
          içinde düzeltilir. Önemli düzeltmeler ilgili makalenin altında şeffaf biçimde
          belirtilir.
        </p>
      </section>

    </main>
  );
}
