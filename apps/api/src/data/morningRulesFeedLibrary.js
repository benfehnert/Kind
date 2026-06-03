// Feed content library for the "Morning rules & afternoon energy" exploration.
//
// This is a faithful encoding of the Morning Routines Feed Content Library
// (8-week exploration). It is consumed by the feed-content engine in
// ../feedContent.js, which evaluates each item's `fires(context)` trigger,
// resolves {tokens} from the user's logs, and (optionally) rewrites the copy
// with an LLM while obeying the tone & safety guidance below.
//
// Content areas: personal_insight | comparison | milestone | adherence
// Phases:        baseline (wks 1-2) | rules (wks 3-5) | optimise (wks 6-7) | report (wk 8)

// Token key — pulled from the user's daily logs and rolling aggregates.
// Documented here so the engine can warn on unresolved tokens and so authors
// of new libraries know which values the engine knows how to derive.
export const TOKEN_KEY = {
  daily: ["am_energy", "pm_energy", "pm_focus", "crash_level"],
  rollingAverages: [
    "am_energy_avg",
    "pm_energy_avg",
    "pm_focus_avg",
    "pm_energy_avg_baseline",
    "pm_energy_avg_rules",
    "pm_energy_avg_optimise"
  ],
  gapsAndCrashes: [
    "energy_gap",
    "crash_days",
    "logged_days",
    "crash_pct_baseline",
    "crash_pct_optimise",
    "crash_free_pct"
  ],
  perRuleSplit: [
    "pm_energy_sun",
    "pm_energy_nosun",
    "focus_move",
    "focus_nomove",
    "pm_energy_med",
    "pm_energy_nomed",
    "crash_caffeine",
    "crash_nocaffeine",
    "pm_energy_stack",
    "stack_days",
    "caffeine_days"
  ],
  adherence: [
    "sunlight_pct",
    "movement_pct",
    "caffeine_pct",
    "meditation_pct",
    "rule_days",
    "logged_days_pct",
    "streak_n",
    "phase_total_days",
    "top_rule",
    "high_adherence_weeks"
  ],
  outcomes: ["best_rule", "best_rule_uplift", "second_rule", "rule_1", "rule_2", "rule_3", "rule_4"],
  // Cohort numbers are illustrative placeholders — wire to real group aggregates
  // and only surface once the cohort is large enough to protect privacy.
  cohort: [
    "percentile",
    "your_sun_effect",
    "user_crash_distribution",
    "your_rule_count",
    "user_improvement",
    // directional choice tokens the engine derives from user-vs-cohort numbers
    "consistency_vs_group",
    "sun_effect_vs_group",
    "baseline_room",
    "stack_vs_group",
    "improvement_vs_group"
  ]
};

// Tone & safety guidance — applies to every generated item. Passed verbatim to
// the LLM system prompt so generated copy stays on-message.
export const TONE = [
  "Association, not causation. Use phrases like \"tracked with\", \"tended to\", \"linked to\", \"on the days you…\" — never claim \"X caused Y\". An n=1 self-experiment surfaces personal patterns, not proof.",
  "Hedge by evidence strength. Sunlight (strong) can be stated most confidently; movement (moderate-strong) next; meditation (moderate) softer; caffeine offsetting (mechanistic/experimental) the most cautiously — always flag caffeine as experimental.",
  "No shame for low adherence or low scores. A missed day or low score is data, not a failing. Always pair a \"below\" comparison with something encouraging.",
  "Don't catastrophise crashes. Keep the tone curious and light — the afternoon dip is partly normal biology.",
  "Privacy in comparisons. Suppress cohort comparisons until the group is large enough that no individual is identifiable; never expose another user's data.",
  "Keep copy concise (1-3 sentences). Preserve every number supplied in the draft; never invent statistics."
];

// Medical safeguard — supportive signposting, not diagnosis.
export const SAFETY = {
  severeCrash: {
    firesWhen: "user logs Severe afternoon crashes on >= 5 days within any rolling 2-week window",
    fires: (c) => (c.counts?.severeCrashDays14 ?? 0) >= 5,
    copy:
      "You've logged several severe afternoon crashes lately. Morning routines help many people, but ongoing heavy fatigue can have causes worth checking — if it keeps up, it's reasonable to mention it to a GP or doctor."
  }
};

// Minimum cohort size before any comparison item is allowed to surface.
export const COHORT_MIN = 50;

// Cohort reference figures (illustrative — replace with live aggregates).
export const COHORT_REFERENCE = {
  logging_pct: 78,
  sunlight_followed_pct: 64,
  meditation_followed_pct: 38,
  sunlight_crash_reduction_pct: 18,
  avg_improvement_points: 1.1
};

// The feed items. `fires` receives the resolved context (see feedContent.js).
// `evidence` drives how confidently the copy may be phrased.
export const ITEMS = [
  // ---- Phase 1 — Baseline (Weeks 1-2) -------------------------------------
  {
    id: "B1",
    area: "personal_insight",
    phase: "baseline",
    firesWhen: "first log of the exploration",
    fires: (c) => Boolean(c.events?.firstLog),
    once: true,
    copy:
      "Welcome to your energy exploration. For the next two weeks, change nothing — just log your mornings and afternoons honestly. We're building your personal baseline, and a real, messy picture beats a tidy, aspirational one. The rules come later."
  },
  {
    id: "B2",
    area: "personal_insight",
    phase: "baseline",
    firesWhen: "first entry where crash = Mild dip / Noticeable / Severe",
    fires: (c) => Boolean(c.events?.firstCrash),
    once: true,
    copy:
      "You logged a {crash_level} this afternoon. That's exactly the kind of moment we're here to map. The 1–3pm dip is partly built into your body clock — these weeks are about seeing how much of it is actually movable for you."
  },
  {
    id: "B3",
    area: "personal_insight",
    phase: "baseline",
    firesWhen: ">= 5 daily logs in baseline",
    fires: (c) => c.phase === "baseline" && (c.counts?.baselineLoggedDays ?? 0) >= 5,
    copy:
      "So far your mornings average {am_energy_avg}/10 and your afternoons {pm_energy_avg}/10 — a gap of {energy_gap} points. That drop-off is the number to beat once the morning rules begin."
  },
  {
    id: "B4",
    area: "personal_insight",
    phase: "baseline",
    firesWhen: ">= 7 logs",
    fires: (c) => c.phase === "baseline" && (c.counts?.baselineLoggedDays ?? 0) >= 7,
    copy:
      "In your first week you logged a noticeable or worse crash on {crash_days} of {logged_days} days. Nothing to fix yet — naming the pattern is the whole point of this phase."
  },
  {
    id: "B5",
    area: "adherence",
    phase: "baseline",
    firesWhen: ">= 2 unlogged days in baseline",
    fires: (c) => c.phase === "baseline" && (c.counts?.unloggedBaselineDays ?? 0) >= 2,
    copy:
      "A couple of days slipped by unlogged — completely normal. Even a quick tap on the sliders keeps your baseline sharp. No need to be perfect, just roughly regular."
  },
  {
    id: "B6",
    area: "milestone",
    phase: "baseline",
    firesWhen: "end of Day 14 / baseline phase closes",
    fires: (c) => Boolean(c.events?.baselineComplete),
    once: true,
    copy:
      "Baseline locked in. Over two weeks your afternoon energy averaged {pm_energy_avg_baseline}/10, with a crash on {crash_pct_baseline}% of days. This is your before picture — every rule you try from here gets measured against it."
  },

  // ---- Phase 2 — Morning rules (Weeks 3-5) --------------------------------
  {
    id: "R1",
    area: "personal_insight",
    phase: "rules",
    firesWhen: "start of Week 3",
    fires: (c) => Boolean(c.events?.rulesKickoff) || (c.phase === "rules" && c.week === 3),
    once: true,
    copy:
      "Time to experiment. From today, try the four morning rules and tick the ones you manage — sunlight, movement, delayed caffeine, meditation. You don't need all four. We're looking for the ones that actually change your afternoons."
  },
  {
    id: "R2",
    area: "personal_insight",
    phase: "rules",
    evidence: "strong",
    note: "Sunlight is the strongest-evidence rule; fine to state its effect a little more confidently than the others.",
    firesWhen: ">= 4 sunlight days and >= 4 non-sunlight days logged",
    fires: (c) => (c.counts?.sunDays ?? 0) >= 4 && (c.counts?.nosunDays ?? 0) >= 4,
    copy:
      "Early pattern: on days you caught morning sunlight, your afternoon energy averaged {pm_energy_sun}/10 versus {pm_energy_nosun}/10 without it. Sunlight has the strongest evidence of the four for flattening the afternoon dip — and your own data is starting to test that."
  },
  {
    id: "R3",
    area: "personal_insight",
    phase: "rules",
    evidence: "moderate-strong",
    firesWhen: ">= 4 movement days and >= 4 non-movement days",
    fires: (c) => (c.counts?.moveDays ?? 0) >= 4 && (c.counts?.nomoveDays ?? 0) >= 4,
    copy:
      "On your morning-movement days, afternoon focus came in at {focus_move}/10 vs {focus_nomove}/10. Light morning movement is thought to amplify your natural morning cortisol rise — which tends to show up later as steadier focus."
  },
  {
    id: "R4",
    area: "personal_insight",
    phase: "rules",
    evidence: "mechanistic",
    note: "Always hedge caffeine offsetting — the most hypothesis-driven intervention. Flag it as experimental.",
    firesWhen: ">= 4 delayed-caffeine days",
    fires: (c) => (c.counts?.caffeineDays ?? 0) >= 4,
    copy:
      "You've delayed your first coffee on {caffeine_days} days. Heads up — this is the most experimental of the four: the mechanism is plausible but the direct human evidence is thin, so treat your own numbers as the real test. So far: {crash_caffeine} crashes on delay days vs {crash_nocaffeine} on regular days."
  },
  {
    id: "R5",
    area: "personal_insight",
    phase: "rules",
    evidence: "moderate",
    firesWhen: ">= 4 meditation days and >= 4 non-meditation days",
    fires: (c) => (c.counts?.medDays ?? 0) >= 4 && (c.counts?.nomedDays ?? 0) >= 4,
    copy:
      "On meditation mornings your afternoon energy looks higher — {pm_energy_med}/10 vs {pm_energy_nomed}/10. A short morning practice is linked to a steadier nervous system through the day."
  },
  {
    id: "R6",
    area: "personal_insight",
    phase: "rules",
    firesWhen: ">= 3 days with 3+ rules followed",
    fires: (c) => (c.counts?.stackDays ?? 0) >= 3,
    copy:
      "On the {stack_days} days you stacked three or more rules, afternoon energy averaged {pm_energy_stack}/10 — your strongest grouping so far. The different pathways may be adding up. Worth watching."
  },
  {
    id: "R7",
    area: "personal_insight",
    phase: "rules",
    firesWhen: "rule data present but all rule-vs-no-rule differences < 1 point",
    fires: (c) =>
      c.phase === "rules" &&
      c.counts?.ruleVsNoRuleMaxDiff != null &&
      c.counts.ruleVsNoRuleMaxDiff < 1,
    copy:
      "No single rule is clearly pulling ahead yet — and that's a real finding, not a failure. Bodies differ. Keep logging; the signal often sharpens in the second half."
  },
  {
    id: "R8",
    area: "adherence",
    phase: "rules",
    firesWhen: "end of each rules-phase week",
    fires: (c) => c.phase === "rules" && Boolean(c.events?.weekEnd),
    copy:
      "This week you followed your rules on {rule_days} of 7 days. Whatever the number, it's the honest record that makes your Week 8 analysis worth reading."
  },

  // ---- Phase 3 — Optimise (Weeks 6-7) -------------------------------------
  {
    id: "O1",
    area: "personal_insight",
    phase: "optimise",
    firesWhen: "start of Week 6",
    fires: (c) => Boolean(c.events?.optimiseKickoff) || (c.phase === "optimise" && c.week === 6),
    once: true,
    copy:
      "Now narrow down. Keep the rule — or combo — that looked best for you and let the others go. These two weeks are about confirming whether your front-runner holds up under your full attention."
  },
  {
    id: "O2",
    area: "personal_insight",
    phase: "optimise",
    firesWhen: "entering optimise phase with a leading rule identified",
    fires: (c) => c.phase === "optimise" && Boolean(c.events?.leadingRuleIdentified),
    once: true,
    copy:
      "Your standout so far is {best_rule}: afternoons ran about {best_rule_uplift} points higher on the days you did it. Lean in this fortnight and see if the edge holds."
  },
  {
    id: "O3",
    area: "personal_insight",
    phase: "optimise",
    firesWhen: ">= 1 week of optimise data vs baseline",
    fires: (c) => c.phase === "optimise" && c.aggregates?.crash_pct_optimise != null,
    copy:
      "Crashes are trending down — a noticeable-or-worse crash on {crash_pct_optimise}% of days now, versus {crash_pct_baseline}% at baseline."
  },
  {
    id: "O4",
    area: "personal_insight",
    phase: "optimise",
    priority: "low",
    firesWhen: "available throughout optimise phase (surfaces ~once)",
    fires: (c) => c.phase === "optimise",
    once: true,
    copy:
      "A fair-minded note: sleep, stress and what you ate at lunch all sway your afternoons too. Your front-runner is a strong candidate, not a proven cause — which is exactly why keeping it up this fortnight is the real test."
  },
  {
    id: "O5",
    area: "milestone",
    phase: "optimise",
    firesWhen: ">= 4 consecutive days logged \"None\"",
    fires: (c) => Boolean(c.events?.crashFreeRun4),
    copy:
      "Four afternoons in a row with no crash. Whatever you're doing in the mornings, your body is noticing."
  },

  // ---- Phase 4 — Personalised analysis (Week 8) ---------------------------
  {
    id: "Rep1",
    area: "personal_insight",
    phase: "report",
    firesWhen: "Week 8 begins / report unlocks",
    fires: (c) => Boolean(c.events?.reportReady),
    once: true,
    copy:
      "Your 8-week analysis is ready. Here's what your data — not a study average — suggests about your afternoons."
  },
  {
    id: "Rep2",
    area: "personal_insight",
    phase: "report",
    firesWhen: "Week 8 report",
    fires: (c) => Boolean(c.events?.reportReady),
    copy:
      "Ranked by how closely they tracked with better afternoon energy for you: 1) {rule_1}  2) {rule_2}  3) {rule_3}  4) {rule_4}."
  },
  {
    id: "Rep3",
    area: "personal_insight",
    phase: "report",
    firesWhen: "Week 8 report",
    fires: (c) => Boolean(c.events?.reportReady),
    copy:
      "Bottom line: afternoon energy went from {pm_energy_avg_baseline}/10 at baseline to {pm_energy_avg_optimise}/10 by the optimise phase, and noticeable-or-worse crashes fell from {crash_pct_baseline}% to {crash_pct_optimise}% of days."
  },
  {
    id: "Rep4",
    area: "personal_insight",
    phase: "report",
    firesWhen: "Week 8 report",
    fires: (c) => Boolean(c.events?.reportReady),
    copy:
      "One honest caveat: this is a study of a single person — you — over a short window, so read it as a strong personal hint rather than proof. The rule that worked for you is the one worth keeping."
  },
  {
    id: "Rep5",
    area: "personal_insight",
    phase: "report",
    firesWhen: "Week 8 report",
    fires: (c) => Boolean(c.events?.reportReady),
    copy:
      "Your keep-list: {best_rule} (clearest effect) and {second_rule} (worth retaining). Park the rest. Want to run a focused 4-week re-check on just these two?"
  },

  // ---- 2. Comparisons — individual vs the explorer group ------------------
  // Cohort items only surface when context.cohort.size >= COHORT_MIN.
  {
    id: "C1",
    area: "comparison",
    phase: "any",
    firesWhen: "end of any week",
    fires: (c) => Boolean(c.events?.weekEnd),
    copy:
      "You logged on {logged_days_pct}% of days this week. The typical explorer logs around {cohort_logging_pct}%. You're {consistency_vs_group} the pack on consistency."
  },
  {
    id: "C2",
    area: "comparison",
    phase: "rules",
    firesWhen: "during rules phase, >= 1 week of rule data",
    fires: (c) => c.phase === "rules" && (c.adherence?.sunlight_pct != null),
    copy:
      "Morning sunlight is the most-followed rule across explorers (~{cohort_sunlight_pct}% of rule-phase days), with meditation the least (~{cohort_meditation_pct}%). You're at {sunlight_pct}% sunlight and {meditation_pct}% meditation."
  },
  {
    id: "C3",
    area: "comparison",
    phase: "any",
    evidence: "strong",
    firesWhen: "user has a measurable rule effect and cohort benchmark exists",
    fires: (c) => c.cohort?.sun_effect_benchmark != null && c.cohort?.your_sun_effect != null,
    copy:
      "Explorers who hit morning sunlight on 5+ days a week reported roughly {cohort_sun_reduction_pct}% fewer noticeable crashes. Your sunlight weeks show a {your_sun_effect} change — {sun_effect_vs_group} that."
  },
  {
    id: "C4",
    area: "comparison",
    phase: "any",
    firesWhen: "baseline complete",
    fires: (c) => Boolean(c.events?.baselineComplete) && c.cohort?.percentile != null,
    copy:
      "Your baseline afternoon energy ({pm_energy_avg_baseline}/10) sits around the {percentile}th percentile of explorers — so there's {baseline_room} room to climb."
  },
  {
    id: "C5",
    area: "comparison",
    phase: "any",
    firesWhen: ">= 10 logged days",
    fires: (c) => (c.counts?.loggedDays ?? 0) >= 10 && c.cohort?.user_crash_distribution != null,
    copy:
      "Across explorers, afternoon crashes split roughly 40% mild / 35% noticeable / 25% severe. Yours so far: {user_crash_distribution}."
  },
  {
    id: "C6",
    area: "comparison",
    phase: "optimise",
    firesWhen: "optimise phase",
    fires: (c) => c.phase === "optimise" && c.cohort?.your_rule_count != null,
    copy:
      "Most explorers settle on about 2 rules by the optimise phase. You're running {your_rule_count} — {stack_vs_group} the median."
  },
  {
    id: "C7",
    area: "comparison",
    phase: "report",
    note: "Frame \"below average\" softly — natural variation, not underperformance. Pair with encouragement.",
    firesWhen: "Week 8 report",
    fires: (c) => Boolean(c.events?.reportReady) && c.cohort?.user_improvement != null,
    copy:
      "On average, explorers improved afternoon energy by about {cohort_avg_improvement} points from baseline to optimise. Your improvement: {user_improvement} points — {improvement_vs_group} the group's."
  },

  // ---- 3. Milestone summaries (celebratory, low-pressure, fire once) ------
  {
    id: "M1",
    area: "milestone",
    phase: "any",
    once: true,
    firesWhen: "first log",
    fires: (c) => Boolean(c.events?.firstLog),
    copy: "First log in. Your exploration has officially started 🌱"
  },
  {
    id: "M2",
    area: "milestone",
    phase: "any",
    once: true,
    firesWhen: "streak_n = 7",
    fires: (c) => (c.adherence?.streak_n ?? 0) === 7,
    copy:
      "Seven days of logging straight. Consistency like this is what turns a hunch into a real personal finding."
  },
  {
    id: "M3",
    area: "milestone",
    phase: "baseline",
    once: true,
    firesWhen: "baseline phase closes",
    fires: (c) => Boolean(c.events?.baselineComplete),
    copy:
      "Phase one done. Two weeks of honest baseline data — the foundation everything else gets measured against."
  },
  {
    id: "M4",
    area: "milestone",
    phase: "rules",
    once: true,
    firesWhen: "first day all four rules ticked",
    fires: (c) => Boolean(c.events?.fullStackDay),
    copy:
      "All four rules in a single morning — sunlight, movement, delayed coffee, meditation. A proper stack. Notice how this afternoon lands."
  },
  {
    id: "M5",
    area: "milestone",
    phase: "rules",
    once: true,
    firesWhen: "end of Week 4",
    fires: (c) => Boolean(c.events?.halfway) || c.week === 4,
    copy:
      "Halfway through. You've gone from quietly observing to actively experimenting — and the most useful data is often still ahead."
  },
  {
    id: "M6",
    area: "milestone",
    phase: "any",
    firesWhen: "a new max logging streak is set (after the first)",
    fires: (c) => Boolean(c.events?.newMaxStreak),
    copy:
      "New record: {streak_n} days logged in a row. Beating your own consistency, one morning at a time."
  },
  {
    id: "M7",
    area: "milestone",
    phase: "rules",
    once: true,
    firesWhen: "rules phase closes",
    fires: (c) => Boolean(c.events?.rulesComplete),
    copy:
      "Experiment phase wrapped. You've tested all four rules against your own afternoons — now comes the part where you keep what works."
  },
  {
    id: "M8",
    area: "milestone",
    phase: "any",
    once: true,
    firesWhen: "a full 7-day window logs zero Noticeable/Severe crashes",
    fires: (c) => Boolean(c.events?.crashFreeWeek),
    copy: "A whole week without a real crash. However it happened, it happened."
  },
  {
    id: "M9",
    area: "milestone",
    phase: "optimise",
    once: true,
    firesWhen: "optimise phase closes",
    fires: (c) => Boolean(c.events?.optimiseComplete),
    copy:
      "Optimise phase done. You've confirmed your front-runner under full focus. One week to go — the analysis."
  },
  {
    id: "M10",
    area: "milestone",
    phase: "report",
    once: true,
    firesWhen: "all 8 weeks logged",
    fires: (c) => Boolean(c.events?.explorationComplete),
    copy:
      "Eight weeks, start to finish. You ran a real experiment on yourself and stuck the landing. Your personalised analysis is waiting."
  },

  // ---- 4. Adherence summaries (always non-shaming) ------------------------
  {
    id: "A1",
    area: "adherence",
    phase: "any",
    firesWhen: "end of each week (rules + optimise phases)",
    fires: (c) =>
      Boolean(c.events?.weekEnd) && (c.phase === "rules" || c.phase === "optimise"),
    copy:
      "This week's rules — ☀️ Sunlight {sunlight_pct}% · 🤸 Movement {movement_pct}% · ☕ Delayed caffeine {caffeine_pct}% · 🧘 Meditation {meditation_pct}%. Overall you followed your rules on {rule_days} of 7 days."
  },
  {
    id: "A2",
    area: "adherence",
    phase: "rules",
    once: true,
    firesWhen: "end of rules phase",
    fires: (c) => Boolean(c.events?.rulesComplete),
    copy:
      "Across the three experiment weeks: sunlight on {sunlight_pct}% of days, movement {movement_pct}%, delayed caffeine {caffeine_pct}%, meditation {meditation_pct}%. The ones you stuck with most are also the ones your analysis can say the most about."
  },
  {
    id: "A3",
    area: "adherence",
    phase: "any",
    firesWhen: "end of any phase",
    fires: (c) => Boolean(c.events?.phaseEnd),
    // Completeness band line is selected by the engine via {completeness_line}.
    copy:
      "You logged {logged_days} of {phase_total_days} days this phase ({logged_days_pct}%). {completeness_line}"
  },
  {
    id: "A4",
    area: "adherence",
    phase: "any",
    note: "Cap frequency (once per lapse) so it never nags.",
    firesWhen: "no log for 3+ consecutive days",
    fires: (c) => Boolean(c.events?.lapsed3),
    copy:
      "Been a few days — no worries, the exploration waits for you. A single quick log today picks the thread right back up."
  },
  {
    id: "A5",
    area: "adherence",
    phase: "any",
    note: "Only show if the overlap genuinely holds in the data; otherwise suppress.",
    firesWhen: ">= 2 weeks of rule data and the overlap holds",
    fires: (c) =>
      (c.counts?.ruleWeeks ?? 0) >= 2 && Boolean(c.flags?.adherenceOutcomeOverlap),
    copy:
      "Interesting overlap: your highest-energy afternoons clustered on weeks you followed your rules most ({high_adherence_weeks}). Worth keeping in view as you optimise."
  },
  {
    id: "A6",
    area: "adherence",
    phase: "report",
    once: true,
    firesWhen: "Week 8",
    fires: (c) => Boolean(c.events?.reportReady),
    copy:
      "Over 8 weeks you logged {logged_days_pct}% of days and followed your chosen rules most reliably on {top_rule}. Strong adherence is part of why your front-runner result is one you can trust."
  }
];

export const morningRulesFeedLibrary = {
  explorationId: "morning-rules",
  title: "Morning Routines × Afternoon Energy",
  question: "Do morning rules reduce my chances of an afternoon crash?",
  weeks: 8,
  phases: {
    baseline: [1, 2],
    rules: [3, 4, 5],
    optimise: [6, 7],
    report: [8]
  },
  tokenKey: TOKEN_KEY,
  tone: TONE,
  safety: SAFETY,
  cohortMin: COHORT_MIN,
  cohortReference: COHORT_REFERENCE,
  items: ITEMS
};

export default morningRulesFeedLibrary;
