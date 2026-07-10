import {
  PRIMARY_OUTCOME,
  HABITS,
  HABIT_LABELS,
  HABIT_ICONS,
  SLEEP_QUALITY_COLORS,
  HEALTH_EXPLORATION_LABEL,
  USER_DISCLAIMER
} from "../constants.js";
import {
  phaseStats,
  habitAnalysis,
  rankHabits,
  adherenceStats,
  periodEffectCheck,
  effectSize
} from "../stats.js";
import {
  determineVerdict,
  round1,
  buildKindCompareBody,
  keepListLabel,
  formatOnsetTileValue
} from "../helpers.js";
import { getExplorationTheme } from "../../../explorationThemes.js";
import {
  REPORT_TITLE_LABELS,
  buildInsufficientMobileView,
  buildSubMeta,
  compactMobileView,
  getExplorationCatalogMeta,
  isShortExplorationId,
  periodLabels
} from "../../shared/mobileView.js";

const FULL_EXPLORATION_ID = "screen-sleep";
const SHORT_EXPLORATION_ID = "screen-sleep-short";

function explorationIdFor(isShort) {
  return isShort ? SHORT_EXPLORATION_ID : FULL_EXPLORATION_ID;
}

function evidenceBadge(habitResult, followedPct, phaseLabel = "active") {
  if (habitResult.status !== "valid") return "Insufficient data";
  const abs = habitResult.abs_effect ?? Math.abs(habitResult.difference ?? 0);
  if (abs >= 1.5 && followedPct >= 60) return `Strong signal · ${followedPct}% of ${phaseLabel} nights`;
  if (abs >= 0.8 && followedPct >= 45) return `Moderate–strong · ${followedPct}% of nights`;
  if (abs >= 0.5) return `Moderate · ${followedPct}% of nights`;
  return "Mild · inconsistent";
}

function badgeColors(badge, theme) {
  if (badge.startsWith("Strong") || badge.startsWith("Moderate–strong")) {
    return { badgeBg: theme.surface, badgeText: theme.accent, bar: theme.accent };
  }
  if (badge.startsWith("Moderate")) {
    return { badgeBg: "#FAEEDA", badgeText: "#854F0B", bar: "#EF9F27" };
  }
  return { badgeBg: "#F1EFE8", badgeText: "#444441", bar: "#888780", valColor: "#5F6B5C" };
}

function sleepQualityDistributionBars(stats) {
  if (!stats?.distribution) {
    return [
      { w: 25, c: SLEEP_QUALITY_COLORS.unrested },
      { w: 25, c: SLEEP_QUALITY_COLORS.ok },
      { w: 25, c: SLEEP_QUALITY_COLORS.rested },
      { w: 25, c: SLEEP_QUALITY_COLORS.fully_restored }
    ];
  }
  const d = stats.distribution;
  return [
    { w: Math.round(d.unrested * 100), c: SLEEP_QUALITY_COLORS.unrested },
    { w: Math.round(d.ok * 100), c: SLEEP_QUALITY_COLORS.ok },
    { w: Math.round(d.rested * 100), c: SLEEP_QUALITY_COLORS.rested },
    { w: Math.round(d.fully_restored * 100), c: SLEEP_QUALITY_COLORS.fully_restored }
  ];
}

function chartBounds(values) {
  const nums = values.filter((v) => v != null && !Number.isNaN(v));
  if (!nums.length) return { min: 4, max: 9 };
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  return { min: Math.max(1, Math.floor(lo - 1)), max: Math.min(10, Math.ceil(hi + 1)) };
}

function endPhaseEntries(outEntries, active) {
  return outEntries.length ? outEntries : active.slice(-7);
}

function buildFactorRows(activeEntries, theme) {
  if (!activeEntries.length) return [];

  const fullHabit = Object.fromEntries(
    HABITS.map((h) => [h, { sleep: habitAnalysis(activeEntries, h, PRIMARY_OUTCOME) }])
  );

  const maxUplift = Math.max(
    ...HABITS.map((h) => {
      const s = fullHabit[h]?.sleep;
      return s?.status === "valid" && s.beneficial ? s.difference : 0;
    }),
    0.1
  );

  return HABITS.map((habit) => {
    const sleep = fullHabit[habit]?.sleep;
    const followed = activeEntries.filter((e) => e[habit]).length;
    const followedPct = activeEntries.length ? Math.round((followed / activeEntries.length) * 100) : 0;
    const uplift = sleep?.status === "valid" && sleep.beneficial ? sleep.difference : 0;
    const badge = evidenceBadge(sleep ?? { status: "insufficient_data" }, followedPct);
    const colors = badgeColors(badge, theme);
    return {
      icon: HABIT_ICONS[habit],
      label: HABIT_LABELS[habit],
      value: uplift > 0 ? `+${round1(uplift)}` : round1(uplift) ?? "—",
      width: Math.max(10, Math.round((Math.abs(uplift) / maxUplift) * 100)),
      bar: colors.bar,
      badge,
      badgeBg: colors.badgeBg,
      badgeText: colors.badgeText,
      ...(colors.valColor ? { valColor: colors.valColor } : {})
    };
  }).sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
}

export function buildScreenSleepMobileView({
  reportType,
  allEntries = [],
  studyMeta = {},
  cohortSnapshot = null,
  isShort = false,
  lede = null,
  guidance = null,
  limitations = null,
  keepList = null
}) {
  const explorationId = explorationIdFor(isShort);
  const catalog = getExplorationCatalogMeta(explorationId);
  const theme = getExplorationTheme(FULL_EXPLORATION_ID);
  const labels = periodLabels(isShort, {
    intervention: isShort ? "30-min free (days 3–4)" : "30-min free",
    optimise: isShort ? "60-min free (day 5)" : "60-min free",
    after: "60-min free"
  });

  const bEntries = allEntries.filter((e) => e.phase === "BASELINE" && e.valid_for_analysis);
  const iEntries = allEntries.filter((e) => e.phase === "INTERVENTION" && e.valid_for_analysis);
  const opEntries = allEntries.filter((e) => e.phase === "OPTIMISE" && e.valid_for_analysis);
  const outEntries = allEntries.filter((e) => e.phase === "OUTPUT" && e.valid_for_analysis);
  const active = [...iEntries, ...opEntries, ...outEntries];

  const endDate =
    studyMeta.end_date ??
    studyMeta.optimise_end_date ??
    studyMeta.intervention_end_date ??
    studyMeta.baseline_end_date ??
    allEntries.at(-1)?.date ??
    studyMeta.start_date;

  const scopeEntries =
    reportType === "BASELINE_SUMMARY"
      ? bEntries
      : reportType === "INTERVENTION_INTERIM"
        ? [...bEntries, ...iEntries]
        : allEntries;

  const adherence = adherenceStats(scopeEntries.length ? scopeEntries : allEntries, studyMeta.start_date, endDate);

  const baselineSleep = phaseStats(bEntries, PRIMARY_OUTCOME);
  const thirtyMinSleep = phaseStats(iEntries, PRIMARY_OUTCOME);
  const sixtyMinSleep = phaseStats(opEntries, PRIMARY_OUTCOME);
  const endSleep = phaseStats(endPhaseEntries(outEntries, active), PRIMARY_OUTCOME);
  const activeSleep = phaseStats(active, PRIMARY_OUTCOME);

  const view = {
    explorationName: catalog.explorationName,
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    category: catalog.category,
    reportTitleLabel: REPORT_TITLE_LABELS[reportType] ?? reportType,
    subMeta: buildSubMeta(studyMeta, adherence, endDate, { loggingUnit: "nights" })
  };

  if (lede) view.lede = lede;
  if (guidance) view.guidance = guidance;
  if (limitations?.length) view.limitations = limitations;

  if (reportType === "BASELINE_SUMMARY" && baselineSleep.mean != null) {
    view.tiles = [
      {
        label: "Sleep quality",
        value: `${round1(baselineSleep.mean)}/10`,
        delta: "Baseline average"
      },
      {
        label: "Nights logged",
        value: `${bEntries.length}`,
        delta: "Baseline phase"
      }
    ];
  } else if (baselineSleep.mean != null) {
    const compareSleep =
      reportType === "INTERVENTION_INTERIM"
        ? thirtyMinSleep
        : reportType === "OPTIMISE_COMPLETION"
          ? sixtyMinSleep.mean != null
            ? sixtyMinSleep
            : endSleep
          : activeSleep;
    const sleepDelta = round1((compareSleep.mean ?? baselineSleep.mean) - baselineSleep.mean);
    const onsetCompare =
      reportType === "INTERVENTION_INTERIM" ? iEntries : active;
    const onsetTile = formatOnsetTileValue(bEntries, onsetCompare);

    view.tiles = [
      {
        label: "Sleep quality",
        value:
          compareSleep.mean != null
            ? `${round1(baselineSleep.mean)} → ${round1(compareSleep.mean)}`
            : `${round1(baselineSleep.mean)}`,
        delta: compareSleep.mean != null ? `${sleepDelta >= 0 ? "+" : ""}${sleepDelta} pts` : "Baseline only"
      },
      {
        label: "Time to fall asleep",
        value: onsetTile.value,
        delta: onsetTile.delta
      }
    ];
  }

  const phasePoints = [];
  if (baselineSleep.mean != null) phasePoints.push({ label: "Baseline", v: round1(baselineSleep.mean) });
  if (reportType !== "BASELINE_SUMMARY" && thirtyMinSleep.mean != null) {
    phasePoints.push({ label: labels.intervention, v: round1(thirtyMinSleep.mean) });
  }
  if ((reportType === "OPTIMISE_COMPLETION" || reportType === "FINAL_STUDY_COMPLETE") && sixtyMinSleep.mean != null) {
    phasePoints.push({ label: labels.optimise, v: round1(sixtyMinSleep.mean) });
  } else if (reportType === "FINAL_STUDY_COMPLETE" && endSleep.mean != null) {
    phasePoints.push({ label: labels.optimise, v: round1(endSleep.mean ?? activeSleep.mean) });
  }

  if (phasePoints.length) {
    const bounds = chartBounds(phasePoints.map((p) => p.v));
    view.phaseChart = {
      title: "Sleep quality by phase",
      min: bounds.min,
      max: bounds.max,
      points: phasePoints
    };
  }

  const factorSource =
    reportType === "INTERVENTION_INTERIM"
      ? iEntries
      : reportType === "OPTIMISE_COMPLETION" || reportType === "FINAL_STUDY_COMPLETE"
        ? active
        : [];
  const factorRows = buildFactorRows(factorSource, theme);
  if (factorRows.length) {
    view.factors = {
      title: "What worked for you",
      sub: "Extra sleep quality on nights you followed each habit.",
      rows: factorRows
    };
  }

  if (baselineSleep.n) {
    const distribution = {
      title: "How rested mornings felt",
      beforeLabel: labels.baseline,
      before: sleepQualityDistributionBars(baselineSleep),
      legend: [
        { c: SLEEP_QUALITY_COLORS.unrested, label: "Unrested" },
        { c: SLEEP_QUALITY_COLORS.ok, label: "OK" },
        { c: SLEEP_QUALITY_COLORS.rested, label: "Rested" },
        { c: SLEEP_QUALITY_COLORS.fully_restored, label: "Fully restored" }
      ]
    };

    if (reportType !== "BASELINE_SUMMARY") {
      const afterStats =
        reportType === "INTERVENTION_INTERIM"
          ? thirtyMinSleep
          : reportType === "OPTIMISE_COMPLETION"
            ? opEntries.length
              ? sixtyMinSleep
              : endSleep
            : endSleep;
      distribution.afterLabel = reportType === "INTERVENTION_INTERIM" ? labels.intervention : labels.after;
      distribution.after = sleepQualityDistributionBars(afterStats);
    }

    view.distribution = distribution;
  }

  if ((reportType === "OPTIMISE_COMPLETION" || reportType === "FINAL_STUDY_COMPLETE") && keepList) {
    view.keepList = keepList;
  } else if (reportType === "FINAL_STUDY_COMPLETE") {
    const ranked = rankHabits(active);
    const keepItems = ranked.filter((r) => r.status === "valid").slice(0, 2).map((r) => keepListLabel(r.habit));
    view.keepList = {
      title: "Your keep list",
      items: keepItems.length ? keepItems : ["60-min screen-free", "No screens in bed"],
      body:
        "The 60-minute buffer made the biggest difference — especially when paired with no in-bed scrolling. Reading on paper helped on tougher nights."
    };
  }

  if (reportType === "FINAL_STUDY_COMPLETE") {
    const sleepEff = effectSize(baselineSleep, activeSleep, PRIMARY_OUTCOME);
    const periodFx = periodEffectCheck(allEntries, PRIMARY_OUTCOME);
    const verdict = determineVerdict(sleepEff, {}, periodFx);
    if (!view.lede) {
      view.lede =
        verdict === "BENEFICIAL" || verdict === "PROBABLY_BENEFICIAL_PERIOD_EFFECT_PRESENT"
          ? "Cutting evening screen time changed how quickly you switched off and how restored mornings felt. Here's your personal sleep story."
          : "Here's what your own data over this exploration suggests about evening screens and your sleep quality.";
    }

    const sleepDelta = round1((activeSleep.mean ?? 0) - (baselineSleep.mean ?? 0));
    view.compare = {
      title: "How you compare",
      body: cohortSnapshot
        ? buildKindCompareBody(sleepDelta, adherence.logging_pct, cohortSnapshot)
        : `Your sleep quality changed by ${sleepDelta >= 0 ? "+" : ""}${sleepDelta} points over the health exploration.`
    };
    view.disclaimer = USER_DISCLAIMER.body;
    view.disclaimerInfo = USER_DISCLAIMER;
    view.cta = {
      label:
        view.keepList?.items?.length >= 2
          ? "Run a 4-week re-check on your keep-list  →"
          : "Continue tracking what works  →",
      toast:
        view.keepList?.items?.length >= 2
          ? `Setting up a focused 4-week re-check on ${view.keepList.items.join(" and ").toLowerCase()}.`
          : "Keep tracking the evening habits that work best for you."
    };
  }

  return compactMobileView(view);
}

export function buildScreenSleepMobileViewForReport(report, ctx) {
  const isShort = ctx.isShort ?? isShortExplorationId(ctx.explorationId);
  const reportType = report.type === "INSUFFICIENT_DATA" ? report.for_report : report.type;

  if (report.type === "INSUFFICIENT_DATA") {
    return buildInsufficientMobileView({
      explorationId: explorationIdFor(isShort),
      reportType,
      message: report.message,
      studyMeta: ctx.studyMeta,
      availableSummary: report.available_summary
    });
  }

  return buildScreenSleepMobileView({
    reportType,
    allEntries: ctx.allEntries ?? [],
    studyMeta: ctx.studyMeta ?? {},
    cohortSnapshot: ctx.cohortSnapshot ?? null,
    isShort,
    lede: report.headline ?? report.lede ?? null,
    guidance: report.phase_b_guidance ?? report.optimise_guidance ?? null,
    limitations: report.limitations ?? report.quality_warnings ?? null,
    keepList: report.keep_list ?? null
  });
}
