import { CHALLENGE_DETAILS } from './challengeDetails.js';

export const CHALLENGE_SWAP_COST = 100;

const challenge = (id, track, title, summary, tags, chaosId, chaosTitle) => {
  const details = CHALLENGE_DETAILS[id];
  if (!details) throw new Error(`Missing detailed challenge brief for ${id}`);
  return Object.freeze({
    id,
    track,
    title,
    summary,
    desc: details.desc,
    technicalScope: details.technicalScope,
    deliverables: details.deliverables,
    tags: Object.freeze(tags),
    points: 100,
    chaosTwist: Object.freeze({ id: chaosId, title: chaosTitle, desc: details.chaosDesc }),
  });
};

export const CHALLENGE_CATALOG = Object.freeze([
  challenge('ai-adaptive-campus-concierge', 'AI & Automation', 'Adaptive Campus Services Concierge', 'Personalize campus notices, services, and next actions for distinct student needs.', ['Lambda', 'DynamoDB', 'S3'], 'ai-manual-override', 'Manual Override Required', 'Add a manual override and record why a recommendation changed.'),
  challenge('ai-document-workflow-automator', 'AI & Automation', 'Document-to-Workflow Automator', 'Turn forms or requests into a tracked multi-step workflow.', ['Lambda', 'Step Functions', 'DynamoDB'], 'ai-second-input', 'Second Input Format', 'Support a second input format, including scanned forms.'),
  challenge('ai-feedback-signal-hub', 'AI & Automation', 'Feedback Signal-to-Action Hub', 'Convert feedback into evidence-backed issues and actions.', ['S3', 'Lambda', 'DynamoDB'], 'ai-action-notification', 'Action Notification', 'Notify the responsible role with the evidence that triggered it.'),
  challenge('ai-human-review-assistant', 'AI & Automation', 'Human-in-the-Loop Review Assistant', 'Help reviewers prioritize work while humans approve final actions.', ['Lambda', 'DynamoDB', 'Cognito'], 'ai-low-confidence', 'Low Confidence Escalation', 'Escalate low-confidence suggestions for manual review.'),

  challenge('health-safe-prescription-organizer', 'Healthcare & Wellbeing', 'Safe Prescription Organizer', 'Digitize prescription details and flag interaction concerns for pharmacist review without giving medical advice.', ['S3', 'Lambda', 'DynamoDB'], 'health-caregiver-access', 'Caregiver Access', 'Add approved caregiver access to medication schedules.'),
  challenge('health-wellbeing-pattern-explorer', 'Healthcare & Wellbeing', 'Wellbeing Pattern Explorer', 'Explain trends from synthetic or user-provided activity data.', ['Lambda', 'DynamoDB', 'S3'], 'health-missing-data', 'Incomplete Data', 'Handle missing data and communicate uncertainty.'),
  challenge('health-care-coordination-hub', 'Healthcare & Wellbeing', 'Everyday Care Coordination Hub', 'Coordinate tasks, reminders, logs, and updates for care roles.', ['Cognito', 'DynamoDB', 'SNS'], 'health-urgent-escalation', 'Urgent Task Escalation', 'Escalate an urgent task when its owner does not respond.'),
  challenge('health-sports-load-planner', 'Healthcare & Wellbeing', 'Sports Load & Recovery Planner', 'Recommend workload adjustments from non-clinical training data.', ['Lambda', 'DynamoDB', 'EventBridge'], 'health-consent-controls', 'Consent Controls', 'Add consent and user-controlled data deletion.'),

  challenge('fintech-fraud-network-explorer', 'FinTech & Digital Commerce', 'Fraud Network Explorer', 'Surface suspicious synthetic transaction networks for reviewer action.', ['Lambda', 'DynamoDB', 'S3'], 'fintech-evidence-trail', 'Evidence Trail Required', 'Show a plain-language evidence trail for every alert.'),
  challenge('fintech-student-budget-coach', 'FinTech & Digital Commerce', 'Student Budget & Cashflow Coach', 'Categorize spending and forecast progress toward a savings target.', ['Lambda', 'DynamoDB', 'S3'], 'fintech-offline-reconcile', 'Offline Reconciliation', 'Import offline CSV data and reconcile duplicates.'),
  challenge('fintech-payment-risk-guard', 'FinTech & Digital Commerce', 'Explainable Payment Risk Guard', 'Score synthetic payment risk and explain extra-verification decisions.', ['API Gateway', 'Lambda', 'DynamoDB'], 'fintech-step-up', 'Step-up Verification', 'Add a safe step-up verification flow.'),
  challenge('fintech-invoice-anomaly-monitor', 'FinTech & Digital Commerce', 'Small Business Invoice Anomaly Monitor', 'Detect duplicate, unusual, or rapidly changing invoice patterns.', ['Lambda', 'DynamoDB', 'S3'], 'fintech-dispute-workflow', 'Merchant Dispute Workflow', 'Add a merchant dispute workflow with preserved history.'),

  challenge('cities-green-corridor-planner', 'Smart Cities, Mobility & Disaster Response', 'Emergency Green-Corridor Planner', 'Recommend safer emergency routes from simulated traffic data.', ['Lambda', 'DynamoDB', 'API Gateway'], 'cities-road-closure', 'Road Closure', 'Recalculate when a road closure invalidates the route.'),
  challenge('cities-shuttle-demand-planner', 'Smart Cities, Mobility & Disaster Response', 'Campus Shuttle Demand Planner', 'Help students choose less-crowded shuttle options.', ['Lambda', 'DynamoDB', 'EventBridge'], 'cities-event-demand', 'Demand Surge', 'React to an event ending early and changed demand.'),
  challenge('cities-disaster-triage-map', 'Smart Cities, Mobility & Disaster Response', 'Disaster Incident Triage Map', 'Deduplicate, classify, and prioritize synthetic incident reports.', ['S3', 'Lambda', 'DynamoDB'], 'cities-offline-sync', 'Communication Outage', 'Queue and later synchronize reports during an outage.'),
  challenge('cities-relief-allocation-board', 'Smart Cities, Mobility & Disaster Response', 'Relief Resource Allocation Board', 'Match supplies and volunteers to high-priority requests.', ['SQS', 'SNS', 'Lambda'], 'cities-depot-loss', 'Depot Unavailable', 'Reallocate after a key supply depot becomes unavailable.'),

  challenge('security-cloud-drift-simulator', 'Cybersecurity, Trust & Digital Identity', 'Cloud Drift Detection Simulator', 'Detect simulated baseline violations and recommend remediation.', ['CloudWatch', 'Lambda', 'DynamoDB'], 'security-new-baseline', 'New Security Baseline', 'Apply a new baseline rule to existing resources.'),
  challenge('security-zero-trust-monitor', 'Cybersecurity, Trust & Digital Identity', 'Zero-Trust API Activity Monitor', 'Identify abnormal synthetic API usage with evidence.', ['API Gateway', 'Lambda', 'DynamoDB'], 'security-risk-explanations', 'Risk Explanations', 'Add per-user risk explanations, not just block or allow.'),
  challenge('security-privacy-control-center', 'Cybersecurity, Trust & Digital Identity', 'Privacy Consent & Data Control Center', 'Let users review, modify, export, and revoke consent.', ['Cognito', 'DynamoDB', 'S3'], 'security-consent-revocation', 'Consent Revocation', 'Process mid-flow consent revocation with an audit record.'),
  challenge('security-media-evidence-desk', 'Cybersecurity, Trust & Digital Identity', 'Media Authenticity Evidence Desk', 'Assess media or claims using sources and uncertainty.', ['S3', 'Lambda', 'DynamoDB'], 'security-conflicting-sources', 'Conflicting Sources', 'Present conflicting evidence and unresolved confidence.'),

  challenge('education-accessible-lecture-companion', 'Education, Skills & Accessibility', 'Accessible Lecture Companion', 'Deliver captions, notes, and accessible visual descriptions.', ['S3', 'Lambda', 'DynamoDB'], 'education-keyboard-access', 'Keyboard-first Access', 'Make the core workflow keyboard and screen-reader ready.'),
  challenge('education-knowledge-gap-diagnostic', 'Education, Skills & Accessibility', 'Knowledge-Gap Diagnostic', 'Map assessments to actionable concept gaps.', ['Lambda', 'DynamoDB', 'S3'], 'education-incomplete-assessment', 'Incomplete Assessment', 'Lower confidence when assessment data is incomplete.'),
  challenge('education-adaptive-practice-studio', 'Education, Skills & Accessibility', 'Adaptive Practice Studio', 'Change practice tasks based on learner performance.', ['Lambda', 'DynamoDB', 'S3'], 'education-second-learner', 'Second Learner Profile', 'Support a second learner with a distinct next path.'),
  challenge('education-career-navigator', 'Education, Skills & Accessibility', 'Skills-to-Career Navigator', 'Map skills to a realistic target-role learning plan.', ['Lambda', 'DynamoDB', 'S3'], 'education-role-change', 'Target Role Changed', 'Recompute and explain the plan after the target role changes.'),

  challenge('climate-microgrid-energy-planner', 'Climate, Energy & Agriculture', 'Microgrid Energy Planner', 'Recommend stable energy storage actions from simulated data.', ['Lambda', 'DynamoDB', 'EventBridge'], 'climate-forecast-failure', 'Forecast Feed Failure', 'Fall back safely when forecast data fails.'),
  challenge('climate-water-leak-watch', 'Climate, Energy & Agriculture', 'Water Anomaly & Leak Watch', 'Detect abnormal water use and recommend actions.', ['Lambda', 'DynamoDB', 'SNS'], 'climate-major-leak', 'Major Leak Alert', 'Escalate a major leak to resident and facilities roles.'),
  challenge('climate-food-redistribution-hub', 'Climate, Energy & Agriculture', 'Food Waste Redistribution Hub', 'Match usable food surplus to verified nearby demand.', ['Lambda', 'DynamoDB', 'S3'], 'climate-donor-cancelled', 'Donor Cancelled', 'Reassign stock when a donor cancels after matching.'),
  challenge('climate-crop-advisory-assistant', 'Climate, Energy & Agriculture', 'Crop Health & Advisory Assistant', 'Give non-binding, localized crop-care guidance.', ['S3', 'Lambda', 'DynamoDB'], 'climate-weather-change', 'Weather Risk Changed', 'Update advice after weather-risk conditions change.'),

  challenge('retail-inventory-demand-engine', 'Retail, Supply Chain & Logistics', 'Inventory Shrinkage & Demand Forecasting Engine', 'Forecast demand and flag stock anomalies.', ['Lambda', 'S3', 'DynamoDB'], 'retail-stock-conflict', 'Conflicting Stock Count', 'Reconcile conflicting stock counts with confidence.'),
  challenge('retail-cold-chain-tracker', 'Retail, Supply Chain & Logistics', 'Cold-Chain Compliance Tracker', 'Track synthetic custody and temperature compliance.', ['Lambda', 'DynamoDB', 'S3'], 'retail-telemetry-loss', 'Telemetry Loss', 'Quarantine and review a batch after telemetry loss.'),
  challenge('retail-low-carbon-fleet-planner', 'Retail, Supply Chain & Logistics', 'Low-Carbon Fleet Dispatch Planner', 'Balance delivery capacity, delay, and emissions.', ['Lambda', 'DynamoDB', 'API Gateway'], 'retail-vehicle-unavailable', 'Vehicle Unavailable', 'Re-plan after one vehicle becomes unavailable.'),
  challenge('retail-size-fit-assistant', 'Retail, Supply Chain & Logistics', 'Explainable Size & Fit Assistant', 'Recommend size and products using purchase and return history.', ['API Gateway', 'Lambda', 'DynamoDB'], 'retail-return-spike', 'Return-rate Spike', 'Adapt after a return-rate spike and explain why.'),

  challenge('work-meeting-action-compiler', 'Workforce, Productivity & Digital Life', 'Meeting-to-Action Compiler', 'Extract owners, deadlines, and decisions from transcripts.', ['S3', 'Lambda', 'DynamoDB'], 'work-missed-action', 'Missed Action', 'Escalate and reassign a missed action.'),
  challenge('work-workload-balance-monitor', 'Workforce, Productivity & Digital Life', 'Workload Balance Monitor', 'Identify unsustainable work patterns without clinical claims.', ['Lambda', 'DynamoDB', 'EventBridge'], 'work-missing-self-report', 'Missing Self-report', 'Handle stopped self-reporting with visible uncertainty.'),
  challenge('work-team-knowledge-finder', 'Workforce, Productivity & Digital Life', 'Team Knowledge Finder', 'Retrieve reliable project information with source context.', ['S3', 'Lambda', 'DynamoDB'], 'work-conflicting-documents', 'Conflicting Documents', 'Resolve conflicting documents using freshness and review.'),
  challenge('work-project-coordination-pulse', 'Workforce, Productivity & Digital Life', 'Project Coordination Pulse', 'Show dependencies, blockers, and shared team status.', ['Lambda', 'DynamoDB', 'SNS'], 'work-contributor-unavailable', 'Contributor Unavailable', 'Rebalance work when a contributor becomes unavailable.'),

  challenge('civic-grievance-triage-engine', 'Civic Tech & Open Innovation', 'Public Grievance Triage Engine', 'Route civic complaints and track resolution against an SLA.', ['S3', 'Lambda', 'DynamoDB'], 'civic-duplicate-surge', 'Duplicate Report Surge', 'Merge a surge of duplicate reports while retaining evidence.'),
  challenge('civic-participatory-budgeting-tool', 'Civic Tech & Open Innovation', 'Participatory Budgeting Tool', 'Rank proposals and simulate transparent budget allocation.', ['Lambda', 'DynamoDB', 'S3'], 'civic-budget-cut', 'Budget Cut', 'Recompute after the available budget falls by 20%.'),
  challenge('civic-low-connectivity-portal', 'Civic Tech & Open Innovation', 'Low-Connectivity Public Service Portal', 'Support a civic process on poor connectivity and low-end devices.', ['Lambda', 'DynamoDB', 'S3'], 'civic-sync-conflict', 'Offline Sync Conflict', 'Queue offline submissions and resolve a sync conflict.'),
  challenge('civic-inclusive-service-redesign', 'Civic Tech & Open Innovation', 'Inclusive Campus Service Redesign', 'Improve a defined service for an underserved user group.', ['Lambda', 'DynamoDB', 'API Gateway'], 'civic-second-persona', 'Second User Persona', 'Support a second persona with different language or accessibility needs.'),
]);

const clonePublic = ({ id, track, title, summary, desc, technicalScope, deliverables, tags, points }) => ({
  id,
  track,
  title,
  summary,
  desc,
  technicalScope: [...technicalScope],
  deliverables: [...deliverables],
  tags: [...tags],
  points,
});
const cloneChaos = ({ id, title, desc }) => ({ id, title, desc });

export function listPublicChallenges() {
  return CHALLENGE_CATALOG.map(clonePublic);
}

export function listAdminChallenges() {
  return CHALLENGE_CATALOG.map((entry) => ({ ...clonePublic(entry), chaosTwist: cloneChaos(entry.chaosTwist) }));
}

export function getChallengeById(id) {
  return CHALLENGE_CATALOG.find((entry) => entry.id === id) || null;
}

export function createTeamChallengeSnapshot(entry) {
  if (!entry) throw new Error('A catalog challenge is required');
  return { challenge: clonePublic(entry), chaosEvent: cloneChaos(entry.chaosTwist) };
}

export function chooseBalancedChallenge(existingAssignments = [], random = Math.random) {
  const counts = new Map(CHALLENGE_CATALOG.map((entry) => [entry.id, 0]));
  for (const assignment of existingAssignments) {
    const id = assignment?.mystery_question?.id || assignment?.mysteryQuestion?.id || assignment?.id;
    if (counts.has(id)) counts.set(id, counts.get(id) + 1);
  }
  const minimum = Math.min(...counts.values());
  const candidates = CHALLENGE_CATALOG.filter((entry) => counts.get(entry.id) === minimum);
  return candidates[Math.min(candidates.length - 1, Math.floor(Math.max(0, Math.min(0.999999999, Number(random()) || 0)) * candidates.length))];
}

export async function assignBalancedChallengeForNewTeam(client, random = Math.random) {
  // Serialize assignment within the surrounding transaction so concurrent team
  // registrations cannot both observe the same least-used challenge set.
  await client.query('SELECT pg_advisory_xact_lock(20260908)');
  const existing = await client.query('SELECT mystery_question FROM hackathon_teams');
  return createTeamChallengeSnapshot(chooseBalancedChallenge(existing.rows, random));
}
