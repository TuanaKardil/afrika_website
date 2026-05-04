// RegionBar.jsx — pill row of regions under nav
const RegionBar = () => {
  const regions = [
    { slug: "afrika", label: "Tüm Afrika" },
    { slug: "kuzey", label: "Kuzey Afrika" },
    { slug: "bati", label: "Batı Afrika" },
    { slug: "orta", label: "Orta Afrika" },
    { slug: "dogu", label: "Doğu Afrika" },
    { slug: "guney", label: "Güney Afrika" },
  ];
  const [active, setActive] = React.useState("afrika");
  return (
    <div style={rbStyles.wrap}>
      <div className="ah-region-inner ah-container" style={rbStyles.inner}>
        <span style={rbStyles.label}>BÖLGE</span>
        <div style={rbStyles.pills}>
          {regions.map(r => (
            <a key={r.slug} href="#"
               onClick={(e) => { e.preventDefault(); setActive(r.slug); }}
               style={{
                 ...rbStyles.pill,
                 background: active === r.slug ? "#0a2351" : "transparent",
                 color: active === r.slug ? "#fff" : "#212529",
                 borderColor: active === r.slug ? "#0a2351" : "#e5e7eb",
               }}>{r.label}</a>
          ))}
        </div>
      </div>
    </div>
  );
};
const rbStyles = {
  wrap: { background: "#fff", borderBottom: "1px solid #e5e7eb" },
  inner: { maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 40, display: "flex", alignItems: "center", gap: 14 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#0a2351", paddingRight: 14, borderRight: "1px solid #e5e7eb" },
  pills: { display: "flex", gap: 6, flex: 1 },
  pill: { display: "inline-flex", alignItems: "center", padding: "5px 12px", border: "1px solid", fontSize: 12, fontWeight: 600, letterSpacing: "-0.005em", textDecoration: "none", borderRadius: 2, whiteSpace: "nowrap" },
  right: { display: "flex", alignItems: "center", gap: 10, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "#6b7280" },
  weatherLabel: { color: "#6b7280" },
  weather: { color: "#212529", fontWeight: 700 },
  fxLabel: { color: "#6b7280", marginLeft: 8 },
  fx: { color: "#212529", fontWeight: 700, fontFeatureSettings: '"tnum" 1' },
  fxUp: { color: "#2e8b3d", fontWeight: 700, fontFeatureSettings: '"tnum" 1' },
};
window.RegionBar = RegionBar;
