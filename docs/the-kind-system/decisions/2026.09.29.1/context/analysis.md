Below is a summary from a Claude session Ben Fehnert used to summarise the difference between 2026.09.28 of the Kind Design System and what is specified in other company materials, along with his commentary. 

# Where it's inconsistent or takes a different position

- Who reviews protocols. It names the science advisory board as the scientific review before the IRB, and describes it as external. That role now sits with the Protocol Review Board, which has internal members and a Science Advisory Board that only advises. It also leaves out the DPO sign-off and the clinical and user-safety review.
> Protocol Review Board is a new function

- The readiness reviewer has no owner. The Roles and Responsibilities document doesn't assign the Kind-readiness reviewer to anyone. The Head of Science is the natural fit.
> Agreed

- Standards. Protocols are based only on CENT, which is a guideline for reporting trials. SPENT, the SPIRIT extension for N-of-1, is the standard for writing protocols, and it's what your deck and answers cite.
> CENT guidelines - for designing N-of-1
> CONSORT guidelines - for designing RCTs / trials
> SPENT guidelines - for reporting N-of-1
> SPIRIT guidelines - for reporting RCTs / trials

- AI drafts protocols. Protocols are generated from published papers with AI tools (DSPy and GROBID). This doesn't appear in the IRB brief, the Science Advisory answers or the roles document. BRANY and the Science Advisory Board will want it disclosed, and Q4 should mention it.
> Need to be clear that its only draft protocols that are created using these tools and that the Protocol Review Board and the IRB will also be involved before being added to Kind

- AI and participant data. The closed loop feeds insights drawn from participant data into AI protocol generation. That falls under your still-open rule on using data for AI, and may not be covered by the current consent and privacy wording.
> I will update the privacy policy separately.

- IRB routes. It describes only "expedited or full" review. The umbrella protocol, templated sub-studies and BRANY deciding whether an exploration fits a template are all missing.
> Need to add

- De-identification and researcher access.
  - It doesn't name a de-identification standard or minimum group sizes.
  - The Researcher Dashboard's data export contradicts the website's "aggregated only" wording.
  - It doesn't mention Data Use Agreements.
> Should reference Safe Harbor Method plus a review to reduce chance of any reidentification 

- Data location. The Supabase hosting region isn't stated. Your working assumption is the US; the privacy policy says the US, UK and Netherlands.

> I will update the privacy policy separately.

- Gaps in AI coverage.
  - The matching engine isn't covered, though it's described elsewhere as a deterministic, AI-enabled algorithm.
  - More importantly, nothing governs the AI companion that talks to participants. Its messages are generated live, so they never pass a review gate. That matters for Q7 (spotting safety issues) and for claims (it must never give advice).
> Good point. How would we govern the AI companion discussions with Individuals?

- Terminology.
  - It standardises on "Individual/Participant", while the reports and website say "explorers".
  - It defines N-of-1 trials as "often randomized and blinded", but Kind won't use blinding at launch.
> No action

- Public repository. The document sits in a public GitHub repository ("benfehnert/Kind Public") and names your infrastructure. Please confirm that's intended.
> No action