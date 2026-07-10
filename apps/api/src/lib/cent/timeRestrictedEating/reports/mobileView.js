import {
  PRIMARY_OUTCOME,
  HABITS,
  HABIT_LABELS,
  HABIT_ICONS,
  HUNGER_COLORS,
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
  buildLimitations,
  determineVerdict,
  round1,
  buildKindCompareBody,
  keepListLabel
} from "../helpers.js";
import { meanWindowHours } from "../normalize.js";
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

const FULL_EXPLORATION_ID = "eating";
const SHORT_EXPLORATION_ID = "eating-short";

function explorationIdFor(isShort) {
  return isShort ? SHORT_EXPLORATION_ID : FULL_EXPLORATION_ID;
}

function evidenceBadge(habitResult, followedPct) {
  if (habitResult.status !== "valid") return "Insufficient data";
  const abs = habitResult.abs_effect ?? Math.abs(habitResult.difference ?? 0);
  if (abs >= 1.5 && followedPct >= 60) return `Strong signal · ${followedPct}% of days`;
  if (abs >= 0.8 && followedPct >= 45) return `Moderate–strong · ${followedPct}% of days`;
  if (abs >= 0.5) return `Moderate · ${followedPct}% of days`;
  return "Unclear · too inconsistent";
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

function hungerDistributionBars(stats) {
  if (!stats?.distribution) {
    return [
      { w: 25, c: HUNGER_COLORS.very_hungry },
      { w: 25, c: HUNGER_COLORS.hungry },
      { w: 25, c: HUNGER_COLORS.manageable },
      { w: 25, c: HUNGER_COLORS.comfortable }
    ];
  }
  const d = stats.distribution;
  return [
    { w: Math.round(d.very_hungry * 100), c: HUNGER_COLORS.very_hungry },
    { w: Math.round(d.hungry * 100), c: HUNGER_COLORS.hungry },
    { w: Math.round(d.manageable * 100), c: HUNGER_COLORS.manageable },
    { w: Math.round(d.comfortable * 100), c: HUNGER_COLORS.comfortable }
  ];
}

function chartBounds(values) {
  const nums = values.filter((v) => v != null && !Number.isNaN(v));
  if (!nums.length) return { min: 4, max: 8 };
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  return { min: Math.max(1, Math.floor(lo - 1)), max: Math.min(10, Math.ceil(hi + 1)) };
}

function buildFactorRows(activeEntries, theme) {
  if (!activeEntries.length) return [];
  const fullHabit = Object.fromEntries(
    HABITS.map((h) => [h, { energy: habitAnalysis(activeEntries, h, PRIMARY_OUTCOME) }])
  );
  const maxUplift = Math.max(
    ...HABITS.map((h) => {
      const e = fullHabit[h]?.energy;
      return e?.status === "valid" && e.beneficial ? e.difference : 0;
    }),
    0.1
  );
  return HABITS.map((habit) => {
    const energy = fullHabit[habit]?.energy;
    const followed = activeEntries.filter((e) => e[habit]).length;
    const followedPct = activeEntries.length ? Math.round((followed / activeEntries.length) * 100) : 0;
    const uplift = energy?.status === "valid" && energy.beneficial ? energy.difference : 0;
    const badge = evidenceBadge(energy ?? { status: "insufficient_data" }, followedPct);
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

export function buildTimeRestrictedEatingMobileView({
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
    intervention: isShort ? "10-hour window (days 3–4)" : "10-hour",
    optimise: isShort ? "8-hour window (day 5)" : "Week 6",
    after: isShort ? "8-hour window" : "Week 6"
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

  const baselineEnergy = phaseStats(bEntries, PRIMARY_OUTCOME);
  const tenHourEnergy = phaseStats(iEntries, PRIMARY_OUTCOME);
  const optimiseEnergy = phaseStats(opEntries, PRIMARY_OUTCOME);
  const activeEnergy = phaseStats(active, PRIMARY_OUTCOME);
  const baselineHunger = phaseStats(bEntries, "hunger_comfort");
  const baselineWindow = meanWindowHours(bEntries);
  const activeWindow = meanWindowHours(active);

  const view = {
    explorationName: catalog.explorationName,
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    category: catalog.category,
    reportTitleLabel: REPORT_TITLE_LABELS[reportType] ?? reportType,
    subMeta: buildSubMeta(studyMeta, adherence, endDate)
  };

  if (lede) view.lede = lede;
  if (guidance) view.guidance = guidance;
  if (limitations?.length) view.limitations = limitations;

  if (reportType === "BASELINE_SUMMARY" && baselineEnergy.mean != null) {
    view.tiles = [
      { label: "Daily energy", value: `${round1(baselineEnergy.mean)}/10`, delta: "Baseline average" },
      {
        label: "Eating window",
        value: baselineWindow != null ? `${Math.round(baselineWindow)}h` : "—",
        delta: "Baseline average"
      }
    ];
  } else if (baselineEnergy.mean != null) {
    const compareEnergy = reportType === "INTERVENTION_INTERIM" ? tenHourEnergy : activeEnergy;
    const energyDelta = round1((compareEnergy.mean ?? baselineEnergy.mean) - baselineEnergy.mean);
    const compareWindow = reportType === "INTERVENTION_INTERIM" ? meanWindowHours(iEntries) : activeWindow;
    const windowDelta =
      compareWindow != null && baselineWindow != null ? round1(compareWindow - baselineWindow) : null;
    view.tiles = [
      {
        label: "Daily energy",
        value:
          compareEnergy.mean != null
            ? `${round1(baselineEnergy.mean)} → ${round1(compareEnergy.mean)}`
            : `${round1(baselineEnergy.mean)}`,
        delta: compareEnergy.mean != null ? `${energyDelta >= 0 ? "+" : ""}${energyDelta} pts` : "Baseline only"
      },
      {
        label: "Eating window",
        value:
          compareWindow != null && baselineWindow != null
            ? `${Math.round(baselineWindow)}h → ${Math.round(compareWindow)}h`
            : baselineWindow != null
              ? `${Math.round(baselineWindow)}h`
              : "—",
        delta: windowDelta != null ? `${windowDelta >= 0 ? "+" : ""}${windowDelta} hrs` : "Compared with Baseline"
      }
    ];
  }

  const phasePoints = [];
  if (baselineEnergy.mean != null) phasePoints.push({ label: "Baseline", v: round1(baselineEnergy.mean) });
  if (reportType !== "BASELINE_SUMMARY" && tenHourEnergy.mean != null) {
    phasePoints.push({ label: labels.intervention, v: round1(tenHourEnergy.mean) });
  }
  if ((reportType === "OPTIMISE_COMPLETION" || reportType === "FINAL_STUDY_COMPLETE") && optimiseEnergy.mean != null) {
    phasePoints.push({ label: isShort ? "8-hour" : labels.optimise, v: round1(optimiseEnergy.mean) });
  } else if (reportType === "FINAL_STUDY_COMPLETE" && tenHourEnergy.mean != null) {
    phasePoints.push({
      label: labels.optimise,
      v: round1(activeEnergy.mean ?? tenHourEnergy.mean)
    });
  }

  if (phasePoints.length) {
    const bounds = chartBounds(phasePoints.map((p) => p.v));
    view.phaseChart = { title: "Daily energy by phase", min: bounds.min, max: bounds.max, points: phasePoints };
  }

  const factorSource =
    reportType === "INTERVENTION_INTERIM" ? iEntries : reportType === "BASELINE_SUMMARY" ? [] : active;
  const factorRows = buildFactorRows(factorSource, theme);
  if (factorRows.length) {
    view.factors = {
      title: "What worked for you",
      sub: "Extra daily energy linked to each timing habit.",
      rows: factorRows
    };
  }

  if (baselineHunger.n) {
    const distribution = {
      title: "Hunger comfort through the day",
      beforeLabel: labels.baseline,
      before: hungerDistributionBars(baselineHunger),
      legend: [
        { c: HUNGER_COLORS.very_hungry, label: "Very hungry" },
        { c: HUNGER_COLORS.hungry, label: "Hungry" },
        { c: HUNGER_COLORS.manageable, label: "Manageable" },
        { c: HUNGER_COLORS.comfortable, label: "Comfortable" }
      ]
    };
    if (reportType !== "BASELINE_SUMMARY") {
      const afterStats =
        reportType === "INTERVENTION_INTERIM"
          ? phaseStats(iEntries, "hunger_comfort")
          : phaseStats(opEntries.length ? opEntries : active, "hunger_comfort");
      distribution.afterLabel = reportType === "INTERVENTION_INTERIM" ? labels.intervention : labels.after;
      distribution.after = hungerDistributionBars(afterStats);
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
      items: keepItems.length ? keepItems : ["10-hour eating window", "First meal ~8am"],
      body: "Your clearest gains came from a stable window rather than pushing to 8 hours."
    };
  }

  if (reportType === "FINAL_STUDY_COMPLETE") {
    const energyEff = effectSize(baselineEnergy, activeEnergy, PRIMARY_OUTCOME);
    const periodFx = periodEffectCheck(allEntries, PRIMARY_OUTCOME);
    const verdict = determineVerdict(energyEff, {}, periodFx);
    if (!view.lede) {
      view.lede =
        verdict === "BENEFICIAL" || verdict === "PROBABLY_BENEFICIAL_PERIOD_EFFECT_PRESENT"
          ? "Compressing your eating window shifted your daily energy curve. Here's what your logs suggest about timing — not calories — for you."
          : "Here's what your own data over this exploration suggests about meal timing and your daily energy.";
    }
    const energyDelta = round1((activeEnergy.mean ?? 0) - (baselineEnergy.mean ?? 0));
    view.compare = {
      title: "How you compare",
      body: cohortSnapshot
        ? buildKindCompareBody(energyDelta, adherence.logging_pct, cohortSnapshot)
        : `Your daily energy changed by ${energyDelta >= 0 ? "+" : ""}${energyDelta} points over the health exploration.`
    };
    view.disclaimer = USER_DISCLAIMER.body;
    view.disclaimerInfo = USER_DISCLAIMER;
    view.cta = {
      label: "Continue tracking what works  →",
      toast: "Keep tracking the timing habits that work best for you."
    };
  }

  return compactMobileView(view);
}

export function buildTimeRestrictedEatingMobileViewForReport(report, ctx) {
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

  return buildTimeRestrictedEatingMobileView({
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
