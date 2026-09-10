const detail = (desc, technicalScope, deliverables, chaosDesc) => Object.freeze({
  desc,
  technicalScope: Object.freeze(technicalScope),
  deliverables: Object.freeze(deliverables),
  chaosDesc,
});

// Participant-facing briefs are intentionally server-owned. Chaos descriptions
// are merged only into the private organizer/team snapshot by challengeCatalog.
export const CHALLENGE_DETAILS = Object.freeze({
  'ai-adaptive-campus-concierge': detail(
    'Build a campus concierge that turns a student profile, timetable, accessibility preferences, and live campus notices into a short, prioritized list of relevant services and next actions. The experience should explain why each recommendation is shown and let students correct preferences instead of behaving like an opaque chatbot.',
    ['Use a small synthetic student and campus-notice dataset; no live institutional integration is required.', 'Apply deterministic rules or a lightweight model and display the evidence behind every recommendation.', 'Protect personal preferences and keep the core workflow usable when optional AI output is unavailable.'],
    ['A profile and preference setup flow for at least two distinct student personas.', 'A personalized notice and next-action dashboard with clear explanations.', 'A feedback or correction control that changes later recommendations.'],
    'A student disputes a recommendation. Add a staff or user manual-override path that replaces the suggested action, records who changed it, and displays a short reason and timestamp in an audit history.',
  ),
  'ai-document-workflow-automator': detail(
    'Create a system that accepts a structured request or form, extracts the information needed by an organization, and converts it into a visible multi-step workflow. Users must be able to see the current stage, responsible role, pending information, and final outcome rather than losing requests inside email or paper processes.',
    ['Limit the prototype to one clearly defined workflow with three to five stages and synthetic documents.', 'Validate required fields before advancing and preserve a timestamped status history.', 'Use confidence indicators for extracted values and require human confirmation when confidence is low.'],
    ['A request submission and document-upload experience.', 'A role-aware workflow board showing owners, stages, and exceptions.', 'A complete audit timeline from intake through approval or rejection.'],
    'The organization begins receiving scanned forms as well as structured submissions. Add a second input path for image or PDF forms, surface uncertain extracted fields, and require confirmation before the workflow can continue.',
  ),
  'ai-feedback-signal-hub': detail(
    'Build a feedback intelligence hub that ingests comments from a small set of approved channels, groups related concerns, and turns repeated signals into evidence-backed issues. The system should help an operator decide what deserves action without inventing facts or hiding the original comments that support each issue.',
    ['Use synthetic feedback and a bounded taxonomy of themes, urgency, and responsible roles.', 'Keep links from every derived issue to the exact source comments and expose classification confidence.', 'Allow an operator to merge, split, dismiss, or assign issues while retaining the original evidence.'],
    ['A feedback intake or import workflow.', 'A prioritized issue dashboard with theme, urgency, confidence, and supporting evidence.', 'An action tracker with owner, status, and resolution notes.'],
    'When an issue crosses a configurable urgency threshold, notify the responsible role. The notification must include the triggering evidence, avoid duplicate alerts, and record delivery status on the issue timeline.',
  ),
  'ai-human-review-assistant': detail(
    'Develop a review assistant for a clearly defined queue such as applications, content reports, or support requests. It may summarize and prioritize items, but a human reviewer must retain authority over every final decision and be able to inspect the evidence, confidence, and policy rule behind each suggestion.',
    ['Use synthetic review items and a transparent scoring rubric that can be demonstrated within the event.', 'Separate machine suggestions from human decisions in both the data model and interface.', 'Record reviewer actions, overrides, and notes without treating model output as a final judgment.'],
    ['A prioritized review queue with filters and confidence labels.', 'An evidence panel explaining each suggested priority or category.', 'Approve, reject, defer, and override actions with an auditable history.'],
    'Low-confidence suggestions can no longer appear in the normal queue. Route them into a dedicated manual-review lane, explain what evidence is missing or conflicting, and prevent automatic progression until a reviewer resolves them.',
  ),

  'health-safe-prescription-organizer': detail(
    'Design a prescription organizer that digitizes medication instructions from synthetic prescriptions, builds a readable schedule, and flags possible conflicts for pharmacist review. It must support safer organization and communication while clearly stating that it does not diagnose, prescribe, or replace professional medical advice.',
    ['Use synthetic medication data and a small organizer-provided interaction ruleset; do not make clinical claims.', 'Show the source and severity of every warning and require pharmacist acknowledgement for flagged conflicts.', 'Protect sensitive fields, support corrections, and retain a timestamped history of schedule changes.'],
    ['Prescription entry or upload with confirmation of extracted fields.', 'A daily medication schedule with reminders and adherence logging.', 'A pharmacist review queue for interaction concerns and unresolved data.'],
    'A patient now needs help from a caregiver. Add explicit, revocable caregiver access to selected schedules and reminders, show exactly what the caregiver can view or update, and record every access change.',
  ),
  'health-wellbeing-pattern-explorer': detail(
    'Build a non-clinical wellbeing explorer that helps a user understand patterns in synthetic or voluntarily supplied sleep, activity, mood, or routine data. It should present trends and correlations in plain language, avoid medical diagnosis, and help the user distinguish observed data from uncertain interpretation.',
    ['Limit insights to descriptive trends and non-clinical suggestions, with visible disclaimers.', 'Let users inspect the data points and date ranges behind every summary.', 'Support consent, export, correction, and deletion of user-provided records.'],
    ['A simple data-entry or synthetic-data import flow.', 'A trends dashboard with explanations and filters by time range.', 'A user-controlled insight journal or action plan linked to observed patterns.'],
    'A week of activity and mood records is missing. Keep the dashboard functional, visibly mark incomplete periods, lower the confidence of affected insights, and explain which conclusions should no longer be trusted.',
  ),
  'health-care-coordination-hub': detail(
    'Create a coordination hub for everyday, non-emergency care involving a person, caregiver, and support professional. The product should organize tasks, reminders, observations, and updates in one shared timeline while ensuring each role sees only the information and actions appropriate to them.',
    ['Use synthetic care plans and clearly separate routine coordination from emergency or diagnostic services.', 'Implement role-based views and an audit trail for task assignment, completion, and note changes.', 'Define escalation rules with duplicate suppression and an explicit acknowledgement step.'],
    ['A shared care plan with tasks, owners, due times, and status.', 'Role-specific dashboards for the person, caregiver, and coordinator.', 'A chronological activity and communication log.'],
    'An urgent routine task passes its response deadline without acknowledgement. Escalate it to a backup role, notify both responsible parties, preserve the original ownership history, and show the escalation clearly on the timeline.',
  ),
  'health-sports-load-planner': detail(
    'Develop a sports workload and recovery planner using synthetic, non-clinical training data such as session duration, perceived exertion, rest, and planned events. It should help an athlete or coach compare workload trends and make explainable schedule adjustments without presenting medical diagnoses.',
    ['Use a simple transparent workload formula and label all recommendations as non-medical guidance.', 'Allow users to correct sessions and see how a change affects the proposed plan.', 'Store consent state and provide export and deletion controls for personal training records.'],
    ['Training-session logging and a weekly workload view.', 'Explainable alerts for sudden increases, low recovery, or schedule conflicts.', 'An editable recommended plan with coach or athlete acknowledgement.'],
    'Privacy requirements change during the event. Add explicit consent before analysis, a clear view of stored data, and a user-controlled deletion action that removes personal records while retaining only a minimal audit receipt.',
  ),

  'fintech-fraud-network-explorer': detail(
    'Build an investigator-facing explorer for synthetic transactions that reveals suspicious relationships among accounts, merchants, devices, and payments. The system should prioritize patterns for human review, provide a transparent evidence trail, and avoid automatically accusing or blocking a real person.',
    ['Use synthetic data and a bounded set of explainable rules such as shared identifiers, rapid movement, or unusual frequency.', 'Separate risk signals from investigator decisions and display confidence or rule contributions.', 'Preserve case notes and status changes in an immutable review timeline.'],
    ['A searchable transaction and entity relationship view.', 'A ranked alert queue with filters and concise explanations.', 'A case workspace for evidence, reviewer decisions, and resolution status.'],
    'Every alert must now be understandable to a non-technical reviewer. Add a plain-language evidence trail showing which transactions and relationships triggered the alert, the rule applied, and what remains uncertain.',
  ),
  'fintech-student-budget-coach': detail(
    'Create a budgeting coach that categorizes synthetic or user-imported transactions, visualizes cash flow, and forecasts progress toward a chosen savings target. Users should be able to correct categories and assumptions, with the forecast updating immediately and never presenting itself as regulated financial advice.',
    ['Use synthetic records or explicit user uploads; do not connect to live bank accounts.', 'Make category rules and forecast assumptions visible and editable.', 'Handle duplicate, missing, and corrected transactions without silently changing totals.'],
    ['Transaction categorization with manual correction.', 'Income, expense, and savings-goal dashboards.', 'An explainable forecast with at least two adjustable scenarios.'],
    'The user can only provide an offline CSV export. Add CSV import, validate malformed rows, detect likely duplicates against existing transactions, and provide a reconciliation screen before totals are updated.',
  ),
  'fintech-payment-risk-guard': detail(
    'Develop an explainable risk guard for synthetic digital payments. It should score each payment from a small, auditable set of signals, explain when extra verification is requested, and allow legitimate users to complete a safe review path instead of relying on unexplained block-or-allow decisions.',
    ['Use a deterministic ruleset or lightweight model over synthetic payments and identities.', 'Expose signal contributions, thresholds, and uncertainty without leaking sensitive security details.', 'Record verification attempts and reviewer outcomes while minimizing stored personal data.'],
    ['A payment simulation or API submission interface.', 'A risk decision panel with signal-level explanations.', 'A review queue and audit timeline for challenged payments.'],
    'High-risk payments may no longer be rejected immediately. Add a step-up verification flow with a one-time challenge, expiry, retry limit, and a clear recovery path, then record how verification changed the final decision.',
  ),
  'fintech-invoice-anomaly-monitor': detail(
    'Build a monitor for synthetic small-business invoices that identifies likely duplicates, unusual amounts, sudden vendor changes, and rapid resubmissions. The tool should help an owner or accountant investigate anomalies while preserving the original invoice and avoiding irreversible automated decisions.',
    ['Use a bounded invoice schema and explainable anomaly rules suitable for a 24-hour prototype.', 'Keep source documents, extracted values, corrections, and decisions traceable.', 'Provide clear false-positive and resolved states so alerts do not disappear without history.'],
    ['Invoice upload or synthetic batch import with field validation.', 'An anomaly dashboard showing rule, severity, and comparable invoices.', 'A review workflow with notes, status, and exportable evidence.'],
    'A merchant disputes an anomaly decision. Add a dispute workflow that accepts supporting evidence, preserves every prior value and decision, assigns a reviewer, and records the final resolution without overwriting history.',
  ),

  'cities-green-corridor-planner': detail(
    'Design an emergency green-corridor planner that recommends a safer route for an ambulance or response vehicle using simulated traffic, road capacity, hospital availability, and incident data. Dispatchers must be able to compare alternatives and understand why a route was selected instead of receiving an unexplained shortest path.',
    ['Use a small synthetic road graph and simulated traffic updates; live traffic integration is optional.', 'Balance travel time, safety constraints, closures, and destination capacity with visible rule weights.', 'Keep a dispatcher confirmation step and a timestamped history of route changes.'],
    ['An incident form capturing origin, destination needs, and priority.', 'A map or graph showing the recommended route and at least one alternative.', 'A dispatcher dashboard with route explanation, status, and update history.'],
    'A road on the active corridor closes after dispatch. Detect that the route is invalid, calculate a safe alternative from the vehicle’s latest simulated position, alert the dispatcher, and preserve both route versions with reasons.',
  ),
  'cities-shuttle-demand-planner': detail(
    'Build a campus shuttle demand planner that combines synthetic schedules, stop capacity, event times, and rider intent to help students choose less-crowded travel options. Operators should see predicted pressure by route and time window while students receive understandable alternatives rather than false precision.',
    ['Use synthetic demand and timetable data with transparent capacity assumptions.', 'Show confidence or data freshness beside forecasts and allow manual operator corrections.', 'Prioritize a responsive student flow and a separate lightweight operator view.'],
    ['A student route and departure-time recommendation screen.', 'A demand heat map or route-capacity dashboard.', 'An operator control for service notices and schedule adjustments.'],
    'A major campus event ends ninety minutes early, shifting demand immediately. Accept the schedule update, recalculate affected forecasts and recommendations, notify impacted riders, and show which assumptions changed.',
  ),
  'cities-disaster-triage-map': detail(
    'Create a disaster incident triage map for synthetic reports arriving from citizens, volunteers, and responders. The system should identify likely duplicates, classify needs, estimate priority from transparent rules, and keep humans in control of dispatch decisions during a rapidly changing situation.',
    ['Use synthetic incident reports and a bounded taxonomy of location, need, severity, and verification status.', 'Never discard duplicates; link them to a canonical incident with retained evidence.', 'Expose confidence, source freshness, and manual override history for every priority.'],
    ['A report intake workflow supporting location and evidence.', 'A map and prioritized queue of canonical incidents.', 'A responder assignment and status timeline with duplicate links.'],
    'Connectivity fails for field reporters. Add an offline queue that accepts reports with local timestamps, visibly marks unsynchronized records, and resolves duplicate or conflicting updates when connectivity returns.',
  ),
  'cities-relief-allocation-board': detail(
    'Develop a relief allocation board that matches synthetic supplies, volunteers, vehicles, and shelters to prioritized requests. Coordinators should be able to see why an allocation is proposed, adjust it manually, and track partial fulfilment without hiding unmet needs or overcommitting scarce stock.',
    ['Use synthetic inventories and requests with explicit quantity, location, expiry, capability, and priority fields.', 'Prevent double-allocation transactionally and display unmet quantities after every match.', 'Keep manual approvals and a complete allocation, dispatch, and delivery history.'],
    ['Request and resource registration workflows.', 'An explainable matching board with conflicts and unmet needs.', 'A dispatch tracker showing ownership, quantities, and delivery status.'],
    'A primary supply depot becomes unavailable after allocations are planned. Freeze its stock, identify every affected dispatch, propose reassignment from remaining depots, and show requests that can no longer be fully served.',
  ),

  'security-cloud-drift-simulator': detail(
    'Build a cloud configuration drift simulator that compares synthetic resource snapshots with an approved security baseline. It should identify violations, explain their impact, and recommend safe remediation steps without requiring access to a participant’s real AWS account or automatically changing infrastructure.',
    ['Use synthetic resource JSON and a small versioned baseline ruleset.', 'Show expected and observed values, severity, evidence, and remediation guidance for each finding.', 'Allow acknowledgement, exception, and resolved states with an audit history.'],
    ['A baseline definition or selection view.', 'A scan results dashboard grouped by resource and severity.', 'A remediation and exception workflow with before-and-after evidence.'],
    'Organizers publish a new baseline rule during the event. Version the baseline, apply the new rule to all existing synthetic resources, distinguish newly introduced findings, and preserve results from the previous scan.',
  ),
  'security-zero-trust-monitor': detail(
    'Create a zero-trust activity monitor for synthetic API events that identifies unusual access patterns using identity, device, endpoint, time, and request-volume signals. It should help an analyst investigate risk through evidence and context rather than offering only a silent allow-or-block result.',
    ['Use synthetic logs and a bounded, explainable risk scoring policy.', 'Minimize identity data while preserving enough context for investigation.', 'Separate automated signal generation from analyst disposition and record all overrides.'],
    ['An event ingestion or replay simulator.', 'A per-user and per-endpoint risk dashboard with evidence.', 'An analyst queue with disposition, notes, and audit history.'],
    'Analysts reject binary decisions. Add a per-user risk explanation that lists contributing signals, recent comparable behavior, uncertainty, and the exact reason an action was allowed, challenged, or escalated.',
  ),
  'security-privacy-control-center': detail(
    'Develop a privacy control center where a user can understand what data a fictional service collects, why it is used, and which consent grants are active. Users must be able to modify, export, and revoke consent while the application records lawful, comprehensible changes rather than hiding them in settings.',
    ['Model a small set of data purposes and granular consent states with versioned policy text.', 'Apply least privilege and ensure revoked purposes stop future processing in the simulated workflow.', 'Keep an append-only consent history while protecting exported personal data.'],
    ['A plain-language consent dashboard grouped by purpose.', 'Modify, revoke, and export controls with confirmation.', 'An audit timeline showing policy version, actor, action, and effective time.'],
    'A user revokes consent while a data-processing job is in progress. Stop or quarantine the affected work, prevent later processing, explain the outcome to the user, and record the mid-flow revocation in the audit trail.',
  ),
  'security-media-evidence-desk': detail(
    'Build an evidence desk that helps reviewers assess a synthetic media item or public claim by collecting sources, provenance notes, and uncertainty indicators. It must organize evidence and disagreements without claiming absolute authenticity or replacing trained fact-checkers.',
    ['Use organizer-provided or synthetic media and sources; avoid unsupported biometric or forensic certainty.', 'Keep provenance, timestamp, reviewer notes, and source quality visible.', 'Separate observations, source claims, automated hints, and final reviewer conclusions.'],
    ['A case intake flow for media or claims and related sources.', 'An evidence comparison workspace with provenance and confidence.', 'A reviewer conclusion report that explicitly states unresolved questions.'],
    'Two credible sources provide conflicting evidence. Present both without suppressing either, show how each affects confidence, require a reviewer note, and allow the case to remain unresolved rather than forcing a verdict.',
  ),

  'education-accessible-lecture-companion': detail(
    'Create an accessible lecture companion that turns organizer-provided or recorded educational content into captions, structured notes, key terms, and useful descriptions of important visuals. Students must be able to navigate the material in multiple ways and correct generated content when it is inaccurate.',
    ['Use a short sample lecture and clearly label generated or incomplete content.', 'Support semantic headings, transcript timestamps, sufficient contrast, and user-controlled text size.', 'Provide correction and export paths without requiring advanced real-time transcription.'],
    ['A lecture viewer with synchronized transcript or captions.', 'Structured notes, key terms, and accessible visual descriptions.', 'Search, correction, and accessible export controls.'],
    'The core experience must now work without a mouse. Make every action keyboard reachable, add visible focus and screen-reader labels, provide skip navigation, and verify the transcript and notes in a logical reading order.',
  ),
  'education-knowledge-gap-diagnostic': detail(
    'Build a diagnostic tool that maps synthetic assessment responses to specific concepts and recommends the next area for a learner to review. The output should show the evidence behind every identified gap, distinguish unanswered questions from incorrect answers, and avoid pretending a short assessment is definitive.',
    ['Use a small concept map and organizer-defined question-to-concept mappings.', 'Calculate mastery with a transparent formula and display confidence based on evidence coverage.', 'Allow instructors or learners to inspect answers and correct mapping errors.'],
    ['An assessment-taking or result-import workflow.', 'A concept map showing strengths, gaps, and supporting questions.', 'A prioritized review plan with explanations and progress tracking.'],
    'Part of the assessment data becomes unavailable. Recalculate mastery and recommendations, visibly lower confidence for under-sampled concepts, and explain exactly which missing responses affected each conclusion.',
  ),
  'education-adaptive-practice-studio': detail(
    'Develop an adaptive practice studio that selects the next task from a bounded content bank using learner performance, recent mistakes, and stated goals. The learner should understand why difficulty or topic changed, and educators should be able to inspect and override the adaptation rules.',
    ['Use a compact organizer-created question bank with tagged concepts and difficulty metadata.', 'Apply a deterministic adaptation policy suitable for demonstration and preserve attempt history.', 'Avoid high-stakes grading claims and provide manual educator control.'],
    ['A practice session with immediate, constructive feedback.', 'A learner progress view tied to concepts and attempts.', 'An explainable next-task recommendation plus educator override.'],
    'A second learner joins with different strengths and goals. Keep profiles and histories isolated, generate a distinct next path for each learner, and let an educator compare why their recommendations diverged.',
  ),
  'education-career-navigator': detail(
    'Create a skills-to-career navigator that compares a user-entered skills profile with a selected target role and produces a realistic learning sequence. Recommendations should cite the skill gap they address, acknowledge uncertainty in role data, and let the user control priorities, time, and constraints.',
    ['Use a curated synthetic role-and-skill dataset rather than scraping live job listings during judging.', 'Make matching weights and prerequisite relationships visible and editable.', 'Avoid hiring guarantees and distinguish evidence from recommendations.'],
    ['A skills profile and target-role selection flow.', 'A gap analysis with evidence and confidence.', 'A sequenced learning plan with milestones, resources, and editable constraints.'],
    'The learner changes their target role after creating a plan. Recompute the gaps and sequence, preserve completed milestones, explain what was added or removed, and show how the new role altered priorities.',
  ),

  'climate-microgrid-energy-planner': detail(
    'Design a microgrid planning dashboard that recommends when to charge, discharge, conserve, or defer flexible loads using simulated demand, renewable generation, battery state, and tariff data. Operators should be able to inspect assumptions and compare stability, cost, and renewable-use trade-offs before accepting a plan.',
    ['Use a bounded synthetic time series and a transparent rule-based or simple optimization strategy.', 'Enforce battery capacity, reserve, and charge-rate constraints in every recommendation.', 'Label forecasts and assumptions clearly and keep a safe operator override.'],
    ['A demand, generation, and storage monitoring dashboard.', 'An explainable schedule of recommended energy actions.', 'A scenario comparison showing cost, reserve, and renewable utilization.'],
    'The renewable forecast feed fails for the next six hours. Detect stale data, switch to a conservative fallback plan using recent observations and reserve limits, explain reduced confidence, and notify the operator.',
  ),
  'climate-water-leak-watch': detail(
    'Build a water-use anomaly monitor for synthetic household or campus meter readings. It should distinguish expected patterns from sustained abnormal use, help users investigate likely leaks, and recommend practical next actions without claiming certainty from a single noisy reading.',
    ['Use synthetic time-series data and transparent thresholds or baseline comparisons.', 'Show the readings, duration, and confidence behind every alert and support false-positive feedback.', 'Separate resident and facilities views while minimizing personally identifiable behavior data.'],
    ['A water-consumption dashboard with baseline comparisons.', 'An alert queue explaining anomaly severity and evidence.', 'A response workflow for acknowledgement, inspection, and resolution.'],
    'A sustained high-flow pattern crosses the major-leak threshold. Escalate it to both the resident and facilities role, prevent duplicate alerts, require acknowledgement, and track inspection and resolution timestamps.',
  ),
  'climate-food-redistribution-hub': detail(
    'Create a food-surplus redistribution hub that matches verified synthetic donations with nearby recipient requests using quantity, food type, expiry, storage needs, distance, and pickup capacity. The system should prioritize safety and traceability while showing why a match was proposed and what demand remains unmet.',
    ['Use synthetic donors and recipients with explicit verification and handling-status fields.', 'Prevent expired or incompatible items from matching and avoid double-allocation.', 'Require acceptance by both sides and retain custody and cancellation history.'],
    ['Donation and recipient-demand registration flows.', 'An explainable matching board with expiry and logistics warnings.', 'Pickup, custody, and delivery tracking with unmet-demand visibility.'],
    'A donor cancels after recipients and pickup volunteers have accepted a match. Release the stock safely, notify every affected party, find eligible replacement surplus, and retain the cancelled match in the audit history.',
  ),
  'climate-crop-advisory-assistant': detail(
    'Develop a localized crop advisory assistant using synthetic crop stage, soil observation, weather, and pest-report data. It should provide non-binding, explainable care suggestions in accessible language, cite the inputs behind each suggestion, and encourage expert confirmation for high-risk actions.',
    ['Limit the prototype to a small set of crops, regions, and organizer-approved advisory rules.', 'Display data freshness, uncertainty, and safety disclaimers; do not prescribe restricted chemicals.', 'Allow farmers to correct local observations and compare how advice changes.'],
    ['A crop and field profile with local observations.', 'A prioritized advisory feed with evidence and timing.', 'A history of actions, feedback, and changing conditions.'],
    'A new weather warning changes the risk profile after advice was issued. Re-evaluate affected recommendations, highlight what changed, withdraw unsafe guidance, and notify the farmer with a revised action window.',
  ),

  'retail-inventory-demand-engine': detail(
    'Build an inventory intelligence engine that forecasts short-term synthetic demand and flags discrepancies among expected, recorded, and counted stock. Store managers should be able to inspect the evidence, confidence, and business impact behind each forecast or shrinkage alert before taking action.',
    ['Use a limited product and store dataset with an explainable baseline forecast.', 'Separate sales, receipts, transfers, and physical counts in the stock model.', 'Support correction and reconciliation without overwriting the original observations.'],
    ['A product-level demand and stock dashboard.', 'An anomaly queue showing quantity, confidence, and supporting events.', 'A replenishment or investigation workflow with status history.'],
    'Two trusted stock counts conflict. Add a reconciliation workflow that compares source, timestamp, movements, and confidence, requests a deciding review, and preserves both counts and the final adjustment.',
  ),
  'retail-cold-chain-tracker': detail(
    'Create a cold-chain compliance tracker for synthetic batches moving through suppliers, warehouses, carriers, and stores. The product should combine custody events and temperature readings, surface exposure windows, and help a reviewer decide whether a batch remains usable without making unsupported safety claims.',
    ['Use synthetic telemetry and a simple product-specific temperature policy.', 'Preserve append-only custody and sensor evidence with timestamps and source identity.', 'Separate automatic alerts from human quarantine and release decisions.'],
    ['A batch and custody timeline.', 'A temperature-compliance dashboard with excursion evidence.', 'A review workflow for quarantine, investigation, and disposition.'],
    'Telemetry disappears during transit. Mark the evidence gap, automatically quarantine the affected batch, block normal handoff, and require a reviewer to document investigation and disposition before release.',
  ),
  'retail-low-carbon-fleet-planner': detail(
    'Develop a fleet dispatch planner that assigns synthetic deliveries to available vehicles while balancing capacity, promised time, distance, and estimated emissions. Dispatchers should be able to compare plans, understand compromises, and override assignments when operational knowledge is missing.',
    ['Use a small synthetic fleet, delivery set, and distance matrix; live routing is optional.', 'Enforce vehicle capacity, availability, and delivery-window constraints.', 'Explain the score or trade-off for each assignment and retain dispatcher changes.'],
    ['A vehicle and delivery intake dashboard.', 'An explainable dispatch plan with route and emissions estimates.', 'A scenario comparison and manual reassignment workflow.'],
    'One assigned vehicle becomes unavailable immediately before departure. Remove it from capacity, identify affected deliveries, generate a feasible re-plan, and clearly show delays or orders that cannot be reassigned.',
  ),
  'retail-size-fit-assistant': detail(
    'Build an explainable size and fit assistant using synthetic product measurements, customer preferences, purchases, and returns. It should recommend a size or product while explaining the evidence and uncertainty, allow feedback, and avoid inferring sensitive body information beyond what the user provides.',
    ['Use a bounded synthetic catalog with brand-specific measurements and return reasons.', 'Display confidence and the factors that influenced each recommendation.', 'Allow the user to correct preferences and delete profile information.'],
    ['A preference and optional measurement setup flow.', 'Product-level size recommendations with explanations and alternatives.', 'A feedback and return-reason loop that updates future suggestions.'],
    'A product line experiences a sudden return-rate spike. Detect the change, reduce confidence or adjust recommendations for affected items, and explain to shoppers and reviewers why the advice changed.',
  ),

  'work-meeting-action-compiler': detail(
    'Build a meeting-to-action compiler that converts a synthetic transcript into proposed decisions, tasks, owners, and deadlines. Participants must review and confirm extracted items before they become commitments, and every action should remain linked to the exact transcript evidence that created it.',
    ['Use short organizer-provided transcripts and a bounded participant directory.', 'Separate proposed items from confirmed tasks and expose extraction confidence.', 'Preserve corrections, reassignment, completion, and source references in the timeline.'],
    ['Transcript upload or selection with timestamped viewing.', 'A review screen for proposed decisions and action items.', 'An action board with owners, due dates, evidence, and status.'],
    'A confirmed action passes its deadline while its owner is unavailable. Escalate it, suggest an eligible replacement owner, require confirmation, and retain the original owner and missed-deadline history.',
  ),
  'work-workload-balance-monitor': detail(
    'Create a workload balance monitor that combines synthetic task load, working patterns, and voluntary self-reports to surface potentially unsustainable trends. It must avoid clinical or employee-performance judgments, provide transparent evidence, and let individuals control what personal data is shared.',
    ['Use synthetic workloads and non-clinical indicators with explicit consent.', 'Present trends at useful aggregation levels and avoid ranking employees.', 'Show confidence, support corrections, and keep manager actions separate from automated observations.'],
    ['An individual workload and preference view.', 'A team-level capacity dashboard with privacy safeguards.', 'Explainable suggestions for reprioritization, recovery time, or manager review.'],
    'A contributor stops providing voluntary self-reports. Keep the monitor useful using available task data, visibly reduce confidence, avoid assuming wellbeing status, and tell managers what information is now missing.',
  ),
  'work-team-knowledge-finder': detail(
    'Develop a team knowledge finder that retrieves answers from a small, approved collection of project documents while keeping source, owner, date, and confidence visible. Users should be able to open the supporting passage and flag stale or incorrect content rather than trusting an unsupported generated answer.',
    ['Use an organizer-provided document collection with metadata and access labels.', 'Return source-linked results and abstain when evidence is insufficient.', 'Respect document visibility and record corrections or review requests.'],
    ['Document ingestion and metadata management.', 'A search or question interface with cited supporting passages.', 'A freshness and review workflow for flagged knowledge.'],
    'Two project documents give conflicting instructions. Detect the conflict, compare owners and freshness, show both sources, lower answer confidence, and route the item to a human owner for resolution.',
  ),
  'work-project-coordination-pulse': detail(
    'Build a project coordination pulse that combines synthetic tasks, milestones, dependencies, availability, and blockers into a shared operational view. It should make stalled work and downstream impact visible while helping the team agree on updates instead of silently changing assignments.',
    ['Use a bounded project with explicit dependencies and role capabilities.', 'Calculate blocked or at-risk status from transparent rules and data freshness.', 'Require confirmation for reassignment and preserve the full change history.'],
    ['A shared board for milestones, dependencies, and owners.', 'A blocker and downstream-impact view with alerts.', 'A status-update and reassignment workflow with audit history.'],
    'A contributor becomes unavailable mid-project. Identify affected tasks and downstream milestones, propose a capability-aware rebalance, require team confirmation, and clearly show capacity or deadline risks that remain.',
  ),

  'civic-grievance-triage-engine': detail(
    'Create a civic grievance triage engine that accepts synthetic public complaints, groups related reports, routes each issue to an appropriate department, and tracks progress against a defined service-level target. Citizens and operators must see transparent status without exposing private reporter details.',
    ['Use a bounded grievance taxonomy, department directory, and synthetic reports.', 'Retain every report as evidence when deduplicating and expose routing confidence.', 'Implement role-aware public and operator views with an auditable status history.'],
    ['A multilingual-friendly complaint intake flow with location and evidence.', 'An operator queue grouped by category, urgency, and SLA risk.', 'A citizen status page and department resolution workflow.'],
    'A public incident creates a surge of near-duplicate complaints. Merge them into a canonical case without losing individual evidence or acknowledgements, update all reporters consistently, and prevent the surge from distorting priority.',
  ),
  'civic-participatory-budgeting-tool': detail(
    'Build a participatory budgeting tool where residents can review synthetic proposals, understand cost and impact, express priorities, and explore transparent allocations under a fixed budget. The application should make trade-offs visible and prevent a popular proposal from silently exceeding constraints.',
    ['Use a small approved proposal dataset with cost, category, beneficiaries, and compatibility constraints.', 'Apply a transparent ranking and allocation method with visible assumptions.', 'Keep voting or preference data privacy-aware and expose aggregate results.'],
    ['Proposal browsing and comparison.', 'A preference or voting workflow with clear eligibility rules.', 'An interactive allocation simulator explaining funded and unfunded choices.'],
    'The available budget falls by twenty percent after preferences are collected. Recompute feasible allocations, preserve the original scenario, explain which proposals changed status, and let users compare the trade-offs.',
  ),
  'civic-low-connectivity-portal': detail(
    'Develop a public-service portal for one clearly defined civic process that remains usable on low-end devices and unreliable networks. Residents should be able to understand requirements, prepare a submission, receive a local receipt, and later confirm server synchronization without repeatedly entering the same data.',
    ['Scope the prototype to one service and a small form with synthetic records.', 'Optimize the critical path for low bandwidth, keyboard access, and progressive enhancement.', 'Encrypt sensitive submissions, identify offline state clearly, and use idempotent synchronization.'],
    ['A lightweight eligibility and guidance page.', 'An offline-capable form with validation and local receipt.', 'A synchronization status and conflict-resolution workflow.'],
    'Several offline submissions synchronize after their server records were edited elsewhere. Detect conflicts, preserve both versions, explain the differing fields, and require an explicit merge or selection before final submission.',
  ),
  'civic-inclusive-service-redesign': detail(
    'Redesign one campus or civic service for a clearly identified underserved user group. Teams should document the barrier, create an inclusive end-to-end workflow, and demonstrate how the solution improves access while protecting dignity, privacy, and the ability to use a non-digital alternative.',
    ['Define one primary persona using evidence supplied or gathered ethically during the event.', 'Meet basic accessibility, plain-language, consent, and low-bandwidth requirements.', 'Measure success with observable service outcomes rather than visual polish alone.'],
    ['A concise barrier and user-journey map.', 'A working inclusive service prototype covering the core journey.', 'An accessibility checklist, feedback mechanism, and outcome measurement plan.'],
    'A second persona arrives with different language or accessibility needs. Extend the same core service without creating a separate inferior path, document conflicts between needs, and show how users choose appropriate accommodations.',
  ),
});
