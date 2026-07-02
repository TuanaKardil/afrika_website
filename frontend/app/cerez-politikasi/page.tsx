import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Çerez Politikası | Afrika Haberleri",
  description: "Afrika Haberleri çerez kullanım politikası hakkında bilgi edinin.",
};

export default function CerezPolitikasiPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-headline text-3xl text-on-surface mb-2">Çerez Politikası</h1>
      <p className="font-body text-sm text-on-surface/50 mb-8">Son güncelleme: Temmuz 2026</p>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Kullandığımız Çerezler</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed mb-4">
          Afrika Haberleri yalnızca aşağıdaki teknik zorunlu çerezleri kullanmaktadır:
        </p>
        <div className="border border-outline-variant rounded-md overflow-hidden">
          <table className="w-full font-body text-sm">
            <thead className="bg-surface-container">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-on-surface">Çerez</th>
                <th className="text-left px-4 py-2.5 font-semibold text-on-surface">Amaç</th>
                <th className="text-left px-4 py-2.5 font-semibold text-on-surface">Süre</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-outline-variant">
                <td className="px-4 py-2.5 text-on-surface/80 font-mono text-xs">sb-*-auth-token</td>
                <td className="px-4 py-2.5 text-on-surface/80">Oturum yönetimi (giriş durumu)</td>
                <td className="px-4 py-2.5 text-on-surface/80">Oturum süresi</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Kullanmadığımız Çerezler</h2>
        <ul className="font-body text-base text-on-surface/80 leading-relaxed list-disc pl-5 space-y-1">
          <li>Reklam veya izleme çerezleri</li>
          <li>Analitik çerezler (Google Analytics vb.)</li>
          <li>Üçüncü taraf pazarlama çerezleri</li>
          <li>Sosyal medya çerezleri</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Çerezleri Kontrol Etme</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Tarayıcınızın ayarlarından çerezleri silebilir veya engelleyebilirsiniz. Oturum
          çerezini silmeniz durumunda her ziyarette yeniden giriş yapmanız gerekebilir.
        </p>
      </section>

      <section>
        <h2 className="font-headline text-xl text-on-surface mb-3">Daha Fazla Bilgi</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Kişisel verilerinizin nasıl işlendiği hakkında daha ayrıntılı bilgi için{" "}
          <a href="/kvkk" className="text-primary hover:underline">
            KVKK Aydınlatma Metnimizi
          </a>{" "}
          inceleyebilirsiniz. Sorularınız için{" "}
          <a href="/iletisim" className="text-primary hover:underline">
            iletişime geçin.
          </a>
        </p>
      </section>
    </main>
  );
}
