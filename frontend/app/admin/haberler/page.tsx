"use client";

import { useEffect, useState, useCallback } from "react";

interface Article {
  id: string;
  slug: string;
  title_tr: string | null;
  meta_description_tr: string | null;
  score: number | null;
  view_count: number;
  published_at: string;
  source: string;
  is_suppressed: boolean;
}

export default function AdminHaberler() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 30;

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      ...(search ? { q: search } : {}),
    });
    const res = await fetch(`/api/admin/articles?${params}`);
    const data = await res.json();
    setArticles(data.articles ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  async function saveMetaDesc(id: string, value: string) {
    setSaving(true);
    await fetch("/api/admin/articles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, meta_description_tr: value }),
    });
    setSaving(false);
    setEditing(null);
    fetchArticles();
  }

  async function toggleSuppress(id: string, current: boolean) {
    await fetch("/api/admin/articles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_suppressed: !current }),
    });
    fetchArticles();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Haberler</h1>
        <span className="text-gray-400 text-sm">{total.toLocaleString("tr")} haber</span>
      </div>

      <input
        type="text"
        placeholder="Başlıkta ara..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        className="w-full mb-6 px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber"
      />

      {loading ? (
        <p className="text-gray-500 text-sm">Yükleniyor...</p>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Başlık</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium w-64">Meta Description</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Skor</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Görüntülenme</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {articles.map((a) => (
                <tr key={a.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <a
                      href={`/haber/${a.slug}`}
                      target="_blank"
                      rel="noopener"
                      className="text-gray-200 hover:text-amber text-xs line-clamp-2 block max-w-xs"
                    >
                      {a.title_tr}
                    </a>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {a.source} · {new Date(a.published_at).toLocaleDateString("tr-TR")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {editing?.id === a.id ? (
                      <div className="flex flex-col gap-1.5">
                        <textarea
                          className="w-full px-2 py-1.5 bg-gray-800 border border-amber rounded text-xs text-gray-200 resize-none focus:outline-none"
                          rows={3}
                          value={editing.value}
                          maxLength={160}
                          onChange={e => setEditing({ id: a.id, value: e.target.value })}
                        />
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-gray-500">{editing.value.length}/160</span>
                          <button
                            onClick={() => saveMetaDesc(a.id, editing.value)}
                            disabled={saving}
                            className="px-2 py-0.5 bg-amber text-gray-900 rounded text-xs font-medium"
                          >
                            {saving ? "..." : "Kaydet"}
                          </button>
                          <button onClick={() => setEditing(null)} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                            İptal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditing({ id: a.id, value: a.meta_description_tr ?? "" })}
                        className="text-left w-full"
                      >
                        {a.meta_description_tr ? (
                          <span className="text-xs text-gray-400 hover:text-gray-200 line-clamp-2">{a.meta_description_tr}</span>
                        ) : (
                          <span className="text-xs text-red-500 hover:text-red-400">Eksik — tıkla ekle</span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${(a.score ?? 0) >= 8 ? "text-green-400" : (a.score ?? 0) >= 6 ? "text-yellow-400" : "text-red-400"}`}>
                      {a.score ?? "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300 text-sm">{a.view_count.toLocaleString("tr")}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleSuppress(a.id, a.is_suppressed)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${a.is_suppressed ? "bg-red-900/50 text-red-400 hover:bg-red-900" : "bg-green-900/50 text-green-400 hover:bg-green-900"}`}
                    >
                      {a.is_suppressed ? "Gizli" : "Yayında"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex gap-2 mt-6 justify-center">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm disabled:opacity-40">Önceki</button>
          <span className="px-3 py-1.5 text-gray-400 text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm disabled:opacity-40">Sonraki</button>
        </div>
      )}
    </div>
  );
}
