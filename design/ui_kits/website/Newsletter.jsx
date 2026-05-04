// Newsletter.jsx — bültene abone ol section, full-bleed navy
const Newsletter = () => {
  const [email, setEmail] = React.useState("");
  const [done, setDone] = React.useState(false);
  return (
    <section style={nlStyles.section}>
      <div style={nlStyles.inner}>
        <div style={nlStyles.left}>
          <div style={nlStyles.eyebrow}>GÜNLÜK BÜLTEN</div>
          <h2 style={nlStyles.h}>Afrika gündemi her sabah saat 06:00'da kutunuzda</h2>
          <p style={nlStyles.p}>İhracat fırsatları, ihaleler, sektör haberleri ve ülke analizleri. 24.000+ Türk iş insanı zaten abone.</p>
          <ul style={nlStyles.ul}>
            <li style={nlStyles.li}><span style={nlStyles.tick}>✓</span>Sektör bazlı filtreleme</li>
            <li style={nlStyles.li}><span style={nlStyles.tick}>✓</span>Aktif ihale bildirimleri</li>
            <li style={nlStyles.li}><span style={nlStyles.tick}>✓</span>Haftalık analiz raporu (PDF)</li>
          </ul>
        </div>
        <div style={nlStyles.right}>
          <form style={nlStyles.form} onSubmit={(e) => { e.preventDefault(); setDone(true); }}>
            <label style={nlStyles.lab}>İŞ E-POSTASI</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@sirket.com" style={nlStyles.input}/>
            <label style={nlStyles.lab}>İLGİ ALANLARINIZ</label>
            <div style={nlStyles.chips}>
              {["İnşaat","Enerji","Savunma","Madencilik","Tekstil","Otomotiv","Tarım","Lojistik"].map(c => (
                <label key={c} style={nlStyles.chip}>
                  <input type="checkbox" defaultChecked={["İnşaat","Enerji"].includes(c)} style={{accentColor:"#0a2351"}}/>{c}
                </label>
              ))}
            </div>
            <button style={nlStyles.btn}>{done ? "✓ ABONE OLDUNUZ" : "ÜCRETSİZ ABONE OL →"}</button>
            <p style={nlStyles.fine}>Verileriniz üçüncü taraflarla paylaşılmaz. İstediğiniz zaman aboneliği bırakabilirsiniz.</p>
          </form>
        </div>
      </div>
    </section>
  );
};
const nlStyles = {
  section: { background: "#0a2351", color: "#fff", marginTop: 60 },
  inner: { maxWidth: 1280, margin: "0 auto", padding: "56px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" },
  left: {},
  eyebrow: { fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "#f5b800", marginBottom: 14 },
  h: { fontSize: 32, fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#fff", marginBottom: 14 },
  p: { fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,0.8)", marginBottom: 22 },
  ul: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 },
  li: { fontSize: 14, color: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", gap: 10 },
  tick: { color: "#f5b800", fontWeight: 800 },
  right: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", padding: 28 },
  form: { display: "flex", flexDirection: "column", gap: 8 },
  lab: { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#f5b800", marginTop: 6 },
  input: { height: 42, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", padding: "0 12px", fontFamily: "inherit", fontSize: 14, borderRadius: 2, outline: 0 },
  chips: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  chip: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)", borderRadius: 2, cursor: "pointer" },
  btn: { background: "#f5b800", color: "#0a2351", border: 0, height: 46, fontWeight: 800, fontSize: 13, letterSpacing: "0.06em", cursor: "pointer", borderRadius: 2, fontFamily: "inherit", marginTop: 6 },
  fine: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 8, lineHeight: 1.5 },
};
window.Newsletter = Newsletter;
