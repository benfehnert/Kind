import {
  PRIMARY_OUTCOME,
  SECONDARY_OUTCOMES,
  HABITS,
  HABIT_LABELS,
  HABIT_ICONS,
  SLEEP_QUALITY_COLORS,
  MIN_BASELINE_DAYS,
  MIN_ACTIVE_DAYS,
  HEALTH_EXPLORATION_LABEL,
  USER_DISCLAIMER,
  THEME_BAR,
  THEME_BADGE_BG,
  THEME_BADGE_TEXT
} from "../constants.js";
import {
  phaseStats,
  effectSize,
  habitAnalysis,
  winddownStackingAnalysis,
  adherenceStats,
  periodEffectCheck,
  rankHabits,
  percentileRank
} from "../stats.js";
import {
  buildLimitations,
  buildPersonalisedFindings,
  determineVerdict,
  formatDateRange,
  round1,
  buildKindCompareBody,
  keepListLabel,
  formatOnsetTileValue
} from "../helpers.js";
import { buildWinddownSleepChart, buildHabitUpliftChart } from "../charts.js";
import { meanWinddownMinutes } from "../normalize.js";
import { generateInsufficientDataReport } from "./insufficient.js";
import { buildScreenSleepMobileView } from "./mobileView.js";
import { resolveAnalysisThresholds } from "../../shared/mobileView.js";

function evidenceBadge(habitResult, followedPct, phaseLabel = "active") {
  if (habitResult.status !== "valid") return "Insufficient data";
  const abs = habitResult.abs_effect ?? Math.abs(habitResult.difference ?? 0);
  if (abs >= 1.5 && followedPct >= 60) return `Strong signal · ${followedPct}% of ${phaseLabel} nights`;
  if (abs >= 0.8 && followedPct >= 45) return `Moderate–strong · ${followedPct}% of nights`;
  if (abs >= 0.5) return `Moderate · ${followedPct}% of nights`;
  return "Mild · inconsistent";
}

function badgeColors(badge) {
  if (badge.startsWith("Strong") || badge.startsWith("Moderate–strong")) {
    return { badgeBg: THEME_BADGE_BG, badgeText: THEME_BADGE_TEXT, bar: THEME_BAR };
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

export function generateFinalReport(allEntries, studyMeta, cohortSnapshot = null, options = {}) {
  const bEntries = allEntries.filter((e) => e.phase === "BASELINE" && e.valid_for_analysis);
  const iEntries = allEntries.filter((e) => e.phase === "INTERVENTION" && e.valid_for_analysis);
  const opEntries = allEntries.filter((e) => e.phase === "OPTIMISE" && e.valid_for_analysis);
  const outEntries = allEntries.filter((e) => e.phase === "OUTPUT" && e.valid_for_analysis);
  const active = [...iEntries, ...opEntries, ...outEntries];
  const thresholds = resolveAnalysisThresholds(options.isShort ?? false, {
    MIN_BASELINE_DAYS,
    MIN_ACTIVE_DAYS
  });

  if (bEntries.length < thresholds.MIN_BASELINE_DAYS || active.length < thresholds.MIN_ACTIVE_DAYS) {
    return generateInsufficientDataReport(
      "FINAL",
      bEntries.length,
      thresholds.MIN_ACTIVE_DAYS,
      allEntries.filter((e) => e.valid_for_analysis),
      { studyMeta, isShort: options.isShort ?? false, cohortSnapshot }
    );
  }

  const sleepEff = effectSize(
    phaseStats(bEntries, PRIMARY_OUTCOME),
    phaseStats(active, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );
  const winddownEff = effectSize(
    phaseStats(bEntries, "winddown_minutes"),
    phaseStats(active, "winddown_minutes"),
    "winddown_minutes"
  );
  const secEffs = Object.fromEntries(
    SECONDARY_OUTCOMES.map((o) => [
      o,
      effectSize(phaseStats(bEntries, o), phaseStats(active, o), o)
    ])
  );

  const fullHabit = Object.fromEntries(
    HABITS.map((h) => [
      h,
      {
        sleep: habitAnalysis(active, h, PRIMARY_OUTCOME),
        winddown: habitAnalysis(active, h, "winddown_minutes")
      }
    ])
  );

  const stackingFinal = winddownStackingAnalysis(active, PRIMARY_OUTCOME);
  const weekly6 = {};
  for (let w = 1; w <= 6; w += 1) {
    weekly6[w] = phaseStats(allEntries.filter((e) => e.study_week === w), PRIMARY_OUTCOME);
  }

  const periodFx = periodEffectCheck(allEntries, PRIMARY_OUTCOME);
  const personalised = buildPersonalisedFindings(fullHabit);
  const verdict = determineVerdict(sleepEff, secEffs, periodFx);

  const endDate = studyMeta.end_date ?? allEntries.at(-1)?.date;
  const adherence = adherenceStats(allEntries, studyMeta.start_date, endDate);

  const baselineSleep = phaseStats(bEntries, PRIMARY_OUTCOME);
  const thirtyMinSleep = phaseStats(iEntries, PRIMARY_OUTCOME);
  const week6Sleep = phaseStats(
    outEntries.length ? outEntries : [...opEntries, ...iEntries].slice(-7),
    PRIMARY_OUTCOME
  );
  const activeSleep = phaseStats(active, PRIMARY_OUTCOME);

  const baselineWinddown = meanWinddownMinutes(bEntries);
  const activeWinddown = meanWinddownMinutes(active);

  const baselineSleepDist = phaseStats(bEntries, "sleep_quality");
  const week6SleepDist = phaseStats(
    outEntries.length ? outEntries : active.slice(-7),
    "sleep_quality"
  );

  const ranked = rankHabits(active);
  const keepItems = ranked.filter((r) => r.status === "valid").slice(0, 2).map((r) => keepListLabel(r.habit));

  const maxUplift = Math.max(
    ...HABITS.map((h) => {
      const s = fullHabit[h]?.sleep;
      return s?.status === "valid" && s.beneficial ? s.difference : 0;
    }),
    0.1
  );

  const factorRows = HABITS.map((habit) => {
    const sleep = fullHabit[habit]?.sleep;
    const followed = active.filter((e) => e[habit]).length;
    const followedPct = active.length ? Math.round((followed / active.length) * 100) : 0;
    const uplift = sleep?.status === "valid" && sleep.beneficial ? sleep.difference : 0;
    const badge = evidenceBadge(sleep ?? { status: "insufficient_data" }, followedPct);
    const colors = badgeColors(badge);
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

  const participantName = studyMeta.participant_name ?? "You";
  const loggingPct = adherence.logging_pct;
  const sleepDelta = round1(activeSleep.mean - baselineSleep.mean);
  const winddownDelta = round1(activeWinddown - baselineWinddown);
  const onsetTile = formatOnsetTileValue(bEntries, active);

  const winddownSleepChart = buildWinddownSleepChart(active, baselineSleep.mean);
  const habitUpliftChart = buildHabitUpliftChart(
    Object.fromEntries(HABITS.map((h) => [h, fullHabit[h]?.sleep]))
  );
  const limitations = buildLimitations(adherence, periodFx, bEntries, active);
  const generalisabilityNote =
    "These findings reflect your individual response over this 6-week period. Results may differ in other seasons, life phases, or if repeated. They are personal insights, not medical conclusions.";

  const centReport = {
    type: "FINAL_STUDY_COMPLETE",
    reportTitle: "Personalised trial final report",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    study_summary: {
      total_nights_logged: allEntries.length,
      baseline_nights_logged: bEntries.length,
      thirty_min_nights_logged: iEntries.length,
      sixty_min_nights_logged: opEntries.length,
      output_nights_logged: outEntries.length
    },
    primary_outcome: {
      baseline: baselineSleep,
      active: activeSleep,
      effect: sleepEff
    },
    winddown: {
      baseline_minutes: baselineWinddown,
      active_minutes: activeWinddown,
      effect: winddownEff
    },
    secondary_outcomes: Object.fromEntries(
      SECONDARY_OUTCOMES.map((o) => [
        o,
        {
          baseline: phaseStats(bEntries, o),
          active: phaseStats(active, o),
          effect: secEffs[o]
        }
      ])
    ),
    full_habit_analysis: fullHabit,
    stacking_final: stackingFinal,
    weekly_6_trend: weekly6,
    period_effect: periodFx,
    personalised_findings: personalised,
    overall_verdict: verdict,
    winddown_sleep_chart: winddownSleepChart,
    habit_uplift_chart: habitUpliftChart,
    limitations,
    generalisability_note: generalisabilityNote
  };

  const mobileReport = {
    ...buildScreenSleepMobileView({
      reportType: "FINAL_STUDY_COMPLETE",
      allEntries,
      studyMeta,
      cohortSnapshot,
      isShort: options.isShort ?? false,
      limitations,
      keepList: {
        title: "Your keep list",
        items: keepItems.length ? keepItems : ["60-min screen-free", "No screens in bed"],
        body:
          "The 60-minute buffer made the biggest difference — especially when paired with no in-bed scrolling. Reading on paper helped on tougher nights."
      }
    }),
    winddown_sleep_chart: winddownSleepChart,
    habit_uplift_chart: habitUpliftChart,
    _cent: centReport
  };

  return { centReport, mobileReport };
}
