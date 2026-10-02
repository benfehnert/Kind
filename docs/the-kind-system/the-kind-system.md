# THE KIND SYSTEM

### Rules for Building, Reviewing, and Deploying Features

A controlled document governing feature development, the design system, AI-generated output, and the research protocol pipeline at Kind.

*Version 2026.09.30 — Accepted 2026-10-02 — 30 September 2026*

*Previous versions: 2026.09.29.1; 2026.09.29; 2026.08.28 (originally issued as "Version 0.1 — Draft for review"). Versions use CalVer (`YYYY.MM.DD`). Every version and the reasoning behind it is recorded in [`decisions/`](decisions/README.md). Implementation state against the codebase is tracked in [`implementation-status.md`](implementation-status.md). Visual token values are recorded in [`design-tokens.md`](design-tokens.md).*

---

## 0. Purpose and Scope

This document is the governing specification for how Kind builds, reviews, and deploys features across its product, its design system, and its research pipeline. It applies to every contributor and every automated agent operating on Kind's codebase, design system, or protocol-generation tooling.

Kind makes extensive use of artificial intelligence: to generate and revise interface code, to draft and revise design-system components, and to convert published research into deliverable exploration protocols. This document exists because that extent of AI use does not reduce the need for rigor — it increases it. A process is not auditable because a human could, in principle, explain what happened. It is auditable because every material decision, human or AI, leaves a record that a third party can reconstruct without asking anyone what they meant.

Three properties are required of every process described below, without exception:

- **Determinism where determinism is possible.** The same inputs, run through the same gate, produce the same class of output. Where AI introduces variability, that variability is bounded and reviewed, not left open.
- **A named human accountable** for every output that reaches a participant, a researcher, or production. "The AI generated it" is not a disposition.
- **A retained decision trail** for every artifact that passes a gate, sufficient to answer, after the fact, what was reviewed, by whom, against what standard, and why it passed or failed.

Sections 1 and 5 describe Kind's system architecture and technical infrastructure. Sections 2 through 4 describe the three governed workflows: the design system, AI-generated output in general, and the exploration (research protocol) pipeline specifically. Section 6 defines terms used throughout. Where a workflow at Kind is benchmarked against an external precedent, that precedent is described alongside the rule it substantiates, not collected into a separate literature review — the point is not that other companies have done something similar; it is that the specific mechanism Kind requires has already been shown, elsewhere, to hold up under real operating conditions.

### 0.1 Human-in-the-Loop Touchpoints

AI participates in generation at every stage of this document. It is never permitted to participate in the decision that a generated artifact is fit to ship. That decision is reserved, at every stage, for a named human or a named human body. The table below is a single index of every point in this document where that reservation applies; each is also marked inline, where it occurs, with a 👤 **HUMAN-IN-THE-LOOP** callout.

| # | Touchpoint | Who decides | What is decided | Section |
|---|---|---|---|---|
| 1 | Design System change review | Code reviewer (someone other than the author) | Whether a code-level change to the Design System merges | 2.2.1 |
| 2 | Design System visual sign-off | Design reviewer + two developer approvers; merge restricted to named maintainers | Whether a visual change to the Design System merges | 2.2.2 |
| 3 | New component/pattern review | Kind's scheduled design-system review session | Whether a new component or pattern is accepted into the Design System | 2.2.3 |
| 4 | AI Oversight Gate review | A named human reviewer, assigned per artifact type | Pass/Fail on every AI-generated artifact, before it may be called deployment-ready | 3.1.3 |
| 5 | Kind-readiness determination | Head of Science (interim: see Section 4.2), applying the Section 4.1 checklist | Pass/Fail on whether a draft exploration is Kind-ready | 4.2 |
| 6 | Protocol Review Board review | Kind's Protocol Review Board, with quorum (chair, Head of Science seat, non-scientist member, unaffiliated member) | Scientific, clinical, and user-safety approval of a review-ready exploration, before IRB submission | 4.3 |
| 7 | IRB determination | BRANY, Kind's independent IRB (full board, expedited, or fuller review) | Formal ethics clearance, including whether an exploration fits an approved template; required before any exploration reaches an individual | 4.3 |
| 8 | DPO protocol sign-off | Data Protection Officer | Data-protection and security sign-off on every protocol; can be withheld independently of the Protocol Review Board's vote | 4.3 |
| 9 | Re-identification review | Data Protection Officer | Whether a de-identified dataset or export may leave Kind, after Safe Harbor de-identification and cohort minimums are applied | 4.4 |
| 10 | Live AI output review | Safety Officer | Scheduled review of a sample of logged AI-generated messages shown to individuals, and whether the live AI system must be paused or re-gated | 3.3 |

No artifact, code change, exploration protocol, or dataset skips from AI generation directly to production, App, or Dashboard without passing through at least one row of this table. Section 4.4's data *routing* (personalised versus de-identified streams) is, by contrast, deliberately automated and technical rather than human-adjudicated. De-identification itself is a technical control *followed by* a human review (Touchpoint 9). Section 3.3's runtime limits on live AI output are also fixed technical controls, and they are reviewed after the fact by sampling (Touchpoint 10), not message by message. These distinctions are intentional and are called out where they occur, so that "human-reviewed" is never claimed for a step that is actually a fixed technical control.

### 0.2 Rules That Bind Machines, Not Just People

The design systems benchmarked throughout this document — Section 2.2's Shopify Polaris, IBM Carbon, and Atlassian Design System among them — are, in the end, governance built around human contributors. A contributor reads a contribution guide, a style guide, a component spec; a reviewer checks whether what was submitted follows it; deviation is caught, if it is caught, after the fact, at review. The guide itself does nothing to a contributor who has not read it, has misread it, or decides a particular case warrants an exception.

Kind's rules are written to be read by both. Every document referenced in this system — the Design System, language style guides, protocol-generation checklists, AI agent instructions — is authored to be directly consumable by an agent at runtime, not only by a person in advance of writing code. This is a different claim from "Kind uses AI to help build things." Kind does not put a general-purpose model into its codebase, design system, or protocol pipeline and trust it to have absorbed the rules the way a new hire eventually does. Each agent is given an explicit, scoped instruction set before it is inserted into a task: what information it is permitted to draw on, what methods it is permitted to use, and when it is permitted to use them. An agent generating a component is not holding the whole Design System in an undifferentiated context window and hoping the relevant part surfaces — it is handed the specific, version-controlled rules that govern that task, in the same form the AI Oversight Gate in Section 3 requires it to declare as its inputs (Rule 3.1.1).

> **Rule 0.2.1.** No AI agent operates on Kind's codebase, design system, or protocol-generation tooling under general, unconstrained model access. Every such agent is given a scoped, version-controlled instruction set — defining the information and methods available to it, and when each applies — before it is inserted into a task.

This is what makes the human-in-the-loop cycle in Section 0.1 iterative rather than merely repeated: the same instruction set an agent was constrained by is available for a human reviewer to check the agent's output against, and a failure at any Section 0.1 touchpoint can be traced to a specific, revisable line in a specific, version-controlled document — not to an opaque judgment call an unconstrained model made on its own.

---

## 1. System Architecture

Kind's product surface is a three-tier chain: the Kind App calls the Kind API, which reads and writes the Kind DB. Two governed layers sit alongside this chain rather than inside it, and every component of the chain is required to conform to both:

- The **Design System**, which codifies visual design, language style, accessibility, and coding standards as the single source of truth for how the App and Dashboard are built (Section 2).
- **AI workflows**, which govern how data structures, normalisation, and scheduling are handled wherever an AI process participates in producing or transforming Kind data (Section 3).

No component of the Kind App, Kind API, or Kind DB is permitted to diverge from the Design System's codified standards on the basis that a human or an AI agent judged a local deviation to be an improvement. Deviations are proposed as changes to the Design System itself, through the process in Section 2.2, not implemented ad hoc.

> **Implementation status (2026.09.29).** Kind App, Kind API, and Kind DB are implemented (`apps/mobile`, `apps/api`, `supabase/`). The Design System is partially implemented as code tokens and primitives in `apps/mobile/src/theme/` and `apps/mobile/src/components/primitives/`, not yet in Storybook. The Kind Researcher Dashboard is specified, not implemented. See [`implementation-status.md`](implementation-status.md).

<p align="center"><img src="images/fig-1-system-architecture.png" alt="Figure 1. System Architecture — Broad Relationships. Exported directly from the Kind System FigJam board (node 16:935), 28 August 2026." width="100%"/></p>

<p align="center"><em>Figure 1. System Architecture — Broad Relationships. Exported directly from the Kind System FigJam board (node 16:935), 28 August 2026.</em></p>

---

## 2. The Design System: Source of Truth

The Design System is the single source of truth for four codified domains: visual design, language style, accessibility, and coding standards. "Source of truth" is not a description of intent; it is an operating rule.

> **Rule 2.1.** No visual, linguistic, accessibility, or coding decision may be implemented in the Kind App, Kind API, or Kind Researcher Dashboard that contradicts the current version of the Design System. Where the Design System is silent, the implementer proposes an addition to the Design System before proceeding, rather than deciding locally.

### 2.1 Where the Design System Lives

The Design System is documented in Storybook. Storybook is not limited to rendering UI components and running accessibility tests against them — it is also the repository of record for higher-order system documentation, including this document. A rule that exists only in a person's memory, a chat thread, or a slide deck is not part of the Design System and cannot be enforced as one.

> **Implementation status (2026.09.29).** Storybook is specified, not implemented: there is no Storybook configuration or story file in the repository. Until it exists, visual token values live in `apps/mobile/src/theme/` (recorded in [`design-tokens.md`](design-tokens.md)). Higher-order system documentation, including this document, lives in `docs/the-kind-system/`.

Below the level of visual and interaction rules, three further artifacts are kept under source control in the Kind codebase itself, versioned identically to application code: language style guides, AI agent instructions, and decision logs. Placing these in version control rather than in a wiki or a shared document is deliberate — it means a change to how an AI agent is instructed to write code is itself a reviewable, diffable, revertible commit, subject to the same history as any other change to the system.

The AI agent instructions in particular are not a general orientation document written for a human to skim once. They are scoped per task — what an agent operating on the Design System may reference, and under what conditions — and consumed directly by the agent at runtime, per Rule 0.2.1. A change to those instructions is reviewed under the same rules as any other Design System change (Section 2.2): it alters what a machine, not just a person, is permitted to do.

### 2.2 Governing Change

Kind's contribution model for the Design System follows the same shape as three of the design systems most frequently cited as industry benchmarks for governed, auditable design-system change:

> **Rule 2.2.1.** Every change to a Design System component — visual, linguistic, or code-level — is submitted as a reviewable change, tested against the existing suite before merge, and accompanied by a record of what changed and why, comparable to the changeset requirement that keeps Shopify's Polaris design system's main branch continuously releasable while enforcing strict semantic versioning of breaking, additive, and internal changes.

*Reference: Shopify Polaris contribution and versioning guidelines, [github.com/Shopify/polaris — CONTRIBUTING.md](https://github.com/Shopify/polaris/blob/main/.github/CONTRIBUTING.md).*

> 👤 **HUMAN-IN-THE-LOOP (Touchpoint 1).** A code reviewer who is not the change's author decides whether a code-level Design System change merges. No change merges on the author's own approval, whether the author is a person or an AI agent acting under a person's direction.

> **Rule 2.2.2.** A change that touches a component visually requires sign-off from a design reviewer in addition to code reviewers; a change that touches code only still requires review from someone other than its author. Only a small, named set of maintainers may merge into the Design System, comparable to IBM's Carbon Design System, which requires two developer approvals for code-only changes and a design review plus two developer approvals for visual changes, with merge rights restricted to core maintainers.

*Reference: IBM Carbon Design System contribution guidelines, [github.com/carbon-design-system/carbon — CONTRIBUTING.md](https://github.com/carbon-design-system/carbon/blob/main/.github/CONTRIBUTING.md).*

> 👤 **HUMAN-IN-THE-LOOP (Touchpoint 2).** A design reviewer, plus two developer approvers, sign off on any visual change before it merges. Only a small, named set of maintainers holds merge rights into the Design System — a fixed list of people, not an open pool.

> **Rule 2.2.3.** A new component or pattern — as opposed to a fix to an existing one — is treated as a system-wide change requiring coordinated review across design, code, and documentation simultaneously, not as an ordinary pull request. Kind holds a recurring, scheduled design-system review session for exactly this class of change, comparable to Atlassian Design System's practice of restricting new-component contribution to a coordinated internal process and running fortnightly design-system critique sessions.

*Reference: Atlassian Design System contribution model, [atlassian.design/contribution](https://atlassian.design/contribution).*

> 👤 **HUMAN-IN-THE-LOOP (Touchpoint 3).** New components and patterns are accepted or rejected in a standing, scheduled review session, not by whoever happens to open the pull request. Coordinated human review across design, code, and documentation is a precondition of acceptance, not a formality applied afterward.

---

## 3. The AI Oversight Gate

This section defines the single checkpoint that every AI-enabled process at Kind is required to pass through before its output may be treated as deployment-ready. It is defined once, here, and referenced by number everywhere else in this document. No workflow is permitted to define its own alternative review pattern in place of this one.

<p align="center"><img src="images/fig-2-ai-oversight-gate.png" alt="Figure 2. The AI Oversight Gate. Exported directly from the Kind System FigJam board (node 32:2989), 28 August 2026." width="100%"/></p>

<p align="center"><em>Figure 2. The AI Oversight Gate. Exported directly from the Kind System FigJam board (node 32:2989), 28 August 2026.</em></p>

### 3.1 The Gate, Defined

> **Rule 3.1.1.** Every AI-generated artifact is produced from three declared inputs: source materials, context, and any manual prompts used to direct the generation. These inputs are retained, not discarded once generation completes.

"Context" here is not an open-ended prompt composed at the point of generation — it is the scoped, version-controlled instruction set described in Rule 0.2.1: the specific information and methods the agent was authorized to use for this task, and no others. Declaring it as an input, and retaining it, means a reviewer at Touchpoint 4 (Section 0.1) can check the output against the same constraints the agent was given, rather than reconstructing after the fact what the agent might have been told.

> **Rule 3.1.2.** A checklist specific to the artifact's type is applied to both the inputs and the generated output before the artifact is considered for review. The checklist, not the reviewer's unaided judgment, is the primary review instrument.

> **Rule 3.1.3.** A named human reviewer evaluates the AI-generated output against the checklist. The reviewer records a Pass or a Fail. There is no third outcome.

> 👤 **HUMAN-IN-THE-LOOP (Touchpoint 4 — the central gate).** This is the single point every AI-generated artifact at Kind must pass through before it can be called deployment-ready, regardless of what generated it or how confident that process was. The reviewer is named, not anonymous or rotating without record, and the Pass/Fail call is theirs alone — the checklist informs the review, it does not substitute for it.

> **Rule 3.1.4.** On Fail, the artifact returns to the input stage. It is not silently revised and resubmitted; it re-enters the gate as a new attempt, and the record of the failed attempt is retained alongside the eventual pass.

> **Rule 3.1.5.** On Pass, two things are produced together and neither is valid without the other: the deployment-ready artifact itself, and a decision trail recording what was reviewed, by whom, against which checklist, and on what basis it passed.

### 3.2 Why This Pattern, and Not Another

The shape of this gate — automated and checklist-based screening, human judgment applied at a defined point rather than everywhere, explicit failure modes to watch for, and a retained record — mirrors the pattern used by the organizations currently operating AI-assisted engineering at the largest scale:

- GitHub's own guidance for reviewing Copilot-generated code at enterprise scale layers automated tests, static analysis, and security scanning first, then requires a human to check contextual alignment, then directs reviewers to specific AI failure modes — hallucinated APIs or packages, tests that were deleted rather than fixed, missed edge cases — before a complex change is subject to a team checklist covering functionality, security, and maintainability. This is the closest publicly documented analog to the gate defined in 3.1.

  *Reference: [GitHub Docs — Reviewing AI-generated code](https://docs.github.com/en/enterprise-cloud@latest/copilot/tutorials/review-ai-generated-code).*

- Google's own published engineering review standard — the baseline against which AI-assisted output is now routinely checked industry-wide — requires review by someone other than the author across eight explicit dimensions: design, functionality, complexity, tests, naming, comments, style, and documentation. Kind's per-artifact checklists (3.1.2) are type-specific instances of this same requirement: a fixed, explicit, non-negotiable set of dimensions, not an open-ended "look it over."

  *Reference: [Google Engineering Practices — Code Review](https://google.github.io/eng-practices/review/).*

- Kind's own engineering tooling is built on Claude Code. Anthropic's published guidance for using it places a human checkpoint before execution (plan review) and before commit (diff review), rather than permitting autonomous merge. This is precedent from the tool vendor itself, not a third-party interpretation, and it is the direct basis for Rules 3.1.3 through 3.1.5: review happens at defined checkpoints, not as an afterthought.

  *Reference: [Anthropic — Claude Code Best Practices](https://code.claude.com/docs/en/best-practices).*

### 3.3 Live AI Output to Individuals

Some AI output reaches individuals at runtime: the AI companion's reminders and messages, and AI-rewritten feed copy. None of it can pass Touchpoint 4 one message at a time. Kind therefore gates the *system* that produces those messages, fixes hard limits on what it may produce, and reviews what it actually produced afterwards.

> **Rule 3.3.1.** A live AI system that generates content for individuals passes the AI Oversight Gate (Section 3.1) as a single artifact before it is enabled. That artifact is its instruction set, content library, model and version, and runtime limits. The Head of Product and the Safety Officer are the named reviewers. Any change to any of these parts re-enters the gate as a new attempt.

> **Rule 3.3.2.** Live AI output is bound by fixed runtime limits that are enforced in code, not only requested in a prompt:
> - it logs and summarises, and never gives diagnosis, treatment, dose, or other medical advice;
> - it never invents or changes a number from the individual's data;
> - crisis signals trigger the non-dismissible redirect to 911 or 988, and that redirect is never AI-generated;
> - safety copy is never rewritten by AI;
> - when the model is unavailable or its output fails a check, a deterministic template is shown instead.

> **Rule 3.3.3.** Every AI-generated message shown to an individual is logged with the instruction-set version, model, inputs, and output, as part of the audit trail of consent, prompts, confirmations, and screening.

> 👤 **HUMAN-IN-THE-LOOP (Touchpoint 10).** The Safety Officer reviews a sample of logged live AI output on a fixed schedule, together with any safety signals raised by individuals or community moderation. They can recommend pausing the system or sending it back through Rule 3.3.1. Sampling doesn't make individual messages "human-reviewed"; what it does is make the system's behaviour reviewable.

> **Implementation status (2026.09.29.1).** Partial. The only live AI output in the codebase is AI-rewritten feed copy (`apps/api/src/feedContent.js`). It has tone and safety rules in its prompt, a deterministic fallback, cohort suppression, and safety copy that is never rewritten. The limits on numbers exist only as prompt instructions, output is not logged, and there is no crisis redirect. No AI companion exists in the repository. See [`implementation-status.md`](implementation-status.md).

---

## 4. The Exploration Pipeline

An "exploration" is Kind's term for a research protocol as it moves from published evidence and internal guidelines through generation, review, ethics clearance, and deployment to individuals and researchers. This section describes that pipeline in the order it runs. Every AI-enabled step named below is required to route through the gate defined in Section 3; it is not re-described here.

### 4.1 Inputs and Generation

Protocol generation draws on three declared sources: the SPIRIT extension for N-of-1 trials (SPENT), Kind's own internal guidelines (including the approved exploration templates and the seven single-case design archetypes), and materials supplied by the research team. These are parsed and used to generate a protocol generation checklist, which in turn governs protocol generation itself and the resulting draft exploration.

AI tooling (Section 5: DSPy, GROBID) produces **draft protocols only**. A draft generated this way is never added to Kind directly. It passes the Kind-readiness gate (4.2), the Protocol Review Board (4.3), and the IRB (4.3) exactly as a protocol a person drafted would. Its use is disclosed to both the Protocol Review Board and the IRB.

> **Rule 4.1.1.** No exploration protocol may be generated without being checked against SPENT and against Kind's internal guidelines at the checklist stage. A protocol that has not been checked against both is not eligible to proceed past this step.

> **Rule 4.1.2.** A protocol drafted with AI tooling is labelled as AI-drafted in its decision trail. That label is disclosed in the Protocol Review Board and IRB submissions. It carries no shortcut through any later gate.

Kind separates the standard for *writing* a protocol from the standard for *reporting* its results, because the field does:

| Stage | Individual (N-of-1) explorations | Group analyses across individuals |
|---|---|---|
| Writing the protocol (4.1) | SPENT: the SPIRIT extension for N-of-1 trials | SPIRIT |
| Reporting results (4.4) | CENT: the CONSORT extension for N-of-1 trials | CONSORT |

SPENT and CENT are not internal conventions Kind invented for its own convenience. They are the field's canonical, peer-reviewed standards for N-of-1 protocols and N-of-1 reports, extending SPIRIT and CONSORT, which play the same roles for conventional trials. Aligning the protocol-generation checklist to SPENT means Kind's protocols contain what a journal or IRB would expect of a human-authored N-of-1 protocol. Aligning reports to CENT (Rule 4.4.3) means Kind's results can be reported to the standard a peer-reviewed journal would apply.

> **Implementation status (2026.09.29.1).** Partial. CENT-aligned *analysis and reporting* pipelines for deployed explorations exist in `apps/api/src/lib/cent/` and `apps/api/src/lib/centShort/`, covered by snapshot tests (`apps/api/tests/outputs/`). The SPENT-aligned protocol generation checklist and the generation tooling (Section 5: DSPy, GROBID) are specified, not implemented.

*References: Porcino AJ, Shamseer L, Chan AW, et al., for the SPENT group. "SPIRIT extension and elaboration for n-of-1 trials: SPENT 2019 checklist." BMJ 2020;368:m122. [doi.org/10.1136/bmj.m122](https://doi.org/10.1136/bmj.m122). Chan AW, Tetzlaff JM, Altman DG, et al. "SPIRIT 2013 Statement: defining standard protocol items for clinical trials." Ann Intern Med 2013;158:200-207. [doi.org/10.7326/0003-4819-158-3-201302050-00583](https://doi.org/10.7326/0003-4819-158-3-201302050-00583). Vohra S, Shamseer L, Sampson M, et al., for the CENT group. "CONSORT extension for reporting N-of-1 trials (CENT) 2015 Statement." BMJ 2015;350:h1738. [doi.org/10.1136/bmj.h1738](https://doi.org/10.1136/bmj.h1738). Companion: "...2015: Explanation and elaboration." J Clin Epidemiol 2016;76:9-17. [doi.org/10.1016/j.jclinepi.2015.05.004](https://doi.org/10.1016/j.jclinepi.2015.05.004). Schulz KF, Altman DG, Moher D, for the CONSORT Group. "CONSORT 2010 Statement: updated guidelines for reporting parallel group randomised trials." BMJ 2010;340:c332. [doi.org/10.1136/bmj.c332](https://doi.org/10.1136/bmj.c332).*

### 4.2 The Kind-Readiness Gate

Every draft exploration is evaluated against a single question: is it Kind-ready? This determination is an application of the AI Oversight Gate defined in Section 3 to the exploration as a whole, rather than to a single generated artifact in isolation — it uses the same Pass/Fail discipline and the same requirement for a named reviewer, applied against the protocol generation checklist from 4.1.

> 👤 **HUMAN-IN-THE-LOOP (Touchpoint 5).** The Head of Science, not the generation process itself, determines Kind-readiness. As with Touchpoint 4, the checklist structures the review; the pass/fail call is the Head of Science's. While the Head of Science role is held on an interim basis by the Chief Science Officer, who also chairs the Protocol Review Board, the same person would review the exploration at both Touchpoint 5 and Touchpoint 6. How that conflict is handled is an open point, recorded in release 2026.09.29.1.

> **Rule 4.2.1.** A draft exploration that fails the Kind-readiness check returns to the research materials stage (4.1) for rework. It does not proceed to review by a shortened path, and the failed attempt is retained in the decision trail.

> **Rule 4.2.2.** A draft exploration that passes becomes a review-ready exploration and proceeds to Section 4.3. Passing this gate is necessary but not sufficient for deployment — it does not substitute for ethics review.

<p align="center"><img src="images/fig-3a-inputs-and-gate.png" alt="Exploration Pipeline — Inputs, Generation, and the Kind-Readiness Gate" width="100%"/></p>

<p align="center"><em>Figure 3a. The Exploration Pipeline — Inputs, Generation, and the Kind-Readiness Gate (Sections 4.1–4.2). Reconstructed from the Kind System FigJam board (node 17:1968) as of 28 August 2026. <strong>Out of date since 2026.09.29.1:</strong> it shows CENT as the generation input, where the text now specifies SPENT, and it doesn't mark AI output as a draft.</em></p>

### 4.3 Protocol and Ethics Review

A review-ready exploration is reviewed by Kind's **Protocol Review Board** before it is submitted for ethics review. The Protocol Review Board is Kind's first-line research-ethics screen, and it is kept separate from product and roadmap approval. Its process runs in five steps:

1. **Prepare.** The Head of Science prepares the protocol against an approved template.
2. **Declare.** Every attendee declares their interests, and anyone conflicted steps out.
3. **Review.** The board carries out a scientific, clinical, and user-safety review, with a quorum present.
4. **Sign off.** The Data Protection Officer signs off on data protection and security.
5. **Submit to IRB.** The Head of Science sends documented screening to the IRB with the submission.

**Membership.** The Chief Science Officer chairs the board, and a rolling stand-in chair is drawn from named Science Advisory Board members when the chair is conflicted. The Head of Science is a fixed voting member. A non-scientist member and an unaffiliated member (no employment, equity, or consulting ties to Kind) are also voting members. The quorum is the chair, the Head of Science seat, the non-scientist member, and the unaffiliated member; the minimum number of voting members is to be confirmed with the IRB. Science Advisory Board members and health-category specialists are invited when a protocol needs their expertise.

The **Science Advisory Board** is advisory, not operational. It advises the Chief Science Officer and the Board of Directors on science strategy, methods, and integrity, and provides specialists and the stand-in chair to the Protocol Review Board. It does not approve explorations.

After Protocol Review Board approval and DPO sign-off, the exploration goes to **BRANY**, Kind's central, independent, AAHRPP-accredited Institutional Review Board. Research is run under an IRB-approved **umbrella protocol** with templated sub-studies, and every exploration takes one of three review routes:

| Route | When it applies |
|---|---|
| Full board | The umbrella protocol, and the first set of exemplar templates |
| Expedited | A new exploration that fits an approved template, submitted as a modification |
| Fuller review | A novel exploration, submitted as a modification request; once approved, it can become a new template |

BRANY, not Kind, decides whether an exploration fits an approved template, and it can require fuller review. The Chief Science Officer, as investigator of record, is accountable to BRANY for research run under the umbrella protocol.

> **Rule 4.3.1.** No exploration may reach individuals without a Protocol Review Board approval, a DPO sign-off, and an IRB determination on record, regardless of which IRB route applies.

> **Rule 4.3.2.** The IRB route (full board, expedited, or fuller review) is recorded as part of the decision trail. The record includes the template the exploration was submitted against, if any, and BRANY's determination of fit, so that the choice of route is auditable and not simply asserted.

> **Rule 4.3.3.** A Protocol Review Board decision is valid only with a quorum present and after every attendee has declared their interests. Conflicted members, including a conflicted chair, step out of the decision.

> 👤 **HUMAN-IN-THE-LOOP (Touchpoint 6).** The Protocol Review Board approves, sends back, or declines each protocol. It includes internal members, so its independence comes from its unaffiliated and non-scientist members, its quorum rule, and declared interests, not from being external to Kind.

> 👤 **HUMAN-IN-THE-LOOP (Touchpoint 8).** The Data Protection Officer signs off on data protection and security for every protocol, and can withhold that sign-off regardless of the Protocol Review Board's vote. The DPO has a direct line to the Board of Directors, so the sign-off doesn't depend on the DPO's line manager.

> 👤 **HUMAN-IN-THE-LOOP (Touchpoint 7).** BRANY, independent of Kind's product organisation, makes the ethics determination. None of Touchpoints 6–8 can be satisfied by a passing score from any AI Oversight Gate upstream; they are additional, not redundant.

That an AI-assisted, software-delivered health product can clear a review of this weight, not just an internal one, has precedent. Big Health's digital CBT product Sleepio has been the subject of more than 100 peer-reviewed papers and, in 2022, became the first digital therapeutic to receive formal guidance from the UK's National Institute for Health and Care Excellence (NICE) confirming both clinical and cost effectiveness — the same evidentiary bar the UK applies to drugs and medical devices. Kind's gate is built to the same principle. The Protocol Review Board is an internal screen, and the IRB is the external, standards-body-grade review. The internal screen does not substitute for it.

*Reference: [Big Health — Sleepio first digital therapeutic to receive NICE guidance](https://www.bighealth.com/news/sleepio-is-the-first-ever-digital-therapeutic-to-receive-nice-guidance-confirming-clinical-and-cost-effectiveness).*

<p align="center"><img src="images/fig-3b-science-ethics-review.png" alt="Exploration Pipeline — Science and Ethics Review" width="100%"/></p>

<p align="center"><em>Figure 3b. The Exploration Pipeline — Science and Ethics Review (Section 4.3). Reconstructed from the Kind System FigJam board (node 17:1968) as of 28 August 2026. <strong>Out of date since 2026.09.29.1:</strong> it shows a science advisory board review and only two IRB tracks. The text above, with the Protocol Review Board, DPO sign-off, and three BRANY routes, governs.</em></p>

### 4.4 Publishing and Data Handling

A deployment-ready exploration enters the Kind publishing pipeline, which produces insights, results, and protocols as distinct outputs. Separately, raw data collected through explorations is split at the point of processing into two streams with different destinations and different audiences:

- **Personalised data** flows to the Kind App, which administers protocols, collects data, and displays reports directly to the individual who is the subject of the exploration.
- **Deidentified data** flows to the Kind Researcher Dashboard, which exposes protocol methods, summary statistics, and data export to researchers (aggregate by default; see Rule 4.4.2) — and separately feeds the Kind publishing pipeline, so that published insights become an input back into future protocol generation (4.1). The pipeline is closed-loop by design: what Kind learns from deployed explorations is required to reach the next round of protocol generation, not sit unused in a dashboard.

> **Rule 4.4.1.** Personalised data is never exposed through the Researcher Dashboard. Deidentification happens before data reaches any researcher-facing surface, not after.

> **Rule 4.4.2.** De-identification uses the HIPAA Safe Harbor method as Kind's working definition (Kind is not a HIPAA covered entity, and this is a chosen standard, not a legal obligation), together with minimum cohort sizes, owned by the DPO. Researchers receive aggregate outputs by default. Row-level de-identified data is released only under a Data Use Agreement that prohibits re-identification and onward transfer.

> 👤 **HUMAN-IN-THE-LOOP (Touchpoint 9).** Before any de-identified dataset or export leaves Kind, whether to a researcher under a Data Use Agreement or to the publishing pipeline, the DPO reviews the residual risk of re-identification and records whether it may be released. Safe Harbor and cohort minimums are applied first as technical controls; the review is a check on their result, not a replacement for them.

> **Rule 4.4.3.** Results are reported against CENT for individual (N-of-1) explorations and CONSORT for group analyses, using pre-specified analysis plans or explicit emulative analysis.

> **Implementation status (2026.09.29.1).** Partial. Cohort suppression exists for feed comparisons (`COHORT_MIN = 50` in `apps/api/src/data/morningRulesFeedLibrary.js`). There is no researcher export, DUA process, or re-identification review, because the Researcher Dashboard doesn't exist. Public website copy (`apps/kind-website/faq.html`, `individuals.html`, `researchers.html`, `privacy-policy.html`) says researcher data is "always anonymised and aggregated", which contradicts row-level access under a DUA. See [`implementation-status.md`](implementation-status.md).

The requirement that every release — in Kind's case, every published exploration and every publishing-pipeline run — produce an archived, reconstructable record is itself standard practice among organizations that treat release integrity as a discipline in its own right. Google's SRE Book describes release engineering as producing, for every release, an archived report of everything the release contains, alongside a re-run of tests on the release branch specifically to establish an audit trail independent of the original development history. Netflix's automated canary analysis system, Kayenta, replaced manual, judgment-based release review with an automated, metrics-gated comparison between a new build and a known-good baseline — roughly 200 automated judgments a day — precisely so that release safety did not depend on a reviewer's stamina or attention on a given day. Kind's publishing pipeline and its Kind-readiness gate (4.2) are built on the same premise: a decision this consequential should not depend on who happened to be reviewing it.

*References: [Google SRE Book — Release Engineering](https://sre.google/sre-book/release-engineering/); [Netflix TechBlog — Automated Canary Analysis at Netflix with Kayenta](https://netflixtechblog.com/automated-canary-analysis-at-netflix-with-kayenta-3260bc7acc69).*

<p align="center"><img src="images/fig-3c-publishing-and-data.png" alt="Exploration Pipeline — Publishing and Data Handling" width="100%"/></p>

<p align="center"><em>Figure 3c. The Exploration Pipeline — Publishing and Data Handling (Section 4.4). Reconstructed from the Kind System FigJam board (node 17:1968) as of 28 August 2026. It does not show the DPO's re-identification review (Touchpoint 9) added in 2026.09.29.1.</em></p>

### 4.5 Matching Individuals to Explorations

Individuals are matched to explorations by a **rule-based, deterministic matching engine**, using eligibility and exclusion filters and scoring against the individual's stated goals. It does not use other individuals' outcomes, and it does not generate content. The engine is therefore governed as exploration logic, not as live AI output (Section 3.3).

> **Rule 4.5.1.** Any change to the matching engine's rules, tags, or weights requires Protocol Review Board approval before release. Relevance feedback and completion rates are reviewed periodically by the Head of Science, and they never change matching scores automatically.

> **Rule 4.5.2.** A change to the matching logic triggers the Safety Officer's re-review of Kind's regulatory scope (general wellness and clinical decision support), and monitoring for drift toward disease-specific or treatment claims.

> **Implementation status (2026.09.29.1).** Partial. A deterministic onboarding recommender exists (`apps/api/src/lib/onboardingRecommendations.js`: fixed goal boosts, no model). No Protocol Review Board approval is recorded for its current rules.

---

## 5. Technical Infrastructure

This section names the concrete systems that implement the architecture described in Section 1. It is descriptive, not a rule set of its own — the rules governing what runs on this infrastructure are in Sections 2 through 4.

| Component | Implementation | Role | Status (2026.09.29) |
|---|---|---|---|
| Kind App | Expo, React Native (native + web via react-native-web; web build deployed to Cloudflare) | Main touchpoint for individuals/participants; administers protocols, collects data, displays reports. | Implemented — `apps/mobile` |
| Kind Researcher Dashboard | React Native / Expo (web) | Main touchpoint for researchers; surfaces protocol methods, summary statistics, and data export. | Specified — not in repository |
| Kind API | Hono, deployed as a Cloudflare Worker (wrangler) | Logic and transmission layer connecting the App and Dashboard to the database. | Implemented — `apps/api` |
| Kind DB | Supabase (PostgreSQL, row-level security) | Persistent storage. | Implemented — `supabase/migrations` |
| Kind website | Static HTML/CSS/JS, deployed to GitHub Pages | Public marketing site and waitlist. | Implemented — `apps/kind-website` |
| Protocol-generation tooling | DSPy, GROBID | Parses published research papers into structured inputs for generating *draft* protocols (Section 4.1). | Specified — not in repository |
| Matching engine | Rule-based, deterministic (no model) | Matches individuals to eligible explorations (Section 4.5). | Partial — `apps/api/src/lib/onboardingRecommendations.js` |
| Live AI output | OpenAI API (`gpt-4o-mini` default) for feed copy; AI companion specified | Generates messages shown to individuals at runtime (Section 3.3). | Partial — `apps/api/src/feedContent.js`; companion not in repository |
| Design System documentation | Storybook | Source of truth for components, accessibility testing, and higher-order system documentation (Section 2.1). | Specified — interim: `apps/mobile/src/theme/` + `docs/the-kind-system/` |

Status values are defined, and evidence for each is given, in [`implementation-status.md`](implementation-status.md). Figure 4 shows the stack as specified and has not been regenerated to show status.

<p align="center"><img src="images/fig-4-tech-stack.png" alt="Figure 4. Technical Infrastructure — Tech Stack. Exported directly from the Kind System FigJam board (node 32:5555), 28 August 2026." width="100%"/></p>

<p align="center"><em>Figure 4. Technical Infrastructure — Tech Stack. Exported directly from the Kind System FigJam board (node 32:5555), 28 August 2026.</em></p>

---

## 6. Definitions

| Term | Definition |
|---|---|
| Individual / Participant | The end user of the Kind App who is the subject of a deployed exploration. (Note: internal product documentation may use "Explorer" for this role; this document standardizes on "Individual" or "Participant" for consistency with clinical-trial reporting terminology.) |
| Protocol | The structured, generated specification for an exploration: what is administered, how, on what schedule, and how it is measured. |
| Exploration | A protocol as it moves through generation, review, ethics clearance, and deployment; Kind's term for what would elsewhere be called a research study or trial. |
| Decision Trail | The retained record, produced at every AI Oversight Gate (Section 3) and every pipeline gate (Section 4), of what was reviewed, by whom, against what standard, and on what basis it passed or failed. |
| Kind-ready | Having passed the Kind-readiness gate defined in Section 4.2; a necessary but not sufficient condition for deployment. |
| N-of-1 trial | A clinical trial design in which a single participant receives multiple treatment periods (often randomized and blinded), allowing individual-level causal inference rather than only population-average effects. |
| CENT | CONSORT extension for reporting N-of-1 trials (2015): the peer-reviewed standard for *reporting* N-of-1 trial results, which Kind's results reports are aligned to (Rule 4.4.3). |
| CONSORT | Consolidated Standards of Reporting Trials: the standard for reporting randomised trials, which Kind applies to group analyses (Rule 4.4.3). |
| SPENT | SPIRIT extension for N-of-1 trials (2019 checklist, published 2020): the standard for what an N-of-1 *protocol* must contain, which Kind's protocol generation checklist is aligned to (Rule 4.1.1). |
| SPIRIT | Standard Protocol Items: Recommendations for Interventional Trials: the standard for trial protocols, which SPENT extends. |
| Protocol Review Board | Kind's internal first-line research-ethics screen, with a quorum that includes non-scientist and unaffiliated members. It approves protocols before IRB submission (Section 4.3, Touchpoint 6). |
| Science Advisory Board | Kind's advisory body of named scientists. It advises on science strategy, methods, and integrity, and provides specialists and a stand-in chair to the Protocol Review Board. It does not approve explorations. |
| BRANY | Kind's central, independent, AAHRPP-accredited IRB (Section 4.3, Touchpoint 7). |
| Umbrella protocol | The IRB-approved master protocol under which explorations run as templated sub-studies. |
| Approved template | An exploration design approved by the IRB. A new exploration that fits one can be submitted on the expedited route. |
| Investigator of record | The person accountable to the IRB for research run under the umbrella protocol (the Chief Science Officer). |
| Data Protection Officer (DPO) | The accountable officer for data governance. Signs off every protocol (Touchpoint 8) and reviews re-identification risk before any de-identified data leaves Kind (Touchpoint 9). |
| Safety Officer | The accountable officer for adverse events and regulatory monitoring, including sampled review of live AI output (Touchpoint 10). |
| Safe Harbor | The HIPAA de-identification method (45 CFR §164.514(b)(2)), which removes 18 specified identifiers. Used by Kind as a working definition (Rule 4.4.2). |
| Data Use Agreement (DUA) | The agreement required before a researcher receives row-level de-identified data. It prohibits re-identification and onward transfer. |
| Live AI output | AI-generated content shown to an individual at runtime, such as AI companion messages or AI-rewritten feed copy (Section 3.3). |

---

## Appendix A: Diagram Index

Every figure in this document ships as a real image file alongside it, in `images/`, versioned in this repository together with the document — there is nothing to fetch from Figma or from a live board to read this document. Figures 1, 2, and 4 are direct exports of the Kind System FigJam board, taken 28 August 2026. Figures 3a–3c (the Exploration Pipeline) are a structural reconstruction built from the board's node data rather than a raster export of that section, pending a direct export of its own. This document is not required to stay in sync with a live board to remain accurate: it is a snapshot, standing on its own. The source node is still recorded below for the one purpose that matters — regenerating a figure when the underlying system changes and the diagram no longer matches it.

| Figure | Section | FigJam Source Node | Provenance |
|---|---|---|---|
| Fig. 1 | 1. System Architecture | Broad relationships — node 16:935 | Direct export |
| Fig. 2 | 3. The AI Oversight Gate | AI Oversight — node 32:2989 | Direct export |
| Fig. 3a–3c | 4. The Exploration Pipeline | Exploration pipeline — node 17:1968 | Structural reconstruction. 3a and 3b are out of date since 2026.09.29.1, and 3c is incomplete (see captions). |
| Fig. 4 | 5. Technical Infrastructure | Tech stack — node 32:5555 | Direct export |

The original exports, and the record of how each figure entered this document, are kept in [`decisions/2026.08.28/context/figjam/`](decisions/2026.08.28/context/figjam/sources.md). When a figure is regenerated, the new export and its source node are recorded in the context folder of the release that changes it.

---

## Appendix B: External Source Register

Full citations for every external precedent referenced in this document, for direct use in further academic or governance writing.

| Domain | Source | URL |
|---|---|---|
| Design system governance | Shopify Polaris — CONTRIBUTING.md | https://github.com/Shopify/polaris/blob/main/.github/CONTRIBUTING.md |
| Design system governance | IBM Carbon Design System — CONTRIBUTING.md | https://github.com/carbon-design-system/carbon/blob/main/.github/CONTRIBUTING.md |
| Design system governance | Atlassian Design System — Contribution model | https://atlassian.design/contribution |
| AI-assisted engineering | GitHub Docs — Reviewing AI-generated code (Copilot Enterprise) | https://docs.github.com/en/enterprise-cloud@latest/copilot/tutorials/review-ai-generated-code |
| AI-assisted engineering | Google Engineering Practices — Code Review | https://google.github.io/eng-practices/review/ |
| AI-assisted engineering | Anthropic — Claude Code Best Practices | https://code.claude.com/docs/en/best-practices |
| Release governance | Google SRE Book — Release Engineering | https://sre.google/sre-book/release-engineering/ |
| Release governance | Netflix TechBlog — Automated Canary Analysis with Kayenta | https://netflixtechblog.com/automated-canary-analysis-at-netflix-with-kayenta-3260bc7acc69 |
| Clinical/research rigor | Vohra et al., CENT 2015 Statement, BMJ 350:h1738 | https://doi.org/10.1136/bmj.h1738 |
| Clinical/research rigor | Vohra et al., CENT 2015 Explanation & Elaboration, J Clin Epidemiol 76:9-17 | https://doi.org/10.1016/j.jclinepi.2015.05.004 |
| Clinical/research rigor | Porcino et al., SPENT 2019 checklist, BMJ 368:m122 | https://doi.org/10.1136/bmj.m122 |
| Clinical/research rigor | Chan et al., SPIRIT 2013 Statement, Ann Intern Med 158:200-207 | https://doi.org/10.7326/0003-4819-158-3-201302050-00583 |
| Clinical/research rigor | Schulz et al., CONSORT 2010 Statement, BMJ 340:c332 | https://doi.org/10.1136/bmj.c332 |
| Data protection | HHS — Guidance on de-identification under the HIPAA Privacy Rule (Safe Harbor, 45 CFR §164.514(b)(2)) | https://www.hhs.gov/hipaa/for-professionals/special-topics/de-identification/index.html |
| Clinical/research rigor | Big Health — Sleepio first digital therapeutic to receive NICE guidance | https://www.bighealth.com/news/sleepio-is-the-first-ever-digital-therapeutic-to-receive-nice-guidance-confirming-clinical-and-cost-effectiveness |
