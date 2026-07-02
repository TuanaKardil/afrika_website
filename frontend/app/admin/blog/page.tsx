"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
}

export default function AdminBlogList() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/blog");
    const data = await res.json();
    setPosts(data.posts ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" yazısını silmek istediğinize emin misiniz?`)) return;
    await fetch(`/api/admin/blog?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Blog Yazıları</h1>
        <button
          onClick={() => router.push("/admin/blog/yeni")}
          className="px-4 py-2 bg-amber text-gray-900 rounded-lg text-sm font-bold hover:bg-amber/90"
        >
          + Yeni Yazı
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Yükleniyor...</p>
      ) : posts.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm mb-4">Henüz blog yazısı yok.</p>
          <button onClick={() => router.push("/admin/blog/yeni")} className="px-4 py-2 bg-amber text-gray-900 rounded-lg text-sm font-bold">İlk Yazıyı Yaz</button>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Başlık</th>
                <th className="text-center px-6 py-3 text-gray-500 font-medium">Durum</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Tarih</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {posts.map(p => (
                <tr key={p.id} className="hover:bg-gray-800/30">
                  <td className="px-6 py-3">
                    <span className="text-gray-200">{p.title}</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.status === "published" ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                      {p.status === "published" ? "Yayında" : "Taslak"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-400 text-xs">
                    {new Date(p.published_at ?? p.created_at).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-6 py-3 flex gap-3 justify-end">
                    {p.status === "published" && (
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noopener" className="text-xs text-gray-500 hover:text-amber">Gör ↗</a>
                    )}
                    <button onClick={() => router.push(`/admin/blog/${p.id}`)} className="text-xs text-gray-400 hover:text-white">Düzenle</button>
                    <button onClick={() => handleDelete(p.id, p.title)} className="text-xs text-red-500 hover:text-red-400">Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
