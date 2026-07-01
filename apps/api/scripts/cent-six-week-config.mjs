export const SIX_WEEK_CENT = {
  "screen-sleep": {
    explorationId: "screen-sleep",
    fixture: "anna-screen-sleep-completion.json",
    cohort: "cohort-snapshot-screen-sleep.json",
    outputDir: "cent-screen-sleep-anna",
    downloadsCsv: "cent-screen-sleep-anna-all.csv",
    downloadsPdf: "kind-cent-screen-sleep-anna-reports.pdf",
    module: "../src/lib/cent/screenSleep/index.js",
    analyze: "analyzeScreenSleep"
  },
  relaxation: {
    explorationId: "relaxation",
    fixture: "anna-relaxation-completion.json",
    cohort: "cohort-snapshot-relaxation.json",
    outputDir: "cent-relaxation-anna",
    downloadsCsv: "cent-relaxation-anna-all.csv",
    downloadsPdf: "kind-cent-relaxation-anna-reports.pdf",
    module: "../src/lib/cent/relaxationPractices/index.js",
    analyze: "analyzeRelaxationPractices"
  },
  "upf-mood": {
    explorationId: "upf-mood",
    fixture: "anna-upf-mood-completion.json",
    cohort: "cohort-snapshot-upf-mood.json",
    outputDir: "cent-upf-mood-anna",
    downloadsCsv: "cent-upf-mood-anna-all.csv",
    downloadsPdf: "kind-cent-upf-mood-anna-reports.pdf",
    module: "../src/lib/cent/upfReduction/index.js",
    analyze: "analyzeUpfReduction"
  }
};
