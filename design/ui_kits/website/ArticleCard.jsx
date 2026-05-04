// ArticleCard.jsx — image + amber-dot meta + bold headline
const ArticleCard = ({ article, size = "md", fillHeight = false, layout = "vertical" }) => {
  const isLg = size === "lg";
  const isHorz = layout === "horizontal";
  return (
    <a href={`haber.html?id=${encodeURIComponent(article.id)}`}
       className={isHorz ? "ah-card-horz" : ""}
       style={{
         ...cardStyles.card,
         ...(isLg ? cardStyles.cardLg : {}),
         ...(isHorz ? cardStyles.cardHorz : {}),
         ...(fillHeight ? { height: "100%" } : {}),
       }}
       onMouseEnter={(e) => {
         const t = e.currentTarget.querySelector('.ah-title');
         if (t) { t.style.textDecoration = 'underline'; t.style.textUnderlineOffset = '3px'; }
         const img = e.currentTarget.querySelector('.ah-img');
         if (img) img.style.transform = 'scale(1.04)';
       }}
       onMouseLeave={(e) => {
         const t = e.currentTarget.querySelector('.ah-title');
         if (t) t.style.textDecoration = 'none';
         const img = e.currentTarget.querySelector('.ah-img');
         if (img) img.style.transform = 'scale(1)';
       }}>
      <div className={isHorz ? "ah-card-img" : ""} style={{
        ...cardStyles.img,
        ...(isLg && fillHeight ? { flex: 1, aspectRatio: "auto", minHeight: 380 } : {}),
        ...(!isLg && !isHorz ? { aspectRatio: "16/10" } : {}),
        ...(isHorz ? cardStyles.imgHorz : {}),
      }}>
        <div className="ah-img" style={{...cardStyles.imgInner, background: article.imgGrad}}></div>
        {isLg && (
          <>
            <div style={cardStyles.overlay}></div>
            <div style={cardStyles.heroText}>
              <div style={cardStyles.heroMeta}>
                <span style={cardStyles.heroDot}></span>
                {article.ago} • {article.category}
              </div>
              <div style={cardStyles.heroTitle} className="ah-title">{article.title}</div>
              <div style={cardStyles.heroExcerpt}>{article.excerpt}</div>
            </div>
          </>
        )}
      </div>
      {!isLg && (
        <div style={{...cardStyles.body, ...(isHorz ? cardStyles.bodyHorz : {})}}>
          <div style={cardStyles.meta}>
            <span style={cardStyles.dot}></span>
            {article.ago} • {article.category}
          </div>
          <div style={cardStyles.title} className="ah-title">{article.title}</div>
        </div>
      )}
    </a>
  );
};

const cardStyles = {
  card: { display: "flex", flexDirection: "column", height: "100%", textDecoration: "none", color: "inherit", border: "1px solid #e5e7eb", background: "#fff", transition: "border-color 150ms" },
  cardLg: { border: 0, position: "relative", overflow: "hidden" },
  cardHorz: { flexDirection: "row", minHeight: 0 },
  img: { position: "relative", overflow: "hidden", width: "100%" },
  imgHorz: { width: "45%", flexShrink: 0, aspectRatio: "auto", minHeight: "100%" },
  imgInner: { position: "absolute", inset: 0, transition: "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)" },
  overlay: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,35,81,0.94) 0%, rgba(10,35,81,0.55) 50%, rgba(10,35,81,0.05) 90%)" },
  heroText: { position: "absolute", bottom: 0, left: 0, right: 0, padding: "28px 32px 30px", color: "#fff" },
  heroMeta: { fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: "#f5b800", display: "flex", alignItems: "center", gap: 8, marginBottom: 14, textTransform: "uppercase" },
  heroDot: { width: 6, height: 6, borderRadius: "50%", background: "#f5b800" },
  heroTitle: { fontSize: 30, fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.022em", color: "#fff", marginBottom: 12 },
  heroExcerpt: { fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.85)", maxWidth: 580 },
  body: { padding: "14px 16px 16px", flex: 1, display: "flex", flexDirection: "column" },
  bodyHorz: { padding: "16px 18px", justifyContent: "center" },
  meta: { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#6b7280", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 },
  dot: { width: 5, height: 5, borderRadius: "50%", background: "#f5b800" },
  title: { fontSize: 16, fontWeight: 800, lineHeight: 1.28, letterSpacing: "-0.012em", color: "#0a2351" },
  excerpt: { fontSize: 13, color: "#4a5159", lineHeight: 1.5, marginTop: 6 },
};

window.ArticleCard = ArticleCard;
