import type { Metadata } from "next";

export const metadata: Metadata = { title: "Blog" };

export default function AdminBlog() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-2">Blog</h1>
      <p className="text-gray-400 text-sm mb-8">Blog yazma arayüzü yakında eklenecek.</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">
          Buradan Türkçe blog yazıları oluşturabilecek, taslak kaydedip yayınlayabileceksiniz.
        </p>
      </div>
    </div>
  );
}
