"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(() => import("@/components/admin/TiptapEditor"), { ssr: false });

interface BlogEditorProps {
  postId?: string;
}

export default function BlogEditor({ postId }: BlogEditorProps) {
  const router = useRouter();
  const isNew = !postId;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (!postId) return;
    fetch(`/api/admin/blog?id=${postId}`)
      .then(r => r.json())
      .then(data => {
        const p = data.post;
        setTitle(p.title ?? "");
        setContent(p.content ?? "");
        setExcerpt(p.excerpt ?? "");
        setImageUrl(p.featured_image_url ?? "");
        setStatus(p.status ?? "draft");
        setLoading(false);
      });
  }, [postId]);

  async function handleSave(saveStatus?: "draft" | "published") {
    setSaving(true);
    const finalStatus = saveStatus ?? status;
    const body = { title, content, excerpt, featured_image_url: imageUrl || null, status: finalStatus };

    let res: Response;
    if (isNew) {
      res = await fetch("/api/admin/blog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      setSaving(false);
      if (data.post?.id) router.replace(`/admin/blog/${data.post.id}`);
    } else {
      res = await fetch("/api/admin/blog", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: postId, ...body }) });
      setSaving(false);
      setStatus(finalStatus);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "blog-images");
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (data.url) setImageUrl(data.url);
    setUploading(false);
  }

  if (loading) return <div className="p-8 text-gray-400">Yükleniyor...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push("/admin/blog")} className="text-gray-400 hover:text-white text-sm">← Geri</button>
        <h1 className="text-2xl font-bold text-white flex-1">{isNew ? "Yeni Blog Yazısı" : "Blog Yazısını Düzenle"}</h1>
        <span className={`px-2 py-1 rounded text-xs font-medium ${status === "published" ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}>
          {status === "published" ? "Yayında" : "Taslak"}
        </span>
        <button onClick={() => handleSave("draft")} disabled={saving} className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-600 disabled:opacity-50">
          {saving ? "..." : "Taslak Kaydet"}
        </button>
        <button onClick={() => handleSave("published")} disabled={saving || !title} className="px-5 py-2 bg-amber text-gray-900 rounded-lg text-sm font-bold hover:bg-amber/90 disabled:opacity-50">
          {saving ? "..." : "Yayınla"}
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Başlık</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Yazı başlığı..."
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 text-xl font-bold focus:outline-none focus:border-amber placeholder-gray-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Öne Çıkan Görsel</label>
          <div className="flex gap-4 items-start">
            {imageUrl && <img src={imageUrl} alt="" className="w-40 h-28 object-cover rounded-lg border border-gray-700" />}
            <div className="flex-1 space-y-2">
              <input
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="Görsel URL'si"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-amber"
              />
              <label className="cursor-pointer inline-block px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 hover:border-amber hover:text-amber">
                {uploading ? "Yükleniyor..." : "Bilgisayardan Yükle"}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Kısa Özet (isteğe bağlı)</label>
          <textarea
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            rows={2}
            placeholder="Liste sayfasında görünecek kısa açıklama..."
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-amber resize-none placeholder-gray-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">İçerik</label>
          <TiptapEditor content={content} onChange={setContent} placeholder="Blog yazınızı buraya yazın..." />
        </div>
      </div>
    </div>
  );
}
