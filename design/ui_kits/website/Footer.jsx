// Footer.jsx — navy footer
const Footer = () => {
  return (
    <footer style={ftStyles.footer}>
      <div className="ah-footer-grid" style={ftStyles.inner}>
        <div style={ftStyles.brand}>
          <div style={ftStyles.logo}>
            <span style={ftStyles.bar}></span>
            <span style={ftStyles.wm1}>AFRİKA</span>
            <span style={ftStyles.wm2}>HABERLERİ</span>
          </div>
          <p style={ftStyles.tag}>Türk iş dünyası için Afrika pazarlarından editöryal haberler. Her sabah Türkiye saatiyle 06:00'da güncellenir.</p>
        </div>
        <div>
          <div style={ftStyles.h}>KATEGORİLER</div>
          {["Fırsatlar","Pazarlar & Ekonomi","Ticaret & İhracat","Sektörler","Türk İş Dünyası","Etkinlikler & Fuarlar"].map(l => <a key={l} href="#" style={ftStyles.l}>{l}</a>)}
        </div>
        <div>
          <div style={ftStyles.h}>BÖLGELER</div>
          {["Tüm Afrika","Kuzey Afrika","Batı Afrika","Orta Afrika","Doğu Afrika","Güney Afrika"].map(l => <a key={l} href="#" style={ftStyles.l}>{l}</a>)}
        </div>
        <div>
          <div style={ftStyles.h}>KURUMSAL</div>
          {["Hakkımızda","İletişim","Bülten","Reklam","Künye"].map(l => <a key={l} href="#" style={ftStyles.l}>{l}</a>)}
        </div>
      </div>
      <div style={ftStyles.copy}>
        <div style={ftStyles.copyInner}>
          <span>© 2026 AFRİKA HABERLERİ. TÜM HAKLARI SAKLIDIR.</span>
          <span style={ftStyles.legal}>GİZLİLİK • KULLANIM KOŞULLARI • ÇEREZ POLİTİKASI</span>
        </div>
      </div>
    </footer>
  );
};

const ftStyles = {
  footer: { background: "#0a2351", color: "#fff", marginTop: 60 },
  inner: { maxWidth: 1280, margin: "0 auto", padding: "48px 24px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 40 },
  brand: {},
  logo: { display: "flex", alignItems: "center", marginBottom: 12 },
  bar: { width: 4, height: 22, background: "#f5b800" },
  wm1: { color: "#fff", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em", marginLeft: 10 },
  wm2: { color: "#f5b800", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em", marginLeft: 6 },
  tag: { fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, maxWidth: 320 },
  h: { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#f5b800", marginBottom: 14 },
  l: { display: "block", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)", textDecoration: "none", marginBottom: 8 },
  copy: { borderTop: "1px solid rgba(255,255,255,0.12)" },
  copyInner: { maxWidth: 1280, margin: "0 auto", padding: "16px 24px", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", display: "flex", justifyContent: "space-between" },
  legal: { color: "rgba(255,255,255,0.45)" },
};

window.Footer = Footer;
