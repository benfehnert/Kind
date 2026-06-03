#!/usr/bin/env node
// Standalone CLI for the feed-content generator.
//
// Runs the engine against a sample (or supplied) user-log context and prints
// feed items in the same shape apps/mobile/mock-data/feed.json uses. Works with
// no OPENAI_API_KEY (deterministic templates); set the key to have the LLM
// rewrite the copy while obeying the library's tone & safety rules.
//
// Usage:
//   node scripts/generate-feed.mjs                 # built-in "rules phase" scenario
//   node scripts/generate-feed.mjs --scenario report
//   node scripts/generate-feed.mjs --context ./my-context.json
//   node scripts/generate-feed.mjs --pretty        # human-readable instead of JSON
//
// Scenarios: baseline | rules | optimise | report

import { readFileSync } from "node:fs";
import { generateFeedContent } from "../src/feedContent.js";
import { morningRulesFeedLibrary } from "../src/data/morningRulesFeedLibrary.js";

const args = process.argv.slice(2);
const getFlag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const hasFlag = (name) => args.includes(`--${name}`);

const SCENARIOS = {
  baseline: {
    label: "Baseline · Week 2",
    context: {
      phase: "baseline",
      week: 2,
      events: { baselineComplete: true, weekEnd: true },
      counts: { baselineLoggedDays: 11, loggedDays: 11, unloggedBaselineDays: 3 },
      aggregates: {
        am_energy_avg: 7.1,
        pm_energy_avg: 4.6,
        crash_days: 6,
        logged_days: 11,
        pm_energy_avg_baseline: 4.6,
        crash_pct_baseline: 55
      },
      adherence: { logged_days_pct: 79, streak_n: 7, phase_total_days: 14 }
    }
  },
  rules: {
    label: "Rules · Week 4 (halfway)",
    context: {
      phase: "rules",
      week: 4,
      events: { weekEnd: true, fullStackDay: true, halfway: true },
      counts: {
        loggedDays: 26,
        sunDays: 8,
        nosunDays: 5,
        moveDays: 7,
        nomoveDays: 6,
        medDays: 5,
        nomedDays: 8,
        caffeineDays: 6,
        stackDays: 4,
        ruleWeeks: 2
      },
      aggregates: {
        pm_energy_sun: 6.4,
        pm_energy_nosun: 4.8,
        focus_move: 6.9,
        focus_nomove: 5.4,
        pm_energy_med: 6.1,
        pm_energy_nomed: 5.2,
        crash_caffeine: 2,
        crash_nocaffeine: 5,
        pm_energy_stack: 6.8
      },
      adherence: {
        sunlight_pct: 62,
        movement_pct: 54,
        caffeine_pct: 46,
        meditation_pct: 38,
        rule_days: 5,
        logged_days_pct: 86,
        streak_n: 12
      },
      flags: { adherenceOutcomeOverlap: true },
      // Cohort present and above the privacy minimum -> comparisons surface.
      cohort: {
        size: 78,
        your_sun_effect: "+1.6 point",
        your_sun_effect_value: 1.6,
        sun_effect_benchmark: 1.0,
        your_rule_count: 3
      }
    }
  },
  optimise: {
    label: "Optimise · Week 7",
    context: {
      phase: "optimise",
      week: 7,
      events: { leadingRuleIdentified: true, crashFreeRun4: true, weekEnd: true, optimiseComplete: true },
      counts: { loggedDays: 45, severeCrashDays14: 1 },
      aggregates: { crash_pct_optimise: 22, crash_pct_baseline: 55 },
      outcomes: { best_rule: "morning sunlight", best_rule_uplift: 1.6 },
      adherence: { sunlight_pct: 71, movement_pct: 60, caffeine_pct: 40, meditation_pct: 33, rule_days: 6, logged_days_pct: 90, streak_n: 18 },
      cohort: { size: 78, your_rule_count: 2 }
    }
  },
  report: {
    label: "Report · Week 8",
    context: {
      phase: "report",
      week: 8,
      events: { reportReady: true, explorationComplete: true },
      counts: { loggedDays: 52 },
      aggregates: { pm_energy_avg_baseline: 4.6, pm_energy_avg_optimise: 6.7, crash_pct_baseline: 55, crash_pct_optimise: 20 },
      outcomes: {
        best_rule: "morning sunlight",
        second_rule: "morning movement",
        rule_1: "Sunlight",
        rule_2: "Movement",
        rule_3: "Meditation",
        rule_4: "Delayed caffeine"
      },
      adherence: { logged_days_pct: 88, top_rule: "sunlight", streak_n: 21 },
      cohort: { size: 78, user_improvement: 2.1 }
    }
  }
};

async function main() {
  const scenarioName = getFlag("scenario") || "rules";
  const contextPath = getFlag("context");

  let context;
  let label;
  if (contextPath) {
    context = JSON.parse(readFileSync(contextPath, "utf8"));
    label = `custom context (${contextPath})`;
  } else {
    const scenario = SCENARIOS[scenarioName];
    if (!scenario) {
      console.error(`Unknown scenario "${scenarioName}". Options: ${Object.keys(SCENARIOS).join(", ")}`);
      process.exit(1);
    }
    context = scenario.context;
    label = scenario.label;
  }

  const result = await generateFeedContent({
    exploration: {
      id: "morning-rules",
      title: "Do morning rules reduce my chances of an afternoon crash?",
      feedLabel: "Morning rules & afternoon energy",
      bg: "#FDF0E4",
      text: "#8A4A1A"
    },
    context,
    library: morningRulesFeedLibrary,
    limit: Number(getFlag("limit") || 12),
    model: getFlag("model")
  });

  if (hasFlag("pretty")) {
    console.log(`\nScenario: ${label}`);
    console.log(
      `Generator: ${result.meta.generator}${result.meta.model ? ` (${result.meta.model})` : ""} · fired ${result.meta.firedCount} · returned ${result.meta.returnedCount} · cohort eligible: ${result.meta.cohortEligible}`
    );
    if (result.meta.unresolvedTokens.length) {
      console.log(`Unresolved tokens: ${result.meta.unresolvedTokens.join(", ")}`);
    }
    console.log("");
    for (const it of result.items) {
      console.log(`[${it._meta.ruleId}] ${it.badgeLabel} · ${it._meta.contentArea}${it._meta.evidence ? ` · evidence: ${it._meta.evidence}` : ""}`);
      console.log(`  ${it.body}`);
      if (it.highlight) console.log(`  ↳ ${it.highlight}`);
      console.log("");
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
