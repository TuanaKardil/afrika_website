import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analitik" };

export default function AdminAnalytics() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Analitik</h1>
          <p className="text-gray-500 text-sm">
            Ölçüm Kimliği: <code className="text-amber font-mono text-xs">G-TWW2BKCGWR</code>
          </p>
        </div>
        <a
          href="https://analytics.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-amber text-gray-900 rounded-lg text-sm font-bold hover:bg-amber/90"
        >
          Google Analytics&apos;i Aç ↗
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: "🔴", label: "Gerçek Zamanlı", desc: "Şu an sitede kaç kişi var" },
          { icon: "📊", label: "Raporlar", desc: "Ziyaretçi, oturum, sayfa görüntülenme" },
          { icon: "🌍", label: "Coğrafya", desc: "Hangi ülkelerden ziyaret geliyor" },
        ].map(item => (
          <a
            key={item.label}
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-5 bg-gray-900 border border-gray-800 rounded-xl hover:border-amber/50 transition-colors group"
          >
            <div className="text-2xl mb-3">{item.icon}</div>
            <p className="text-white text-sm font-medium group-hover:text-amber transition-colors mb-1">{item.label}</p>
            <p className="text-gray-500 text-xs">{item.desc}</p>
          </a>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-gray-400 text-sm font-medium mb-2">Durum</p>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-sm">GA4 etiketi tüm sayfalara eklendi, veri toplanıyor</span>
        </div>
        <p className="text-gray-500 text-xs">
          Gerçek zamanlı veriler hemen görünür. Günlük raporlar 24-48 saat içinde dolar.
        </p>
      </div>
    </div>
  );
}
