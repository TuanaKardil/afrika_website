// Header.jsx — top breaking strip + sticky navy header
const Header = () => {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const fmt = now.toLocaleString("tr-TR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Main navy header */}
      <header style={hdrStyles.header}>
        <div className="ah-header-inner" style={hdrStyles.inner}>
          <a href="#" className="ah-header-logo" style={hdrStyles.logo}>
            <span style={hdrStyles.bar}></span>
            <span style={hdrStyles.wm1}>AFRİKA</span>
            <span style={hdrStyles.wm2}>HABERLERİ</span>
          </a>

          <div style={hdrStyles.actions}>
            <a href="#" style={hdrStyles.iconBtn} aria-label="Kaydedilenler">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </a>
            <a href="#" className="ah-header-subscribe" style={hdrStyles.subscribe}>BÜLTENE ABONE OL</a>
            <a href="giris.html" style={hdrStyles.signin}>Giriş Yap</a>
          </div>
        </div>
      </header>
    </>
  );
};

const hdrStyles = {
  utilStrip: { background: "#061a3f", color: "rgba(255,255,255,0.7)", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  utilInner: { maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 30, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, letterSpacing: "0.04em" },
  date: { color: "rgba(255,255,255,0.55)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em", whiteSpace: "nowrap" },
  utilRight: { display: "flex", alignItems: "center", gap: 18, whiteSpace: "nowrap" },
  utilLink: { color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" },
  live: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#ff4d4d", whiteSpace: "nowrap" },
  pulse: { width: 6, height: 6, borderRadius: "50%", background: "#ff4d4d", animation: "ahPulse 1.6s infinite" },

  header: { position: "sticky", top: 0, zIndex: 50, background: "#0a2351", color: "#fff" },
  inner: { maxWidth: 1280, margin: "0 auto", height: 64, padding: "0 24px", display: "flex", alignItems: "center", gap: 24 },
  logo: { display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 },
  bar: { width: 4, height: 28, background: "#f5b800" },
  wm1: { color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", marginLeft: 10 },
  wm2: { color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", marginLeft: 6 },
  search: { display: "flex", alignItems: "center", flex: 1, maxWidth: 460, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 2, padding: "0 12px", height: 38, gap: 8 },
  searchInput: { background: "transparent", border: 0, outline: 0, color: "#fff", fontFamily: "inherit", fontSize: 13, flex: 1 },
  kbd: { fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 2, padding: "2px 5px", letterSpacing: "0.04em" },
  actions: { display: "flex", alignItems: "center", gap: 14, marginLeft: "auto" },
  iconBtn: { color: "rgba(255,255,255,0.8)", display: "inline-flex", alignItems: "center", padding: 6 },
  subscribe: { background: "#f5b800", color: "#0a2351", padding: "8px 14px", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textDecoration: "none", borderRadius: 2 },
  signin: { fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)", textDecoration: "none" },
};

window.Header = Header;
