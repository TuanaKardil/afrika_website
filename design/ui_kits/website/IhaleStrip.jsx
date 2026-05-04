// IhaleStrip.jsx — opportunity / tender block (specific to this site)
const IhaleStrip = () => {
  const stats = [
    { v: "847", l: "Aktif İhale" },
    { v: "23", l: "Bu Hafta Eklenen" },
    { v: "41", l: "7 Günde Bitiyor" },
  ];
  const tenders = [
    { country: "Cezayir", title: "Tlemcen otoyol genişleme projesi", deadline: "12 GÜN", budget: "$1,2Mr", cat: "İNŞAAT" },
    { country: "Nijerya", title: "Lagos limanı konteyner terminali", deadline: "8 GÜN", budget: "$680M", cat: "ALTYAPI" },
    { country: "Senegal", title: "Dakar kentsel su şebekesi", deadline: "21 GÜN", budget: "$240M", cat: "ENERJİ" },
  ];
  return (
    <section style={ihStyles.section}>
      <div style={ihStyles.head}>
        <div style={ihStyles.headLeft}>
          <div style={ihStyles.rule}></div>
          <div style={ihStyles.eyebrowRow}>
            <span style={ihStyles.eyebrow}>İHALELER & FIRSATLAR</span>
            <span style={ihStyles.live}><span style={ihStyles.pulse}></span>CANLI</span>
          </div>
        </div>
        <a href="#" style={ihStyles.action}>TÜM İHALELER →</a>
      </div>

      <div className="ah-ihale-stats" style={ihStyles.stats}>
        {stats.map((s, i) => (
          <div key={i} style={ihStyles.stat}>
            <div style={ihStyles.statV}>{s.v}</div>
            <div style={ihStyles.statL}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={ihStyles.list}>
        {tenders.map((t, i) => (
          <a key={i} href="#" className="ah-ihale-row" style={ihStyles.row}>
            <div style={ihStyles.rowFlag}>{t.country.toUpperCase()}</div>
            <div style={ihStyles.rowMid}>
              <div style={ihStyles.rowCat}>{t.cat}</div>
              <div style={ihStyles.rowTitle}>{t.title}</div>
            </div>
            <div style={ihStyles.rowBudget}>{t.budget}</div>
            <div style={ihStyles.rowDeadline}>
              <div style={ihStyles.rowDeadL}>SON BAŞVURU</div>
              <div style={ihStyles.rowDeadV}>{t.deadline}</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};
const ihStyles = {
  section: { maxWidth: 1280, margin: "0 auto", padding: "48px 24px 0" },
  head: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 },
  headLeft: { flex: 1 },
  rule: { borderTop: "2px solid #1e6fb8", marginBottom: 12 },
  eyebrowRow: { display: "flex", alignItems: "center", gap: 12 },
  eyebrow: { fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", color: "#0a2351", textTransform: "uppercase" },
  live: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#c41e3a" },
  pulse: { width: 6, height: 6, borderRadius: "50%", background: "#c41e3a", animation: "ahPulse 1.6s infinite" },
  action: { fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#1e6fb8", textDecoration: "none", textTransform: "uppercase" },
  stats: { background: "#0a2351", color: "#fff", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 16 },
  stat: { padding: "20px 24px", borderRight: "1px solid rgba(255,255,255,0.12)" },
  statV: { fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", fontFeatureSettings: '"tnum" 1' },
  statL: { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", marginTop: 4 },
  list: { border: "1px solid #e5e7eb" },
  row: { display: "grid", gridTemplateColumns: "120px 1fr 110px 130px", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #e5e7eb", textDecoration: "none", color: "#212529", gap: 18 },
  rowFlag: { fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#0a2351", borderLeft: "3px solid #f5b800", paddingLeft: 10 },
  rowMid: {},
  rowCat: { fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#6b7280", marginBottom: 3 },
  rowTitle: { fontSize: 14, fontWeight: 700, letterSpacing: "-0.005em" },
  rowBudget: { fontSize: 16, fontWeight: 800, color: "#2e8b3d", letterSpacing: "-0.01em", textAlign: "right", fontFeatureSettings: '"tnum" 1' },
  rowDeadline: { textAlign: "right" },
  rowDeadL: { fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", color: "#6b7280", textTransform: "uppercase" },
  rowDeadV: { fontSize: 13, fontWeight: 800, color: "#c41e3a", fontFeatureSettings: '"tnum" 1' },
};
window.IhaleStrip = IhaleStrip;
