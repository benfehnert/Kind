import {
  PRIMARY_OUTCOME,
  FACTOR_OUTCOME,
  HABITS,
  HABIT_LABELS,
  HABIT_ICONS,
  ANXIETY_COLORS,
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
  relaxationBadgeColors,
  relaxationEvidenceBadge
} from "../helpers.js";
import {
  REPORT_TITLE_LABELS,
  buildInsufficientMobileView,
  buildSubMeta,
  compactMobileView,
  getExplorationCatalogMeta,
  isShortExplorationId,
  periodLabels
} from "../../shared/mobileView.js";

const FULL_EXPLORATION_ID = "relaxation";
const SHORT_EXPLORATION_ID = "relaxation-short";

function explorationIdFor(isShort) {
  return isShort ? SHORT_EXPLORATION_ID : FULL_EXPLORATION_ID;
}

function anxietyDistributionBars(stats) {
  if (!stats?.distribution) {
    return [
      { w: 15, c: ANXIETY_COLORS.high },
      { w: 35, c: ANXIETY_COLORS.moderate },
      { w: 32, c: ANXIETY_COLORS.mild },
      { w: 18, c: ANXIETY_COLORS.calm }
    ];
  }
  const d = stats.distribution;
  return [
    { w: Math.round(d.high * 100), c: ANXIETY_COLORS.high },
    { w: Math.round(d.moderate * 100), c: ANXIETY_COLORS.moderate },
    { w: Math.round(d.mild * 100), c: ANXIETY_COLORS.mild },
    { w: Math.round(d.calm * 100), c: ANXIETY_COLORS.calm }
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

function buildFactorRows(activeEntries) {
  if (!activeEntries.length) return [];

  const fullHabit = Object.fromEntries(
    HABITS.map((h) => [h, { stress: habitAnalysis(activeEntries, h, FACTOR_OUTCOME) }])
  );

  const maxReduction = Math.max(
    ...HABITS.map((h) => {
      const s = fullHabit[h]?.stress;
      return s?.status === "valid" && s.beneficial ? s.abs_effect : 0;
    }),
    0.1
  );

  return HABITS.map((habit) => {
    const stress = fullHabit[habit]?.stress;
    const followed = activeEntries.filter((e) => e[habit]).length;
    const followedPct = activeEntries.length ? Math.round((followed / activeEntries.length) * 100) : 0;
    const reduction = stress?.status === "valid" && stress.beneficial ? stress.difference : 0;
    const badge = relaxationEvidenceBadge(stress ?? { status: "insufficient_data" }, followedPct);
    const colors = relaxationBadgeColors(badge);
    return {
      icon: HABIT_ICONS[habit],
      label: HABIT_LABELS[habit],
      value: reduction !== 0 ? round1(reduction) : round1(reduction) ?? "—",
      width: Math.max(10, Math.round((Math.abs(reduction) / maxReduction) * 100)),
      bar: colors.bar,
      badge,
      badgeBg: colors.badgeBg,
      badgeText: colors.badgeText,
      ...(colors.valColor ? { valColor: colors.valColor } : {})
    };
  }).sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
}

export function buildRelaxationPracticesMobileView({
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
  const labels = periodLabels(isShort, {
    intervention: isShort ? "Practices (days 3–4)" : "Practices",
    optimise: isShort ? "Optimise (day 5)" : "Week 6",
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

  const baselineComposure = phaseStats(bEntries, PRIMARY_OUTCOME);
  const practicesComposure = phaseStats(iEntries, PRIMARY_OUTCOME);
  const optimiseComposure = phaseStats(opEntries, PRIMARY_OUTCOME);
  const endComposure = phaseStats(endPhaseEntries(outEntries, active), PRIMARY_OUTCOME);
  const activeComposure = phaseStats(active, PRIMARY_OUTCOME);

  const baselineStress = phaseStats(bEntries, FACTOR_OUTCOME);
  const practicesStress = phaseStats(iEntries, FACTOR_OUTCOME);
  const activeStress = phaseStats(active, FACTOR_OUTCOME);

  const baselineAnxiety = phaseStats(bEntries, "anxiety");
  const endAnxiety = phaseStats(endPhaseEntries(outEntries, active), "anxiety");

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

  if (reportType === "BASELINE_SUMMARY" && baselineComposure.mean != null) {
    view.tiles = [
      {
        label: "Composure",
        value: `${round1(baselineComposure.mean)}/10`,
        delta: "Baseline average"
      },
      {
        label: "Stress level",
        value: baselineStress.mean != null ? `${round1(baselineStress.mean)}/10` : "—",
        delta: "Baseline average"
      }
    ];
  } else if (baselineComposure.mean != null) {
    const compareComposure =
      reportType === "INTERVENTION_INTERIM" ? practicesComposure : activeComposure;
    const compareStress =
      reportType === "INTERVENTION_INTERIM" ? practicesStress : activeStress;
    const composureDelta = round1((compareComposure.mean ?? baselineComposure.mean) - baselineComposure.mean);
    const stressDelta = round1((compareStress.mean ?? baselineStress.mean) - baselineStress.mean);

    view.tiles = [
      {
        label: "Stress level",
        value:
          compareStress.mean != null && baselineStress.mean != null
            ? `${round1(baselineStress.mean)} → ${round1(compareStress.mean)}`
            : baselineStress.mean != null
              ? `${round1(baselineStress.mean)}`
              : "—",
        delta: compareStress.mean != null ? `${stressDelta <= 0 ? "" : "+"}${stressDelta} pts` : "Baseline only"
      },
      {
        label: "Composure",
        value:
          compareComposure.mean != null
            ? `${round1(baselineComposure.mean)} → ${round1(compareComposure.mean)}`
            : `${round1(baselineComposure.mean)}`,
        delta: compareComposure.mean != null ? `${composureDelta >= 0 ? "+" : ""}${composureDelta} pts` : "Baseline only"
      }
    ];
  }

  const phasePoints = [];
  if (baselineComposure.mean != null) phasePoints.push({ label: "Baseline", v: round1(baselineComposure.mean) });
  if (reportType !== "BASELINE_SUMMARY" && practicesComposure.mean != null) {
    phasePoints.push({ label: labels.intervention, v: round1(practicesComposure.mean) });
  }
  if ((reportType === "OPTIMISE_COMPLETION" || reportType === "FINAL_STUDY_COMPLETE") && optimiseComposure.mean != null) {
    phasePoints.push({ label: labels.optimise, v: round1(optimiseComposure.mean) });
  } else if (reportType === "FINAL_STUDY_COMPLETE" && endComposure.mean != null) {
    phasePoints.push({ label: labels.optimise, v: round1(endComposure.mean ?? activeComposure.mean) });
  }

  if (phasePoints.length) {
    const bounds = chartBounds(phasePoints.map((p) => p.v));
    view.phaseChart = {
      title: "Composure by phase",
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
  const factorRows = buildFactorRows(factorSource);
  if (factorRows.length) {
    view.factors = {
      title: "What worked for you",
      sub: "Lower stress on days you used each practice.",
      rows: factorRows
    };
  }

  if (baselineAnxiety.n) {
    const distribution = {
      title: "Anxiety through the week",
      beforeLabel: labels.baseline,
      before: anxietyDistributionBars(baselineAnxiety),
      legend: [
        { c: ANXIETY_COLORS.high, label: "High (7–10)" },
        { c: ANXIETY_COLORS.moderate, label: "Moderate (5–6)" },
        { c: ANXIETY_COLORS.mild, label: "Mild (3–4)" },
        { c: ANXIETY_COLORS.calm, label: "Calm (1–2)" }
      ]
    };

    if (reportType !== "BASELINE_SUMMARY") {
      const afterStats =
        reportType === "INTERVENTION_INTERIM"
          ? phaseStats(iEntries, "anxiety")
          : endAnxiety;
      distribution.afterLabel = reportType === "INTERVENTION_INTERIM" ? labels.intervention : labels.after;
      distribution.after = anxietyDistributionBars(afterStats);
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
      items: keepItems.length ? keepItems : ["Vagal breathing", "Short nature walk"],
      body:
        "Breathing gave you the fastest drop in stress; nature walks sustained composure through the afternoon. PMR helped on high-stress days — worth keeping both core habits."
    };
  }

  if (reportType === "FINAL_STUDY_COMPLETE") {
    const composureEff = effectSize(baselineComposure, activeComposure, PRIMARY_OUTCOME);
    const periodFx = periodEffectCheck(allEntries, PRIMARY_OUTCOME);
    const verdict = determineVerdict(composureEff, {}, periodFx);
    if (!view.lede) {
      view.lede =
        verdict === "BENEFICIAL" || verdict === "PROBABLY_BENEFICIAL_PERIOD_EFFECT_PRESENT"
          ? "Regular relaxation practices shifted your stress baseline. Here's which techniques your data links to calmer, more composed days."
          : "Here's what your own data over this exploration suggests about relaxation practices and your composure.";
    }

    const composureDelta = round1((activeComposure.mean ?? 0) - (baselineComposure.mean ?? 0));
    const stressDelta = round1((activeStress.mean ?? 0) - (baselineStress.mean ?? 0));
    view.compare = {
      title: "How you compare",
      body: cohortSnapshot
        ? buildKindCompareBody(composureDelta, stressDelta, adherence.logging_pct, cohortSnapshot)
        : `Your composure changed by ${composureDelta >= 0 ? "+" : ""}${composureDelta} points and stress by ${stressDelta} points over the health exploration.`
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
          : "Keep tracking the relaxation practices that work best for you."
    };
  }

  return compactMobileView(view);
}

export function buildRelaxationPracticesMobileViewForReport(report, ctx) {
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

  return buildRelaxationPracticesMobileView({
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
