// SectorTicker.jsx — CNBC-style horizontal sector strip
const SectorTicker = () => {
  const { SECTORS } = window.AH_DATA;
  return (
    <div style={tickStyles.wrap}>
      <div style={tickStyles.inner}>
        <div style={tickStyles.label}>SEKTÖRLER</div>
        <div style={tickStyles.chips}>
          {SECTORS.map(s => {
            const color = s.dir === "up" ? "#2e8b3d" : s.dir === "down" ? "#c41e3a" : "#4a5159";
            const arrow = s.dir === "up" ? "↑" : s.dir === "down" ? "↓" : "";
            const sign = s.change != null ? (s.change > 0 ? "+" : "") + s.change.toFixed(1).replace(".", ",") : "";
            return (
              <a key={s.slug} href="#" style={tickStyles.chip}>
                <span style={tickStyles.chipName}>{s.name.toUpperCase()}</span>
                {s.change != null && (
                  <span style={{...tickStyles.chipChange, color}}>
                    {arrow} %{sign}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const tickStyles = {
  wrap: { background: "#f7f8fa", borderBottom: "1px solid #e5e7eb" },
  inner: { maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "stretch", height: 36 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#0a2351", padding: "0 16px", borderRight: "1px solid #e5e7eb", display: "flex", alignItems: "center", flexShrink: 0 },
  chips: { display: "flex", overflowX: "auto", flex: 1 },
  chip: { display: "inline-flex", alignItems: "center", gap: 8, padding: "0 14px", borderRight: "1px solid #e5e7eb", textDecoration: "none", whiteSpace: "nowrap" },
  chipName: { fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", color: "#212529" },
  chipChange: { fontSize: 11, fontWeight: 700, fontFeatureSettings: '"tnum" 1' },
};

window.SectorTicker = SectorTicker;
