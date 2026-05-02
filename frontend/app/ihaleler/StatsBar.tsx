"use client";

import { useEffect, useRef, useState } from "react";
import type { TenderStats } from "@/lib/queries/tenders";

function formatBudgetLabel(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}Mr`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd.toLocaleString("tr-TR")}`;
}

interface StatItemProps {
  label: string;
  value: number;
  format?: (n: number) => string;
}

function StatItem({ label, value, format }: StatItemProps) {
  const [displayed, setDisplayed] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === 0) return;
    const duration = 1200;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * value));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [value]);

  const formatted = format ? format(displayed) : displayed.toLocaleString("tr-TR");

  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <span className="font-headline text-2xl md:text-3xl font-bold text-white tabular-nums">
        {formatted}
      </span>
      <span className="font-body text-xs md:text-sm text-white/80 text-center whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}

interface StatsBarProps {
  stats: TenderStats;
}

export default function StatsBar({ stats }: StatsBarProps) {
  return (
    <section
      className="w-full bg-primary py-6 px-4"
      aria-label="Ihale istatistikleri"
    >
      <div className="container mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 divide-y-2 md:divide-y-0 md:divide-x-2 divide-white/20">
        <StatItem label="Aktif Ihale" value={stats.active} />
        <StatItem label="Bu Hafta Eklenen" value={stats.addedThisWeek} />
        <StatItem label="7 Gunde Bitiyor" value={stats.expiringIn7Days} />
        <StatItem
          label="Toplam Butce"
          value={stats.totalBudgetUsd}
          format={formatBudgetLabel}
        />
      </div>
    </section>
  );
}
