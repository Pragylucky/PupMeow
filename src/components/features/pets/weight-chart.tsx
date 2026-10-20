import { formatDate } from "@/lib/utils";

/** Lightweight SVG line chart for the weight log (no chart library needed). */
export function WeightChart({ points }: { points: { date: string; kg: number }[] }) {
  if (points.length < 2) {
    return <p className="text-sm text-muted">Add at least two weight entries to see a trend.</p>;
  }
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const W = 640, H = 190, P = 36;
  const xs = sorted.map((p) => new Date(p.date).getTime());
  const ys = sorted.map((p) => p.kg);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys) * 0.95, maxY = Math.max(...ys) * 1.05;
  const sx = (x: number) => P + ((x - minX) / Math.max(1, maxX - minX)) * (W - P * 2);
  const sy = (y: number) => H - P + -((y - minY) / Math.max(0.01, maxY - minY)) * (H - P * 2);
  const path = sorted.map((p, i) => `${i ? "L" : "M"}${sx(new Date(p.date).getTime()).toFixed(1)},${sy(p.kg).toFixed(1)}`).join(" ");
  const last = sorted[sorted.length - 1];
  const first = sorted[0];
  const change = last.kg - first.kg;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto max-h-56 w-full" role="img" aria-label={`Weight went from ${first.kg} kg to ${last.kg} kg`}>
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="var(--pm-border)" />
        <text x={P} y={H - 8} fontSize="13" fill="var(--pm-muted)">{formatDate(first.date)}</text>
        <text x={W - P} y={H - 8} fontSize="13" fill="var(--pm-muted)" textAnchor="end">{formatDate(last.date)}</text>
        <path d={path} fill="none" stroke="var(--pm-primary)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        {sorted.map((p) => (
          <g key={p.date + p.kg}>
            <circle cx={sx(new Date(p.date).getTime())} cy={sy(p.kg)} r="6" fill="var(--pm-surface)" stroke="var(--pm-primary)" strokeWidth="3.5" />
            <text x={sx(new Date(p.date).getTime())} y={sy(p.kg) - 13} fontSize="14" fontWeight="800" textAnchor="middle" fill="var(--pm-text)">{p.kg}</text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 text-xs text-muted">
        {change === 0 ? "No change" : `${change > 0 ? "+" : ""}${change.toFixed(1)} kg`} since {formatDate(first.date)}
      </figcaption>
    </figure>
  );
}
