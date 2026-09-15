-- Allow each candidate to rank up to two subdomains while applications are open.
CREATE TABLE IF NOT EXISTS public.candidate_subdomain_choices (
  candidate_id uuid NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  subdomain_id uuid NOT NULL REFERENCES public.subdomains(id) ON DELETE RESTRICT,
  priority smallint NOT NULL CHECK (priority IN (1, 2)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (candidate_id, priority),
  UNIQUE (candidate_id, subdomain_id)
);

ALTER TABLE public.candidate_subdomain_choices ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_subdomain_choices TO authenticated;

DROP POLICY IF EXISTS "Candidates can read own subdomain choices" ON public.candidate_subdomain_choices;
CREATE POLICY "Candidates can read own subdomain choices"
ON public.candidate_subdomain_choices FOR SELECT TO authenticated
USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage subdomain choices" ON public.candidate_subdomain_choices;
CREATE POLICY "Admins can manage subdomain choices"
ON public.candidate_subdomain_choices FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Candidates can read application deadline" ON public.recruitment_settings;
CREATE POLICY "Candidates can read application deadline"
ON public.recruitment_settings FOR SELECT TO authenticated
USING (key = 'application_deadline');

INSERT INTO public.recruitment_settings (key, value)
VALUES ('application_deadline', '{"at": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.candidate_subdomain_choices (candidate_id, subdomain_id, priority)
SELECT id, subdomain_id, 1
FROM public.candidate_profiles
WHERE subdomain_id IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_candidate_subdomains(p_subdomain_ids uuid[])
RETURNS SETOF public.candidate_subdomain_choices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id uuid := auth.uid();
  v_deadline timestamptz;
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

  -- Serialize concurrent changes made by the same candidate.
  PERFORM 1 FROM public.candidate_profiles WHERE id = v_candidate_id FOR UPDATE;

  IF coalesce(array_length(p_subdomain_ids, 1), 0) NOT BETWEEN 1 AND 2 THEN
    RAISE EXCEPTION 'SELECT_ONE_OR_TWO_SUBDOMAINS';
  END IF;

  SELECT count(DISTINCT choice_id) INTO v_distinct_count
  FROM unnest(p_subdomain_ids) AS choice_id;
  IF v_distinct_count <> array_length(p_subdomain_ids, 1) THEN
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
  WHERE s.id = ANY(p_subdomain_ids) AND s.is_active AND d.is_active;
  IF v_valid_count <> array_length(p_subdomain_ids, 1) THEN
    RAISE EXCEPTION 'INVALID_OR_INACTIVE_SUBDOMAIN';
  END IF;

  SELECT domain_id INTO v_primary_domain
  FROM public.subdomains WHERE id = p_subdomain_ids[1];

  DELETE FROM public.candidate_subdomain_choices
  WHERE candidate_id = v_candidate_id;

  INSERT INTO public.candidate_subdomain_choices (candidate_id, subdomain_id, priority, updated_at)
  SELECT v_candidate_id, choice_id, ordinality::smallint, now()
  FROM unnest(p_subdomain_ids) WITH ORDINALITY AS selected(choice_id, ordinality);

  -- Keep the existing single-choice columns as the primary-choice compatibility layer.
  UPDATE public.candidate_profiles
  SET domain_id = v_primary_domain,
      subdomain_id = p_subdomain_ids[1],
      domain_locked = false,
      status = CASE WHEN status = 'pending' THEN 'round_0' ELSE status END,
      updated_at = now()
  WHERE id = v_candidate_id;

  RETURN QUERY
  SELECT * FROM public.candidate_subdomain_choices
  WHERE candidate_id = v_candidate_id
  ORDER BY priority;
END;
$$;

REVOKE ALL ON FUNCTION public.set_candidate_subdomains(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_candidate_subdomains(uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
