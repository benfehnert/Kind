import explorations from "../mocks/explorations.json" with { type: "json" };

const DEFAULT_THEME = {
  bg: "#FDF0E4",
  text: "#8A4A1A"
};

/**
 * Canonical exploration theme tokens derived from explorations.json.
 * @param {string} explorationId
 */
export function getExplorationTheme(explorationId) {
  const entry = explorations[explorationId];
  const bg = entry?.bg ?? DEFAULT_THEME.bg;
  const text = entry?.text ?? DEFAULT_THEME.text;
  return {
    bg,
    text,
    accent: text,
    surface: bg,
    keepPillBg: bg,
    keepPillText: text
  };
}

/**
 * Inject per-exploration CSS variable placeholders into CENT report HTML templates.
 * @param {string} html
 * @param {string} explorationId
 */
export function applyThemeToReportHtml(html, explorationId) {
  const theme = getExplorationTheme(explorationId);
  return html
    .replaceAll("__ACCENT__", theme.accent)
    .replaceAll("__SURFACE__", theme.surface)
    .replaceAll("__KEEP_PILL_BG__", theme.keepPillBg)
    .replaceAll("__KEEP_PILL_TEXT__", theme.keepPillText);
}
