import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "h2", "h3", "p", "blockquote", "ul", "ol", "li",
  "strong", "em", "figure", "figcaption", "img", "a",
];

export function sanitizeArticleContent(dirty: string): string {
  const cleaned = sanitizeHtml(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title"],
      img: ["src", "alt", "width", "height"],
    },
    textFilter: (text) => text.replace(/\u2014|\u2013/g, ","),
  });
  return cleaned;
}
