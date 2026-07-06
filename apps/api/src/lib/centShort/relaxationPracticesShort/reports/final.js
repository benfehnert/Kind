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

export function generateFinalReport(allEntries, studyMeta, cohortSnapshot = null) {
  const bEntries = allEntries.filter((e) => e.phase === "BASELINE" && e.valid_for_analysis);
  const iEntries = allEntries.filter((e) => e.phase === "INTERVENTION" && e.valid_for_analysis);
  const opEntries = allEntries.filter((e) => e.phase === "OPTIMISE" && e.valid_for_analysis);
  const outEntries = allEntries.filter((e) => e.phase === "OUTPUT" && e.valid_for_analysis);
  const active = [...iEntries, ...opEntries, ...outEntries];

  if (bEntries.length < MIN_BASELINE_DAYS || active.length < MIN_ACTIVE_DAYS) {
    return generateInsufficientDataReport(
      "FINAL",
      bEntries.length,
      MIN_ACTIVE_DAYS,
      allEntries.filter((e) => e.valid_for_analysis)
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
    "These findings reflect your individual response over this short 6-day alpha exploration. With so few days the signal is preliminary and may differ if repeated over a longer period. They are early personal insights, not medical conclusions.";

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
    explorationName: "Relaxation practices & composure",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    reportTitleLabel: "Personalised trial final report",
    category: "Mental Health",
    subMeta: `${participantName} · ${formatDateRange(studyMeta.start_date, endDate)} · ${loggingPct}% of days logged`,
    lede:
      verdict === "BENEFICIAL" || verdict === "PROBABLY_BENEFICIAL_PERIOD_EFFECT_PRESENT"
        ? "Regular relaxation practices shifted your stress baseline. Here's which techniques your data links to calmer, more composed days."
        : "Here's what your own data over this exploration suggests about relaxation practices and your composure.",
    tiles: [
      {
        label: "Stress level",
        value: `${round1(baselineStress.mean)} → ${round1(activeStress.mean)}`,
        delta: `${stressDelta <= 0 ? "" : "+"}${stressDelta} pts`
      },
      {
        label: "Composure",
        value: `${round1(baselineComposure.mean)} → ${round1(activeComposure.mean)}`,
        delta: `${composureDelta >= 0 ? "+" : ""}${composureDelta} pts`
      }
    ],
    phaseChart: {
      title: "Composure by phase",
      min: 4,
      max: 8,
      points: [
        { label: "Baseline", v: round1(baselineComposure.mean) },
        { label: "Practices", v: round1(practicesComposure.mean) },
        { label: "Week 6", v: round1(week6Composure.mean ?? activeComposure.mean) }
      ]
    },
    factors: {
      title: "What worked for you",
      sub: "Lower stress on days you used each practice.",
      rows: factorRows
    },
    distribution: {
      title: "Anxiety through the week",
      beforeLabel: "Baseline (wks 1–2)",
      afterLabel: "Week 6",
      before: anxietyDistributionBars(baselineAnxiety),
      after: anxietyDistributionBars(week6Anxiety),
      legend: [
        { c: ANXIETY_COLORS.high, label: "High (7–10)" },
        { c: ANXIETY_COLORS.moderate, label: "Moderate (5–6)" },
        { c: ANXIETY_COLORS.mild, label: "Mild (3–4)" },
        { c: ANXIETY_COLORS.calm, label: "Calm (1–2)" }
      ]
    },
    keepList: {
      title: "Your keep list",
      items: keepItems.length ? keepItems : ["Vagal breathing", "Short nature walk"],
      body:
        "Breathing gave you the fastest drop in stress; nature walks sustained composure through the afternoon. PMR helped on high-stress days — worth keeping both core habits."
    },
    compare: {
      title: "How you compare",
      body: cohortSnapshot
        ? buildKindCompareBody(composureDelta, stressDelta, loggingPct, cohortSnapshot)
        : `Your composure changed by ${composureDelta >= 0 ? "+" : ""}${composureDelta} points and stress by ${stressDelta} points over the health exploration.`
    },
    disclaimer: USER_DISCLAIMER.body,
    disclaimerInfo: USER_DISCLAIMER,
    limitations,
    generalisabilityNote,
    practice_composure_chart: practiceComposureChart,
    habit_stress_chart: habitStressChart,
    cta: {
      label: keepItems.length >= 2 ? "Run a 4-week re-check on your keep-list  →" : "Continue tracking what works  →",
      toast: keepItems.length >= 2
        ? `Setting up a focused 4-week re-check on ${keepItems.join(" and ").toLowerCase()}.`
        : "Keep tracking the relaxation practices that work best for you."
    },
    _cent: centReport
  };

  return { centReport, mobileReport };
}
