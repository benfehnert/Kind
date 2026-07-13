import {
  PRIMARY_OUTCOME,
  SECONDARY_OUTCOMES,
  RULES,
  RULE_LABELS,
  MIN_INTERVENTION_DAYS,
  HEALTH_EXPLORATION_LABEL
} from "../constants.js";
import {
  phaseStats,
  effectSize,
  ruleAnalysis,
  stackingAnalysis,
  adherenceStats,
  periodEffectCheck,
  adverseEffectCheck,
  rankRules
} from "../stats.js";
import {
  buildLimitations,
  buildHealthExplorationHeadline,
  buildOptimiseGuidance,
  round1
} from "../helpers.js";
import { buildMorningRulesEnergyChart, buildRuleUpliftChart } from "../charts.js";
import { generateInsufficientDataReport } from "./insufficient.js";
import { buildMorningRulesMobileViewForReport } from "./mobileView.js";
import { resolveAnalysisThresholds } from "../../shared/mobileView.js";

function realCrashPct(stats) {
  if (!stats?.distribution) return null;
  return Math.round((stats.distribution.noticeable + stats.distribution.severe) * 100);
}

export function generateInterventionReport(baselineEntries, interventionEntries, studyMeta, options = {}) {
  const bValid = baselineEntries.filter((e) => e.valid_for_analysis);
  const iValid = interventionEntries.filter((e) => e.valid_for_analysis);

  const thresholds = resolveAnalysisThresholds(options.isShort ?? false, { MIN_INTERVENTION_DAYS });

  if (iValid.length < thresholds.MIN_INTERVENTION_DAYS) {
    return generateInsufficientDataReport("INTERVENTION_INTERIM", iValid.length, thresholds.MIN_INTERVENTION_DAYS, iValid, {
      studyMeta,
      isShort: options.isShort ?? false
    });
  }

  const baselineEnergyMean = phaseStats(bValid, "afternoon_energy").mean;
  const baselineCrashStats = phaseStats(bValid, PRIMARY_OUTCOME);
  const interventionCrashStats = phaseStats(iValid, PRIMARY_OUTCOME);
  const beforeCrashPct = realCrashPct(baselineCrashStats);
  const afterCrashPct = realCrashPct(interventionCrashStats);
  const crashEff = effectSize(
    baselineCrashStats,
    interventionCrashStats,
    PRIMARY_OUTCOME
  );
  const secEffs = Object.fromEntries(
    SECONDARY_OUTCOMES.map((o) => [
      o,
      effectSize(phaseStats(bValid, o), phaseStats(iValid, o), o)
    ])
  );

  const ruleCrash = Object.fromEntries(
    RULES.map((r) => [r, ruleAnalysis(iValid, r, PRIMARY_OUTCOME)])
  );
  const ruleEnergy = Object.fromEntries(
    RULES.map((r) => [r, ruleAnalysis(iValid, r, "afternoon_energy")])
  );

  const stackingCrash = stackingAnalysis(iValid, PRIMARY_OUTCOME);
  const stackingEnergy = stackingAnalysis(iValid, "afternoon_energy");

  const weekly = {};
  for (let w = 1; w <= 5; w += 1) {
    weekly[w] = phaseStats(
      [...bValid, ...iValid].filter((e) => e.study_week === w),
      "afternoon_energy"
    );
  }

  const periodFx = periodEffectCheck([...bValid, ...iValid], "afternoon_energy");
  const earlyB = iValid.slice(0, 3);
  const lateB = iValid.slice(3);
  const earlyMean = phaseStats(earlyB, PRIMARY_OUTCOME).mean;
  const lateMean = phaseStats(lateB, PRIMARY_OUTCOME).mean;
  const carryover = {
    early_mean: earlyMean,
    late_mean: lateMean,
    note:
      earlyMean !== null && lateMean !== null && Math.abs(earlyMean - lateMean) > 0.5
        ? "An initial adaptation period may be present in the first few days of the Morning rules phase"
        : null
  };

  const adverse = adverseEffectCheck(bValid, iValid);
  const rankedRules = rankRules(iValid);
  const top2Rules = rankedRules.filter((r) => r.status === "valid").slice(0, 2).map((r) => r.rule);
  const top2Labels = top2Rules.map((r) => RULE_LABELS[r]);

  const endDate = studyMeta.intervention_end_date ?? iValid.at(-1)?.date;
  const adherence = adherenceStats([...baselineEntries, ...interventionEntries], studyMeta.start_date, endDate);

  const morningRulesEnergyChart = buildMorningRulesEnergyChart(iValid, baselineEnergyMean);
  const ruleUpliftChart = buildRuleUpliftChart(ruleEnergy);

  const report = {
    type: "INTERVENTION_INTERIM",
    reportTitle: "Health exploration interim report",
    phaseLabel: "Morning rules",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    primary_effect: crashEff,
    secondary_effects: secEffs,
    rule_crash: ruleCrash,
    rule_energy: ruleEnergy,
    stacking_crash: stackingCrash,
    stacking_energy: stackingEnergy,
    morning_rules_energy_chart: morningRulesEnergyChart,
    rule_uplift_chart: ruleUpliftChart,
    weekly_trend: weekly,
    period_effect: periodFx,
    carryover,
    adverse_check: adverse,
    adherence,
    optimise_rules: top2Rules,
    optimise_rule_labels: top2Labels,
    optimise_guidance: buildOptimiseGuidance(top2Rules),
    limitations: buildLimitations(adherence, periodFx, bValid, iValid),
    headline: buildHealthExplorationHeadline(crashEff, secEffs, rankedRules),
    summary_tiles: [
      {
        label: "Afternoon crash severity change",
        value:
          beforeCrashPct != null && afterCrashPct != null
            ? `${beforeCrashPct}% → ${afterCrashPct}%`
            : crashEff.crash_reduction_pct != null
              ? `${crashEff.crash_reduction_pct >= 0 ? "+" : ""}${round1(crashEff.crash_reduction_pct)} percentage points`
              : "—",
        note:
          beforeCrashPct != null && afterCrashPct != null
            ? `${afterCrashPct - beforeCrashPct >= 0 ? "+" : ""}${afterCrashPct - beforeCrashPct} percentage points`
            : crashEff.improved
              ? "Improved vs Baseline"
              : "Compared with Baseline"
      },
      {
        label: "Afternoon energy change",
        value:
          secEffs.afternoon_energy?.mean_diff != null && baselineEnergyMean != null
            ? `${round1(baselineEnergyMean)} → ${round1(baselineEnergyMean + secEffs.afternoon_energy.mean_diff)}`
            : secEffs.afternoon_energy?.mean_diff != null
              ? `${secEffs.afternoon_energy.mean_diff >= 0 ? "+" : ""}${round1(secEffs.afternoon_energy.mean_diff)} points`
              : baselineEnergyMean != null
                ? `${round1(baselineEnergyMean)}`
                : "—",
        note:
          secEffs.afternoon_energy?.mean_diff != null
            ? `${secEffs.afternoon_energy.mean_diff >= 0 ? "+" : ""}${round1(secEffs.afternoon_energy.mean_diff)} pts`
            : "Compared with Baseline average"
      }
    ]
  };

  return {
    ...report,
    mobileView: buildMorningRulesMobileViewForReport(report, {
      studyMeta,
      allEntries: [...baselineEntries, ...interventionEntries],
      isShort: options.isShort ?? false,
      cohortSnapshot: options.cohortSnapshot ?? null
    })
  };
}
