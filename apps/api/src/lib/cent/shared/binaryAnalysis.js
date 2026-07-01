import { mean } from "./math.js";

export function binaryHabitAnalysis(phaseEntries, habitKey, outcome, options = {}) {
  const minObs = options.minObservations ?? 5;
  const higherIsBetter = options.higherIsBetter ?? true;

  const entriesWithOutcome = phaseEntries.filter(
    (e) => e[outcome] !== null && e[outcome] !== undefined
  );
  const followed = entriesWithOutcome.filter((e) => e[habitKey] === true);
  const notFollowed = entriesWithOutcome.filter((e) => e[habitKey] !== true);

  if (followed.length < minObs || notFollowed.length < minObs) {
    return {
      habit: habitKey,
      outcome,
      status: "insufficient_data",
      followed_n: followed.length,
      not_followed_n: notFollowed.length
    };
  }

  const meanF = mean(followed.map((e) => e[outcome]));
  const meanNf = mean(notFollowed.map((e) => e[outcome]));
  const diff = meanF - meanNf;
  const beneficial = higherIsBetter ? diff > 0 : diff < 0;

  return {
    habit: habitKey,
    rule: habitKey,
    outcome,
    followed_n: followed.length,
    not_followed_n: notFollowed.length,
    mean_followed: meanF,
    mean_not_followed: meanNf,
    difference: diff,
    beneficial,
    abs_effect: Math.abs(diff),
    status: "valid"
  };
}
