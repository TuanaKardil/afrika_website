// SectionBlock.jsx — eyebrow with blue rule + 4-up grid
const SectionBlock = ({ eyebrow, items, action = "Tümünü Gör", href = "haberler.html" }) => {
  return (
    <section style={blockStyles.section}>
      <div style={blockStyles.head}>
        <div style={blockStyles.headLeft}>
          <div style={blockStyles.rule}></div>
          <div style={blockStyles.eyebrow}>{eyebrow}</div>
        </div>
        <a href={href} style={blockStyles.action}>{action} →</a>
      </div>
      <div className="ah-grid-4" style={blockStyles.grid}>
        {items.map(a => <ArticleCard key={a.id} article={a} />)}
      </div>
    </section>
  );
};

// AllArticlesModal — full list of all news, with filters
const AllArticlesModal = ({ eyebrow, onClose }) => {
  const D = window.AH_DATA;
  const all = [D.LEAD_ARTICLE, ...D.SECONDARY, ...D.SECTOR_BLOCK, ...D.COUNTRY_BLOCK,
    ...D.SIDEBAR_LIST.map(a => ({ ...a, imgGrad: "linear-gradient(135deg,#143063,#1e6fb8)", excerpt: "" }))];
  const cats = ["Tümü", ...new Set(all.map(a => a.category))];
  const [cat, setCat] = React.useState("Tümü");
  const filtered = cat === "Tümü" ? all : all.filter(a => a.category === cat);

  React.useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div style={modalStyles.backdrop} onClick={onClose}>
      <div style={modalStyles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.head}>
          <div>
            <div style={modalStyles.eyebrow}>{eyebrow}</div>
            <div style={modalStyles.title}>Tüm Haberler</div>
            <div style={modalStyles.count}>{filtered.length} haber</div>
          </div>
          <button onClick={onClose} style={modalStyles.close} aria-label="Kapat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={modalStyles.filters}>
          {cats.map(c => (
            <a key={c} href="#" onClick={(e) => { e.preventDefault(); setCat(c); }}
               style={{ ...modalStyles.chip, background: cat === c ? "#0a2351" : "transparent", color: cat === c ? "#fff" : "#212529", borderColor: cat === c ? "#0a2351" : "#e5e7eb" }}>
              {c}
            </a>
          ))}
        </div>
        <div className="ah-grid-4" style={modalStyles.grid}>
          {filtered.map(a => <ArticleCard key={a.id} article={a} />)}
        </div>
      </div>
    </div>
  );
};

// RankedList — En Çok Okunanlar
const RankedList = ({ items }) => {
  return (
    <aside style={rankStyles.aside}>
      <div style={rankStyles.rule}></div>
      <div style={rankStyles.eyebrow}>EN ÇOK OKUNANLAR</div>
      <ol style={rankStyles.list}>
        {items.map((a, i) => (
          <li key={a.id} style={rankStyles.li}>
            <span style={rankStyles.num}>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <div style={rankStyles.cat}>{a.category}</div>
              <a href="#" style={rankStyles.title}>{a.title}</a>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
};

const blockStyles = {
  section: { maxWidth: 1280, margin: "0 auto", padding: "40px 24px 0" },
  head: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 },
  headLeft: { flex: 1 },
  rule: { borderTop: "2px solid #1e6fb8", width: "100%", marginBottom: 12 },
  eyebrow: { fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", color: "#0a2351", textTransform: "uppercase" },
  action: { fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#1e6fb8", textDecoration: "none", textTransform: "uppercase", paddingBottom: 2, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 },
};

const modalStyles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(10,35,81,0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 24px", overflowY: "auto" },
  panel: { background: "#fff", maxWidth: 1280, width: "100%", padding: "32px 32px 40px", borderRadius: 2 },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #1e6fb8", paddingBottom: 18, marginBottom: 20 },
  eyebrow: { fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#1e6fb8", marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: "#0a2351" },
  count: { fontSize: 12, fontWeight: 600, color: "#6b7280", marginTop: 6 },
  close: { background: "transparent", border: "1px solid #e5e7eb", color: "#0a2351", width: 36, height: 36, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 2 },
  filters: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 },
  chip: { display: "inline-flex", alignItems: "center", padding: "6px 14px", border: "1px solid", fontSize: 12, fontWeight: 600, textDecoration: "none", borderRadius: 2, whiteSpace: "nowrap" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 },
};

const rankStyles = {
  aside: { padding: "0 24px" },
  rule: { borderTop: "2px solid #1e6fb8", marginBottom: 12 },
  eyebrow: { fontSize: 16, fontWeight: 700, letterSpacing: "0.08em", color: "#0a2351", marginBottom: 18 },
  list: { listStyle: "none", margin: 0, padding: 0 },
  li: { display: "flex", gap: 14, padding: "12px 0", borderBottom: "1px solid #e5e7eb", alignItems: "flex-start" },
  num: { fontSize: 22, fontWeight: 800, color: "#f5b800", lineHeight: 1, fontFeatureSettings: '"tnum" 1', flexShrink: 0, width: 28 },
  cat: { fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "#6b7280", textTransform: "uppercase", marginBottom: 4 },
  title: { fontSize: 14, fontWeight: 700, lineHeight: 1.3, color: "#212529", textDecoration: "none" },
};

window.SectionBlock = SectionBlock;
window.RankedList = RankedList;
window.AllArticlesModal = AllArticlesModal;
