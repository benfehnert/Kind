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
        fullTitle: ex.title,
        feedLabel: ex.feedLabel || ex.title || id,
        category: ex.category,
        icon: ex.icon,
        bg: ex.bg,
        text: ex.text,
        fields: ex.fields
      };
    })
    .filter(Boolean);
}

export function formatLogFieldValues(fields, values) {
  const fieldValues = {};
  for (const field of fields || []) {
    const raw = values[field.id];
    if (field.type === "checks") {
      const checked = raw || [];
      fieldValues[field.id] = (field.opts || []).filter((_, idx) => checked[idx]);
    } else if (field.type === "range") {
      fieldValues[field.id] = Number(raw ?? field.val ?? field.min ?? 0);
    } else if (field.type === "select") {
      const idx = Number(raw ?? field.sel ?? 0);
      fieldValues[field.id] = field.opts?.[idx] ?? "";
    }
  }
  return fieldValues;
}

export function parseLogFieldValues(fields, fieldValuesFromApi = {}) {
  const values = buildInitialFieldValues(fields);
  for (const field of fields || []) {
    const raw = fieldValuesFromApi[field.id];
    if (raw === undefined || raw === null) continue;

    if (field.type === "checks") {
      const selected = Array.isArray(raw) ? raw : [];
      values[field.id] = (field.opts || []).map((opt) => selected.includes(opt));
    } else if (field.type === "range") {
      values[field.id] = Number(raw);
    } else if (field.type === "select") {
      const idx = (field.opts || []).indexOf(raw);
      values[field.id] = idx >= 0 ? idx : Number(field.sel ?? 0);
    }
  }
  return values;
}

export function mergeLogValues(existing, patch) {
  return { ...existing, ...patch };
}

export function getPendingLogExplorations(logExplorations, loggedExplorationIds = [], locallySavedIds = []) {
  const logged = new Set([...loggedExplorationIds, ...locallySavedIds]);
  return (logExplorations || []).filter((ex) => !logged.has(ex.id));
}

export function allExplorationsLogged(logExplorations, loggedExplorationIds = [], locallySavedIds = []) {
  if (!logExplorations?.length) return false;
  return getPendingLogExplorations(logExplorations, loggedExplorationIds, locallySavedIds).length === 0;
}

export function isExplorationLoggedToday(explorationId, loggedExplorationIds = [], locallySavedIds = []) {
  return loggedExplorationIds.includes(explorationId) || locallySavedIds.includes(explorationId);
}
