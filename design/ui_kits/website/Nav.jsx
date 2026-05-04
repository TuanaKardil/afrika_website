// Nav.jsx — 8-tab horizontal nav with rich hover dropdowns
const Nav = () => {
  const { NAV_TABS, SECTOR_DROPDOWN } = window.AH_DATA;
  const [openDrop, setOpenDrop] = React.useState(null);
  const [active, setActive] = React.useState(null);
  const [hovered, setHovered] = React.useState(null);

  const WEST_AFRICA = [
    { name: "Nijerya", slug: "nijerya", capital: "Abuja", pop: "223M" },
    { name: "Senegal", slug: "senegal", capital: "Dakar", pop: "17M" },
    { name: "Gana", slug: "gana", capital: "Accra", pop: "33M" },
    { name: "Fildişi Sahili", slug: "fildisi", capital: "Yamoussoukro", pop: "28M" },
    { name: "Mali", slug: "mali", capital: "Bamako", pop: "22M" },
    { name: "Burkina Faso", slug: "burkina-faso", capital: "Ouagadougou", pop: "23M" },
    { name: "Nijer", slug: "nijer", capital: "Niamey", pop: "26M" },
    { name: "Gine", slug: "gine", capital: "Conakry", pop: "14M" },
    { name: "Benin", slug: "benin", capital: "Porto-Novo", pop: "13M" },
    { name: "Togo", slug: "togo", capital: "Lomé", pop: "9M" },
  ];

  return (
    <nav style={navStyles.nav}>
      <div className="ah-nav-inner ah-container" style={navStyles.inner}>
        <ul style={navStyles.list}>
          {NAV_TABS.map(tab => {
            const isActive = active === tab.slug;
            const isSectorDrop = tab.hasDropdown;
            const isCountryDrop = tab.hasCountryDropdown;
            const isDrop = isSectorDrop || isCountryDrop;
            const isHover = hovered === tab.slug;
            const isOpen = openDrop === tab.slug;
            const showAffordance = isDrop && (isHover || isOpen);
            return (
              <li key={tab.slug}
                  style={navStyles.item}
                  onMouseEnter={() => { setHovered(tab.slug); if (isDrop) setOpenDrop(tab.slug); }}
                  onMouseLeave={() => { setHovered(null); if (isDrop) setOpenDrop(null); }}>
                <a href={isSectorDrop ? "sektor-haberleri.html" : "#"}
                   onClick={(e) => { if (!isSectorDrop) { e.preventDefault(); setActive(tab.slug); } }}
                   style={{
                     ...navStyles.link,
                     color: isActive || showAffordance ? "#0a2351" : "#212529",
                     borderBottom: isActive ? "2px solid #f5b800" : (showAffordance ? "2px solid #1e6fb8" : "2px solid transparent"),
                     background: showAffordance ? "rgba(30,111,184,0.06)" : "transparent",
                   }}>
                  {tab.label}
                  {isDrop && (
                    <span style={{
                      ...navStyles.dropPill,
                      background: showAffordance ? "#0a2351" : "#f5b800",
                      color: showAffordance ? "#fff" : "#0a2351",
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transform: showAffordance ? "rotate(180deg)" : "rotate(0)", transition: "transform 200ms" }}><path d="M6 9l6 6 6-6"/></svg>
                    </span>
                  )}
                </a>

                {/* SECTOR mega-dropdown */}
                {isSectorDrop && isOpen && (
                  <div style={navStyles.megaWrap}>
                    <div style={navStyles.megaArrow}></div>
                    <div style={navStyles.mega}>
                      <div style={navStyles.megaHeader}>
                        <div style={navStyles.megaEyebrow}>SEKTÖR HABERLERİ</div>
                        <div style={navStyles.megaHelper}>Sektör seçerek o alandaki tüm haberleri filtreleyin</div>
                      </div>
                      <div style={navStyles.grid}>
                        {SECTOR_DROPDOWN.map((sec, i) => (
                          <a key={sec} href="sektor-haberleri.html" style={navStyles.gridItem}>
                            <span style={navStyles.gridNum}>{String(i + 1).padStart(2, "0")}</span>
                            <span style={navStyles.gridName}>{sec}</span>
                          </a>
                        ))}
                      </div>
                      <a href="sektor-haberleri.html" style={navStyles.megaFooter}>Tüm sektör haberlerini gör →</a>
                    </div>
                  </div>
                )}

                {/* COUNTRY mega-dropdown */}
                {isCountryDrop && isOpen && (
                  <div style={{...navStyles.megaWrap, left: "auto", right: 0}}>
                    <div style={{...navStyles.megaArrow, left: "auto", right: 30}}></div>
                    <div style={navStyles.mega}>
                      <div style={navStyles.megaHeader}>
                        <div style={navStyles.megaEyebrow}>BATI AFRİKA ÜLKELERİ</div>
                        <div style={navStyles.megaHelper}>Ülkeye tıklayarak o ülkeye ait haberleri görün</div>
                      </div>
                      <div style={navStyles.grid}>
                        {WEST_AFRICA.map((c, i) => (
                          <a key={c.slug} href={`haberler.html?ulke=${c.slug}`} style={navStyles.gridItem}>
                            <span style={navStyles.gridNum}>{String(i + 1).padStart(2, "0")}</span>
                            <span style={navStyles.gridName}>{c.name}</span>
                          </a>
                        ))}
                      </div>
                      <a href="haberler.html" style={navStyles.megaFooter}>Tüm ülke haberlerini gör →</a>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

const slugify = (s) => s.toLowerCase()
  .replaceAll("ı","i").replaceAll("ş","s").replaceAll("ğ","g").replaceAll("ü","u").replaceAll("ö","o").replaceAll("ç","c")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const navStyles = {
  nav: { background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 64, zIndex: 40, overflow: "visible" },
  inner: { maxWidth: 1280, margin: "0 auto", padding: "0 24px", overflow: "visible" },
  list: { display: "flex", alignItems: "center", gap: 8, listStyle: "none", margin: 0, padding: 0, height: 52, overflow: "visible" },
  item: { position: "relative", height: "100%", display: "flex", alignItems: "center" },
  link: { textDecoration: "none", fontSize: 14, fontWeight: 700, letterSpacing: "-0.005em", whiteSpace: "nowrap", height: "100%", display: "inline-flex", alignItems: "center", gap: 8, padding: "0 14px", transition: "background 150ms" },
  dropPill: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", transition: "background 150ms, color 150ms" },

  megaWrap: { position: "absolute", top: "100%", left: 0, paddingTop: 8, zIndex: 60 },
  megaArrow: { position: "absolute", top: 2, left: 30, width: 14, height: 14, background: "#fff", border: "1px solid #e5e7eb", borderRight: 0, borderBottom: 0, transform: "rotate(45deg)" },
  mega: { background: "#fff", border: "1px solid #e5e7eb", boxShadow: "0 12px 32px rgba(10,35,81,0.16)", width: 560, padding: 20, position: "relative" },
  megaHeader: { borderBottom: "2px solid #1e6fb8", paddingBottom: 12, marginBottom: 14 },
  megaEyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#1e6fb8" },
  megaHelper: { fontSize: 12, color: "#6b7280", marginTop: 4 },

  feature: { display: "flex", alignItems: "center", gap: 14, background: "linear-gradient(135deg,#0a2351 0%,#143063 100%)", color: "#fff", padding: "16px 18px", textDecoration: "none", marginBottom: 16, position: "relative" },
  featureBar: { width: 4, alignSelf: "stretch", background: "#f5b800" },
  featureNum: { fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#f5b800", marginBottom: 4 },
  featureTitle: { fontSize: 18, fontWeight: 800, letterSpacing: "-0.015em", color: "#fff", marginBottom: 6, lineHeight: 1.2 },
  featureMeta: { display: "flex", alignItems: "center", gap: 12, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)", letterSpacing: "0.04em" },
  featureLive: { display: "inline-flex", alignItems: "center", gap: 5, color: "#ff6b6b", fontWeight: 700 },
  pulse: { width: 5, height: 5, borderRadius: "50%", background: "#ff6b6b", animation: "ahPulse 1.6s infinite" },
  featureCta: { fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "#f5b800", whiteSpace: "nowrap", paddingLeft: 8 },

  gridLabel: { fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#9ca3af", marginBottom: 10 },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, marginBottom: 14, marginTop: 4 },
  gridItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", textDecoration: "none", color: "#212529", borderRadius: 2, transition: "background 120ms" },
  gridNum: { fontSize: 10, fontWeight: 800, color: "#9ca3af", width: 20, fontFeatureSettings: '"tnum" 1' },
  gridName: { fontSize: 13, fontWeight: 600, letterSpacing: "-0.005em" },

  megaFooter: { display: "block", borderTop: "1px solid #e5e7eb", paddingTop: 14, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "#1e6fb8", textDecoration: "none", textAlign: "center" },
};

window.Nav = Nav;
