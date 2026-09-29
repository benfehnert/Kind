# Clarifications: release 2026.09.29.1

These are the questions the agent asked after reading `analysis.md`, the three PDFs, and the codebase, with the user's answers. Everything else was derived from the sources, or from the user's comments in `analysis.md`.

### Q1. Standards
> Your note on the standards pairs CENT/CONSORT with *designing* trials and SPENT/SPIRIT with *reporting* them. The published standards run the other way. SPIRIT (and its N-of-1 extension SPENT) says what a trial *protocol* must contain. CONSORT (and its N-of-1 extension CENT) says how *completed results* are reported. Ben's analysis and the deck/R&R describe it that way too, and so does the codebase: `apps/api/src/lib/cent/` produces result reports. Which mapping should the Kind System use?

Options offered: *Standard mapping (Recommended)*: the §4.1 protocol generation checklist aligned to SPENT (N-of-1) and SPIRIT (group trials), and results reports and preprints (§4.4) aligned to CENT (N-of-1) and CONSORT (group analyses) · *As in my note*

**Answer:** Standard mapping. This supersedes the design/reporting labels in the user's comment in `analysis.md`.

### Q2. Touchpoints
> The Protocol Review Board replaces the Science Advisory Board as a gate, and the SAB becomes advisory only. Changing the §0.1 touchpoints needs your explicit OK. How should the table change?

Options offered: *PRB + separate DPO row (Recommended)*: Touchpoint 6 becomes the Protocol Review Board (quorum; scientific, clinical and user-safety review), with a new Touchpoint 8 for DPO data-protection sign-off because the DPO can withhold it on their own. The SAB leaves the table, and Touchpoint 5 (Kind-readiness) is assigned to the Head of Science · *PRB incl. DPO, one row*

**Answer:** PRB + separate DPO row. This is the user's explicit confirmation of the §0.1 changes.

### Q3. Re-identification review
> You asked for Safe Harbor plus a review to reduce re-identification risk. Who carries out that review, and when? (Cohort minimums: the code already uses 50 for feed comparisons.)

Options offered: *DPO, per data release (Recommended)*: the DPO reviews re-identification risk before each de-identified dataset or export leaves Kind (a researcher export under a DUA, or publishing data). It becomes a human touchpoint, and §0.1's note that §4.4 is purely automated gets updated · *DPO at protocol sign-off* · *Decide later*

**Answer:** DPO, per data release.

### Q4. AI companion
> How should the AI companion's live messages to individuals be governed? They can't pass Touchpoint 4 one message at a time.

Options offered: *Gate the system (Recommended)*:
- The companion's instructions, content library, model and guardrails pass the AI Oversight Gate as one artifact (Head of Product + Safety Officer).
- Runtime hard limits: no advice, never change numbers, crisis redirect to 911/988, deterministic fallback.
- Every message is logged, and the Safety Officer reviews a sample on a set schedule.
- Any change re-enters the gate.

Other options offered: *Templates only at launch* · *Record as open gap*

**Answer:** Gate the system.
