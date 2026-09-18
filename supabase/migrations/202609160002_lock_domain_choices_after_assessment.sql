-- Prevent domain choice modifications once Round 1 assessment has started or submitted
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
  v_locked boolean;
  v_round_0 text;
BEGIN
  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED';
  END IF;

  SELECT domain_locked, round_0_status INTO v_locked, v_round_0
  FROM public.candidate_profiles
  WHERE id = v_candidate_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CANDIDATE_PROFILE_REQUIRED';
  END IF;

  IF coalesce(v_locked, false)
     OR (v_round_0 IS NOT NULL AND v_round_0 <> 'not_started')
     OR EXISTS (SELECT 1 FROM public.assessment_attempts WHERE candidate_id = v_candidate_id)
     OR EXISTS (SELECT 1 FROM public.candidate_written_answers WHERE candidate_id = v_candidate_id AND is_final = true) THEN
    RAISE EXCEPTION 'DOMAIN_CHOICES_LOCKED';
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
