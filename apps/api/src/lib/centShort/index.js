import {
  analyzeMorningRules,
  generateFinalReport as generateMorningRulesFinalReport,
  loadDayEntries as loadMorningRulesEntries,
  buildStudyMeta as buildMorningRulesMeta
} from "./morningRulesShort/index.js";
import {
  analyzeTimeRestrictedEating,
  generateFinalReport as generateEatingFinalReport,
  loadDayEntries as loadEatingEntries,
  buildStudyMeta as buildEatingMeta
} from "./timeRestrictedEatingShort/index.js";
import {
  analyzeRelaxationPractices,
  generateFinalReport as generateRelaxationFinalReport,
  loadDayEntries as loadRelaxationEntries,
  buildStudyMeta as buildRelaxationMeta
} from "./relaxationPracticesShort/index.js";
import {
  analyzeScreenSleep,
  generateFinalReport as generateScreenSleepFinalReport,
  loadDayEntries as loadScreenSleepEntries,
  buildStudyMeta as buildScreenSleepMeta
} from "./screenSleepShort/index.js";
import {
  analyzeUpfReduction,
  generateFinalReport as generateUpfFinalReport,
  loadDayEntries as loadUpfEntries,
  buildStudyMeta as buildUpfMeta
} from "./upfReductionShort/index.js";

/**
 * Short (alpha) explorations run a completely separate analysis pipeline from
 * the full-length CENT modules. One logged day maps to one full-study week, so
 * a six-week exploration finishes in six days and an eight-week one in eight.
 */
const SHORT_EXPLORATION_MODULES = {
  "morning-rules-short": {
    loadDayEntries: loadMorningRulesEntries,
    buildStudyMeta: buildMorningRulesMeta,
    analyze: analyzeMorningRules,
    generateFinalReport: generateMorningRulesFinalReport
  },
  "eating-short": {
    loadDayEntries: loadEatingEntries,
    buildStudyMeta: buildEatingMeta,
    analyze: analyzeTimeRestrictedEating,
    generateFinalReport: generateEatingFinalReport
  },
  "screen-sleep-short": {
    loadDayEntries: loadScreenSleepEntries,
    buildStudyMeta: buildScreenSleepMeta,
    analyze: analyzeScreenSleep,
    generateFinalReport: generateScreenSleepFinalReport
  },
  "relaxation-short": {
    loadDayEntries: loadRelaxationEntries,
    buildStudyMeta: buildRelaxationMeta,
    analyze: analyzeRelaxationPractices,
    generateFinalReport: generateRelaxationFinalReport
  },
  "upf-mood-short": {
    loadDayEntries: loadUpfEntries,
    buildStudyMeta: buildUpfMeta,
    analyze: analyzeUpfReduction,
    generateFinalReport: generateUpfFinalReport
  }
};

export function getCentShortModule(explorationId) {
  return SHORT_EXPLORATION_MODULES[explorationId] ?? null;
}

export function centShortSupportsExploration(explorationId) {
  return explorationId in SHORT_EXPLORATION_MODULES;
}

export function isShortExploration(explorationId) {
  return typeof explorationId === "string" && explorationId.endsWith("-short");
}
