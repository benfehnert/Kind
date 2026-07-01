export function mean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function sd(values) {
  if (values.length <= 1) return null;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function tQuantile975(df) {
  if (df <= 0) return 12.706;
  const table = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447,
    7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228, 15: 2.131, 20: 2.086,
    30: 2.042, 60: 2.0, 120: 1.98
  };
  for (const k of Object.keys(table).map(Number).sort((a, b) => a - b)) {
    if (df <= k) return table[k];
  }
  return 1.96;
}

export function round1(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  return Math.round(n * 10) / 10;
}

export function formatDateRange(startDate, endDate) {
  const fmt = (d) => {
    const date = new Date(`${d}T00:00:00Z`);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    });
  };
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

export function parseDate(value) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

export function daysBetween(startDate, endDate) {
  const start = new Date(`${parseDate(startDate)}T00:00:00Z`);
  const end = new Date(`${parseDate(endDate)}T00:00:00Z`);
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}
