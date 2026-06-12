export function buildInitialFieldValues(fields) {
  const values = {};
  for (const f of fields || []) {
    if (f.type === "checks") {
      values[f.id] = (f.opts || []).map(() => false);
    } else if (f.type === "range") {
      values[f.id] = Number(f.val ?? f.min ?? 0);
    } else if (f.type === "select") {
      values[f.id] = Number(f.sel ?? 0);
    }
  }
  return values;
}

export function buildInitialLogValues(explorationList) {
  const out = {};
  for (const ex of explorationList) {
    out[ex.id] = buildInitialFieldValues(ex.fields);
  }
  return out;
}

export function listConsentedExplorationForms(explorations, explorationConsents) {
  return Object.entries(explorationConsents || {})
    .filter(([, v]) => v?.granted)
    .map(([id]) => {
      const ex = explorations?.[id];
      if (!ex?.fields?.length) return null;
      return {
        id,
        title: ex.feedLabel || ex.title || id,
        icon: ex.icon,
        bg: ex.bg,
        text: ex.text,
        fields: ex.fields
      };
    })
    .filter(Boolean);
}
