import { buildScreenSleepContext } from "./index.js";

export function buildScreenSleepInsights(entries, cohortSnapshot = null) {
  const ctx = buildScreenSleepContext(entries, cohortSnapshot);
  const insights = [];

  if (ctx.adherence?.logged_nights_pct != null && ctx.adherence.logged_nights_pct < 70) {
    insights.push({
      type: "adherence",
      priority: "high",
      title: "Logging consistency",
      body: `You've logged ${ctx.adherence.logged_nights_pct}% of nights so far. More consistent check-ins will strengthen your personalised report.`
    });
  }

  if (
    ctx.aggregates?.sleep_quality_avg_thirty_min != null &&
    ctx.aggregates?.sleep_quality_avg_baseline != null
  ) {
    const delta = ctx.aggregates.sleep_quality_avg_thirty_min - ctx.aggregates.sleep_quality_avg_baseline;
    if (delta > 0.5) {
      insights.push({
        type: "sleep_improvement",
        priority: "medium",
        title: "Sleep trending up",
        body: `Your sleep quality during the 30-min screen-free phase is about ${delta.toFixed(1)} points higher than baseline so far.`
      });
    }
  }

  if (ctx.adherence?.screen_free_60_pct != null && ctx.adherence.screen_free_60_pct >= 70) {
    insights.push({
      type: "screen_free_adherence",
      priority: "medium",
      title: "Strong screen-free consistency",
      body: `You're hitting a 60-min screen-free buffer on ${ctx.adherence.screen_free_60_pct}% of active phase nights — great for building reliable patterns.`
    });
  }

  return insights;
}
