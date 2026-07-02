"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(() => import("@/components/admin/TiptapEditor"), { ssr: false });

interface Article {
  id: string;
  slug: string;
  title_tr: string | null;
  excerpt_tr: string | null;
  content_tr: string | null;
  meta_description_tr: string | null;
  featured_image_url: string | null;
  score: number | null;
  source: string;
  published_at: string;
}

export default function ArticleEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/articles?id=${id}`);
    const data = await res.json();
    const a: Article = data.article;
    setArticle(a);
    setTitle(a.title_tr ?? "");
    setExcerpt(a.excerpt_tr ?? "");
    setContent(a.content_tr ?? "");
    setMetaDesc(a.meta_description_tr ?? "");
    setImageUrl(a.featured_image_url ?? "");
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/articles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title_tr: title,
        excerpt_tr: excerpt,
        content_tr: content,
        meta_description_tr: metaDesc,
        featured_image_url: imageUrl,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "article-images");
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) setImageUrl(data.url);
    setUploading(false);
  }

  if (loading) return <div className="p-8 text-gray-400">Yükleniyor...</div>;
  if (!article) return <div className="p-8 text-gray-400">Haber bulunamadı.</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">← Geri</button>
        <h1 className="text-2xl font-bold text-white flex-1">Haber Düzenle</h1>
        <a href={`/haber/${article.slug}`} target="_blank" rel="noopener" className="text-xs text-gray-500 hover:text-amber">Sayfayı Gör ↗</a>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-amber text-gray-900 rounded-lg text-sm font-bold hover:bg-amber/90 disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : saved ? "✓ Kaydedildi" : "Kaydet"}
        </button>
      </div>

      <div className="space-y-6">
        {/* Başlık */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Başlık</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 text-base focus:outline-none focus:border-amber"
          />
        </div>

        {/* Görsel */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Öne Çıkan Görsel</label>
          <div className="flex gap-4 items-start">
            {imageUrl && (
              <img src={imageUrl} alt="" className="w-40 h-28 object-cover rounded-lg border border-gray-700" />
            )}
            <div className="flex-1 space-y-2">
              <input
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="Görsel URL'si"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-amber"
              />
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 hover:border-amber hover:text-amber">
                  {uploading ? "Yükleniyor..." : "Bilgisayardan Yükle"}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
                <span className="text-xs text-gray-600">veya URL girin</span>
              </div>
            </div>
          </div>
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Özet (Excerpt)</label>
          <textarea
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-amber resize-none"
          />
        </div>

        {/* Meta Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Meta Description <span className={`ml-2 font-mono ${metaDesc.length > 160 ? "text-red-400" : metaDesc.length >= 140 ? "text-green-400" : "text-gray-500"}`}>{metaDesc.length}/160</span>
          </label>
          <textarea
            value={metaDesc}
            onChange={e => setMetaDesc(e.target.value)}
            rows={3}
            maxLength={160}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-amber resize-none"
          />
        </div>

        {/* İçerik */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">İçerik</label>
          <TiptapEditor content={content} onChange={setContent} placeholder="Haber içeriğini buraya yazın..." />
        </div>
      </div>
    </div>
  );
}
