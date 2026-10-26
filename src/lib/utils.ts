import { format, parseISO } from 'date-fns';

/** Join class names, dropping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Generate a reasonably unique id (crypto.randomUUID with fallback). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Format an ISO date for display. */
export function formatDate(iso?: string, pattern = 'MMM d, yyyy · h:mm a'): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

export function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Trigger a client-side CSV download. */
export function downloadCsv(filename: string, rows: Array<Array<string | number>>): void {
  const body = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Format a Date as the value expected by <input type="datetime-local"> (local time). */
export function toIsoDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse a <input type="datetime-local"> value into a local Date. */
export function fromIsoDateTimeLocal(v: string): Date {
  return new Date(v);
}
