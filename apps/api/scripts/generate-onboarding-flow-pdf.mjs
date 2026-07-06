#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { ONBOARDING_STEPS } from "../../mobile/src/data/explorerOnboarding.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

const COLORS = {
  greenDark: "#22401F",
  greenLight: "#E6ECD0",
  orange: "#F4A261",
  bg: "#F7F8F2",
  surface: "#FFFFFF",
  text: "#1F2A1F",
  textMuted: "#666666",
  border: "#DADFD2",
  amberBg: "#FDF0E4",
  amberText: "#8A4A1A"
};

const AUTH_SCREENS = [
  {
    id: "login",
    phase: "Authentication",
    title: "Login",
    headline: "Welcome back.",
    subhead: "Sign in with your email and password.",
    uiType: "auth-form",
    fields: ["Email", "Password"],
    actions: ["Sign in", "Create account → Sign Up"],
    next: "Explorer onboarding (if first visit) or Main app tabs"
  },
  {
    id: "signup",
    phase: "Authentication",
    title: "Sign Up",
    headline: "Create your account",
    subhead: "Use your email and a password to get started.",
    uiType: "auth-form",
    fields: ["Name", "Email", "Password (min 8 chars)"],
    actions: ["Create account"],
    branch: "Optional — reached from Login",
    next: "Explorer onboarding"
  }
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stepUiDescription(step) {
  switch (step.type) {
    case "welcome":
      return {
        headline: 'Understand what actually works for you.',
        body: "Kind blob illustration",
        uiType: "welcome"
      };
    case "message":
      if (step.bubble) {
        return {
          headline: step.bubble,
          body: "Kind blob illustration",
          uiType: "intro-bubble"
        };
      }
      return {
        headline: step.title,
        body: [
          step.body,
          step.note
            ? step.note.startsWith("Note:")
              ? step.note
              : `Note: ${step.note}`
            : null
        ]
          .filter(Boolean)
          .join("\n\n"),
        uiType: "value-prop",
        icon: step.icon
      };
    case "yesNo":
      return {
        headline: step.title,
        body: step.body,
        uiType: "yes-no",
        bullets: step.bullets,
        requireYes: step.requireYes
      };
    case "text":
      return {
        headline: step.title,
        body: `Text field: ${step.label}`,
        uiType: "text-input",
        placeholder: step.placeholder
      };
    case "year":
      return {
        headline: step.title,
        body: `Numeric field: ${step.label}`,
        uiType: "text-input",
        placeholder: step.placeholder
      };
    case "singleSelect":
      return {
        headline: step.title,
        body: "Single-choice cards",
        uiType: "single-select",
        options: step.options.map((o) => o.label)
      };
    case "multiSelect":
      return {
        headline: step.title,
        body: "Multi-select cards (pick one or more)",
        uiType: "multi-select",
        options: step.options.map((o) => o.label)
      };
    case "reminders":
      return {
        headline: step.title,
        body: step.body,
        uiType: "yes-no"
      };
    case "notifications":
      return {
        headline: step.title,
        body: step.body,
        uiType: "notifications",
        branch: "Only shown if user chose Yes on Set reminders"
      };
    case "finish":
      return {
        headline: step.title,
        body: step.body,
        uiType: "finish"
      };
    default:
      return { headline: step.title || step.id, body: "", uiType: "generic" };
  }
}

function buildOnboardingScreens() {
  return ONBOARDING_STEPS.map((step, index) => {
    const ui = stepUiDescription(step);
    const progressIndex = ONBOARDING_STEPS.slice(0, index + 1).filter((s) => s.showProgress).length;
    const progressTotal = ONBOARDING_STEPS.filter((s) => s.showProgress).length;

    return {
      id: step.id,
      phase: "Explorer onboarding",
      stepNumber: index + 1,
      title: step.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      continueLabel: step.continueLabel,
      showProgress: step.showProgress,
      progress: step.showProgress ? `${progressIndex} / ${progressTotal}` : null,
      showBack: index > 0,
      ...ui
    };
  });
}

function renderPhoneScreen(screen, screenIndex) {
  const progressBar = screen.showProgress
    ? `<div class="progress-track"><div class="progress-fill" style="width:${(parseInt(screen.progress, 10) / parseInt(screen.progress.split(" / ")[1], 10)) * 100}%"></div></div>`
    : `<div class="logo-mark">kind</div>`;

  let content = "";

  if (screen.uiType === "welcome") {
    content = `
      <div class="headline">Understand what actually <span class="accent">works for you.</span></div>
      <div class="blob"></div>
    `;
  } else if (screen.uiType === "intro-bubble") {
    content = `
      <div class="bubble">${escapeHtml(screen.headline)}</div>
      <div class="blob"></div>
    `;
  } else if (screen.uiType === "auth-form") {
    content = `
      <div class="headline">${escapeHtml(screen.headline)}</div>
      <div class="sub">${escapeHtml(screen.subhead)}</div>
      <div class="blob small"></div>
      ${(screen.fields || [])
        .map(
          (f) => `
        <div class="field">
          <div class="field-label">${escapeHtml(f)}</div>
          <div class="field-input"></div>
        </div>`
        )
        .join("")}
    `;
  } else if (screen.uiType === "yes-no") {
    content = `
      <div class="title">${escapeHtml(screen.headline)}</div>
      ${screen.body ? `<div class="body">${escapeHtml(screen.body)}</div>` : ""}
      ${(screen.bullets || [])
        .map((b) => `<div class="bullet">✓ ${escapeHtml(b)}</div>`)
        .join("")}
      <div class="yes-no">
        <div class="choice yes">Yes</div>
        <div class="choice no">No</div>
      </div>
      ${screen.requireYes ? `<div class="warn">Requires Yes to continue</div>` : ""}
    `;
  } else if (screen.uiType === "text-input") {
    content = `
      <div class="title">${escapeHtml(screen.headline)}</div>
      <div class="field">
        <div class="field-label">${escapeHtml(screen.placeholder || "Input")}</div>
        <div class="field-input"></div>
      </div>
    `;
  } else if (screen.uiType === "single-select" || screen.uiType === "multi-select") {
    content = `
      <div class="title">${escapeHtml(screen.headline)}</div>
      ${(screen.options || [])
        .map((o) => `<div class="option">${escapeHtml(o)}</div>`)
        .join("")}
    `;
  } else if (screen.uiType === "notifications") {
    content = `
      <div class="title">${escapeHtml(screen.headline)}</div>
      <div class="body">${escapeHtml(screen.body)}</div>
      <div class="notif-card">
        <div class="notif-title">Daily check-in reminders</div>
        <div class="notif-body">A short nudge each day to log your exploration data.</div>
      </div>
      <div class="btn-primary">Allow notifications</div>
      <div class="link-muted">Not now</div>
    `;
  } else if (screen.uiType === "finish") {
    content = `
      <div class="headline finish">${escapeHtml(screen.headline)}</div>
      <div class="body">${escapeHtml(screen.body)}</div>
    `;
  } else {
    content = `
      <div class="title">${escapeHtml(screen.headline)}</div>
      ${screen.body ? `<div class="body">${escapeHtml(screen.body)}</div>` : ""}
    `;
  }

  const meta = [
    screen.phase,
    screen.stepNumber ? `Step ${screen.stepNumber}` : null,
    screen.progress ? `Progress ${screen.progress}` : "No progress bar",
    screen.branch ? screen.branch : null
  ]
    .filter(Boolean)
    .join(" · ");

  return `
    <section class="screen-page">
      <div class="screen-header">
        <div class="screen-num">${String(screenIndex).padStart(2, "0")}</div>
        <div>
          <h2>${escapeHtml(screen.title)}</h2>
          <p class="meta">${escapeHtml(meta)}</p>
        </div>
      </div>
      <div class="screen-layout">
        <div class="phone">
          <div class="phone-notch"></div>
          <div class="phone-header">
            ${screen.showBack ? `<div class="back">‹</div>` : progressBar}
          </div>
          <div class="phone-body">${content}</div>
          <div class="phone-footer">
            <div class="btn-continue">${escapeHtml(screen.continueLabel || screen.actions?.[0] || "Continue")}</div>
          </div>
        </div>
        <div class="screen-notes">
          <h3>Navigation</h3>
          <ul>
            ${screen.showBack ? "<li>Back chevron returns to previous screen</li>" : "<li>Kind logo shown (no back on first screen)</li>"}
            <li>Primary action: <strong>${escapeHtml(screen.continueLabel || "Continue")}</strong></li>
            ${screen.next ? `<li>Next: ${escapeHtml(screen.next)}</li>` : screen.uiType === "finish" ? "<li>Completes onboarding → Main app tabs</li>" : "<li>Advances to next step</li>"}
          </ul>
          ${screen.branch ? `<p class="branch-note">${escapeHtml(screen.branch)}</p>` : ""}
          ${screen.answerKey ? `<p class="data-note">Saved answer key: <code>${escapeHtml(screen.answerKey)}</code></p>` : ""}
        </div>
      </div>
    </section>
  `;
}

function buildHtml(allScreens) {
  const flowSteps = [
    "Login",
    "Sign Up (optional)",
    ...ONBOARDING_STEPS.map((s) => s.id),
    "Main app tabs"
  ];

  const screenPages = allScreens.map((s, i) => renderPhoneScreen(s, i + 1)).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Kind App — Onboarding Flow</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: ${COLORS.text};
      background: #fff;
      margin: 0;
      font-size: 11px;
      line-height: 1.45;
    }
    .cover {
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 24mm 8mm;
      page-break-after: always;
      background: linear-gradient(160deg, ${COLORS.bg} 0%, ${COLORS.greenLight} 100%);
    }
    .cover h1 {
      font-size: 34px;
      margin: 0 0 8px;
      color: ${COLORS.greenDark};
      letter-spacing: -0.02em;
    }
    .cover .subtitle {
      font-size: 16px;
      color: ${COLORS.textMuted};
      margin-bottom: 28px;
    }
    .cover .summary {
      max-width: 520px;
      font-size: 13px;
      color: ${COLORS.text};
      margin-bottom: 24px;
    }
    .flow-diagram {
      background: ${COLORS.surface};
      border: 1px solid ${COLORS.border};
      border-radius: 12px;
      padding: 16px 18px;
      max-width: 620px;
    }
    .flow-diagram h3 {
      margin: 0 0 10px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: ${COLORS.greenDark};
    }
    .flow-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    .flow-chip {
      background: ${COLORS.greenLight};
      color: ${COLORS.greenDark};
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
    }
    .flow-arrow { color: ${COLORS.textMuted}; font-size: 10px; }
    .flow-branch {
      margin-top: 10px;
      padding: 10px 12px;
      background: ${COLORS.amberBg};
      border-radius: 8px;
      color: ${COLORS.amberText};
      font-size: 10px;
    }
    .overview {
      page-break-after: always;
      padding: 8mm 0;
    }
    .overview h2 {
      font-size: 20px;
      color: ${COLORS.greenDark};
      margin: 0 0 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th, td {
      border: 1px solid ${COLORS.border};
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: ${COLORS.greenLight};
      color: ${COLORS.greenDark};
      font-weight: 600;
    }
    tr:nth-child(even) td { background: ${COLORS.bg}; }
    .screen-page {
      page-break-after: always;
      padding: 4mm 0 8mm;
    }
    .screen-header {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 12px;
      border-bottom: 2px solid ${COLORS.greenDark};
      padding-bottom: 8px;
    }
    .screen-num {
      font-size: 28px;
      font-weight: 700;
      color: ${COLORS.greenDark};
      line-height: 1;
      min-width: 36px;
    }
    .screen-header h2 {
      margin: 0;
      font-size: 18px;
      color: ${COLORS.text};
    }
    .meta {
      margin: 4px 0 0;
      color: ${COLORS.textMuted};
      font-size: 10px;
    }
    .screen-layout {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 20px;
      align-items: start;
    }
    .phone {
      width: 220px;
      height: 420px;
      border: 2px solid ${COLORS.border};
      border-radius: 28px;
      background: ${COLORS.bg};
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    .phone-notch {
      width: 72px;
      height: 8px;
      background: ${COLORS.border};
      border-radius: 999px;
      margin: 8px auto 0;
    }
    .phone-header {
      display: flex;
      align-items: center;
      padding: 10px 14px 6px;
      min-height: 36px;
    }
    .logo-mark {
      font-weight: 800;
      color: ${COLORS.greenDark};
      font-size: 14px;
      letter-spacing: -0.03em;
    }
    .back {
      width: 24px;
      height: 24px;
      border-radius: 12px;
      background: ${COLORS.greenLight};
      color: ${COLORS.greenDark};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
    }
    .progress-track {
      flex: 1;
      height: 6px;
      background: ${COLORS.border};
      border-radius: 999px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: ${COLORS.greenDark};
      border-radius: 999px;
    }
    .phone-body {
      flex: 1;
      padding: 8px 14px;
      overflow: hidden;
    }
    .phone-footer {
      padding: 10px 14px 16px;
    }
    .headline {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 8px;
    }
    .headline .accent, .accent { color: ${COLORS.orange}; }
    .title {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 6px;
    }
    .sub, .body {
      font-size: 9px;
      color: ${COLORS.textMuted};
      line-height: 1.4;
      margin-bottom: 8px;
    }
    .bubble {
      background: ${COLORS.surface};
      border-radius: 12px;
      padding: 10px;
      font-size: 9px;
      margin-bottom: 8px;
      border: 1px solid ${COLORS.border};
    }
    .blob {
      width: 80px;
      height: 80px;
      border-radius: 50% 45% 55% 50%;
      background: radial-gradient(circle at 30% 30%, ${COLORS.orange}, ${COLORS.greenDark});
      margin: 12px auto;
      opacity: 0.85;
    }
    .blob.small { width: 56px; height: 56px; margin: 8px auto 12px; }
    .field {
      background: ${COLORS.surface};
      border: 1px solid ${COLORS.border};
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 8px;
    }
    .field-label {
      font-size: 8px;
      color: ${COLORS.textMuted};
      margin-bottom: 4px;
    }
    .field-input {
      height: 14px;
      background: ${COLORS.bg};
      border-radius: 4px;
    }
    .yes-no { display: grid; gap: 6px; margin-top: 8px; }
    .choice {
      border-radius: 8px;
      padding: 8px;
      font-size: 9px;
      font-weight: 600;
      text-align: center;
      border: 1px solid ${COLORS.border};
      background: ${COLORS.surface};
    }
    .choice.yes { border-color: ${COLORS.greenDark}; background: ${COLORS.greenLight}; color: ${COLORS.greenDark}; }
    .option {
      border: 1px solid ${COLORS.border};
      border-radius: 8px;
      padding: 7px 8px;
      margin-bottom: 5px;
      font-size: 8px;
      background: ${COLORS.surface};
    }
    .notif-card {
      background: ${COLORS.greenLight};
      border: 1px solid ${COLORS.greenDark};
      border-radius: 8px;
      padding: 8px;
      margin-bottom: 8px;
    }
    .notif-title { font-size: 9px; font-weight: 700; color: ${COLORS.greenDark}; }
    .notif-body { font-size: 8px; color: ${COLORS.textMuted}; margin-top: 2px; }
    .btn-primary, .btn-continue {
      background: ${COLORS.greenDark};
      color: #fff;
      border-radius: 10px;
      padding: 9px;
      text-align: center;
      font-size: 9px;
      font-weight: 600;
    }
    .link-muted {
      text-align: center;
      font-size: 8px;
      color: ${COLORS.textMuted};
      margin-top: 6px;
    }
    .bullet { font-size: 8px; color: ${COLORS.textMuted}; margin-bottom: 4px; }
    .warn {
      font-size: 8px;
      color: ${COLORS.amberText};
      background: ${COLORS.amberBg};
      padding: 6px;
      border-radius: 6px;
      margin-top: 6px;
    }
    .screen-notes h3 {
      margin: 0 0 8px;
      font-size: 12px;
      color: ${COLORS.greenDark};
    }
    .screen-notes ul {
      margin: 0;
      padding-left: 16px;
      font-size: 10px;
    }
    .screen-notes li { margin-bottom: 4px; }
    .branch-note, .data-note {
      margin-top: 10px;
      padding: 8px 10px;
      background: ${COLORS.amberBg};
      border-radius: 8px;
      color: ${COLORS.amberText};
      font-size: 9px;
    }
    .data-note { background: ${COLORS.greenLight}; color: ${COLORS.greenDark}; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 9px; }
    .footer-note {
      margin-top: 16px;
      font-size: 9px;
      color: ${COLORS.textMuted};
      page-break-before: always;
      padding-top: 8mm;
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>Kind App — Onboarding Flow</h1>
    <p class="subtitle">Screen-by-screen reference · Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
    <p class="summary">
      New users authenticate via email/password, then complete the Explorer onboarding wizard
      (${ONBOARDING_STEPS.length} steps). On completion they enter the main app (Home, Explore, Me tabs).
      Steps are defined in <code>apps/mobile/src/data/explorerOnboarding.js</code>.
    </p>
    <div class="flow-diagram">
      <h3>High-level flow</h3>
      <div class="flow-row">
        ${flowSteps
          .slice(0, 6)
          .map((s) => `<span class="flow-chip">${escapeHtml(s)}</span><span class="flow-arrow">→</span>`)
          .join("")}
        <span class="flow-chip">… ${ONBOARDING_STEPS.length - 4} more steps …</span>
        <span class="flow-arrow">→</span>
        <span class="flow-chip">Main tabs</span>
      </div>
      <div class="flow-branch">
        <strong>Conditional branch:</strong> Step "Turn on notifications" is skipped unless the user selects Yes on "Set reminders".
      </div>
    </div>
  </div>

  <div class="overview">
    <h2>Step index</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Phase</th>
          <th>Screen ID</th>
          <th>Type</th>
          <th>Title / content</th>
          <th>Continue</th>
        </tr>
      </thead>
      <tbody>
        ${AUTH_SCREENS.map(
          (s, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(s.phase)}</td>
            <td>${escapeHtml(s.id)}</td>
            <td>auth</td>
            <td>${escapeHtml(s.headline)}</td>
            <td>${escapeHtml(s.actions?.[0] || "—")}</td>
          </tr>`
        ).join("")}
        ${ONBOARDING_STEPS.map(
          (s, i) => `
          <tr>
            <td>${AUTH_SCREENS.length + i + 1}</td>
            <td>Explorer onboarding</td>
            <td>${escapeHtml(s.id)}</td>
            <td>${escapeHtml(s.type)}</td>
            <td>${escapeHtml(s.title || s.bubble || s.id)}</td>
            <td>${escapeHtml(s.continueLabel)}</td>
          </tr>`
        ).join("")}
        <tr>
          <td>${AUTH_SCREENS.length + ONBOARDING_STEPS.length + 1}</td>
          <td>Main app</td>
          <td>main-tabs</td>
          <td>tabs</td>
          <td>Home · Explore · Me</td>
          <td>—</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${screenPages}

  <div class="footer-note">
    Source: <code>apps/mobile/src/data/explorerOnboarding.js</code>,
    <code>ExplorerOnboardingScreen.js</code>, <code>AuthNavigator.js</code>.
    Progress bar shows on steps where <code>showProgress: true</code> (18 of ${ONBOARDING_STEPS.length} onboarding steps).
  </div>
</body>
</html>`;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: false, ...opts });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "google-chrome",
  "chromium"
];

function findChrome() {
  for (const candidate of CHROME_PATHS) {
    if (candidate.includes("/")) {
      if (existsSync(candidate)) return candidate;
    }
  }
  return CHROME_PATHS[2];
}

async function htmlToPdf(htmlOut, pdfOut) {
  const chrome = findChrome();
  await run(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfOut}`,
      `file://${htmlOut}`
    ],
    { cwd: repoRoot }
  );
}

async function main() {
  const onboardingScreens = buildOnboardingScreens().map((s) => ({
    ...s,
    answerKey: ONBOARDING_STEPS.find((step) => step.id === s.id)?.answerKey
  }));
  const allScreens = [...AUTH_SCREENS, ...onboardingScreens];

  const outDir = path.join(__dirname, "../output/onboarding-flow");
  mkdirSync(outDir, { recursive: true });

  const htmlOut = path.join(outDir, "onboarding-flow-preview.html");
  const pdfOut = path.join(outDir, "kind-onboarding-flow.pdf");
  const pdfDownloads = path.join(homedir(), "Downloads", "kind-onboarding-flow.pdf");

  const html = buildHtml(allScreens);
  writeFileSync(htmlOut, html);

  await htmlToPdf(htmlOut, pdfOut);

  copyFileSync(pdfOut, pdfDownloads);
  console.log(`HTML: ${htmlOut}`);
  console.log(`PDF: ${pdfOut}`);
  console.log(`Copied to ${pdfDownloads}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
