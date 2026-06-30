"use client";

import { useState } from "react";

const SECTORS = ["İnşaat", "Enerji", "Savunma", "Madencilik", "Tekstil", "Otomotiv", "Tarım", "Lojistik"];

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<string[]>(["İnşaat", "Enerji"]);
  const [done, setDone] = useState(false);

  function toggleSector(s: string) {
    setSelected((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  return (
    <section className="bg-navy text-white mt-16">
      <div className="max-w-container mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-2 gap-14 items-center">
        {/* Left */}
        <div>
          <div className="text-xs font-bold tracking-[0.1em] text-amber mb-3.5 uppercase">
            GÜNLÜK BÜLTEN
          </div>
          <h2 className="text-[32px] font-black leading-[1.15] tracking-tight text-white mb-3.5">
            Afrika gündemi her sabah saat 06:00&apos;da kutunuzda
          </h2>
          <p className="text-[15px] leading-[1.6] text-white/80 mb-5">
            İhracat fırsatları, sektör haberleri ve ülke analizleri.
            24.000+ Türk iş insanı zaten abone.
          </p>
          <ul className="flex flex-col gap-2">
            {[
              "Sektör bazlı filtreleme",
              "Haftalık analiz raporu (PDF)",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-white/90">
                <span className="text-amber font-black shrink-0">&#10003;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Right */}
        <div className="bg-white/5 border border-white/[0.12] p-7">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
            className="flex flex-col gap-2"
          >
            <label className="text-[11px] font-bold tracking-[0.08em] text-amber uppercase mt-1.5">
              İŞ E-POSTASI
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@sirket.com"
              className="h-[42px] bg-white/8 border border-white/20 text-white text-sm px-3 rounded-sm outline-none placeholder:text-white/50 font-sans"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
            <label className="text-[11px] font-bold tracking-[0.08em] text-amber uppercase mt-1.5">
              İLGİ ALANLARINIZ
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SECTORS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSector(s)}
                  className={`text-xs px-2.5 py-1.5 border rounded-sm transition-colors ${
                    selected.includes(s)
                      ? "bg-amber text-navy border-amber font-black"
                      : "border-white/20 text-white/85 font-semibold hover:border-white/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="bg-amber text-navy h-[46px] font-black text-[13px] tracking-[0.06em] rounded-sm mt-1.5 hover:bg-amber-dark transition-colors"
            >
              {done ? "&#10003; ABONE OLDUNUZ" : "ÜCRETSİZ ABONE OL →"}
            </button>
            <p className="text-[11px] text-white/50 mt-2 leading-relaxed">
              Verileriniz üçüncü taraflarla paylaşılmaz. İstediğiniz zaman
              aboneliği bırakabilirsiniz.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
