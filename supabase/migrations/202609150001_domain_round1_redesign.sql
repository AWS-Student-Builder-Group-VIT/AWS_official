-- Recruitment domain taxonomy and written Round 1 application flow.
-- Safe to run after 202609140008_round_content_and_identity.sql.

ALTER TABLE public.domains
  ADD COLUMN IF NOT EXISTS selection_mode text NOT NULL DEFAULT 'subdomains';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'domains_selection_mode_check'
      AND conrelid = 'public.domains'::regclass
  ) THEN
    ALTER TABLE public.domains
      ADD CONSTRAINT domains_selection_mode_check
      CHECK (selection_mode IN ('subdomains', 'whole_domain'));
  END IF;
END $$;

INSERT INTO public.domains
  (name, slug, description, icon, is_active, sort_order, selection_mode)
VALUES
  ('Technical', 'technical', 'Engineering, cloud, data, and product development.', '⌘', true, 0, 'subdomains'),
  ('Events', 'events', 'Plan, coordinate, and deliver memorable club events.', '◉', true, 1, 'subdomains'),
  ('Design', 'design', 'Create digital, physical, and product experiences for the club.', '◇', true, 2, 'subdomains'),
  ('Publicity', 'publicity', 'Tell the club story and grow participation across channels.', '◎', true, 3, 'subdomains'),
  ('Outreach', 'outreach', 'Build partnerships and meaningful connections for the club.', '↗', true, 4, 'whole_domain'),
  ('Finance', 'finance', 'Plan budgets, track spending, and support responsible delivery.', '₹', true, 5, 'whole_domain')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = true,
  sort_order = EXCLUDED.sort_order,
  selection_mode = EXCLUDED.selection_mode;

-- Preserve historical rows while removing obsolete taxonomies from new applications.
UPDATE public.domains
SET is_active = false
WHERE slug NOT IN ('technical', 'events', 'design', 'publicity', 'outreach', 'finance');

WITH taxonomy (domain_slug, name, slug, description, icon, sort_order) AS (
  VALUES
    ('events', 'Operations & Execution', 'operations-execution', 'Coordinate on-ground delivery, volunteers, troubleshooting, and event flow.', '⚙', 0),
    ('events', 'Logistics and Participant Management', 'logistics-participant-management', 'Manage venues, equipment, registrations, attendance, seating, and participant support.', '▦', 1),
    ('events', 'Event Ideation and Planning', 'event-ideation-planning', 'Develop concepts, objectives, formats, timelines, and audience engagement.', '✦', 2),
    ('design', 'Digital Graphic Design', 'digital-graphic-design', 'Create polished visual assets for digital channels and campaigns.', '◇', 0),
    ('design', 'Art & Craft / Physical Design', 'art-craft-physical-design', 'Create physical artwork, decor, merchandise, and event installations.', '✂', 1),
    ('design', 'UI/UX Design', 'ui-ux-design', 'Design clear, accessible, and engaging digital product experiences.', '⌘', 2),
    ('publicity', 'Social Media Management', 'social-media-management', 'Plan and manage the club social media presence.', '#', 0),
    ('publicity', 'Content & Video Editing', 'content-video-editing', 'Develop written, visual, and edited video content.', '▶', 1),
    ('publicity', 'Event Promotion', 'event-promotion', 'Build campaigns that drive awareness, registration, and attendance.', '↗', 2),
    ('outreach', 'Outreach', 'outreach-whole', 'Apply to Outreach as one complete domain.', '↗', 0),
    ('finance', 'Finance', 'finance-whole', 'Apply to Finance as one complete domain.', '₹', 0)
)
INSERT INTO public.subdomains
  (domain_id, name, slug, description, icon, is_active, sort_order)
SELECT d.id, t.name, t.slug, t.description, t.icon, true, t.sort_order
FROM taxonomy t
JOIN public.domains d ON d.slug = t.domain_slug
ON CONFLICT (domain_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = true,
  sort_order = EXCLUDED.sort_order;

UPDATE public.subdomains s
SET is_active = false
FROM public.domains d
WHERE d.id = s.domain_id
  AND d.slug = 'events'
  AND s.slug NOT IN ('operations-execution', 'logistics-participant-management', 'event-ideation-planning');

UPDATE public.subdomains s
SET is_active = false
FROM public.domains d
WHERE d.id = s.domain_id
  AND d.slug = 'design'
  AND s.slug NOT IN ('digital-graphic-design', 'art-craft-physical-design', 'ui-ux-design');

UPDATE public.subdomains s
SET is_active = false
FROM public.domains d
WHERE d.id = s.domain_id
  AND d.slug = 'publicity'
  AND s.slug NOT IN ('social-media-management', 'content-video-editing', 'event-promotion');

ALTER TABLE public.candidate_subdomain_choices
  DROP CONSTRAINT IF EXISTS candidate_subdomain_choices_priority_check;
ALTER TABLE public.candidate_subdomain_choices
  ADD CONSTRAINT candidate_subdomain_choices_priority_check CHECK (priority > 0);

CREATE OR REPLACE FUNCTION public.set_candidate_subdomains(p_subdomain_ids uuid[])
RETURNS SETOF public.candidate_subdomain_choices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id uuid := auth.uid();
  v_deadline timestamptz;
  v_selection_count integer := coalesce(array_length(p_subdomain_ids, 1), 0);
  v_valid_count integer;
  v_distinct_count integer;
  v_primary_domain uuid;
BEGIN
  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.candidate_profiles WHERE id = v_candidate_id) THEN
    RAISE EXCEPTION 'CANDIDATE_PROFILE_REQUIRED';
  END IF;

  PERFORM 1 FROM public.candidate_profiles WHERE id = v_candidate_id FOR UPDATE;

  IF v_selection_count < 1 THEN
    RAISE EXCEPTION 'SELECTION_REQUIRED';
  END IF;

  SELECT count(DISTINCT choice_id) INTO v_distinct_count
  FROM unnest(p_subdomain_ids) AS choice_id;
  IF v_distinct_count <> v_selection_count THEN
    RAISE EXCEPTION 'DUPLICATE_SUBDOMAIN_SELECTION';
  END IF;

  SELECT NULLIF(value->>'at', '')::timestamptz INTO v_deadline
  FROM public.recruitment_settings
  WHERE key = 'application_deadline';
  IF v_deadline IS NOT NULL AND now() >= v_deadline THEN
    RAISE EXCEPTION 'APPLICATION_DEADLINE_PASSED';
  END IF;

  SELECT count(*) INTO v_valid_count
  FROM public.subdomains s
  JOIN public.domains d ON d.id = s.domain_id
  WHERE s.id = ANY(p_subdomain_ids)
    AND s.is_active
    AND d.is_active;
  IF v_valid_count <> v_selection_count THEN
    RAISE EXCEPTION 'INVALID_OR_INACTIVE_SUBDOMAIN';
  END IF;

  IF (
    SELECT count(*)
    FROM public.subdomains s
    JOIN public.domains d ON d.id = s.domain_id
    WHERE s.id = ANY(p_subdomain_ids) AND d.slug = 'technical'
  ) > 2 THEN
    RAISE EXCEPTION 'TECHNICAL_SELECTION_LIMIT';
  END IF;

  SELECT domain_id INTO v_primary_domain
  FROM public.subdomains
  WHERE id = p_subdomain_ids[1];

  DELETE FROM public.candidate_subdomain_choices
  WHERE candidate_id = v_candidate_id;

  INSERT INTO public.candidate_subdomain_choices
    (candidate_id, subdomain_id, priority, updated_at)
  SELECT v_candidate_id, choice_id, ordinality::smallint, now()
  FROM unnest(p_subdomain_ids) WITH ORDINALITY AS selected(choice_id, ordinality);

  UPDATE public.candidate_profiles
  SET domain_id = v_primary_domain,
      subdomain_id = p_subdomain_ids[1],
      domain_locked = false,
      status = CASE WHEN status = 'pending' THEN 'round_0' ELSE status END,
      updated_at = now()
  WHERE id = v_candidate_id;

  RETURN QUERY
  SELECT *
  FROM public.candidate_subdomain_choices
  WHERE candidate_id = v_candidate_id
  ORDER BY priority;
END;
$$;

REVOKE ALL ON FUNCTION public.set_candidate_subdomains(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_candidate_subdomains(uuid[]) TO authenticated;

CREATE TABLE IF NOT EXISTS public.written_application_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  scope text NOT NULL CHECK (scope IN ('common_non_technical', 'domain')),
  domain_id uuid REFERENCES public.domains(id) ON DELETE RESTRICT,
  question_group text NOT NULL DEFAULT 'common',
  prompt text NOT NULL,
  instructions text NOT NULL DEFAULT '',
  response_type text NOT NULL DEFAULT 'long_text'
    CHECK (response_type IN ('long_text', 'long_text_with_links')),
  required boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (scope = 'common_non_technical' AND domain_id IS NULL)
    OR (scope = 'domain' AND domain_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.written_application_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  question_group text NOT NULL,
  minimum_answers integer NOT NULL CHECK (minimum_answers > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (domain_id, question_group)
);

CREATE TABLE IF NOT EXISTS public.candidate_written_answers (
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE RESTRICT,
  question_id uuid NOT NULL REFERENCES public.written_application_questions(id) ON DELETE RESTRICT,
  answer_text text NOT NULL DEFAULT '',
  submission_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_final boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, domain_id, question_id),
  CHECK (jsonb_typeof(submission_links) = 'array')
);

ALTER TABLE public.written_application_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.written_application_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_written_answers ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.written_application_questions TO authenticated;
GRANT SELECT ON public.written_application_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.candidate_written_answers TO authenticated;

DROP POLICY IF EXISTS candidates_read_active_written_questions ON public.written_application_questions;
CREATE POLICY candidates_read_active_written_questions
ON public.written_application_questions FOR SELECT TO authenticated
USING (is_active OR public.is_recruitment_admin());

DROP POLICY IF EXISTS admins_manage_written_questions ON public.written_application_questions;
CREATE POLICY admins_manage_written_questions
ON public.written_application_questions FOR ALL TO authenticated
USING (public.is_recruitment_admin(ARRAY['super_admin', 'recruitment_admin', 'assessment_evaluator']))
WITH CHECK (public.is_recruitment_admin(ARRAY['super_admin', 'recruitment_admin', 'assessment_evaluator']));

DROP POLICY IF EXISTS candidates_read_written_rules ON public.written_application_rules;
CREATE POLICY candidates_read_written_rules
ON public.written_application_rules FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS admins_manage_written_rules ON public.written_application_rules;
CREATE POLICY admins_manage_written_rules
ON public.written_application_rules FOR ALL TO authenticated
USING (public.is_recruitment_admin(ARRAY['super_admin', 'recruitment_admin', 'assessment_evaluator']))
WITH CHECK (public.is_recruitment_admin(ARRAY['super_admin', 'recruitment_admin', 'assessment_evaluator']));

DROP POLICY IF EXISTS candidates_manage_own_written_answers ON public.candidate_written_answers;
CREATE POLICY candidates_manage_own_written_answers
ON public.candidate_written_answers FOR ALL TO authenticated
USING (candidate_id = auth.uid())
WITH CHECK (candidate_id = auth.uid());

DROP POLICY IF EXISTS admins_read_written_answers ON public.candidate_written_answers;
CREATE POLICY admins_read_written_answers
ON public.candidate_written_answers FOR SELECT TO authenticated
USING (public.is_recruitment_admin());

INSERT INTO public.written_application_questions
  (slug, scope, domain_id, question_group, prompt, instructions, response_type, required, sort_order, is_active)
VALUES
  (
    'common-why-join',
    'common_non_technical',
    NULL,
    'common',
    'Why do you want to join this club?',
    'Explain what motivates you to contribute to AWS Student Builder Group and what you hope to learn.',
    'long_text',
    true,
    0,
    true
  ),
  (
    'common-previous-work',
    'common_non_technical',
    NULL,
    'common',
    'Tell us about your previous work in detail under this domain.',
    'Describe relevant projects, responsibilities, results, and what you personally contributed.',
    'long_text',
    true,
    1,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  scope = EXCLUDED.scope,
  domain_id = EXCLUDED.domain_id,
  question_group = EXCLUDED.question_group,
  prompt = EXCLUDED.prompt,
  instructions = EXCLUDED.instructions,
  response_type = EXCLUDED.response_type,
  required = EXCLUDED.required,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.written_application_questions
  (slug, scope, domain_id, question_group, prompt, instructions, response_type, required, sort_order, is_active)
SELECT seed.slug, 'domain', d.id, 'design_tasks', seed.prompt, seed.instructions,
       'long_text_with_links', false, seed.sort_order, true
FROM public.domains d
CROSS JOIN (
  VALUES
    (
      'design-core-board-merchandise',
      'Core and Board merchandise',
      'Design merchandise for Core and Board members. Cover a T-shirt or hoodie concept, include the relevant front, back, and sleeve views, and use any chosen combination of black, white, purple, and orange. Explain your decisions and add one or more shareable submission links.',
      10
    ),
    (
      'design-hackquest-landing-page',
      'HackQuest landing page',
      'Design a landing page for the GraVITas HackQuest hackathon. Include the HackQuest logo, a short tagline, date, venue, a primary “Register Now” action, and a brief explanation of the hackathon and its concept. Explain your decisions and add one or more shareable submission links.',
      11
    ),
    (
      'design-three-grid-instagram-post',
      'Three-grid Instagram event post',
      'Design a three-slide Instagram promotional grid for an AWS cloud-computing event. Slide 1 explains the event, Slide 2 contains event details, and Slide 3 provides a strong registration hook. Explain your decisions and add one or more shareable submission links.',
      12
    )
) AS seed(slug, prompt, instructions, sort_order)
WHERE d.slug = 'design'
ON CONFLICT (slug) DO UPDATE SET
  scope = EXCLUDED.scope,
  domain_id = EXCLUDED.domain_id,
  question_group = EXCLUDED.question_group,
  prompt = EXCLUDED.prompt,
  instructions = EXCLUDED.instructions,
  response_type = EXCLUDED.response_type,
  required = EXCLUDED.required,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.written_application_rules
  (domain_id, question_group, minimum_answers)
SELECT id, 'design_tasks', 2
FROM public.domains
WHERE slug = 'design'
ON CONFLICT (domain_id, question_group) DO UPDATE SET
  minimum_answers = EXCLUDED.minimum_answers,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
