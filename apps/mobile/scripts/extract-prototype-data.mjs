/**
 * Extracts key `const` literals from prototype.html → mock-data/*.json
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.join(__dirname, "..");
const htmlPath = path.join(mobileRoot, "prototype.html");
const mockDir = path.join(mobileRoot, "mock-data");

const html = fs.readFileSync(htmlPath, "utf8");

function sliceBetween(openNeedle, closeNeedle) {
  const start = html.indexOf(openNeedle);
  if (start < 0) throw new Error(`Missing: ${openNeedle}`);
  const end = html.indexOf(closeNeedle, start + openNeedle.length);
  if (end < 0) throw new Error(`Missing close before: ${closeNeedle}`);
  return html.slice(start, end);
}

const parts = [
  sliceBetween("const FEED_EXP_IDS", "function renderFeedTipScienceCards()"),
  sliceBetween("const EXPLORATION_EVIDENCE", "function buildEvidenceSearchBlob"),
  sliceBetween("const EXPLORATIONS", "function openExploration(id)"),
  sliceBetween("const SCENE_AVATARS", "let followingResearchersSet")
];

const bundled = `
${parts[0]}
${parts[1]}
${parts[2]}
${parts[3]}
globalThis.__data = {
  feed: {
    feedExpIds: FEED_EXP_IDS,
    feedTipTimes: FEED_TIP_TIMES,
    feedScienceTimes: FEED_SCIENCE_TIMES,
    feedTips: FEED_TIPS,
    feedScience: FEED_SCIENCE
  },
  explorationEvidence: EXPLORATION_EVIDENCE,
  explorations: EXPLORATIONS,
  community: {
    sceneAvatars: SCENE_AVATARS,
    commUsers: COMM_USERS,
    nearYouIds: NEAR_YOU_IDS,
    basicUsers: BASIC_USERS,
    followerOnly: FOLLOWER_ONLY,
    researchers: RESEARCHERS,
    explorationFollowers: EXPLORATION_FOLLOWERS,
    researcherNiceBase: RESEARCHER_NICE_BASE
  }
};
`;

const sandbox = vm.createContext({});
vm.runInContext(bundled, sandbox);
const data = sandbox.__data;
if (!data) {
  console.error("__data missing");
  process.exit(1);
}

fs.mkdirSync(mockDir, { recursive: true });

function stripEvidenceSearchBlob(ev) {
  const copy = JSON.parse(JSON.stringify(ev));
  for (const id of Object.keys(copy)) {
    if (copy[id] && typeof copy[id] === "object" && "searchBlob" in copy[id]) {
      delete copy[id].searchBlob;
    }
  }
  return copy;
}

fs.writeFileSync(path.join(mockDir, "feed.runtime.json"), JSON.stringify(data.feed, null, 2));
fs.writeFileSync(path.join(mockDir, "explorations.json"), JSON.stringify(data.explorations, null, 2));
fs.writeFileSync(
  path.join(mockDir, "explorationEvidence.json"),
  JSON.stringify(stripEvidenceSearchBlob(data.explorationEvidence), null, 2)
);

const followingExplorerIds = [
  "sam-johnson",
  "maya-chen",
  "sophie-turner",
  "james-w",
  "lucas-park",
  "inge-voss",
  "mark-douglas",
  "nina-fischer",
  "raj-kumar",
  "lisa-cook",
  "peter-brown",
  "sara-grant",
  "chris-norton",
  "eva-palmer",
  "zara-thomas",
  "kai-reed",
  "obi-evans",
  "fen-lim",
  "dex-woods",
  "mia-taylor",
  "ben-nelson",
  "julia-lane",
  "kim-oliver",
  "felix-white"
];

const communityOut = {
  ...data.community,
  socialMeta: {
    followingExplorerIds,
    followerIdsExpanded: followingExplorerIds,
    followingResearcherIds: ["dr-elena-marsh"]
  }
};

fs.writeFileSync(path.join(mockDir, "community.json"), JSON.stringify(communityOut, null, 2));

console.log("OK: feed.runtime.json, explorations.json, explorationEvidence.json, community.json");
