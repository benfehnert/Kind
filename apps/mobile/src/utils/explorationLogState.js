export function defaultRangeValue(field) {
  const min = Number(field.min ?? 0);
  const max = Number(field.max ?? min);
  const step = Number(field.step ?? 1);
  const midpoint = (min + max) / 2;
  return Math.round(midpoint / step) * step;
}

export function buildInitialFieldValues(fields) {
  const values = {};
  for (const f of fields || []) {
    if (f.type === "checks") {
      values[f.id] = (f.opts || []).map(() => false);
    } else if (f.type === "range") {
      values[f.id] = defaultRangeValue(f);
    } else if (f.type === "select") {
      values[f.id] = null;
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

import { isExplorationComplete } from "./explorationProgress";

export function listConsentedExplorationForms(explorations, explorationConsents, explorationRuns = {}) {
  return Object.entries(explorationConsents || {})
    .filter(([id, v]) => v?.granted && !isExplorationComplete(explorationRuns[id]))
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
      fieldValues[field.id] = Number(raw ?? defaultRangeValue(field));
    } else if (field.type === "select") {
      if (raw === null || raw === undefined) {
        fieldValues[field.id] = "";
      } else {
        const idx = Number(raw);
        fieldValues[field.id] = field.opts?.[idx] ?? "";
      }
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
      values[field.id] = idx >= 0 ? idx : null;
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
