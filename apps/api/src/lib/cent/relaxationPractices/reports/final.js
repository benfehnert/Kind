import {
  PRIMARY_OUTCOME,
  FACTOR_OUTCOME,
  SECONDARY_OUTCOMES,
  HABITS,
  HABIT_LABELS,
  HABIT_ICONS,
  ANXIETY_COLORS,
  MIN_BASELINE_DAYS,
  MIN_ACTIVE_DAYS,
  HEALTH_EXPLORATION_LABEL,
  USER_DISCLAIMER
} from "../constants.js";
import {
  phaseStats,
  effectSize,
  habitAnalysis,
  practiceStackingAnalysis,
  adherenceStats,
  periodEffectCheck,
  rankHabits
} from "../stats.js";
import {
  buildLimitations,
  buildPersonalisedFindings,
  determineVerdict,
  formatDateRange,
  round1,
  buildKindCompareBody,
  keepListLabel,
  relaxationBadgeColors,
  relaxationEvidenceBadge
} from "../helpers.js";
import { buildPracticeComposureChart, buildHabitStressChart } from "../charts.js";
import { generateInsufficientDataReport } from "./insufficient.js";
import { buildRelaxationPracticesMobileView } from "./mobileView.js";
import { resolveAnalysisThresholds } from "../../shared/mobileView.js";

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

  const composureEff = effectSize(
    phaseStats(bEntries, PRIMARY_OUTCOME),
    phaseStats(active, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );
  const stressEff = effectSize(
    phaseStats(bEntries, FACTOR_OUTCOME),
    phaseStats(active, FACTOR_OUTCOME),
    FACTOR_OUTCOME
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
        stress: habitAnalysis(active, h, FACTOR_OUTCOME),
        composure: habitAnalysis(active, h, PRIMARY_OUTCOME)
      }
    ])
  );

  const stackingFinal = practiceStackingAnalysis(active, PRIMARY_OUTCOME);
  const weekly6 = {};
  for (let w = 1; w <= 6; w += 1) {
    weekly6[w] = phaseStats(allEntries.filter((e) => e.study_week === w), PRIMARY_OUTCOME);
  }

  const periodFx = periodEffectCheck(allEntries, PRIMARY_OUTCOME);
  const personalised = buildPersonalisedFindings(fullHabit);
  const verdict = determineVerdict(composureEff, secEffs, periodFx);

  const endDate = studyMeta.end_date ?? allEntries.at(-1)?.date;
  const adherence = adherenceStats(allEntries, studyMeta.start_date, endDate);

  const baselineComposure = phaseStats(bEntries, PRIMARY_OUTCOME);
  const practicesComposure = phaseStats(iEntries, PRIMARY_OUTCOME);
  const week6Composure = phaseStats(
    outEntries.length ? outEntries : [...opEntries, ...iEntries].slice(-7),
    PRIMARY_OUTCOME
  );
  const activeComposure = phaseStats(active, PRIMARY_OUTCOME);

  const baselineStress = phaseStats(bEntries, FACTOR_OUTCOME);
  const activeStress = phaseStats(active, FACTOR_OUTCOME);

  const baselineAnxiety = phaseStats(bEntries, "anxiety");
  const week6Anxiety = phaseStats(
    outEntries.length ? outEntries : active.slice(-7),
    "anxiety"
  );

  const ranked = rankHabits(active);
  const keepItems = ranked.filter((r) => r.status === "valid").slice(0, 2).map((r) => keepListLabel(r.habit));

  const maxReduction = Math.max(
    ...HABITS.map((h) => {
      const s = fullHabit[h]?.stress;
      return s?.status === "valid" && s.beneficial ? s.abs_effect : 0;
    }),
    0.1
  );

  const factorRows = HABITS.map((habit) => {
    const stress = fullHabit[habit]?.stress;
    const followed = active.filter((e) => e[habit]).length;
    const followedPct = active.length ? Math.round((followed / active.length) * 100) : 0;
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

  const participantName = studyMeta.participant_name ?? "You";
  const loggingPct = adherence.logging_pct;
  const composureDelta = round1(activeComposure.mean - baselineComposure.mean);
  const stressDelta = round1(activeStress.mean - baselineStress.mean);

  const practiceComposureChart = buildPracticeComposureChart(active, baselineComposure.mean);
  const habitStressChart = buildHabitStressChart(
    Object.fromEntries(HABITS.map((h) => [h, fullHabit[h]?.stress]))
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
      total_days_logged: allEntries.length,
      baseline_days_logged: bEntries.length,
      practices_days_logged: iEntries.length,
      optimise_days_logged: opEntries.length,
      output_days_logged: outEntries.length
    },
    primary_outcome: {
      baseline: baselineComposure,
      active: activeComposure,
      effect: composureEff
    },
    stress_outcome: {
      baseline: baselineStress,
      active: activeStress,
      effect: stressEff
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
    practice_composure_chart: practiceComposureChart,
    habit_stress_chart: habitStressChart,
    limitations,
    generalisability_note: generalisabilityNote
  };

  const mobileReport = {
    ...buildRelaxationPracticesMobileView({
      reportType: "FINAL_STUDY_COMPLETE",
      allEntries,
      studyMeta,
      cohortSnapshot,
      isShort: options.isShort ?? false,
      limitations,
      keepList: {
        title: "Your keep list",
        items: keepItems.length ? keepItems : ["Vagal breathing", "Short nature walk"],
        body:
          "Breathing gave you the fastest drop in stress; nature walks sustained composure through the afternoon. PMR helped on high-stress days — worth keeping both core habits."
      }
    }),
    practice_composure_chart: practiceComposureChart,
    habit_stress_chart: habitStressChart,
    _cent: centReport
  };

  return { centReport, mobileReport };
}
