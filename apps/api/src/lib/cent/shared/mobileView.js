import explorations from "../../../mocks/explorations.json" with { type: "json" };
import { REPORT_LABELS } from "../../explorationReportsData.js";
import { formatDateRange } from "./helpers.js";

export const SHORT_ANALYSIS_THRESHOLDS = {
  MIN_BASELINE_DAYS: 1,
  MIN_INTERVENTION_DAYS: 1,
  MIN_ACTIVE_DAYS: 3,
  MIN_ENDOFSTUDY_ACTIVE_DAYS: 3
};

export function resolveAnalysisThresholds(isShort, constants = {}) {
  if (isShort) {
    return { ...SHORT_ANALYSIS_THRESHOLDS };
  }
  return {
    MIN_BASELINE_DAYS: constants.MIN_BASELINE_DAYS ?? 7,
    MIN_INTERVENTION_DAYS: constants.MIN_INTERVENTION_DAYS ?? 10,
    MIN_ACTIVE_DAYS: constants.MIN_ACTIVE_DAYS ?? constants.MIN_ENDOFSTUDY_ACTIVE_DAYS ?? 14,
    MIN_ENDOFSTUDY_ACTIVE_DAYS:
      constants.MIN_ENDOFSTUDY_ACTIVE_DAYS ?? constants.MIN_ACTIVE_DAYS ?? 14
  };
}

export const REPORT_TITLE_LABELS = {
  ...REPORT_LABELS,
  INSUFFICIENT_DATA: "Report pending"
};

export function isShortExplorationId(explorationId) {
  return typeof explorationId === "string" && explorationId.endsWith("-short");
}

export function resolveCatalogExplorationId(explorationId) {
  if (!explorationId) return null;
  if (explorations[explorationId]) return explorationId;
  const shortId = explorationId.endsWith("-short") ? explorationId : `${explorationId}-short`;
  if (explorations[shortId]) return shortId;
  const fullId = explorationId.replace(/-short$/, "");
  if (explorations[fullId]) return fullId;
  return explorationId;
}

export function getExplorationCatalogMeta(explorationId) {
  const catalogId = resolveCatalogExplorationId(explorationId);
  const entry = explorations[catalogId] ?? {};
  return {
    explorationName: entry.title ?? catalogId ?? "Health exploration",
    category: entry.category ?? "Health exploration"
  };
}

export function buildSubMeta(studyMeta, adherence, endDate, options = {}) {
  const participantName = studyMeta?.participant_name ?? "You";
  const loggingPct = adherence?.logging_pct ?? 0;
  const unit = options.loggingUnit ?? "days";
  return `${participantName} · ${formatDateRange(studyMeta?.start_date, endDate)} · ${loggingPct}% of ${unit} logged`;
}

export function periodLabels(isShort, { baseline, intervention, optimise, after }) {
  if (isShort) {
    return {
      baseline: baseline ?? "Baseline (days 1–2)",
      intervention: intervention ?? "Intervention (days 3–4)",
      optimise: optimise ?? "Optimise (day 5)",
      after: after ?? "Latest phase"
    };
  }
  return {
    baseline: baseline ?? "Baseline (weeks 1–2)",
    intervention: intervention ?? "Intervention phase",
    optimise: optimise ?? "Optimise phase",
    after: after ?? "Latest phase"
  };
}

export function compactMobileView(view) {
  const out = { ...view };
  for (const key of Object.keys(out)) {
    const val = out[key];
    if (val === undefined || val === null) delete out[key];
    if (Array.isArray(val) && val.length === 0) delete out[key];
    if (typeof val === "object" && !Array.isArray(val) && val !== null) {
      const nested = compactMobileView(val);
      if (Object.keys(nested).length === 0) delete out[key];
      else out[key] = nested;
    }
  }
  return out;
}

export function buildInsufficientMobileView({
  explorationId,
  reportType,
  message,
  studyMeta = null,
  availableSummary = null
}) {
  const meta = getExplorationCatalogMeta(explorationId);
  const view = {
    explorationName: meta.explorationName,
    category: meta.category,
    reportTitleLabel: REPORT_TITLE_LABELS[reportType] ?? reportType,
    lede: message
  };

  if (availableSummary?.primary?.mean != null) {
    view.tiles = [
      {
        label: "Logged so far",
        value: `${availableSummary.days_logged ?? 0} days`,
        delta: "More logging needed"
      }
    ];
  }

  if (studyMeta?.start_date) {
    view.subMeta = buildSubMeta(studyMeta, { logging_pct: 0 }, studyMeta.end_date ?? studyMeta.start_date);
  }

  return compactMobileView(view);
}

export function attachMobileView(report, mobileView) {
  if (!report || report.type === "INSUFFICIENT_DATA") {
    return {
      ...report,
      mobileView: mobileView ?? buildInsufficientMobileView({
        explorationId: report?.explorationId,
        reportType: report?.for_report ?? report?.type,
        message: report?.message ?? "More data is needed for this report."
      })
    };
  }
  return { ...report, mobileView };
}
