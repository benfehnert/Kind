import {
  PRIMARY_OUTCOME,
  HABITS,
  HABIT_LABELS,
  HABIT_ICONS,
  UPF_COLORS,
  UPF_BAND_LABELS,
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
  keepListLabel
} from "../helpers.js";
import { meanUpfPct } from "../normalize.js";
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

const FULL_EXPLORATION_ID = "upf-mood";
const SHORT_EXPLORATION_ID = "upf-mood-short";

function explorationIdFor(isShort) {
  return isShort ? SHORT_EXPLORATION_ID : FULL_EXPLORATION_ID;
}

function evidenceBadge(habitResult, followedPct, phaseLabel = "reduction") {
  if (habitResult.status !== "valid") return "Insufficient data";
  const abs = habitResult.abs_effect ?? Math.abs(habitResult.difference ?? 0);
  if (abs >= 1.5 && followedPct >= 60) return `Strong signal · ${followedPct}% of ${phaseLabel} days`;
  if (abs >= 0.8 && followedPct >= 45) return `Moderate–strong · ${followedPct}% of days`;
  if (abs >= 0.5) return `Moderate · ${followedPct}% of days`;
  return "Mild · partial adherence";
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

function upfDistributionBars(stats) {
  if (!stats?.distribution) {
    return [
      { w: 45, c: UPF_COLORS.high },
      { w: 35, c: UPF_COLORS.medium },
      { w: 20, c: UPF_COLORS.low }
    ];
  }
  const d = stats.distribution;
  return [
    { w: Math.round(d.high * 100), c: UPF_COLORS.high },
    { w: Math.round(d.medium * 100), c: UPF_COLORS.medium },
    { w: Math.round(d.low * 100), c: UPF_COLORS.low }
  ];
}

function chartBounds(values) {
  const nums = values.filter((v) => v != null && !Number.isNaN(v));
  if (!nums.length) return { min: 4, max: 8 };
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
    HABITS.map((h) => [h, { mood: habitAnalysis(activeEntries, h, PRIMARY_OUTCOME) }])
  );

  const maxUplift = Math.max(
    ...HABITS.map((h) => {
      const m = fullHabit[h]?.mood;
      return m?.status === "valid" && m.beneficial ? m.difference : 0;
    }),
    0.1
  );

  return HABITS.map((habit) => {
    const mood = fullHabit[habit]?.mood;
    const followed = activeEntries.filter((e) => e[habit]).length;
    const followedPct = activeEntries.length ? Math.round((followed / activeEntries.length) * 100) : 0;
    const uplift = mood?.status === "valid" && mood.beneficial ? mood.difference : 0;
    const badge = evidenceBadge(mood ?? { status: "insufficient_data" }, followedPct);
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

export function buildUpfReductionMobileView({
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
    intervention: isShort ? "Reduction (days 3–4)" : "Reduction",
    optimise: isShort ? "Week 6 (day 5)" : "Week 6",
    after: "Week 6"
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

  const baselineMood = phaseStats(bEntries, PRIMARY_OUTCOME);
  const reductionMood = phaseStats(iEntries, PRIMARY_OUTCOME);
  const optimiseMood = phaseStats(opEntries, PRIMARY_OUTCOME);
  const endMood = phaseStats(endPhaseEntries(outEntries, active), PRIMARY_OUTCOME);
  const activeMood = phaseStats(active, PRIMARY_OUTCOME);

  const baselineUpf = meanUpfPct(bEntries);
  const baselineUpfStats = phaseStats(bEntries, "upf_pct");
  const endUpfStats = phaseStats(endPhaseEntries(outEntries, active), "upf_pct");
  const activeUpf = meanUpfPct(active);

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

  if (reportType === "BASELINE_SUMMARY" && baselineMood.mean != null) {
    view.tiles = [
      {
        label: "Daily mood",
        value: `${round1(baselineMood.mean)}/10`,
        delta: "Baseline average"
      },
      {
        label: "UPF share of diet",
        value: baselineUpf != null ? `${Math.round(baselineUpf)}%` : "—",
        delta: "Baseline average"
      }
    ];
  } else if (baselineMood.mean != null) {
    const compareMood =
      reportType === "INTERVENTION_INTERIM" ? reductionMood : endMood.mean != null ? endMood : activeMood;
    const tileEndMood = compareMood.mean ?? activeMood.mean;
    const tileEndUpf = endUpfStats.mean ?? (reportType === "INTERVENTION_INTERIM" ? meanUpfPct(iEntries) : activeUpf);
    const moodDelta = round1(tileEndMood - baselineMood.mean);
    const upfDelta = round1(tileEndUpf - baselineUpf);

    view.tiles = [
      {
        label: "Daily mood",
        value:
          tileEndMood != null
            ? `${round1(baselineMood.mean)} → ${round1(tileEndMood)}`
            : `${round1(baselineMood.mean)}`,
        delta: tileEndMood != null ? `${moodDelta >= 0 ? "+" : ""}${moodDelta} pts` : "Baseline only"
      },
      {
        label: "UPF share of diet",
        value:
          tileEndUpf != null && baselineUpf != null
            ? `${Math.round(baselineUpf)}% → ${Math.round(tileEndUpf)}%`
            : baselineUpf != null
              ? `${Math.round(baselineUpf)}%`
              : "—",
        delta: tileEndUpf != null ? `${upfDelta >= 0 ? "+" : ""}${upfDelta} pts` : "Compared with Baseline"
      }
    ];
  }

  const phasePoints = [];
  if (baselineMood.mean != null) phasePoints.push({ label: "Baseline", v: round1(baselineMood.mean) });
  if (reportType !== "BASELINE_SUMMARY" && reductionMood.mean != null) {
    phasePoints.push({ label: labels.intervention, v: round1(reductionMood.mean) });
  }
  if ((reportType === "OPTIMISE_COMPLETION" || reportType === "FINAL_STUDY_COMPLETE") && optimiseMood.mean != null) {
    phasePoints.push({ label: labels.optimise, v: round1(optimiseMood.mean) });
  } else if (reportType === "FINAL_STUDY_COMPLETE" && endMood.mean != null) {
    phasePoints.push({ label: labels.optimise, v: round1(endMood.mean ?? activeMood.mean) });
  }

  if (phasePoints.length) {
    const bounds = chartBounds(phasePoints.map((p) => p.v));
    view.phaseChart = {
      title: "Daily mood by phase",
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
      sub: "Higher mood on days with lower UPF and these swaps.",
      rows: factorRows
    };
  }

  if (baselineUpfStats.n) {
    const distribution = {
      title: "UPF share of daily diet",
      beforeLabel: labels.baseline,
      before: upfDistributionBars(baselineUpfStats),
      legend: [
        { c: UPF_COLORS.high, label: UPF_BAND_LABELS[0] },
        { c: UPF_COLORS.medium, label: UPF_BAND_LABELS[1] },
        { c: UPF_COLORS.low, label: UPF_BAND_LABELS[2] }
      ]
    };

    if (reportType !== "BASELINE_SUMMARY") {
      const afterStats =
        reportType === "INTERVENTION_INTERIM"
          ? phaseStats(iEntries, "upf_pct")
          : endUpfStats;
      distribution.afterLabel = reportType === "INTERVENTION_INTERIM" ? labels.intervention : labels.after;
      distribution.after = upfDistributionBars(afterStats);
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
      items: keepItems.length ? keepItems : ["Whole-food breakfast", "Unprocessed snacks"],
      body:
        "Breakfast and snack swaps drove most of your UPF reduction — and the mood lift followed within two weeks. Home-cooked dinners helped on weekends."
    };
  }

  if (reportType === "FINAL_STUDY_COMPLETE") {
    const moodEff = effectSize(baselineMood, activeMood, PRIMARY_OUTCOME);
    const periodFx = periodEffectCheck(allEntries, PRIMARY_OUTCOME);
    const verdict = determineVerdict(moodEff, {}, periodFx);
    if (!view.lede) {
      view.lede =
        verdict === "BENEFICIAL" || verdict === "PROBABLY_BENEFICIAL_PERIOD_EFFECT_PRESENT"
          ? "Swapping ultra-processed foods for whole alternatives shifted your daily mood. Here's how your UPF intake tracked with how you felt."
          : "Here's what your own data over this exploration suggests about UPF reduction and your daily mood.";
    }

    const moodDelta = round1((activeMood.mean ?? 0) - (baselineMood.mean ?? 0));
    const upfDelta = round1((endUpfStats.mean ?? activeUpf) - baselineUpf);
    view.compare = {
      title: "How you compare",
      body: cohortSnapshot
        ? buildKindCompareBody(moodDelta, upfDelta, adherence.logging_pct, cohortSnapshot)
        : `Your daily mood changed by ${moodDelta >= 0 ? "+" : ""}${moodDelta} points and UPF share by ${upfDelta} percentage points over the health exploration.`
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
          : "Keep tracking the swap habits that work best for you."
    };
  }

  return compactMobileView(view);
}

export function buildUpfReductionMobileViewForReport(report, ctx) {
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

  return buildUpfReductionMobileView({
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
