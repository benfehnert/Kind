/** Remove Anna-style demo progress from catalog payloads shown to non-participants. */
export function stripCatalogProgressFields(catalog) {
  if (!catalog) return catalog;
  const phases = (catalog.phases ?? []).map((p) => ({ ...p, status: "upcoming" }));
  return {
    ...catalog,
    statusBadge: null,
    progress: 0,
    streak: 0,
    streakDays: 0,
    weekCurrent: null,
    weeksTotal: null,
    kpis: [],
    chart: [],
    chartLabel: null,
    phases
  };
}
