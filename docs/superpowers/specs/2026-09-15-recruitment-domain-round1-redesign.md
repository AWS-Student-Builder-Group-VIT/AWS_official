# Recruitment Domain and Round 1 Redesign

Date: 2026-09-15

## Objective

Redesign the recruitment application so candidates can apply to any combination of club domains, complete the correct Round 1 questions immediately after saving their selections, and be reviewed accurately from the admin console.

The user's direct instructions are authoritative. The supplied `AWS_Club_Recruitment_Handbook.pdf` contributes the initial Design task prompts and descriptive context, but its conflicting Outreach, Finance, and Events taxonomy does not override the taxonomy below.

## Candidate Journey

1. The candidate signs in with Google.
2. The candidate completes only the required academic profile fields: registration number, phone number, year, and branch/school.
3. The candidate selects at least one application track from any domain.
4. Saving the selection routes directly to the Round 1 hub.
5. The candidate completes all applicable written questions and, when Technical was selected, the Technical assessment.
6. Round 1 becomes complete only when every required component for the current selection has been submitted.

GitHub, LinkedIn, and portfolio inputs are removed from the profile-completion UI and API payload. Their existing database columns remain nullable for backward compatibility and are not displayed as required candidate data.

## Authoritative Domain Taxonomy

The active domains are:

### Technical

- Web Development
- App Development
- Game Development
- AI/ML

A candidate may select one or two Technical subdomains. Technical is optional.

### Events

- Operations & Execution
- Logistics and Participant Management
- Event Ideation and Planning

### Design

- Digital Graphic Design
- Art & Craft / Physical Design
- UI/UX Design

### Publicity

- Social Media Management
- Content & Video Editing
- Event Promotion

### Outreach

Outreach is selected as a whole domain. The UI shows one `+` control beside the Outreach heading and no visible subdomain cards.

### Finance

Finance is selected as a whole domain. The UI shows one `+` control beside the Finance heading and no visible subdomain cards.

## Selection Rules

- At least one track must be selected before saving.
- Candidates may select any number of non-Technical tracks.
- Candidates may select at most two Technical subdomains.
- The same track cannot be selected twice.
- Selecting Outreach or Finance adds/removes that whole domain.
- Selections remain editable until the configured application deadline.
- Existing records are preserved where their referenced track remains active.

Internally, Outreach and Finance each receive one active hidden subdomain record. This preserves the existing project, interview, filtering, and candidate-choice relationships while keeping the candidate UI domain-level.

The existing `candidate_subdomain_choices` table remains the compatibility layer. Its two-priority restriction is replaced with an ordered positive priority, and the `set_candidate_subdomains` function validates the Technical maximum separately from the unrestricted overall count.

## Round 1 Question Model

Round 1 has two possible components.

### Non-Technical written application

For every selected non-Technical domain, ask these two required questions once per domain, regardless of how many subdomains were selected:

1. Why do you want to join this club?
2. Tell us about your previous work in detail under this domain.

Answers are long-form text and are saved per candidate, domain, and question. Draft answers may be updated until final submission or the application deadline.

### Initial Design task set

Design candidates also receive the three tasks from the supplied handbook and must answer any two:

1. **Core and Board merchandise:** Design merchandise for Core and Board members. The submission should cover T-shirt or hoodie concepts, relevant front/back/sleeve views, and any chosen combination of black, white, purple, and orange.
2. **HackQuest landing page:** Design a landing page for the GraVITas HackQuest hackathon. It must contain the HackQuest logo, short tagline, date, venue, a primary "Register Now" action, and a brief explanation of the hackathon and its concept.
3. **Three-grid Instagram event post:** Design a three-slide Instagram promotional grid for an AWS cloud-computing event. Slide 1 explains the event, Slide 2 contains event details, and Slide 3 provides a strong registration hook.

Each task response accepts a detailed written explanation and one or more shareable submission links. Direct file upload is outside this change; links keep the first release compatible with the current Supabase data model and storage setup.

Other domain-specific question sets are intentionally empty until the user supplies them. The two common non-Technical questions still apply immediately.

### Technical assessment

Technical selections retain the existing scored question bank:

- Five questions are selected for each chosen Technical subdomain.
- Each Technical subdomain adds 25 minutes.
- One or two Technical subdomains can be attempted in the same assessment.
- Non-Technical choices never add timed or auto-graded questions.
- Mixed-domain candidates complete their written sections and Technical assessment from the same Round 1 hub.

The candidate-facing product calls this stage Round 1. Existing `round_0_*` database columns may remain as internal compatibility fields during this change, while visible labels consistently use Round 1. Projects remain Round 2 and interviews remain Round 3.

## Data Model

Add a migration after `202609140008_round_content_and_identity.sql` that:

- Upserts the six authoritative domains and their required visible/hidden subdomains.
- Deactivates obsolete taxonomy rows rather than deleting referenced data.
- Adds `selection_mode` metadata for `subdomains` versus `whole_domain` rendering.
- Removes the two-choice priority constraint and replaces it with a positive-order constraint.
- Updates `set_candidate_subdomains` to accept unlimited active choices while rejecting more than two choices belonging to Technical.
- Adds `written_application_questions` with common or domain scope, prompt, response type, sort order, active state, and whether it is required.
- Adds `written_application_rules` so Design requires any two of its three task questions.
- Adds `candidate_written_answers` keyed by candidate, selected domain, and question, with answer text, submission links, draft/final state, and timestamps.
- Adds Row Level Security allowing candidates to manage only their own answers and recruitment administrators to review all answers.
- Seeds the two common non-Technical questions and the three Design tasks.

The migration is idempotent and uses stable slugs so it can be applied safely to an existing Supabase project. No existing candidate or assessment record is deleted.

## Candidate UI

### Profile completion

Remove the entire `ONLINE_PRESENCE` section and its three URL fields. Keep the academic profile section and identity summary.

### Domain selection

- Replace "Choose up to two specializations" with language explaining unrestricted application choices and the Technical maximum.
- Show selected tracks as removable chips without primary/secondary wording.
- Render visible subdomain cards for Technical, Events, Design, and Publicity.
- Render a selectable `+` button in the Finance and Outreach headings.
- Show a clear validation notice only when a third Technical subdomain is attempted.
- Save all ordered selections through the updated RPC and route immediately to `/dashboard/round-1`.

### Round 1 hub

- Show one written-answer section for each selected non-Technical domain.
- Show Design's three tasks with an "answer any two" progress indicator when Design is selected.
- Show the Technical assessment summary and start/resume action only when Technical is selected.
- Persist drafts, show field-level failures, and prevent final Round 1 submission until required written answers and any Technical assessment are complete.
- If choices change before the deadline, retain answers for still-selected domains and ignore answers for removed domains.

## Admin Console

The admin experience must continue to work with more than two choices and whole-domain selections.

- Domain management shows the new taxonomy and distinguishes whole-domain selections from visible subdomains.
- Candidate lists and operations views display every selected track and wrap long choice lists cleanly.
- Primary/secondary labels are replaced with ordered selection labels.
- Filters work by domain and visible subdomain; Finance and Outreach are filterable at domain level.
- Candidate dossiers show the two common written answers for each selected non-Technical domain and any domain-specific task responses/links.
- CSV export includes all choices and written responses without truncating them.
- The question-bank workspace supports common non-Technical prompts, domain-specific written tasks, active/inactive state, ordering, and per-domain minimum-answer rules.
- The existing TypeScript error in the Round 2/3 guideline editor is fixed as part of restoring a clean admin build.

## Error Handling and Compatibility

- Missing database migration: show an actionable configuration message instead of a blank or generic failure.
- Missing question set: allow the domain to use only the two common prompts; do not block the application.
- Invalid selection: return a typed API/RPC error and keep the unsaved UI selection visible.
- Failed draft save or submission: retain local input and allow retry.
- Existing two-choice candidates remain readable and editable.
- Existing Technical assessment attempts are not regenerated or invalidated.

## Verification

Implementation verification will include:

- Unit tests for selection validation: no Technical choice, one Technical choice, two Technical choices, rejected third Technical choice, and unlimited non-Technical choices.
- Unit tests for question applicability and Design's two-of-three requirement.
- API tests for profile completion without social URLs and for written-answer draft/final validation.
- Migration checks for stable slugs, hidden whole-domain tracks, idempotency, preserved existing data, and Row Level Security policies.
- Candidate-flow checks from profile completion through selection to Round 1 for non-Technical-only, Technical-only, and mixed applications.
- Admin checks for candidate listing, filters, dossiers, question management, and CSV export.
- A clean Next.js type/build check and visual review of desktop and mobile candidate/admin pages.

## Out of Scope

- New domain-specific question sets beyond the three supplied Design tasks.
- Direct design-file uploads or Supabase Storage changes.
- Changes to Round 2 project briefs or Round 3 interview workflows beyond compatibility with the expanded selections.
- Automatic grading of written responses.
