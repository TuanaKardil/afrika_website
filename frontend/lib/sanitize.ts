import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "h2", "h3", "p", "blockquote", "ul", "ol", "li",
  "strong", "em", "a", "small", "figure", "figcaption", "img",
  "table", "thead", "tbody", "tr", "th", "td",
];

export function sanitizeArticleContent(dirty: string): string {
  const cleaned = sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      // Keep source-citation and internal links clickable (a strong SEO/GEO
      // signal). sanitize-html still restricts href to safe schemes by default.
      a: ["href", "target", "rel"],
      p: ["class"],
      img: ["src", "alt", "width", "height"],
    },
    textFilter: (text) => text.replace(/\u2014|\u2013/g, ","),
  });
  return cleaned;
}
