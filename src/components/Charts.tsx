import { useId } from 'react';

export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Minimal accessible SVG charts (no chart library needed for the skeleton).
 * Muted palette per the minimalist design spec.
 */

export function LineChart({
  data,
  label,
  height = 160,
  color = '#38B2AC',
}: {
  data: ChartPoint[];
  label: string;
  height?: number;
  color?: string;
}) {
  const gid = useId();
  const W = 640;
  const H = height;
  const PAD = 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = max - min || 1;

  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((d.value - min) / span) * (H - PAD * 2);
    return { x, y, ...d };
  });

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD} L${pts[0].x.toFixed(1)},${H - PAD} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`${label}: ${Math.round(data[data.length - 1].value).toLocaleString()} on ${data[data.length - 1].label}`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {pts
        .filter((_, i) => i === 0 || i === pts.length - 1)
        .map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r="3" fill={color} />
        ))}
      <text x={PAD} y={H - 6} fontSize="11" fill="#718096">
        {data[0].label}
      </text>
      <text x={W - PAD} y={H - 6} fontSize="11" fill="#718096" textAnchor="end">
        {data[data.length - 1].label}
      </text>
    </svg>
  );
}

export function BarChart({
  data,
  label,
  height = 180,
  color = '#4A5568',
}: {
  data: ChartPoint[];
  label: string;
  height?: number;
  color?: string;
}) {
  const W = 640;
  const H = height;
  const PAD = 24;
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = (W - PAD * 2) / data.length;
  const barW = Math.min(56, bw * 0.6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      {data.map((d, i) => {
        const h = (d.value / max) * (H - PAD * 2 - 18);
        const x = PAD + i * bw + (bw - barW) / 2;
        const y = H - PAD - 18 - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={h} rx="4" fill={color} opacity={i % 2 === 0 ? 0.9 : 0.55} />
            <text
              x={x + barW / 2}
              y={H - PAD - 4}
              fontSize="10"
              fill="#718096"
              textAnchor="middle"
            >
              {d.label}
            </text>
            <title>{`${d.label}: ${d.value.toLocaleString()}`}</title>
          </g>
        );
      })}
    </svg>
  );
}
