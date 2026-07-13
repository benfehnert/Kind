import {
  PRIMARY_OUTCOME,
  RULES,
  RULE_LABELS,
  RULE_ICONS,
  CRASH_COLORS,
  HEALTH_EXPLORATION_LABEL,
  USER_DISCLAIMER
} from "../constants.js";
import {
  phaseStats,
  ruleAnalysis,
  rankRules,
  adherenceStats,
  periodEffectCheck
} from "../stats.js";
import {
  buildLimitations,
  determineVerdict,
  formatDateRange,
  round1,
  buildKindCompareBody
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

const FULL_EXPLORATION_ID = "morning-rules";
const SHORT_EXPLORATION_ID = "morning-rules-short";

function explorationIdFor(isShort) {
  return isShort ? SHORT_EXPLORATION_ID : FULL_EXPLORATION_ID;
}

function evidenceBadge(ruleResult, followedPct, theme) {
  if (ruleResult.status !== "valid") return "Insufficient data";
  const abs = ruleResult.abs_effect ?? Math.abs(ruleResult.difference ?? 0);
  if (abs >= 1.5 && followedPct >= 60) return `Strong evidence · ${followedPct}% of days`;
  if (abs >= 0.8 && followedPct >= 45) return `Moderate–strong · ${followedPct}% of days`;
  if (abs >= 0.5) return `Moderate · ${followedPct}% of days`;
  return "Experimental · too small to call";
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

function distributionBars(stats) {
  if (!stats?.distribution) {
    return [
      { w: 25, c: CRASH_COLORS.none },
      { w: 25, c: CRASH_COLORS.mild_dip },
      { w: 25, c: CRASH_COLORS.noticeable },
      { w: 25, c: CRASH_COLORS.severe }
    ];
  }
  const d = stats.distribution;
  return [
    { w: Math.round(d.none * 100), c: CRASH_COLORS.none },
    { w: Math.round(d.mild_dip * 100), c: CRASH_COLORS.mild_dip },
    { w: Math.round(d.noticeable * 100), c: CRASH_COLORS.noticeable },
    { w: Math.round(d.severe * 100), c: CRASH_COLORS.severe }
  ];
}

function realCrashPct(stats) {
  if (!stats?.distribution) return null;
  return Math.round((stats.distribution.noticeable + stats.distribution.severe) * 100);
}

function buildFactorRows(activeEntries, theme) {
  if (!activeEntries.length) return [];

  const fullRule = Object.fromEntries(
    RULES.map((r) => [r, { energy: ruleAnalysis(activeEntries, r, "afternoon_energy") }])
  );

  const maxUplift = Math.max(
    ...RULES.map((r) => {
      const e = fullRule[r]?.energy;
      return e?.status === "valid" && e.beneficial ? e.difference : 0;
    }),
    0.1
  );

  return RULES.map((rule) => {
    const energy = fullRule[rule]?.energy;
    const followed = activeEntries.filter((e) => e[rule]).length;
    const followedPct = activeEntries.length ? Math.round((followed / activeEntries.length) * 100) : 0;
    const uplift = energy?.status === "valid" && energy.beneficial ? energy.difference : 0;
    const badge = evidenceBadge(energy ?? { status: "insufficient_data" }, followedPct, theme);
    const colors = badgeColors(badge, theme);
    return {
      icon: RULE_ICONS[rule],
      label: RULE_LABELS[rule],
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

function chartBounds(values) {
  const nums = values.filter((v) => v != null && !Number.isNaN(v));
  if (!nums.length) return { min: 4, max: 8 };
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  return { min: Math.max(1, Math.floor(lo - 1)), max: Math.min(10, Math.ceil(hi + 1)) };
}

export function buildMorningRulesMobileView({
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
    intervention: isShort ? "Morning rules (days 3–5)" : "Morning rules",
    optimise: "Optimise",
    after: isShort ? "Optimise (days 6–7)" : "Optimise (weeks 6–7)"
  });

  const bEntries = allEntries.filter((e) => e.phase === "BASELINE" && e.valid_for_analysis);
  const iEntries = allEntries.filter((e) => e.phase === "INTERVENTION" && e.valid_for_analysis);
  const opEntries = allEntries.filter((e) => e.phase === "OPTIMISE" && e.valid_for_analysis);
  const active = [...iEntries, ...opEntries];

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

  const baselineEnergy = phaseStats(bEntries, "afternoon_energy");
  const interventionEnergy = phaseStats(iEntries, "afternoon_energy");
  const optimiseEnergy = phaseStats(opEntries, "afternoon_energy");
  const activeEnergy = phaseStats(active, "afternoon_energy");
  const baselineCrash = phaseStats(bEntries, PRIMARY_OUTCOME);

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
      {
        label: "Afternoon energy",
        value: `${round1(baselineEnergy.mean)}/10`,
        delta: "Baseline average"
      },
      {
        label: "Days logged",
        value: `${bEntries.length}`,
        delta: "Baseline phase"
      }
    ];
  }

  if (reportType !== "BASELINE_SUMMARY") {
    const tiles = [];
    const compareEnergy = reportType === "INTERVENTION_INTERIM" ? interventionEnergy : activeEnergy;
    if (baselineEnergy.mean != null) {
      const energyDelta = round1((compareEnergy.mean ?? baselineEnergy.mean) - baselineEnergy.mean);
      tiles.push({
        label: "Afternoon energy",
        value:
          compareEnergy.mean != null
            ? `${round1(baselineEnergy.mean)} → ${round1(compareEnergy.mean)}`
            : `${round1(baselineEnergy.mean)}`,
        delta: compareEnergy.mean != null ? `${energyDelta >= 0 ? "+" : ""}${energyDelta} pts` : "Baseline only"
      });
    }

    const beforeCrashPct = realCrashPct(baselineCrash);
    const afterCrash =
      reportType === "INTERVENTION_INTERIM"
        ? phaseStats(iEntries, PRIMARY_OUTCOME)
        : phaseStats(opEntries.length ? opEntries : active, PRIMARY_OUTCOME);
    const afterCrashPct = realCrashPct(afterCrash);

    if (beforeCrashPct != null || afterCrashPct != null) {
      tiles.push({
        label: "Days with a noticeable or severe afternoon crash",
        value:
          afterCrashPct != null && beforeCrashPct != null
            ? `${beforeCrashPct}% → ${afterCrashPct}%`
            : beforeCrashPct != null
              ? `${beforeCrashPct}%`
              : "—",
        delta:
          afterCrashPct != null && beforeCrashPct != null
            ? `${afterCrashPct - beforeCrashPct >= 0 ? "+" : ""}${afterCrashPct - beforeCrashPct} percentage points`
            : "Compared with Baseline"
      });
    }

    if (tiles.length) view.tiles = tiles;
  }

  const phasePoints = [];
  if (baselineEnergy.mean != null) phasePoints.push({ label: "Baseline", v: round1(baselineEnergy.mean) });
  if (reportType !== "BASELINE_SUMMARY" && interventionEnergy.mean != null) {
    phasePoints.push({ label: labels.intervention, v: round1(interventionEnergy.mean) });
  }
  if ((reportType === "OPTIMISE_COMPLETION" || reportType === "FINAL_STUDY_COMPLETE") && optimiseEnergy.mean != null) {
    phasePoints.push({ label: labels.optimise, v: round1(optimiseEnergy.mean) });
  } else if (reportType === "FINAL_STUDY_COMPLETE" && interventionEnergy.mean != null && !optimiseEnergy.mean) {
    phasePoints.push({ label: labels.optimise, v: round1(activeEnergy.mean ?? interventionEnergy.mean) });
  }

  if (phasePoints.length >= 1) {
    const bounds = chartBounds(phasePoints.map((p) => p.v));
    view.phaseChart = {
      title: "Afternoon energy by phase",
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
      sub: "Extra afternoon energy on the days you did each rule.",
      rows: factorRows
    };
  }

  if (baselineCrash.n) {
    const distribution = {
      title: "How your afternoons felt",
      beforeLabel: labels.baseline,
      before: distributionBars(baselineCrash),
      legend: [
        { c: CRASH_COLORS.none, label: "None — no afternoon crash" },
        { c: CRASH_COLORS.mild_dip, label: "Mild dip" },
        { c: CRASH_COLORS.noticeable, label: "Noticeable crash" },
        { c: CRASH_COLORS.severe, label: "Severe crash" }
      ]
    };

    if (reportType !== "BASELINE_SUMMARY") {
      const afterStats =
        reportType === "INTERVENTION_INTERIM"
          ? phaseStats(iEntries, PRIMARY_OUTCOME)
          : optimiseEnergy.n
            ? phaseStats(opEntries, PRIMARY_OUTCOME)
            : phaseStats(active, PRIMARY_OUTCOME);
      distribution.afterLabel =
        reportType === "INTERVENTION_INTERIM" ? labels.intervention : labels.after;
      distribution.after = distributionBars(afterStats);
    }

    view.distribution = distribution;
  }

  if ((reportType === "OPTIMISE_COMPLETION" || reportType === "FINAL_STUDY_COMPLETE") && keepList) {
    view.keepList = keepList;
  } else if (reportType === "FINAL_STUDY_COMPLETE") {
    const ranked = rankRules(active);
    const keepItems = ranked.filter((r) => r.status === "valid").slice(0, 2).map((r) => RULE_LABELS[r.rule]);
    view.keepList = {
      title: "Your keep list",
      items: keepItems.length ? keepItems : ["Morning sunlight"],
      body:
        keepItems.length >= 2
          ? "These two tracked most closely with your better afternoons. Worth keeping."
          : "Keep logging the morning rules that track with your better afternoons."
    };
  }

  if (reportType === "FINAL_STUDY_COMPLETE") {
    const periodFx = periodEffectCheck(allEntries, "afternoon_energy");
    const activeCrash = phaseStats(active, PRIMARY_OUTCOME);
    const crashEff = {
      status: baselineCrash.n && activeCrash.n ? "valid" : "insufficient_data",
      improved: (activeEnergy.mean ?? 0) > (baselineEnergy.mean ?? 0)
    };
    const verdict = determineVerdict(crashEff, {}, periodFx);
    if (!view.lede) {
      view.lede =
        verdict === "BENEFICIAL" || verdict === "PROBABLY_BENEFICIAL_PERIOD_EFFECT_PRESENT"
          ? "Your afternoons got steadier. Here's what your own data — not a study average — suggests worked for you."
          : "Here's what your own data over this exploration suggests about your afternoon energy and crashes.";
    }

    const energyDelta = round1((activeEnergy.mean ?? 0) - (baselineEnergy.mean ?? 0));
    const loggingPct = adherence.logging_pct;
    view.compare = {
      title: "How you compare",
      body: cohortSnapshot
        ? buildKindCompareBody(energyDelta, loggingPct, cohortSnapshot)
        : `Your afternoon energy changed by ${energyDelta >= 0 ? "+" : ""}${energyDelta} points over the health exploration.`
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
          : "Keep tracking the rules that work best for you."
    };
  }

  return compactMobileView(view);
}

export function buildMorningRulesMobileViewForReport(report, ctx) {
  const isShort = ctx.isShort ?? isShortExplorationId(ctx.explorationId);
  const reportType =
    report.type === "INSUFFICIENT_DATA" ? report.for_report : report.type;

  if (report.type === "INSUFFICIENT_DATA") {
    return buildInsufficientMobileView({
      explorationId: explorationIdFor(isShort),
      reportType,
      message: report.message,
      studyMeta: ctx.studyMeta,
      availableSummary: report.available_summary
    });
  }

  return buildMorningRulesMobileView({
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
