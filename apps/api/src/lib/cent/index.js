import {
  analyzeMorningRules,
  generateFinalReport as generateMorningRulesFinalReport,
  loadDayEntries as loadMorningRulesEntries,
  buildStudyMeta as buildMorningRulesMeta
} from "./morningRules/index.js";
import {
  analyzeTimeRestrictedEating,
  generateFinalReport as generateEatingFinalReport,
  loadDayEntries as loadEatingEntries,
  buildStudyMeta as buildEatingMeta
} from "./timeRestrictedEating/index.js";
import {
  analyzeRelaxationPractices,
  generateFinalReport as generateRelaxationFinalReport,
  loadDayEntries as loadRelaxationEntries,
  buildStudyMeta as buildRelaxationMeta
} from "./relaxationPractices/index.js";
import {
  analyzeScreenSleep,
  generateFinalReport as generateScreenSleepFinalReport,
  loadDayEntries as loadScreenSleepEntries,
  buildStudyMeta as buildScreenSleepMeta
} from "./screenSleep/index.js";
import {
  analyzeUpfReduction,
  generateFinalReport as generateUpfFinalReport,
  loadDayEntries as loadUpfEntries,
  buildStudyMeta as buildUpfMeta
} from "./upfReduction/index.js";

const EXPLORATION_MODULES = {
  "morning-rules": {
    loadDayEntries: loadMorningRulesEntries,
    buildStudyMeta: buildMorningRulesMeta,
    analyze: analyzeMorningRules,
    generateFinalReport: generateMorningRulesFinalReport
  },
  eating: {
    loadDayEntries: loadEatingEntries,
    buildStudyMeta: buildEatingMeta,
    analyze: analyzeTimeRestrictedEating,
    generateFinalReport: generateEatingFinalReport
  },
  "screen-sleep": {
    loadDayEntries: loadScreenSleepEntries,
    buildStudyMeta: buildScreenSleepMeta,
    analyze: analyzeScreenSleep,
    generateFinalReport: generateScreenSleepFinalReport
  },
  relaxation: {
    loadDayEntries: loadRelaxationEntries,
    buildStudyMeta: buildRelaxationMeta,
    analyze: analyzeRelaxationPractices,
    generateFinalReport: generateRelaxationFinalReport
  },
  "upf-mood": {
    loadDayEntries: loadUpfEntries,
    buildStudyMeta: buildUpfMeta,
    analyze: analyzeUpfReduction,
    generateFinalReport: generateUpfFinalReport
  }
};

export function getCentModule(explorationId) {
  return EXPLORATION_MODULES[explorationId] ?? null;
}

export function centSupportsExploration(explorationId) {
  return explorationId in EXPLORATION_MODULES;
}
