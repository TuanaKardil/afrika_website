import { getLatestArticles } from "@/lib/queries/articles";

export default async function BreakingTicker() {
  const { articles } = await getLatestArticles(1);
  const items = articles
    .slice(0, 7)
    .map((a) => a.title_tr ?? "")
    .filter(Boolean);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div className="bg-white border-b border-outline-variant flex items-stretch h-9 overflow-hidden">
      <div
        className="text-white text-[11px] font-black tracking-[0.1em] px-3.5 flex items-center shrink-0 whitespace-nowrap"
        style={{ background: "#c41e3a" }}
      >
        SON DAKİKA
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div
          className="flex items-center h-full gap-9 whitespace-nowrap pl-4"
          style={{ animation: "ticker-scroll 60s linear infinite" }}
        >
          {doubled.map((title, i) => (
            <span
              key={i}
              className="text-[13px] font-semibold text-on-surface inline-flex items-center gap-2.5 shrink-0"
            >
              <span className="w-[5px] h-[5px] rounded-full bg-amber shrink-0" />
              {title}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
