import { buildEatingContext } from "./index.js";

export function buildEatingInsights(entries, cohortSnapshot = null) {
  const ctx = buildEatingContext(entries, cohortSnapshot);
  const insights = [];

  if (ctx.adherence?.logged_days_pct != null && ctx.adherence.logged_days_pct < 70) {
    insights.push({
      type: "adherence",
      priority: "high",
      title: "Logging consistency",
      body: `You've logged ${ctx.adherence.logged_days_pct}% of days so far. More consistent check-ins will strengthen your personalised report.`
    });
  }

  if (ctx.aggregates?.daily_energy_avg_ten_hour != null && ctx.aggregates?.daily_energy_avg_baseline != null) {
    const delta = ctx.aggregates.daily_energy_avg_ten_hour - ctx.aggregates.daily_energy_avg_baseline;
    if (delta > 0.5) {
      insights.push({
        type: "energy_improvement",
        priority: "medium",
        title: "Energy trending up",
        body: `Your daily energy during the 10-hour window phase is about ${delta.toFixed(1)} points higher than baseline so far.`
      });
    }
  }

  if (ctx.adherence?.window_10h_pct != null && ctx.adherence.window_10h_pct >= 70) {
    insights.push({
      type: "window_adherence",
      priority: "medium",
      title: "Strong window consistency",
      body: `You're hitting a 10-hour window or less on ${ctx.adherence.window_10h_pct}% of active phase days — great for building reliable patterns.`
    });
  }

  return insights;
}
