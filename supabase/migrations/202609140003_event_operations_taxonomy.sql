-- Event-management recruitment taxonomy.
-- Safe to run after 202609140002_domains_auth_admin.sql.

INSERT INTO domains (name, slug, description, icon, is_active, sort_order) VALUES
  (
    'Event Ideation and Planning',
    'event-ideation-planning',
    'Shape event concepts, objectives, formats, timelines, and audience engagement.',
    '✦', true, 1
  ),
  (
    'Logistics and Participant Management',
    'logistics-participant-management',
    'Coordinate venues, equipment, infrastructure, registrations, attendance, and seating.',
    '▦', true, 2
  ),
  (
    'Operations & Execution',
    'operations-execution',
    'Deliver events on the ground through coordination, troubleshooting, and crowd management.',
    '⚙', true, 3
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = true,
  sort_order = EXCLUDED.sort_order;

WITH taxonomy (domain_slug, name, slug, description, icon, sort_order) AS (
  VALUES
    ('event-ideation-planning', 'Concept & Theme Development', 'concept-theme-development', 'Develop the central idea, narrative, theme, and creative direction for an event.', '◇', 0),
    ('event-ideation-planning', 'Event Structure', 'event-structure', 'Design the agenda, session flow, formats, and transitions.', '☷', 1),
    ('event-ideation-planning', 'Timelines', 'timelines', 'Build practical planning schedules, milestones, and run-of-show timelines.', '◷', 2),
    ('event-ideation-planning', 'Objectives', 'objectives', 'Define measurable outcomes and align activities with the event purpose.', '◎', 3),
    ('event-ideation-planning', 'Icebreakers & Audience Engagement', 'icebreakers-audience-engagement', 'Plan icebreakers, audience interactions, and other participation activities.', '✣', 4),

    ('logistics-participant-management', 'Venue', 'venue', 'Select, prepare, and coordinate the event venue.', '⌂', 0),
    ('logistics-participant-management', 'Equipment', 'equipment', 'Plan, source, test, and track event equipment.', '⌘', 1),
    ('logistics-participant-management', 'Infrastructure', 'infrastructure', 'Coordinate power, connectivity, staging, signage, and supporting infrastructure.', '⌗', 2),
    ('logistics-participant-management', 'Registrations, Check-ins & Attendance', 'registrations-checkins-attendance', 'Manage registration records, entry flows, check-ins, and attendance reporting.', '✓', 3),
    ('logistics-participant-management', 'Seating', 'seating', 'Create seating plans and manage participant placement and capacity.', '▤', 4),

    ('operations-execution', 'On-ground Execution', 'on-ground-execution', 'Run the live event according to the approved plan and schedule.', '▶', 0),
    ('operations-execution', 'Troubleshooting', 'troubleshooting', 'Identify and resolve operational issues quickly during the event.', '⚠', 1),
    ('operations-execution', 'Volunteer Responsibility Assignment', 'volunteer-responsibility-assignment', 'Assign clear roles, shifts, owners, and escalation paths to volunteers.', '♟', 2),
    ('operations-execution', 'Crowd Management', 'crowd-management', 'Manage movement, queues, capacity, safety, and participant flow.', '≋', 3),
    ('operations-execution', 'Speaker & Guest Coordination', 'speaker-guest-coordination', 'Coordinate speakers and guests before arrival, on site, and through departure.', '◉', 4)
)
INSERT INTO subdomains (domain_id, name, slug, description, icon, is_active, sort_order)
SELECT d.id, t.name, t.slug, t.description, t.icon, true, t.sort_order
FROM taxonomy t
JOIN domains d ON d.slug = t.domain_slug
ON CONFLICT (domain_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = true,
  sort_order = EXCLUDED.sort_order;

-- Keep the existing Technical domain and its four subdomains available.
UPDATE domains
SET is_active = true, sort_order = 0
WHERE slug = 'technical';

NOTIFY pgrst, 'reload schema';
