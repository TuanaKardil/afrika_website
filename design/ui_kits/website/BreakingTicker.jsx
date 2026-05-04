// BreakingTicker.jsx — red breaking-news scroller above hero
const BreakingTicker = () => {
  const items = [
    "Cezayir otoyol ihalesi: Türk konsorsiyumu 1,2 milyar dolarlık projeyi üstlendi",
    "Senegal LNG sahası ilk yüklemesini Avrupa'ya gönderdi",
    "Aselsan Mısır anlaşması son onay aşamasında",
    "Nijerya merkez bankası faizi yüzde 22,75'e indirdi",
  ];
  return (
    <div className="ah-breaking" style={btStyles.wrap}>
      <div style={btStyles.label}>SON DAKİKA</div>
      <div style={btStyles.scroller}>
        <div style={btStyles.track}>
          {items.concat(items).map((t, i) => (
            <span key={i} style={btStyles.item}>
              <span style={btStyles.dot}></span>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
const btStyles = {
  wrap: { background: "#fff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "stretch", height: 36, overflow: "hidden" },
  label: { background: "#c41e3a", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", padding: "0 14px", display: "flex", alignItems: "center", flexShrink: 0, whiteSpace: "nowrap" },
  scroller: { flex: 1, overflow: "hidden", position: "relative" },
  track: { display: "flex", gap: 36, whiteSpace: "nowrap", animation: "ahMarquee 60s linear infinite", paddingLeft: 16, alignItems: "center", height: "100%" },
  item: { fontSize: 13, fontWeight: 600, color: "#212529", display: "inline-flex", alignItems: "center", gap: 10 },
  dot: { width: 5, height: 5, borderRadius: "50%", background: "#f5b800", flexShrink: 0 },
};
window.BreakingTicker = BreakingTicker;
