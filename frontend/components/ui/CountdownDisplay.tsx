"use client";

import { useState, useEffect } from "react";

interface CountdownDisplayProps {
  deadline: string | null;
  large?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function computeTimeLeft(deadline: string): TimeLeft {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, expired: false };
}

export default function CountdownDisplay({ deadline, large = false }: CountdownDisplayProps) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    if (!deadline) {
      setMounted(true);
      return;
    }
    setTimeLeft(computeTimeLeft(deadline));
    setMounted(true);

    const interval = setInterval(() => {
      setTimeLeft(computeTimeLeft(deadline));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  // SSR-safe: render nothing until client is mounted
  if (!mounted) return null;

  if (!deadline) {
    return (
      <span className={`font-body text-on-surface/40 ${large ? "text-base" : "text-xs"}`}>
        Son tarih belirtilmedi
      </span>
    );
  }

  if (!timeLeft || timeLeft.expired) {
    return (
      <span className={`font-body font-semibold text-red-600 ${large ? "text-lg" : "text-xs"}`}>
        Süresi Doldu
      </span>
    );
  }

  const isUnder24h = timeLeft.days === 0;

  if (isUnder24h) {
    return (
      <span className={`inline-flex items-center gap-1.5 font-body font-semibold text-red-600 ${large ? "text-lg" : "text-xs"}`}>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        {timeLeft.hours} Saat {timeLeft.minutes} Dk {timeLeft.seconds} Sn
      </span>
    );
  }

  return (
    <span className={`font-body font-semibold text-on-surface ${large ? "text-lg" : "text-xs"}`}>
      {timeLeft.days} Gün {timeLeft.hours} Saat
    </span>
  );
}
