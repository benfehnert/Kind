import {
  PRIMARY_OUTCOME,
  SECONDARY_OUTCOMES,
  RULES,
  RULE_LABELS,
  RULE_ICONS,
  CRASH_COLORS,
  MIN_BASELINE_DAYS,
  MIN_ENDOFSTUDY_ACTIVE_DAYS,
  HEALTH_EXPLORATION_LABEL,
  USER_DISCLAIMER
} from "../constants.js";
import {
  phaseStats,
  effectSize,
  ruleAnalysis,
  stackingAnalysis,
  adherenceStats,
  periodEffectCheck,
  adverseEffectCheck,
  rankRules,
  percentileRank
} from "../stats.js";
import {
  buildLimitations,
  buildPersonalisedFindings,
  determineVerdict,
  formatDateRange,
  round1,
  buildKindCompareBody
} from "../helpers.js";
import { buildMorningRulesEnergyChart, buildRuleUpliftChart } from "../charts.js";
import { generateInsufficientDataReport } from "./insufficient.js";
import { buildMorningRulesMobileView } from "./mobileView.js";
import { resolveAnalysisThresholds } from "../../shared/mobileView.js";
import { getExplorationTheme } from "../../../explorationThemes.js";

const theme = getExplorationTheme("morning-rules");

function evidenceBadge(ruleResult, followedPct) {
  if (ruleResult.status !== "valid") return "Insufficient data";
  const abs = ruleResult.abs_effect ?? Math.abs(ruleResult.difference ?? 0);
  if (abs >= 1.5 && followedPct >= 60) return `Strong evidence · ${followedPct}% of days`;
  if (abs >= 0.8 && followedPct >= 45) return `Moderate–strong · ${followedPct}% of days`;
  if (abs >= 0.5) return `Moderate · ${followedPct}% of days`;
  return "Experimental · too small to call";
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

function distributionBars(stats) {
  if (!stats?.distribution) return [{ w: 25, c: CRASH_COLORS.none }, { w: 25, c: CRASH_COLORS.mild_dip }, { w: 25, c: CRASH_COLORS.noticeable }, { w: 25, c: CRASH_COLORS.severe }];
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

export function generateFinalReport(allEntries, studyMeta, cohortSnapshot = null, options = {}) {
  const bEntries = allEntries.filter((e) => e.phase === "BASELINE" && e.valid_for_analysis);
  const iEntries = allEntries.filter((e) => e.phase === "INTERVENTION" && e.valid_for_analysis);
  const opEntries = allEntries.filter((e) => e.phase === "OPTIMISE" && e.valid_for_analysis);
  const active = [...iEntries, ...opEntries];
  const thresholds = resolveAnalysisThresholds(options.isShort ?? false, {
    MIN_BASELINE_DAYS,
    MIN_ENDOFSTUDY_ACTIVE_DAYS
  });

  if (bEntries.length < thresholds.MIN_BASELINE_DAYS || active.length < thresholds.MIN_ENDOFSTUDY_ACTIVE_DAYS) {
    return generateInsufficientDataReport(
      "FINAL",
      bEntries.length,
      thresholds.MIN_ENDOFSTUDY_ACTIVE_DAYS,
      allEntries.filter((e) => e.valid_for_analysis),
      { studyMeta, isShort: options.isShort ?? false, cohortSnapshot }
    );
  }

  const crashEff = effectSize(
    phaseStats(bEntries, PRIMARY_OUTCOME),
    phaseStats(active, PRIMARY_OUTCOME),
    PRIMARY_OUTCOME
  );
  const secEffs = Object.fromEntries(
    SECONDARY_OUTCOMES.map((o) => [
      o,
      effectSize(phaseStats(bEntries, o), phaseStats(active, o), o)
    ])
  );

  const fullRule = Object.fromEntries(
    RULES.map((r) => [
      r,
      {
        primary: ruleAnalysis(active, r, PRIMARY_OUTCOME),
        energy: ruleAnalysis(active, r, "afternoon_energy"),
        focus: ruleAnalysis(active, r, "afternoon_focus")
      }
    ])
  );

  const stackingFinal = stackingAnalysis(active, "afternoon_energy");
  const weekly8 = {};
  for (let w = 1; w <= 8; w += 1) {
    weekly8[w] = phaseStats(allEntries.filter((e) => e.study_week === w), "afternoon_energy");
  }

  const periodFx = periodEffectCheck(allEntries, "afternoon_energy");
  const adverse = adverseEffectCheck(bEntries, iEntries);
  const personalised = buildPersonalisedFindings(fullRule);
  const verdict = determineVerdict(crashEff, secEffs, periodFx);

  const endDate = studyMeta.end_date ?? allEntries.at(-1)?.date;
  const adherence = adherenceStats(allEntries, studyMeta.start_date, endDate);

  const baselineEnergy = phaseStats(bEntries, "afternoon_energy");
  const interventionEnergy = phaseStats(iEntries, "afternoon_energy");
  const optimiseEnergy = phaseStats(opEntries, "afternoon_energy");
  const activeEnergy = phaseStats(active, "afternoon_energy");

  const baselineCrash = phaseStats(bEntries, PRIMARY_OUTCOME);
  const activeCrash = phaseStats(active, PRIMARY_OUTCOME);

  const ranked = rankRules(active);
  const keepItems = ranked.filter((r) => r.status === "valid").slice(0, 2).map((r) => RULE_LABELS[r.rule]);

  const maxUplift = Math.max(
    ...RULES.map((r) => {
      const e = fullRule[r]?.energy;
      return e?.status === "valid" && e.beneficial ? e.difference : 0;
    }),
    0.1
  );

  const factorRows = RULES.map((rule) => {
    const energy = fullRule[rule]?.energy;
    const followed = active.filter((e) => e[rule]).length;
    const followedPct = active.length ? Math.round((followed / active.length) * 100) : 0;
    const uplift = energy?.status === "valid" && energy.beneficial ? energy.difference : 0;
    const badge = evidenceBadge(energy ?? { status: "insufficient_data" }, followedPct);
    const colors = badgeColors(badge);
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

  const participantName = studyMeta.participant_name ?? "You";
  const loggingPct = adherence.logging_pct;
  const cohortLogging = cohortSnapshot?.by_week?.[8]?.logging_pct_distribution;
  const cohortPct = cohortLogging ? percentileRank(loggingPct, cohortLogging) : null;

  const energyDelta = round1(activeEnergy.mean - baselineEnergy.mean);
  const beforeCrashPct = realCrashPct(baselineCrash);
  const afterCrashPct = realCrashPct(activeCrash);

  const morningRulesEnergyChart = buildMorningRulesEnergyChart(active, baselineEnergy.mean);
  const ruleUpliftChart = buildRuleUpliftChart(
    Object.fromEntries(RULES.map((r) => [r, fullRule[r]?.energy]))
  );
  const limitations = buildLimitations(adherence, periodFx, bEntries, active);
  const generalisabilityNote =
    "These findings reflect your individual response over this 8-week period. Results may differ in other seasons, life phases, or if repeated. They are personal insights, not medical conclusions.";

  const centReport = {
    type: "FINAL_STUDY_COMPLETE",
    reportTitle: "Personalised trial final report",
    explorationLabel: HEALTH_EXPLORATION_LABEL,
    generated: new Date().toISOString(),
    study_summary: {
      total_days_logged: allEntries.length,
      baseline_days_logged: bEntries.length,
      intervention_days_logged: iEntries.length,
      optimise_days_logged: opEntries.length
    },
    primary_outcome: {
      baseline: baselineCrash,
      active: activeCrash,
      effect: crashEff
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
    full_rule_analysis: fullRule,
    stacking_final: stackingFinal,
    weekly_8_trend: weekly8,
    period_effect: periodFx,
    adverse_check: adverse,
    personalised_findings: personalised,
    overall_verdict: verdict,
    morning_rules_energy_chart: morningRulesEnergyChart,
    rule_uplift_chart: ruleUpliftChart,
    limitations,
    generalisability_note: generalisabilityNote
  };

  const mobileReport = {
    ...buildMorningRulesMobileView({
      reportType: "FINAL_STUDY_COMPLETE",
      allEntries,
      studyMeta,
      cohortSnapshot,
      isShort: options.isShort ?? false,
      limitations,
      keepList: {
        title: "Your keep list",
        items: keepItems.length ? keepItems : ["Morning sunlight"],
        body:
          keepItems.length >= 2
            ? "These two tracked most closely with your better afternoons. Worth keeping. You can park meditation and the caffeine delay, or revisit them later."
            : "Keep logging the morning rules that track with your better afternoons."
      }
    }),
    morning_rules_energy_chart: morningRulesEnergyChart,
    rule_uplift_chart: ruleUpliftChart,
    _cent: centReport
  };

  return { centReport, mobileReport };
}
