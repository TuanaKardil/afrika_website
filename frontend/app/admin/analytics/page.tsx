import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analitik" };

export default function AdminAnalytics() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-2">Analitik</h1>
      <p className="text-gray-400 text-sm mb-8">Google Analytics 4 entegrasyonu yakında eklenecek.</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-500 text-sm">
          Google Analytics kurulumu tamamlandığında burada trafik, oturum ve sayfa görüntülenme verileri görünecek.
        </p>
      </div>
    </div>
  );
}
