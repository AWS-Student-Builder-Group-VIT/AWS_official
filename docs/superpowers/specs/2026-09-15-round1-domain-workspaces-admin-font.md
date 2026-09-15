# Round 1 Domain Workspaces and Admin Typography Design

## Goal

Replace the single long Round 1 written form with a card-based hub where candidates open and submit each selected application area independently, and render every admin page in Josefin Sans.

## Scope

This change covers the candidate Round 1 hub, the written-answer API, completion-state derivation, the existing Technical assessment entry points, and typography for all routes under `/admin`. It explicitly excludes polling, Redis, realtime subscriptions, taxonomy changes, and changes to the assessment question count or timer.

## Candidate experience

The Round 1 landing view presents one card for each selected non-Technical domain and one card for each selected Technical subdomain.

Each non-Technical card displays the domain name, selected subdomains where applicable, and one of three statuses:

- **Not started:** no answer in the domain has content.
- **Draft:** at least one answer has content, but the domain has not been submitted.
- **Submitted:** all completion rules for the domain passed and its answer rows are final.

Selecting a non-Technical card opens a focused domain workspace on the same route. Only that domain's questions are displayed. The workspace includes Back to Round 1, Save draft, and Submit domain actions. Draft autosave remains available for the active domain only. A submitted domain is read-only, while other domains remain independently editable.

Each selected Technical subdomain receives its own card. Selecting it opens the existing combined timed Technical assessment route with that subdomain's question tab selected. The cards are separate entry points into one existing combined attempt, so they display the same overall Technical attempt status while retaining distinct subdomain labels.

The overall Round 1 status is complete only when every selected non-Technical domain is submitted and the combined Technical assessment, when required, is submitted.

## Submission model

No new database table is required. `candidate_written_answers.is_final` already stores finality on each domain/question answer row.

The written-answer API accepts a required `domainId` for `PUT` and `POST` operations:

- `PUT` saves only answers belonging to that selected non-Technical domain and never changes finality.
- `POST` validates only the target domain's applicable questions and rules. When valid, it sets only that domain's applicable answer rows to `is_final = true`.
- Writes are rejected when the domain is not selected, is Technical, contains answers for another domain, or was already submitted.
- Empty or incomplete domain submissions return the existing structured validation response with the target domain's missing answer keys.

`GET` returns per-domain completion metadata rather than a single `writtenFinal` flag. For each non-Technical domain it includes whether content exists, whether the domain is valid, and whether it is final. The existing aggregate Technical completion state is associated with every selected Technical subdomain card.

After any domain submission, the server recalculates overall Round 1 completion. The candidate profile advances to submitted only when all selected written domains and the required combined Technical assessment are complete.

## State and error handling

Changing answers marks only the active domain dirty. Navigating back to the hub triggers a draft save when needed. Switching to another card cannot leak answers into a different domain payload.

The UI keeps the current error banner pattern. Failed saves leave the draft in memory and keep the workspace open. Failed submission does not lock the domain. The API remains the authority for domain membership, deadline enforcement, completeness, and finality.

No background polling is added. Data refreshes when Round 1 loads, after a save or submission, and when the candidate returns from the Technical assessment.

## Admin typography

Josefin Sans is added to the existing Google Fonts import. The admin layout applies an admin-only font class to login, standard admin pages, and the Operations Console. The class overrides the global body, heading, form-control, and monospace utility font families inside `/admin`, so all visible admin text consistently uses Josefin Sans. Candidate pages retain the existing Inter and Space Mono typography.

## Testing

Automated tests will cover:

- Deriving Not started, Draft, and Submitted states per domain.
- Validating and finalizing one domain without finalizing another.
- Rejecting cross-domain, Technical, unselected, and already-final submissions.
- Deriving overall Round 1 completion from all written domains and the combined Technical attempt.
- The admin-only Josefin Sans wrapper and CSS font override contract.

The full Node test suite and Next.js production build must pass. The final browser review will verify the Round 1 hub/workspace interaction at desktop and narrow widths and visually confirm Josefin Sans on admin login and Operations.
