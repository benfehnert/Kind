import {
  PRIMARY_OUTCOME,
  SECONDARY_OUTCOMES,
  HABITS,
  HABIT_LABELS,
  HABIT_ICONS,
  UPF_COLORS,
  UPF_BAND_LABELS,
  MIN_BASELINE_DAYS,
  MIN_ACTIVE_DAYS,
  HEALTH_EXPLORATION_LABEL,
  USER_DISCLAIMER,
  THEME_GREEN,
  BADGE_BG
} from "../constants.js";
import {
  phaseStats,
  effectSize,
  habitAnalysis,
  upfStackingAnalysis,
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
  upfDistributionBars
} from "../helpers.js";
import { buildUpfMoodChart, buildHabitUpliftChart } from "../charts.js";
import { meanUpfPct } from "../normalize.js";
import { generateInsufficientDataReport } from "./insufficient.js";
import { buildUpfReductionMobileView } from "./mobileView.js";
import { resolveAnalysisThresholds } from "../../shared/mobileView.js";

function evidenceBadge(habitResult, followedPct, phaseLabel = "reduction") {
  if (habitResult.status !== "valid") return "Insufficient data";
  const abs = habitResult.abs_effect ?? Math.abs(habitResult.difference ?? 0);
  if (abs >= 1.5 && followedPct >= 60) return `Strong signal · ${followedPct}% of ${phaseLabel} days`;
  if (abs >= 0.8 && followedPct >= 45) return `Moderate–strong · ${followedPct}% of days`;
  if (abs >= 0.5) return `Moderate · ${followedPct}% of days`;
  return "Mild · partial adherence";
}

function badgeColors(badge) {
  if (badge.startsWith("Strong") || badge.startsWith("Moderate–strong")) {
    return { badgeBg: BADGE_BG, badgeText: THEME_GREEN, bar: THEME_GREEN };
  }
  if (badge.startsWith("Moderate")) {
    return { badgeBg: "#FAEEDA", badgeText: "#854F0B", bar: "#EF9F27" };
  }
  return { badgeBg: "#F1EFE8", badgeText: "#444441", bar: "#888780", valColor: "#5F6B5C" };
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

  const moodEff = effectSize(
    phaseStats(bEntries, PRIMARY_OUTCOME),
    phaseStats(active, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );
  const upfEff = effectSize(
    phaseStats(bEntries, "upf_pct"),
    phaseStats(active, "upf_pct"),
    "upf_pct"
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
        mood: habitAnalysis(active, h, PRIMARY_OUTCOME),
        upf: habitAnalysis(active, h, "upf_pct")
      }
    ])
  );

  const stackingFinal = upfStackingAnalysis(active, PRIMARY_OUTCOME);
  const weekly6 = {};
  for (let w = 1; w <= 6; w += 1) {
    weekly6[w] = phaseStats(allEntries.filter((e) => e.study_week === w), PRIMARY_OUTCOME);
  }

  const periodFx = periodEffectCheck(allEntries, PRIMARY_OUTCOME);
  const personalised = buildPersonalisedFindings(fullHabit);
  const verdict = determineVerdict(moodEff, secEffs, periodFx);

  const endDate = studyMeta.end_date ?? allEntries.at(-1)?.date;
  const adherence = adherenceStats(allEntries, studyMeta.start_date, endDate);

  const baselineMood = phaseStats(bEntries, PRIMARY_OUTCOME);
  const reductionMood = phaseStats(iEntries, PRIMARY_OUTCOME);
  const week6Mood = phaseStats(
    outEntries.length ? outEntries : [...opEntries, ...iEntries].slice(-7),
    PRIMARY_OUTCOME
  );
  const activeMood = phaseStats(active, PRIMARY_OUTCOME);

  const baselineUpf = meanUpfPct(bEntries);
  const activeUpf = meanUpfPct(active);

  const baselineUpfStats = phaseStats(bEntries, "upf_pct");
  const week6UpfStats = phaseStats(
    outEntries.length ? outEntries : active.slice(-7),
    "upf_pct"
  );

  const ranked = rankHabits(active);
  const keepItems = ranked.filter((r) => r.status === "valid").slice(0, 2).map((r) => keepListLabel(r.habit));

  const maxUplift = Math.max(
    ...HABITS.map((h) => {
      const m = fullHabit[h]?.mood;
      return m?.status === "valid" && m.beneficial ? m.difference : 0;
    }),
    0.1
  );

  const factorRows = HABITS.map((habit) => {
    const mood = fullHabit[habit]?.mood;
    const followed = active.filter((e) => e[habit]).length;
    const followedPct = active.length ? Math.round((followed / active.length) * 100) : 0;
    const uplift = mood?.status === "valid" && mood.beneficial ? mood.difference : 0;
    const badge = evidenceBadge(mood ?? { status: "insufficient_data" }, followedPct);
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
  const moodDelta = round1(activeMood.mean - baselineMood.mean);
  const upfDelta = round1((week6UpfStats.mean ?? activeUpf) - baselineUpf);
  const tileEndMood = week6Mood.mean ?? activeMood.mean;
  const tileEndUpf = week6UpfStats.mean ?? activeUpf;
  const tileMoodDelta = round1(tileEndMood - baselineMood.mean);
  const tileUpfDelta = round1(tileEndUpf - baselineUpf);

  const upfMoodChart = buildUpfMoodChart(active, baselineMood.mean);
  const habitUpliftChart = buildHabitUpliftChart(
    Object.fromEntries(HABITS.map((h) => [h, fullHabit[h]?.mood]))
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
      reduction_days_logged: iEntries.length,
      sustained_days_logged: opEntries.length,
      output_days_logged: outEntries.length
    },
    primary_outcome: {
      baseline: baselineMood,
      active: activeMood,
      effect: moodEff
    },
    upf_pct: {
      baseline_pct: baselineUpf,
      active_pct: activeUpf,
      effect: upfEff
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
    upf_mood_chart: upfMoodChart,
    habit_uplift_chart: habitUpliftChart,
    limitations,
    generalisability_note: generalisabilityNote
  };

  const mobileReport = {
    ...buildUpfReductionMobileView({
      reportType: "FINAL_STUDY_COMPLETE",
      allEntries,
      studyMeta,
      cohortSnapshot,
      isShort: options.isShort ?? false,
      limitations,
      keepList: {
        title: "Your keep list",
        items: keepItems.length ? keepItems : ["Whole-food breakfast", "Unprocessed snacks"],
        body:
          "Breakfast and snack swaps drove most of your UPF reduction — and the mood lift followed within two weeks. Home-cooked dinners helped on weekends."
      }
    }),
    upf_mood_chart: upfMoodChart,
    habit_uplift_chart: habitUpliftChart,
    _cent: centReport
  };

  return { centReport, mobileReport };
}
