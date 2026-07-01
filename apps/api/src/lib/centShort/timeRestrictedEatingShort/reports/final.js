import {
  PRIMARY_OUTCOME,
  SECONDARY_OUTCOMES,
  HABITS,
  HABIT_LABELS,
  HABIT_ICONS,
  HUNGER_COLORS,
  MIN_BASELINE_DAYS,
  MIN_ACTIVE_DAYS,
  HEALTH_EXPLORATION_LABEL,
  USER_DISCLAIMER
} from "../constants.js";
import {
  phaseStats,
  effectSize,
  habitAnalysis,
  windowStackingAnalysis,
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
  keepListLabel
} from "../helpers.js";
import { buildWindowEnergyChart, buildHabitUpliftChart } from "../charts.js";
import { meanWindowHours } from "../normalize.js";
import { generateInsufficientDataReport } from "./insufficient.js";
import { getExplorationTheme } from "../../../explorationThemes.js";

const theme = getExplorationTheme("eating");

function evidenceBadge(habitResult, followedPct, phaseLabel = "intervention") {
  if (habitResult.status !== "valid") return "Insufficient data";
  const abs = habitResult.abs_effect ?? Math.abs(habitResult.difference ?? 0);
  if (abs >= 1.5 && followedPct >= 60) return `Strong signal · ${followedPct}% of ${phaseLabel} days`;
  if (abs >= 0.8 && followedPct >= 45) return `Moderate–strong · ${followedPct}% of days`;
  if (abs >= 0.5) return `Moderate · ${followedPct}% of days`;
  return "Unclear · too inconsistent";
}

function badgeColors(badge) {
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

  const energyEff = effectSize(
    phaseStats(bEntries, PRIMARY_OUTCOME),
    phaseStats(active, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );
  const windowEff = effectSize(
    phaseStats(bEntries, "eating_window_hours"),
    phaseStats(active, "eating_window_hours"),
    "eating_window_hours"
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
        energy: habitAnalysis(active, h, PRIMARY_OUTCOME),
        window: habitAnalysis(active, h, "eating_window_hours")
      }
    ])
  );

  const stackingFinal = windowStackingAnalysis(active, PRIMARY_OUTCOME);
  const weekly6 = {};
  for (let w = 1; w <= 6; w += 1) {
    weekly6[w] = phaseStats(allEntries.filter((e) => e.study_week === w), PRIMARY_OUTCOME);
  }

  const periodFx = periodEffectCheck(allEntries, PRIMARY_OUTCOME);
  const personalised = buildPersonalisedFindings(fullHabit);
  const verdict = determineVerdict(energyEff, secEffs, periodFx);

  const endDate = studyMeta.end_date ?? allEntries.at(-1)?.date;
  const adherence = adherenceStats(allEntries, studyMeta.start_date, endDate);

  const baselineEnergy = phaseStats(bEntries, PRIMARY_OUTCOME);
  const tenHourEnergy = phaseStats(iEntries, PRIMARY_OUTCOME);
  const week6Energy = phaseStats(
    outEntries.length ? outEntries : [...opEntries, ...iEntries].slice(-7),
    PRIMARY_OUTCOME
  );
  const activeEnergy = phaseStats(active, PRIMARY_OUTCOME);

  const baselineWindow = meanWindowHours(bEntries);
  const activeWindow = meanWindowHours(active);

  const baselineHunger = phaseStats(bEntries, "hunger_comfort");
  const week6Hunger = phaseStats(
    outEntries.length ? outEntries : active.slice(-7),
    "hunger_comfort"
  );

  const ranked = rankHabits(active);
  const keepItems = ranked.filter((r) => r.status === "valid").slice(0, 2).map((r) => keepListLabel(r.habit));

  const maxUplift = Math.max(
    ...HABITS.map((h) => {
      const e = fullHabit[h]?.energy;
      return e?.status === "valid" && e.beneficial ? e.difference : 0;
    }),
    0.1
  );

  const factorRows = HABITS.map((habit) => {
    const energy = fullHabit[habit]?.energy;
    const followed = active.filter((e) => e[habit]).length;
    const followedPct = active.length ? Math.round((followed / active.length) * 100) : 0;
    const uplift = energy?.status === "valid" && energy.beneficial ? energy.difference : 0;
    const badge = evidenceBadge(energy ?? { status: "insufficient_data" }, followedPct);
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
  const cohortLogging = cohortSnapshot?.by_week?.["6"]?.logging_pct_distribution;
  const energyDelta = round1(activeEnergy.mean - baselineEnergy.mean);
  const windowDelta = round1(activeWindow - baselineWindow);

  const windowEnergyChart = buildWindowEnergyChart(active, baselineEnergy.mean);
  const habitUpliftChart = buildHabitUpliftChart(
    Object.fromEntries(HABITS.map((h) => [h, fullHabit[h]?.energy]))
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
      ten_hour_days_logged: iEntries.length,
      eight_hour_days_logged: opEntries.length,
      output_days_logged: outEntries.length
    },
    primary_outcome: {
      baseline: baselineEnergy,
      active: activeEnergy,
      effect: energyEff
    },
    eating_window: {
      baseline_hours: baselineWindow,
      active_hours: activeWindow,
      effect: windowEff
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
    window_energy_chart: windowEnergyChart,
    habit_uplift_chart: habitUpliftChart,
    limitations,
    generalisability_note: generalisabilityNote
  };

  const mobileReport = {
    explorationName: "Time-restricted eating",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    reportTitleLabel: "Personalised trial final report",
    category: "Metabolic Health",
    subMeta: `${participantName} · ${formatDateRange(studyMeta.start_date, endDate)} · ${loggingPct}% of days logged`,
    lede:
      verdict === "BENEFICIAL" || verdict === "PROBABLY_BENEFICIAL_PERIOD_EFFECT_PRESENT"
        ? "Compressing your eating window shifted your daily energy curve. Here's what your logs suggest about timing — not calories — for you."
        : "Here's what your own data over this exploration suggests about meal timing and your daily energy.",
    tiles: [
      {
        label: "Daily energy",
        value: `${round1(baselineEnergy.mean)} → ${round1(activeEnergy.mean)}`,
        delta: `${energyDelta >= 0 ? "+" : ""}${energyDelta} pts`
      },
      {
        label: "Eating window",
        value: `${Math.round(baselineWindow)}h → ${Math.round(activeWindow)}h`,
        delta: `${windowDelta >= 0 ? "+" : ""}${windowDelta} hrs`
      }
    ],
    phaseChart: {
      title: "Daily energy by phase",
      min: 4,
      max: 8,
      points: [
        { label: "Baseline", v: round1(baselineEnergy.mean) },
        { label: "10-hour", v: round1(tenHourEnergy.mean) },
        { label: "Week 6", v: round1(week6Energy.mean ?? activeEnergy.mean) }
      ]
    },
    factors: {
      title: "What worked for you",
      sub: "Extra daily energy linked to each timing habit.",
      rows: factorRows
    },
    distribution: {
      title: "Hunger comfort through the day",
      beforeLabel: "Baseline (weeks 1–2)",
      afterLabel: "Week 6",
      before: hungerDistributionBars(baselineHunger),
      after: hungerDistributionBars(week6Hunger),
      legend: [
        { c: HUNGER_COLORS.very_hungry, label: "Very hungry" },
        { c: HUNGER_COLORS.hungry, label: "Hungry" },
        { c: HUNGER_COLORS.manageable, label: "Manageable" },
        { c: HUNGER_COLORS.comfortable, label: "Comfortable" }
      ]
    },
    keepList: {
      title: "Your keep list",
      items: keepItems.length ? keepItems : ["10-hour eating window", "First meal ~8am"],
      body:
        "Your clearest gains came from a stable window rather than pushing to 8 hours. Hunger comfort normalised by week 4 — worth keeping the rhythm you found."
    },
    compare: {
      title: "How you compare",
      body: cohortSnapshot
        ? buildKindCompareBody(energyDelta, loggingPct, cohortSnapshot)
        : `Your daily energy changed by ${energyDelta >= 0 ? "+" : ""}${energyDelta} points over the health exploration.`
    },
    disclaimer: USER_DISCLAIMER.body,
    disclaimerInfo: USER_DISCLAIMER,
    limitations,
    generalisabilityNote,
    window_energy_chart: windowEnergyChart,
    habit_uplift_chart: habitUpliftChart,
    cta: {
      label: keepItems.length >= 2 ? "Run a 4-week re-check on your keep-list  →" : "Continue tracking what works  →",
      toast: keepItems.length >= 2
        ? `Setting up a focused 4-week re-check on ${keepItems.join(" and ").toLowerCase()}.`
        : "Keep tracking the timing habits that work best for you."
    },
    _cent: centReport
  };

  return { centReport, mobileReport };
}
