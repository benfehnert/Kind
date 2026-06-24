import { explorationStartInstructions } from "../data/explorationStartInstructions";

export function buildExplorationStartContent(exploration) {
  if (!exploration) return { phaseName: null, instructions: [] };

  const curated =
    exploration.startInstructions || explorationStartInstructions[exploration.id] || null;

  const phase = exploration.phases?.[0];
  const phaseName = phase?.name ?? null;

  if (curated?.length) {
    return { phaseName, instructions: curated };
  }

  const instructions = [];
  if (phase?.desc) instructions.push(phase.desc);
  for (const field of exploration.fields || []) {
    instructions.push(`Each day, log: ${field.label}.`);
  }
  return { phaseName, instructions };
}

export function buildLogFieldSummary(exploration) {
  return (exploration?.fields || []).map((f) => f.label);
}
