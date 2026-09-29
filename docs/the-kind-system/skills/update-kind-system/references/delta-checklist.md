# Delta checklist

This checklist gives the fields a decision needs before it can be written, by change type. It's the type-specific checklist from Rule 3.1.2 as applied to Kind System changes.

Legend: **B** = blocking (ask before writing) · **P** = may be `pending` (write it, and list it under Open gaps) · **D** = derive it yourself from the repo or docs, and cite the source.

## Every decision

| Field | Req | Notes |
|---|---|---|
| Requested end state, stated precisely | B | "Make it warmer" isn't enough. Ask for a value, or offer options. |
| Rationale: why this change, why now | B | Never invent it. Quote the user. |
| Sources and materials behind it | B | Files, links, comments, decks, research. If there are none, record "none supplied". |
| Author (person) | D | From the git user and the prompt. |
| Sections, rules, and docs affected | D | Section numbers and doc files. |
| Current documented state | D | Quoted. |
| Current code state | D | Paths, at the current SHA. |
| Alternatives considered | P | Ask. If none were considered, record that. |
| Reviewer(s) for the required touchpoints | P | Names only when the user gives them. Otherwise `pending`. |
| Supersedes an earlier decision? | D | Search `decisions/` for decisions on the same section or token. |

## `token`

| Field | Req | Notes |
|---|---|---|
| Token name(s) and new value(s) | B | Exact hex / number. |
| New token or change to an existing one | D | Check `apps/mobile/src/theme/`. |
| Platform behaviour | D | Whether it uses `px()` (scaled on web) or `rem()` (not scaled). |
| Contrast / accessibility check for colour pairs | B | Compute WCAG contrast against every surface the token is used on (grep usages). If it fails AA, ask whether to proceed. |
| Where it's used | D | Grep `apps/mobile/src` for the token name and the raw value. Include raw-hex drift that the change would fix or leave. |
| Website impact | B | Does `apps/kind-website/style.css` change as well? Ask, because the website's status as a Design System consumer is still open. |
| Code change in scope? | B | Docs only, or also `apps/mobile/src/theme/*`. |
| Touchpoint | D | Touchpoint 2 (visual change): design reviewer + two developers. |

## `primitive`

| Field | Req | Notes |
|---|---|---|
| New component or fix to an existing one | D | Check `apps/mobile/src/components/primitives/`. A new one → Touchpoint 3. |
| Purpose, props, and variants | B | For new components. |
| Tokens it uses | D | From the source or the proposal. Any new token → add a `token` decision. |
| Accessibility: role, state, touch target ≥ `heights` minimums | B | |
| Screens affected | D | Grep for imports. |
| Touchpoint | D | 2 if visual. 3 if new. |

## `governance`

| Field | Req | Notes |
|---|---|---|
| Rule text: new, amended, or removed | B | Exact wording. Keep numbering stable. |
| Does it change a §0.1 touchpoint or the §3 gate? | D | If yes, flag it prominently and get explicit confirmation from the user. |
| Precedent / external source | P | Kind's style is to cite a precedent next to each rule. Record the URL and access date. |
| Enforcement: how compliance will be checked | P | In repo (CI, CODEOWNERS, a test) or out of repo. This feeds `implementation-status.md`. |
| Implementation status on adoption | D | It is usually `Specified`. |

## `pipeline`

| Field | Req | Notes |
|---|---|---|
| Step(s) added, removed, or reordered | B | |
| Human touchpoint at each gate | B | No gate without a named human role (§0.1). |
| Data-handling effect (personalised vs deidentified) | B | Rule 4.4.1. |
| Figure 3a–3c impact | D | If the flow changes, add a `figure` decision. |
| Code evidence | D | `apps/api/src/lib/cent/`, `centShort/`, `apps/api/scripts/seed-kind.mjs`, consent screens. |

## `infrastructure`

| Field | Req | Notes |
|---|---|---|
| Component, technology, and version | B | |
| Is it in the repo now? | D | `package.json` files, `apps/`, `.github/workflows/`. |
| §5 table row and status | D | |
| Figure 1 / Figure 4 impact | D | If the diagram changes, add a `figure` decision. |

## `figure`

| Field | Req | Notes |
|---|---|---|
| Export file(s) | B | The user supplies them, or the agent exports with Figma tools only if the user asks. Save them to `context/` and `images/`. |
| FigJam file URL and node ID | B | Still missing for 2026.08.28. Ask for it every time until it's recorded. |
| Provenance: direct export or reconstruction | B | |
| SHA-256 of the new image | D | Add it to the release's context `sources.md`. |

## `status`

| Field | Req | Notes |
|---|---|---|
| Which row(s) change, and from what status to what | D | |
| Evidence path(s) at the current SHA | D | Must exist. |
| Should the rule text change as well? | B | Usually not. Status and rules are kept separate. |

## `correction`

| Field | Req | Notes |
|---|---|---|
| What was wrong, and where (release/decision or doc section) | B | |
| Evidence that it was wrong | B | |
| Supersede, or annotate in the new release only | D | Never rewrite an accepted folder. The new decision explains the correction. |
