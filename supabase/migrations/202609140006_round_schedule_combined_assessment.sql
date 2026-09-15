-- Publish round start dates and support one combined, proportional assessment.
INSERT INTO public.recruitment_settings (key, value)
VALUES
  ('round_0_start_at', '{"at": null}'::jsonb),
  ('round_1_start_at', '{"at": null}'::jsonb),
  ('round_2_start_at', '{"at": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Candidates can read application deadline" ON public.recruitment_settings;
DROP POLICY IF EXISTS "Candidates can read recruitment schedule" ON public.recruitment_settings;
CREATE POLICY "Candidates can read recruitment schedule"
ON public.recruitment_settings FOR SELECT TO authenticated
USING (key IN ('application_deadline', 'round_0_start_at', 'round_1_start_at', 'round_2_start_at'));

-- Include subdomain_id so the candidate client can separate a combined assessment
-- into clearly labelled subdomain sections without exposing answer keys.
DROP FUNCTION IF EXISTS public.get_attempt_questions(uuid);
CREATE FUNCTION public.get_attempt_questions(p_attempt_id uuid)
RETURNS TABLE(
  id uuid,
  domain_id uuid,
  subdomain_id uuid,
  question_text text,
  question_type question_type,
  options jsonb,
  marks integer,
  difficulty difficulty_level
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id, q.domain_id, q.subdomain_id, q.question_text, q.question_type,
         q.options, q.marks, q.difficulty
  FROM public.assessment_questions q
  JOIN public.assessment_attempts a
    ON q.id IN (SELECT jsonb_array_elements_text(a.question_ids)::uuid)
  WHERE a.id = p_attempt_id AND a.candidate_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_attempt_questions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_attempt_questions(uuid) TO authenticated;

-- A candidate can receive one project and book one interview for each selected
-- subdomain. Existing single-track rows are backfilled to their project/date track.
ALTER TABLE public.project_assignments ADD COLUMN IF NOT EXISTS subdomain_id uuid REFERENCES public.subdomains(id);
UPDATE public.project_assignments pa
SET subdomain_id = p.subdomain_id
FROM public.projects p
WHERE pa.project_id = p.id AND pa.subdomain_id IS NULL;
ALTER TABLE public.project_assignments DROP CONSTRAINT IF EXISTS project_assignments_candidate_id_key;
ALTER TABLE public.project_assignments DROP CONSTRAINT IF EXISTS project_assignments_candidate_id_subdomain_id_key;
ALTER TABLE public.project_assignments ADD CONSTRAINT project_assignments_candidate_id_subdomain_id_key UNIQUE(candidate_id, subdomain_id);

ALTER TABLE public.interview_bookings ADD COLUMN IF NOT EXISTS subdomain_id uuid REFERENCES public.subdomains(id);
UPDATE public.interview_bookings b
SET subdomain_id = d.subdomain_id
FROM public.interview_slots s
JOIN public.interview_dates d ON d.id = s.date_id
WHERE b.slot_id = s.id AND b.subdomain_id IS NULL;
ALTER TABLE public.interview_bookings DROP CONSTRAINT IF EXISTS interview_bookings_candidate_id_key;
ALTER TABLE public.interview_bookings DROP CONSTRAINT IF EXISTS interview_bookings_candidate_id_subdomain_id_key;
ALTER TABLE public.interview_bookings ADD CONSTRAINT interview_bookings_candidate_id_subdomain_id_key UNIQUE(candidate_id, subdomain_id);

CREATE OR REPLACE FUNCTION public.book_interview_slot(p_slot_id uuid)
RETURNS public.interview_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.interview_bookings;
  v_subdomain_id uuid;
  v_start_at timestamptz;
BEGIN
  SELECT d.subdomain_id INTO v_subdomain_id
  FROM public.interview_slots s
  JOIN public.interview_dates d ON d.id = s.date_id
  WHERE s.id = p_slot_id AND d.is_active;

  IF v_subdomain_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.candidate_subdomain_choices
    WHERE candidate_id = auth.uid() AND subdomain_id = v_subdomain_id
  ) THEN
    RAISE EXCEPTION 'INVALID_SUBDOMAIN_SLOT';
  END IF;

  SELECT NULLIF(value->>'at', '')::timestamptz INTO v_start_at
  FROM public.recruitment_settings WHERE key = 'round_2_start_at';
  IF v_start_at IS NULL OR now() < v_start_at THEN
    RAISE EXCEPTION 'ROUND_NOT_OPEN';
  END IF;

  UPDATE public.interview_slots SET is_booked = true, status = 'booked'
  WHERE id = p_slot_id AND is_booked = false AND status = 'available';
  IF NOT FOUND THEN RAISE EXCEPTION 'SLOT_UNAVAILABLE'; END IF;

  INSERT INTO public.interview_bookings(candidate_id, subdomain_id, slot_id)
  VALUES(auth.uid(), v_subdomain_id, p_slot_id)
  RETURNING * INTO v_result;

  UPDATE public.candidate_profiles SET interview_status = 'in_progress', status = 'round_2'
  WHERE id = auth.uid();
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.book_interview_slot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_interview_slot(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
