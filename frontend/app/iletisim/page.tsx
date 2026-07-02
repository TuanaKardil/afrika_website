import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İletişim | Afrika Haberleri",
  description:
    "Afrika Haberleri ile iletişime geçin. İçerik, iş birliği ve düzeltme talepleriniz için bize ulaşın.",
};

export default function IletisimPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-headline text-3xl text-on-surface mb-8">İletişim</h1>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Bize Ulaşın</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed mb-6">
          Haber düzeltme talepleri, iş birliği teklifleri ve genel sorularınız için
          aşağıdaki e-posta adresinden bize ulaşabilirsiniz.
        </p>
        <div className="bg-surface-container rounded-md p-5 inline-block">
          <p className="font-body text-sm text-on-surface/60 mb-1 uppercase tracking-wider text-xs font-semibold">E-posta</p>
          <a
            href="mailto:iletisim@afrikahaberleri.tr"
            className="font-headline text-lg text-primary hover:underline"
          >
            iletisim@afrikahaberleri.tr
          </a>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Düzeltme Talepleri</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Yayınlanan bir haberde hata tespit ettiyseniz lütfen ilgili haber URL&apos;sini ve
          düzeltme talebinizi e-posta yoluyla iletiniz. Doğrulanan düzeltmeler en geç 24 saat
          içinde işleme alınır. Daha fazla bilgi için{" "}
          <a href="/editoryal-politika" className="text-primary hover:underline">
            editoryal politikamızı
          </a>{" "}
          inceleyebilirsiniz.
        </p>
      </section>

      <section>
        <h2 className="font-headline text-xl text-on-surface mb-3">İş Birliği</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Reklam, sponsorluk veya içerik ortaklığı teklifleri için yukarıdaki e-posta adresinden
          iletişime geçebilirsiniz.
        </p>
      </section>
    </main>
  );
}
