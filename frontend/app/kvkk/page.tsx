import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description:
    "Afrika Haberleri kişisel verilerin korunması kanunu kapsamında aydınlatma metni.",
  alternates: { canonical: "/kvkk" },
};

export default function KvkkPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-headline text-3xl text-on-surface mb-2">KVKK Aydınlatma Metni</h1>
      <p className="font-body text-sm text-on-surface/50 mb-8">Son güncelleme: Temmuz 2026</p>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Veri Sorumlusu</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında veri sorumlusu
          sıfatıyla <strong>Afrika Haberleri</strong> (afrikahaberleri.tr) hareket etmektedir.
          İletişim için:{" "}
          <a href="mailto:iletisim@afrikahaberleri.tr" className="text-primary hover:underline">
            iletisim@afrikahaberleri.tr
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">İşlenen Kişisel Veriler</h2>
        <ul className="font-body text-base text-on-surface/80 leading-relaxed list-disc pl-5 space-y-2">
          <li>
            <strong>E-posta ile kayıt:</strong> E-posta adresi, şifre (şifrelenmiş biçimde saklanır,
            düz metin olarak tutulmaz)
          </li>
          <li>
            <strong>Google ile kayıt:</strong> Google hesabınızdan iletilen e-posta adresi ve
            görünen ad
          </li>
          <li>
            <strong>Kullanım verileri:</strong> Kaydedilen makaleler (tercih yönetimi için)
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">
          İşleme Amacı ve Hukuki Dayanağı
        </h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed mb-3">
          Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
        </p>
        <ul className="font-body text-base text-on-surface/80 leading-relaxed list-disc pl-5 space-y-2">
          <li>
            Kullanıcı hesabının oluşturulması ve yönetilmesi{" "}
            <span className="text-on-surface/50">(KVKK md.5/2-c — sözleşme ifası)</span>
          </li>
          <li>
            Kayıtlı makale tercihlerinin saklanması{" "}
            <span className="text-on-surface/50">(KVKK md.5/2-c — sözleşme ifası)</span>
          </li>
          <li>
            Hesap güvenliği ve kimlik doğrulama{" "}
            <span className="text-on-surface/50">(KVKK md.5/2-f — meşru menfaat)</span>
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Yurt Dışına Veri Aktarımı</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Kullanıcı verileri, kimlik doğrulama ve veri tabanı hizmetleri için{" "}
          <strong>Supabase Inc.</strong> (ABD) altyapısında işlenmektedir. Bu aktarım KVKK
          md.9 kapsamında gerçekleşmekte olup Supabase, SOC 2 Type II sertifikalı bir
          altyapı sağlayıcısıdır.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">Saklama Süresi</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Kişisel verileriniz, hesabınız aktif olduğu sürece saklanır. Hesabınızı silmeniz
          halinde verileriniz en geç 30 gün içinde sistemden kaldırılır. Silme talebi için{" "}
          <a href="/iletisim" className="text-primary hover:underline">
            iletişim sayfamızı
          </a>{" "}
          kullanabilirsiniz.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-headline text-xl text-on-surface mb-3">
          KVKK Kapsamındaki Haklarınız
        </h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed mb-3">
          KVKK md.11 uyarınca aşağıdaki haklara sahipsiniz:
        </p>
        <ul className="font-body text-base text-on-surface/80 leading-relaxed list-disc pl-5 space-y-1">
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
          <li>İşlenmişse buna ilişkin bilgi talep etme</li>
          <li>Yanlış verilerin düzeltilmesini isteme</li>
          <li>Verilerin silinmesini veya yok edilmesini talep etme</li>
          <li>Aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
          <li>Otomatik sistemler vasıtasıyla aleyhe sonuç doğurulmasına itiraz etme</li>
        </ul>
        <p className="font-body text-base text-on-surface/80 leading-relaxed mt-3">
          Taleplerinizi{" "}
          <a href="mailto:iletisim@afrikahaberleri.tr" className="text-primary hover:underline">
            iletisim@afrikahaberleri.tr
          </a>{" "}
          adresine iletebilirsiniz.
        </p>
      </section>

      <section>
        <h2 className="font-headline text-xl text-on-surface mb-3">Çerez Kullanımı</h2>
        <p className="font-body text-base text-on-surface/80 leading-relaxed">
          Sitemizde yalnızca oturum yönetimi için zorunlu çerezler kullanılmaktadır. Detaylar
          için{" "}
          <a href="/cerez-politikasi" className="text-primary hover:underline">
            Çerez Politikamızı
          </a>{" "}
          inceleyebilirsiniz.
        </p>
      </section>
    </main>
  );
}
