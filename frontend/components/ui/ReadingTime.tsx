interface ReadingTimeProps {
  minutes: number | null;
  className?: string;
}

export default function ReadingTime({ minutes, className = "" }: ReadingTimeProps) {
  if (!minutes) return null;
  return (
    <span className={`text-xs font-body text-on-surface/50 ${className}`}>
      {minutes} dk okuma
    </span>
  );
}
