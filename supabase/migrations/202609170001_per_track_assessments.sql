-- Round 1 technical assessments run per selected subdomain instead of as one
-- combined paper, so a candidate starts and submits each track separately.
ALTER TABLE public.assessment_attempts
  DROP CONSTRAINT IF EXISTS assessment_attempts_candidate_id_key;

-- Existing combined attempts keep their row; new ones are unique per track.
ALTER TABLE public.assessment_attempts
  DROP CONSTRAINT IF EXISTS assessment_attempts_candidate_subdomain_key;
ALTER TABLE public.assessment_attempts
  ADD CONSTRAINT assessment_attempts_candidate_subdomain_key
  UNIQUE (candidate_id, subdomain_id);
