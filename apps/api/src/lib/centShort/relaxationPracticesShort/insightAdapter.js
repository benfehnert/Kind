import { buildRelaxationContext } from "./index.js";

export function buildRelaxationInsights(entries, cohortSnapshot = null) {
  const ctx = buildRelaxationContext(entries, cohortSnapshot);
  const insights = [];

  if (ctx.adherence?.logged_days_pct != null && ctx.adherence.logged_days_pct < 70) {
    insights.push({
      type: "adherence",
      priority: "high",
      title: "Logging consistency",
      body: `You've logged ${ctx.adherence.logged_days_pct}% of days so far. More consistent check-ins will strengthen your personalised report.`
    });
  }

  if (ctx.aggregates?.composure_avg_practices != null && ctx.aggregates?.composure_avg_baseline != null) {
    const delta = ctx.aggregates.composure_avg_practices - ctx.aggregates.composure_avg_baseline;
    if (delta > 0.5) {
      insights.push({
        type: "composure_improvement",
        priority: "medium",
        title: "Composure trending up",
        body: `Your composure during the practices phase is about ${delta.toFixed(1)} points higher than baseline so far.`
      });
    }
  }

  if (ctx.adherence?.practice_days_pct != null && ctx.adherence.practice_days_pct >= 60) {
    insights.push({
      type: "practice_adherence",
      priority: "medium",
      title: "Strong practice consistency",
      body: `You're logging at least one relaxation practice on ${ctx.adherence.practice_days_pct}% of active phase days — great for building reliable patterns.`
    });
  }

  return insights;
}
