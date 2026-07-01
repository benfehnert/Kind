import { loadDayEntries } from "./normalize.js";
import {
  phaseStats,
  effectSize,
  ruleAnalysis,
  stackingAnalysis,
  adherenceStats,
  rankRules
} from "./stats.js";
import { PRIMARY_OUTCOME, SECONDARY_OUTCOMES, RULES } from "./constants.js";
import { round1 } from "./helpers.js";

function energyToBarHeight(energy) {
  return Math.max(4, Math.min(100, Math.round(Number(energy) * 10)));
}

function formatEnergy(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function buildInsightViewsFromEntries(entries, run) {
  if (!entries.length) return null;

  const weekCurrent = run?.week_current ?? entries.at(-1)?.study_week ?? 1;
  const studyStart = run?.started_at ?? entries[0].date;

  const weekly = {};
  for (let w = 1; w <= 8; w += 1) {
    weekly[w] = phaseStats(
      entries.filter((e) => e.study_week === w),
      "afternoon_energy"
    );
  }

  const energyTrend = {
    cardTitle: "Afternoon energy over time",
    chartHint: "Avg. afternoon energy by week",
    bars: [],
    labels: []
  };
  for (let w = 1; w <= Math.min(weekCurrent, 8); w += 1) {
    if (weekly[w]?.mean != null) {
      energyTrend.bars.push({ h: energyToBarHeight(weekly[w].mean), v: formatEnergy(weekly[w].mean) });
      energyTrend.labels.push(`Wk ${w}`);
    }
  }

  const recent = entries.slice(-7);
  const rulesChart = {
    cardTitle: "Morning rules vs afternoon energy",
    chartHint: "Days with 3+ rules (green) vs fewer rules (orange)",
    bars: recent.map((row) => ({
      h: row.afternoon_energy != null ? energyToBarHeight(row.afternoon_energy) : 4,
      crash: row.rule_count < 3
    })),
    legend: [
      { label: "3+ morning rules", crash: false },
      { label: "Fewer rules", crash: true }
    ]
  };

  const rows = [];
  const baseline = entries.filter((e) => e.phase === "BASELINE");
  const active = entries.filter((e) => e.phase === "INTERVENTION" || e.phase === "OPTIMISE");

  if (baseline.length >= 3 && active.length >= 3) {
    const bEnergy = phaseStats(baseline, "afternoon_energy").mean;
    const aEnergy = phaseStats(active, "afternoon_energy").mean;
    if (bEnergy != null && aEnergy != null && aEnergy > bEnergy + 0.3) {
      rows.push({
        tone: "+",
        title: "Afternoon energy rising",
        body: `Your afternoon energy is ${round1(aEnergy - bEnergy)} points higher than in your baseline period.`
      });
    }
  }

  const stacking = stackingAnalysis(entries.filter((e) => e.phase !== "BASELINE"), "afternoon_energy");
  const high = stacking[3]?.mean ?? stacking[4]?.mean;
  const low = stacking[0]?.mean ?? stacking[1]?.mean;
  if (high != null && low != null && high - low >= 0.5) {
    rows.push({
      tone: "+",
      title: "Rule stacking helps",
      body: `Days with 3+ morning rules show ${round1(high - low)} points higher afternoon energy on average.`
    });
  }

  const sunEnergy = ruleAnalysis(active, "sunlight", "afternoon_energy");
  const stretchEnergy = ruleAnalysis(active, "stretching", "afternoon_energy");
  if (
    sunEnergy.status === "valid" &&
    stretchEnergy.status === "valid" &&
    sunEnergy.difference >= 0.3 &&
    stretchEnergy.difference >= 0.3
  ) {
    rows.push({
      tone: "+",
      title: "Sunlight + stretching pair well",
      body: `Days with sunlight show ${round1(sunEnergy.difference)} points higher afternoon energy on average.`
    });
  }

  const bCrash = phaseStats(baseline, PRIMARY_OUTCOME);
  const aCrash = phaseStats(active, PRIMARY_OUTCOME);
  if (bCrash.distribution && aCrash.distribution) {
    const bBurden = bCrash.distribution.noticeable + bCrash.distribution.severe;
    const aBurden = aCrash.distribution.noticeable + aCrash.distribution.severe;
    if (bBurden > aBurden + 0.1) {
      rows.push({
        tone: "+",
        title: "Fewer crashes",
        body: `Noticeable or severe afternoon crashes dropped from ${Math.round(bBurden * 100)}% of baseline days to ${Math.round(aBurden * 100)}% during active phases.`
      });
    }
  }

  const ranked = rankRules(active);
  const caffeineTested = active.some((e) => e.caffeine_offset);
  if (!caffeineTested) {
    rows.push({
      tone: "!",
      title: "Caffeine offset untested",
      body: `You haven't logged delayed caffeine yet — worth trying in week ${weekCurrent + 1}.`
    });
  }

  const endDate = entries.at(-1).date;
  const adherenceRaw = adherenceStats(entries, studyStart, endDate);
  const totalDays = entries.length;
  const weekLogs = entries.filter((e) => e.study_week === weekCurrent).length;
  const weekPct = Math.min(100, Math.round((weekLogs / 7) * 100));
  const overallPct = Math.min(100, Math.round(adherenceRaw.logging_pct));

  return {
    energyTrend,
    rulesChart,
    observations: {
      cardTitle: "Key observations",
      rows: rows.length
        ? rows.slice(0, 5)
        : [
            {
              tone: "!",
              title: "Patterns forming",
              body: "Keep logging — clearer observations appear as your check-in history grows."
            }
          ]
    },
    adherence: {
      cardTitle: "Exploration adherence",
      weekLabel: "This week",
      weekPct: `${weekPct}%`,
      overallLabel: `Overall (${totalDays} day${totalDays === 1 ? "" : "s"})`,
      overallPct: `${overallPct}%`
    }
  };
}

export function buildInsightViewsFromLogs(logs, run) {
  const studyStart = run?.started_at ?? logs[0]?.log_date;
  const entries = loadDayEntries(logs, studyStart);
  return buildInsightViewsFromEntries(entries, run);
}
