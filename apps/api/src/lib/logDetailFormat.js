/**
 * Shared formatter for turning a set of log field definitions + logged
 * field values into the "everything recorded" breakdown shown on the
 * Activity Detail screen. Used both by the live app (homeData.js, when a
 * real log is submitted) and by the seed script (so demo/community activity
 * posts are generated the same way instead of hand-typed one-liners).
 */

function formatRangeValue(raw, field) {
  if (field.unit) {
    return field.unit === "%" ? `${raw}%` : `${raw} ${field.unit}`;
  }
  const max = field.max != null ? Number(field.max) : 10;
  return `${raw}/${max}`;
}

export function formatFullLogDetail(fields, fieldValues) {
  const fv = fieldValues ?? {};
  const parts = [];
  for (const field of fields || []) {
    const raw = fv[field.id];
    if (raw === undefined || raw === null || raw === "") continue;
    const formatted =
      field.type === "checks"
        ? Array.isArray(raw) && raw.length
          ? raw.join(", ")
          : "None"
        : field.type === "range"
          ? formatRangeValue(raw, field)
          : String(raw);
    parts.push(`<strong>${field.label}:</strong> ${formatted}`);
  }
  return parts.join(" · ");
}
