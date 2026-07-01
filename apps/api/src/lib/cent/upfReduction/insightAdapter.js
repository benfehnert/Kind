import { buildUpfContext } from "./index.js";

export function buildUpfInsights(entries, cohortSnapshot = null) {
  const ctx = buildUpfContext(entries, cohortSnapshot);
  const insights = [];

  if (ctx.adherence?.logged_days_pct != null && ctx.adherence.logged_days_pct < 70) {
    insights.push({
      type: "adherence",
      priority: "high",
      title: "Logging consistency",
      body: `You've logged ${ctx.adherence.logged_days_pct}% of days so far. More consistent check-ins will strengthen your personalised report.`
    });
  }

  if (
    ctx.aggregates?.daily_mood_avg_reduction != null &&
    ctx.aggregates?.daily_mood_avg_baseline != null
  ) {
    const delta = ctx.aggregates.daily_mood_avg_reduction - ctx.aggregates.daily_mood_avg_baseline;
    if (delta > 0.5) {
      insights.push({
        type: "mood_improvement",
        priority: "medium",
        title: "Mood trending up",
        body: `Your daily mood during the reduction phase is about ${delta.toFixed(1)} points higher than baseline so far.`
      });
    }
  }

  if (ctx.adherence?.low_upf_pct != null && ctx.adherence.low_upf_pct >= 50) {
    insights.push({
      type: "upf_adherence",
      priority: "medium",
      title: "Strong UPF reduction",
      body: `You're under 30% UPF on ${ctx.adherence.low_upf_pct}% of active phase days — great for building reliable patterns.`
    });
  }

  return insights;
}
