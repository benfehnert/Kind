# Clarifications: release 2026.09.29

These are the questions the agent asked while planning, with the user's answers. Each question is quoted as it was asked, followed by the options offered and the answer chosen.

## Round 1 (after the initial codebase audit)

### Q1. Legacy docs
> I checked the other files under docs/ and none of them look like sources for the-kind-system.md. kind-data-model.md, kind-schema.sql and its print HTML/PDF script are a June data model built from the prototype. mobile-deterministic-algorithms.md documents the RN app's logic. docs/.pdf-gen-tmp/ is a live working folder that 3 apps/api CENT report scripts write to, so moving it would break them. As far as I can tell, the doc actually came from the FigJam board (nodes 16:935, 32:2989, 17:1968, 32:5555) plus the cited external references. What should happen to these files?

Options offered: *Move as 'app context' (Recommended)* · *Move all, incl. pdf-gen* · *Leave them in docs/*

**Answer (free text):** "Let's leave them here for a decision we will make later"

### Q2. Code state
> The doc describes infrastructure that doesn't exist in the codebase yet: Storybook, the Researcher Dashboard, DSPy/GROBID, and CI test gates for the web deploy. The actual visual system lives in apps/mobile/src/theme (colors, tokens, typography) and components/primitives. How should the core docs show the app's state?

Options offered: *Status + token reference (Recommended)* · *Status markers only* · *Governance only*

**Answer:** Status + token reference

### Q3. CalVer
> Which CalVer format should the decision folders use?

Options offered: *YYYY.MM.DD (Recommended)* · *YYYY.0M.MICRO* · *YYYY-MM-DD-slug*

**Answer:** YYYY.MM.DD, with a `.N` suffix for a second release on the same day

### Q4. Skill
> Where should the update skill live?

Options offered: *Package + .claude stub (Recommended)* · *Package only*

**Answer:** Package + .claude stub

## Round 2 (after "is this a viable way of tracking changes to documentation?")

The agent answered with these strategies: ADRs (Nygard/MADR), changesets (Polaris), RFCs, git-native (PRs/tags/changelog), versioned docs sites, and wiki page history. It also pointed out four weaknesses of the first plan:

- One folder per update mixes up releases and decisions.
- It duplicates git if the folders hold copies of the docs.
- A SHA written into a file is a weak link to the code compared with a tag.
- Binaries bloat the repository.

It recommended a hybrid.

### Q5. Strategy
> Which tracking model should the plan use?

Options offered: *Hybrid (Recommended)*: CalVer release folders holding one or more ADR-style decision files plus a shared context/, a git tag per release, and a generated version history · *Original plan* · *Pure ADRs* · *Git-native*

**Answer:** Hybrid

### Q6. Binaries
> How should large context files like slide decks and board exports be stored?

Options offered: *Commit directly (Recommended)*: switch to Git LFS if anything goes over about 5 MB · *Git LFS now* · *Link + checksum*

**Answer:** Commit directly
