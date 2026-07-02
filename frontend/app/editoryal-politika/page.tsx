import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editoryal Politika | Afrika Haberleri",
  description:
    "Afrika Haberleri editoryal standartları, içerik seçim kriterleri, düzeltme politikası ve kaynak şeffaflığı hakkında bilgi edinin.",
};

export default function EditoryelPolitikaPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-headline text-3xl text-on-surface mb-8">Editoryal Politika</h1>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">İçerik Seçim Kriterleri</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed mb-4">
          Afrika Haberleri yalnızca Türk iş dünyasıyla doğrudan ilgili haberleri yayınlar.
          Her haber, Afrika ile alaka düzeyine göre 1-10 arasında puanlanır; 6 ve üzeri puan
          alan haberler yayına alınır. Bu eşik, düşük ilgili içeriklerin filtrelenmesini sağlar.
        </p>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Türkiye veya Türk kuruluşlarını olumsuz biçimde öne çıkaran haberler yayınlanmaz.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Kaynak Şeffaflığı</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed mb-4">
          Tüm haberler, orijinal kaynaktan beslenir ve her içeriğin altında kaynak adı ile
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
          Bu kaynakların hiçbirinden telif hakkı izni alınmamış olup içerikler özet ve çeviri
          niteliğinde sunulmaktadır. Tam metne erişmek için her zaman kaynak bağlantısı
          sağlanmaktadır.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Çeviri ve Yapay Zeka Kullanımı</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          İngilizce kaynak içerikler, yapay zeka destekli çeviri sistemi kullanılarak Türkçeye
          aktarılmaktadır. Çeviriler SEO, GEO ve AEO standartlarına uygun olacak biçimde
          düzenlenmekte; orijinal haberin anlamı ve bağlamı korunmaktadır. Çeviri sürecinde
          içerik 600 kelimeyle sınırlandırılmakta, uzun orijinal haberler özetlenerek sunulmaktadır.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Düzeltme Politikası</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Yayınlanan bir haberde olgusal hata tespit edilmesi halinde, okuyucular{" "}
          <a href="/iletisim" className="text-primary hover:underline">
            iletişim sayfamız
          </a>{" "}
          aracılığıyla düzeltme talebinde bulunabilir. Doğrulanan hatalar en geç 24 saat
          içinde düzeltilir. Önemli düzeltmeler, ilgili makalenin altında şeffaf biçimde
          belirtilir.
        </p>
      </section>

      <section>
        <h2 className="font-headline text-xl text-on-surface mb-3">İçerik Güncelliği</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Haberler her gün 07:00 ve 13:00 TST&apos;de güncellenir. Son 24 saatte yayınlanan
          içerikler taranır, çoğaltılanlar ve düşük kaliteliler elenip yalnızca yüksek puanlı
          haberler okuyucuyla paylaşılır.
        </p>
      </section>
    </main>
  );
}
