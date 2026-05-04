// Hero.jsx — 3-column grid: lead + 2 secondary + editör 10/10 öne çıkanlar
const Hero = () => {
  const { LEAD_ARTICLE, SECONDARY } = window.AH_DATA;

  // Editör puanı 10/10 olan haberler — anasayfa üst rafına otomatik yerleştirilir
  // (gerçek uygulamada CMS'ten rating: 10 ile filtrelenir)
  const TOP_RATED = [
    { id: "tr1", title: "Türkiye-Afrika ticaret hacmi 50 milyar dolara dayandı", category: "TİCARET", ago: "2 SAAT ÖNCE", rating: 10 },
    { id: "tr2", title: "Cezayir LNG ihracatında Avrupa'ya rekor sevkiyat", category: "ENERJİ", ago: "4 SAAT ÖNCE", rating: 10 },
    { id: "tr3", title: "Nijerya merkez bankası faiz kararını açıkladı", category: "PAZARLAR", ago: "6 SAAT ÖNCE", rating: 10 },
    { id: "tr4", title: "Etiyopya ile yeni serbest ticaret anlaşması imzalandı", category: "DİPLOMASİ", ago: "9 SAAT ÖNCE", rating: 10 },
  ];

  return (
    <section style={heroStyles.section}>
      <div className="ah-hero-grid ah-container" style={heroStyles.grid}>
        <div style={heroStyles.leadWrap}>
          <ArticleCard article={LEAD_ARTICLE} size="lg" fillHeight />
        </div>
        <div className="ah-hero-secondary" style={heroStyles.secondary}>
          {SECONDARY.map(a => <ArticleCard key={a.id} article={a} layout="horizontal" />)}
        </div>
        <aside className="ah-hero-sidebar" style={heroStyles.sidebar}>
          <div style={heroStyles.rule}></div>
          <div style={heroStyles.eyebrow}>EN ÇOK OKUNANLAR</div>
          <ul style={heroStyles.list}>
            {TOP_RATED.map((a, i) => (
              <li key={a.id} style={heroStyles.li}>
                <a href={`haber.html?id=${encodeURIComponent(a.id)}`} style={heroStyles.lk}>
                  <div style={heroStyles.num}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={heroStyles.body}>
                    <div style={heroStyles.liMeta}>
                      <span style={heroStyles.liDot}></span>
                      {a.ago} • {a.category}
                    </div>
                    <div style={heroStyles.liTitle}>{a.title}</div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
};

const heroStyles = {
  section: { background: "#fff", paddingTop: 24 },
  grid: { maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr) minmax(0,0.9fr)", gap: 20 },
  leadWrap: { gridColumn: "1 / 2" },
  secondary: { gridColumn: "2 / 3", display: "grid", gridTemplateRows: "1fr 1fr", gap: 16, minHeight: 0 },
  sidebar: { gridColumn: "3 / 4", paddingLeft: 4 },
  rule: { borderTop: "2px solid #1e6fb8", marginBottom: 12 },
  eyebrow: { fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", color: "#0a2351", marginBottom: 14 },
  list: { listStyle: "none", margin: 0, padding: 0 },
  li: { borderBottom: "1px solid #e5e7eb", padding: "12px 0" },
  lk: { textDecoration: "none", color: "inherit", display: "flex", gap: 12, alignItems: "flex-start" },
  num: { fontSize: 13, fontWeight: 700, color: "#9ca3af", lineHeight: 1.4, letterSpacing: "0.04em", fontFeatureSettings: '"tnum" 1', minWidth: 18, paddingTop: 1 },
  body: { flex: 1 },
  liMeta: { fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#6b7280", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 },
  liDot: { width: 5, height: 5, borderRadius: "50%", background: "#f5b800" },
  liTitle: { fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: "#212529", letterSpacing: "-0.005em" },
};

window.Hero = Hero;
