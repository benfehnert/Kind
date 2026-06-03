// Feed-content generation engine.
//
// Given an exploration's content library (see ./data/morningRulesFeedLibrary.js)
// and a user-log context, this engine:
//   1. evaluates which library items "fire" for the current context,
//   2. resolves {tokens} from the user's logs / rolling aggregates,
//   3. applies privacy (cohort suppression) and the medical safeguard,
//   4. produces feed items in the exact shape the mobile feed renders
//      (see apps/mobile/mock-data/feed.json + HomeScreen.js).
//
// Copy is rewritten by an LLM when OPENAI_API_KEY is available, obeying the
// library's tone & safety guidance. With no key it falls back to deterministic
// token-filled templates — mirroring the /coaching/nudge pattern in server.js.

import OpenAI from "openai";

// Palette mirrors apps/mobile/src/theme/colors.js so generated items render
// identically to the hand-authored feed.
const PALETTE = {
  amberBg: "#FDF0E4",
  amberText: "#8A4A1A",
  greenLight: "#EAF3DE",
  greenDark: "#3B6D11",
  blueBg: "#E6F1FB",
  blueText: "#185FA5"
};

// Maps a content area to a valid feed `type` (+ insight tab) and the visual
// chrome HomeScreen expects.
function decorate(area, exploration) {
  const expBg = exploration?.bg || PALETTE.amberBg;
  const expText = exploration?.text || PALETTE.amberText;
  switch (area) {
    case "comparison":
      return {
        type: "insight",
        insightTab: "community",
        displayName: "Community insight",
        badge: "blue",
        badgeLabel: "Insight",
        avatarKind: "icon",
        icon: "✦",
        avatarBg: PALETTE.blueBg,
        iconColor: PALETTE.blueText
      };
    case "milestone":
      return {
        type: "milestone",
        displayName: "Milestone",
        badge: "green",
        badgeLabel: "Milestone",
        avatarKind: "glyph",
        glyph: "🌱",
        avatarBg: PALETTE.greenLight,
        glyphColor: PALETTE.greenDark
      };
    case "adherence":
      return {
        type: "insight",
        insightTab: "your",
        displayName: "Adherence summary",
        badge: "teal",
        badgeLabel: "Adherence",
        avatarKind: "glyph",
        glyph: "📊",
        avatarBg: expBg,
        glyphColor: expText
      };
    case "personal_insight":
    default:
      return {
        type: "insight",
        insightTab: "your",
        displayName: "Your insight",
        badge: "blue",
        badgeLabel: "Insight",
        avatarKind: "icon",
        icon: "✦",
        avatarBg: PALETTE.blueBg,
        iconColor: PALETTE.blueText
      };
  }
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

// Builds the flat token -> value map the templates reference. Flattens the
// nested context buckets and derives a handful of computed/directional tokens.
export function buildTokenValues(context = {}, library) {
  const { aggregates = {}, adherence = {}, outcomes = {}, counts = {}, cohort = {}, daily = {} } =
    context;

  const values = { ...daily, ...aggregates, ...adherence, ...outcomes };

  // Count-derived display tokens referenced directly in copy.
  if (values.caffeine_days == null && counts.caffeineDays != null) values.caffeine_days = counts.caffeineDays;
  if (values.stack_days == null && counts.stackDays != null) values.stack_days = counts.stackDays;

  // Derived: morning-to-afternoon gap.
  if (values.energy_gap == null && aggregates.am_energy_avg != null && aggregates.pm_energy_avg != null) {
    values.energy_gap = round1(aggregates.am_energy_avg - aggregates.pm_energy_avg);
  }

  // Cohort reference figures (illustrative placeholders from the library).
  const ref = library?.cohortReference || {};
  values.cohort_logging_pct = cohort.logging_pct ?? ref.logging_pct;
  values.cohort_sunlight_pct = cohort.sunlight_followed_pct ?? ref.sunlight_followed_pct;
  values.cohort_meditation_pct = cohort.meditation_followed_pct ?? ref.meditation_followed_pct;
  values.cohort_sun_reduction_pct = cohort.sunlight_crash_reduction_pct ?? ref.sunlight_crash_reduction_pct;
  values.cohort_avg_improvement = cohort.avg_improvement_points ?? ref.avg_improvement_points;

  // Pass through cohort display tokens.
  for (const k of ["percentile", "your_sun_effect", "user_crash_distribution", "your_rule_count", "user_improvement"]) {
    if (cohort[k] != null) values[k] = cohort[k];
  }

  // Derived directional choice tokens (kept honest: "below" is framed softly
  // downstream by the tone guidance).
  const near = (a, b, tol) => Math.abs(Number(a) - Number(b)) <= tol;
  if (adherence.logged_days_pct != null && values.cohort_logging_pct != null) {
    values.consistency_vs_group = near(adherence.logged_days_pct, values.cohort_logging_pct, 3)
      ? "right with"
      : adherence.logged_days_pct > values.cohort_logging_pct
        ? "ahead of"
        : "behind";
  }
  if (cohort.your_rule_count != null) {
    values.stack_vs_group =
      cohort.your_rule_count > 2 ? "more than" : cohort.your_rule_count < 2 ? "fewer than" : "the same as";
  }
  if (cohort.user_improvement != null && values.cohort_avg_improvement != null) {
    values.improvement_vs_group = near(cohort.user_improvement, values.cohort_avg_improvement, 0.2)
      ? "around"
      : cohort.user_improvement > values.cohort_avg_improvement
        ? "above"
        : "below";
  }
  if (cohort.your_sun_effect != null && cohort.sun_effect_benchmark != null) {
    values.sun_effect_vs_group = near(cohort.your_sun_effect_value ?? 0, cohort.sun_effect_benchmark, 0.05)
      ? "in line with"
      : (cohort.your_sun_effect_value ?? 0) > cohort.sun_effect_benchmark
        ? "stronger than"
        : "softer than";
  }
  if (aggregates.pm_energy_avg_baseline != null) {
    values.baseline_room =
      aggregates.pm_energy_avg_baseline >= 7 ? "a little" : "plenty of";
  }

  // Adherence A3 completeness band line.
  if (adherence.logged_days_pct != null) {
    const p = Number(adherence.logged_days_pct);
    values.completeness_line =
      p >= 80
        ? "Plenty of data to draw on."
        : p >= 50
          ? "A solid record — enough to spot patterns."
          : "A few more logs next phase will sharpen the picture.";
  }

  return values;
}

// Replaces {token} occurrences. Unresolved tokens are recorded and rendered as
// an em dash so copy never leaks a raw "{token}".
export function resolveCopy(template, values) {
  const unresolved = [];
  const body = String(template).replace(/\{([a-z0-9_]+)\}/gi, (match, key) => {
    const v = values[key];
    if (v == null || v === "") {
      unresolved.push(key);
      return "—";
    }
    return String(v);
  });
  return { body, unresolved };
}

// Evaluates which library items fire for the given context, applying privacy
// suppression for cohort comparisons.
export function evaluateTriggers(library, context = {}) {
  const cohortSize = context.cohort?.size ?? 0;
  const cohortOk = cohortSize >= (library.cohortMin ?? 50);

  const fired = [];
  const suppressed = [];

  for (const item of library.items) {
    let didFire = false;
    try {
      didFire = Boolean(item.fires?.(context));
    } catch {
      didFire = false;
    }
    if (!didFire) continue;

    if (item.area === "comparison" && !cohortOk) {
      suppressed.push({ id: item.id, reason: "cohort below privacy minimum" });
      continue;
    }
    fired.push(item);
  }

  return { fired, suppressed, cohortOk };
}

function makeItem({ item, exploration, body, highlight, timeLabel }) {
  const chrome = decorate(item.area, exploration);
  const label = exploration?.feedLabel || exploration?.title || "";
  const idPrefix = item.area === "comparison" ? "cmp" : item.area === "milestone" ? "ms" : item.area === "adherence" ? "adh" : "ins";
  return {
    id: `gen-${idPrefix}-${item.id}`,
    explorationId: exploration?.id || exploration?.explorationId || null,
    ...chrome,
    time: label ? `${timeLabel} · ${label}` : timeLabel,
    body,
    highlight: highlight || "",
    // Tool metadata (ignored by the renderer, useful for review/QA).
    _meta: {
      ruleId: item.id,
      contentArea: item.area,
      phase: item.phase,
      firesWhen: item.firesWhen,
      evidence: item.evidence || null,
      note: item.note || null
    }
  };
}

// Builds the LLM prompt for a batch of fired items and asks for strict JSON.
async function rewriteWithLLM({ apiKey, model, library, exploration, specs }) {
  const client = new OpenAI({ apiKey });
  const system = [
    "You are the content writer for a citizen-science self-tracking app.",
    `You are writing feed copy for the exploration: "${library.title}" (${library.question}).`,
    "Rewrite each provided draft into natural, warm feed copy. Follow these rules strictly:",
    ...library.tone.map((t) => `- ${t}`),
    "- Preserve every numeric value present in the draft exactly; never invent or change numbers.",
    "- If a value appears as an em dash (—) it is missing; phrase around it without inventing a number.",
    "- Keep each body to 1-3 sentences. Provide a short optional `highlight` only when it adds a concrete next step or stat.",
    'Return ONLY JSON of the form {"items":[{"id":"<id>","body":"<text>","highlight":"<text or empty>"}]}.'
  ].join("\n");

  const user = JSON.stringify(
    {
      items: specs.map((s) => ({
        id: s.item.id,
        contentArea: s.item.area,
        phase: s.item.phase,
        evidenceStrength: s.item.evidence || "n/a",
        guidanceNote: s.item.note || null,
        draft: s.body
      }))
    },
    null,
    2
  );

  const completion = await client.chat.completions.create({
    model: model || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    max_tokens: 1200
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  const parsed = JSON.parse(raw);
  const byId = new Map();
  for (const it of parsed.items || []) {
    if (it && it.id) byId.set(String(it.id), it);
  }
  return byId;
}

/**
 * Generate feed content for one exploration.
 *
 * @param {object}  opts
 * @param {object}  opts.exploration  Exploration metadata ({ id, title, feedLabel, bg, text }).
 * @param {object}  opts.context      User-log context (phase, week, events, aggregates, adherence, cohort...).
 * @param {object}  opts.library      Content library (defaults to the morning-rules library).
 * @param {number}  [opts.limit]      Max number of items to return.
 * @param {string}  [opts.timeLabel]  Time label prefix for items (default "Today").
 * @param {string}  [opts.openaiApiKey] OpenAI key; falls back to deterministic templates if absent.
 * @param {string}  [opts.model]      OpenAI model (default gpt-4o-mini).
 * @returns {Promise<{items: object[], meta: object}>}
 */
export async function generateFeedContent({
  exploration,
  context = {},
  library,
  limit = 8,
  timeLabel = "Today",
  openaiApiKey = process.env.OPENAI_API_KEY,
  model
}) {
  if (!library) {
    throw new Error("A content library is required");
  }
  const exp = { id: library.explorationId, ...exploration };

  const values = buildTokenValues(context, library);
  const { fired, suppressed, cohortOk } = evaluateTriggers(library, context);

  // Resolve token-filled drafts for each fired item.
  const allUnresolved = new Set();
  const specs = fired.slice(0, limit).map((item) => {
    const { body, unresolved } = resolveCopy(item.copy, values);
    unresolved.forEach((u) => allUnresolved.add(u));
    const hl = item.highlight ? resolveCopy(item.highlight, values).body : "";
    return { item, body, highlight: hl };
  });

  // Medical safeguard — appended outside the limit so it is never dropped.
  let safetyItem = null;
  const safe = library.safety?.severeCrash;
  if (safe?.fires?.(context)) {
    safetyItem = {
      item: {
        id: "SAFE-severe-crash",
        area: "personal_insight",
        phase: context.phase || "any",
        firesWhen: safe.firesWhen,
        note: "Medical safeguard — supportive signposting, not diagnosis."
      },
      body: safe.copy,
      highlight: ""
    };
  }

  let usedLLM = false;
  let rewrites = new Map();
  if (openaiApiKey && specs.length) {
    try {
      rewrites = await rewriteWithLLM({
        apiKey: openaiApiKey,
        model,
        library,
        exploration: exp,
        specs
      });
      usedLLM = true;
    } catch {
      usedLLM = false; // fall back to deterministic templates
    }
  }

  const items = specs.map((spec) => {
    const rewrite = rewrites.get(spec.item.id);
    const body = (usedLLM && rewrite?.body) ? rewrite.body : spec.body;
    const highlight = usedLLM && rewrite?.highlight != null ? rewrite.highlight : spec.highlight;
    return makeItem({ item: spec.item, exploration: exp, body, highlight, timeLabel });
  });

  if (safetyItem) {
    // Safety copy is never LLM-rewritten — surface it verbatim.
    items.push(
      makeItem({
        item: safetyItem.item,
        exploration: exp,
        body: safetyItem.body,
        highlight: "",
        timeLabel
      })
    );
  }

  return {
    items,
    meta: {
      explorationId: exp.id,
      generator: usedLLM ? "llm" : "template",
      model: usedLLM ? model || "gpt-4o-mini" : null,
      firedCount: fired.length,
      returnedCount: items.length,
      suppressed,
      cohortEligible: cohortOk,
      unresolvedTokens: [...allUnresolved],
      safetyTriggered: Boolean(safetyItem)
    }
  };
}
