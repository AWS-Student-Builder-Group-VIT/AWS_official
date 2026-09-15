-- Domain hierarchy, admin RLS, and production auth support.
-- Safe to run after the original schema on an existing project.

ALTER TABLE domains ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS subdomains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(domain_id, slug)
);

DO $$
DECLARE technical_id UUID;
BEGIN
  INSERT INTO domains(name,slug,description,icon,sort_order)
  VALUES('Technical','technical','Engineering, cloud, data and product development.','⌘',0)
  ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name
  RETURNING id INTO technical_id;

  INSERT INTO subdomains(id,domain_id,name,slug,description,icon,sort_order)
  SELECT id,technical_id,name,slug,description,icon,
    CASE slug WHEN 'web' THEN 0 WHEN 'app' THEN 1 WHEN 'game' THEN 2 WHEN 'ai_ml' THEN 3 ELSE 99 END
  FROM domains WHERE slug IN ('web','app','game','ai_ml')
  ON CONFLICT(id) DO NOTHING;

  ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS subdomain_id UUID REFERENCES subdomains(id);
  ALTER TABLE assessment_questions ADD COLUMN IF NOT EXISTS subdomain_id UUID REFERENCES subdomains(id);
  ALTER TABLE assessment_attempts ADD COLUMN IF NOT EXISTS subdomain_id UUID REFERENCES subdomains(id);
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS subdomain_id UUID REFERENCES subdomains(id);
  ALTER TABLE interview_dates ADD COLUMN IF NOT EXISTS subdomain_id UUID REFERENCES subdomains(id);

  UPDATE candidate_profiles SET subdomain_id=domain_id,domain_id=technical_id WHERE domain_id IN (SELECT id FROM subdomains WHERE domain_id=technical_id);
  UPDATE assessment_questions SET subdomain_id=domain_id,domain_id=technical_id WHERE domain_id IN (SELECT id FROM subdomains WHERE domain_id=technical_id);
  UPDATE assessment_attempts SET subdomain_id=domain_id,domain_id=technical_id WHERE domain_id IN (SELECT id FROM subdomains WHERE domain_id=technical_id);
  UPDATE projects SET subdomain_id=domain_id,domain_id=technical_id WHERE domain_id IN (SELECT id FROM subdomains WHERE domain_id=technical_id);
  UPDATE interview_dates SET subdomain_id=domain_id,domain_id=technical_id WHERE domain_id IN (SELECT id FROM subdomains WHERE domain_id=technical_id);

  DELETE FROM domains WHERE slug IN ('web','app','game','ai_ml');
END $$;

CREATE OR REPLACE FUNCTION is_recruitment_admin(allowed_roles TEXT[] DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(
    SELECT 1 FROM admin_users
    WHERE id=auth.uid() AND (allowed_roles IS NULL OR role=ANY(allowed_roles))
  );
$$;

ALTER TABLE subdomains ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_subdomains ON subdomains;
CREATE POLICY public_subdomains ON subdomains FOR SELECT USING(is_active=true OR is_recruitment_admin());
CREATE POLICY admin_manage_subdomains ON subdomains FOR ALL USING(is_recruitment_admin(ARRAY['super_admin','recruitment_admin'])) WITH CHECK(is_recruitment_admin(ARRAY['super_admin','recruitment_admin']));
CREATE POLICY admin_manage_domains ON domains FOR ALL USING(is_recruitment_admin(ARRAY['super_admin','recruitment_admin'])) WITH CHECK(is_recruitment_admin(ARRAY['super_admin','recruitment_admin']));
CREATE POLICY admin_read_self ON admin_users FOR SELECT USING(id=auth.uid());
CREATE POLICY super_admin_manage_admins ON admin_users FOR ALL USING(is_recruitment_admin(ARRAY['super_admin'])) WITH CHECK(is_recruitment_admin(ARRAY['super_admin']));

-- Admin policies are database enforced; middleware is only an early UX redirect.
CREATE POLICY admin_candidates ON candidate_profiles FOR ALL USING(is_recruitment_admin()) WITH CHECK(is_recruitment_admin());
CREATE POLICY admin_attempts ON assessment_attempts FOR ALL USING(is_recruitment_admin()) WITH CHECK(is_recruitment_admin());
CREATE POLICY admin_answers ON assessment_answers FOR SELECT USING(is_recruitment_admin(ARRAY['super_admin','recruitment_admin','assessment_evaluator']));
CREATE POLICY admin_questions ON assessment_questions FOR ALL USING(is_recruitment_admin(ARRAY['super_admin','recruitment_admin','assessment_evaluator'])) WITH CHECK(is_recruitment_admin(ARRAY['super_admin','recruitment_admin','assessment_evaluator']));
CREATE POLICY admin_projects ON projects FOR ALL USING(is_recruitment_admin(ARRAY['super_admin','recruitment_admin','project_evaluator'])) WITH CHECK(is_recruitment_admin(ARRAY['super_admin','recruitment_admin','project_evaluator']));
CREATE POLICY admin_assignments ON project_assignments FOR ALL USING(is_recruitment_admin()) WITH CHECK(is_recruitment_admin());
CREATE POLICY admin_submissions ON project_submissions FOR SELECT USING(is_recruitment_admin());
CREATE POLICY admin_evaluations ON project_evaluations FOR ALL USING(is_recruitment_admin(ARRAY['super_admin','recruitment_admin','project_evaluator'])) WITH CHECK(is_recruitment_admin(ARRAY['super_admin','recruitment_admin','project_evaluator']));
CREATE POLICY admin_bookings ON interview_bookings FOR ALL USING(is_recruitment_admin()) WITH CHECK(is_recruitment_admin());
CREATE POLICY admin_dates ON interview_dates FOR ALL USING(is_recruitment_admin()) WITH CHECK(is_recruitment_admin());
CREATE POLICY admin_slots ON interview_slots FOR ALL USING(is_recruitment_admin()) WITH CHECK(is_recruitment_admin());
CREATE POLICY admin_results ON final_results FOR ALL USING(is_recruitment_admin()) WITH CHECK(is_recruitment_admin());
CREATE POLICY admin_settings ON recruitment_settings FOR ALL USING(is_recruitment_admin(ARRAY['super_admin','recruitment_admin'])) WITH CHECK(is_recruitment_admin(ARRAY['super_admin','recruitment_admin']));

CREATE OR REPLACE FUNCTION start_assessment()
RETURNS assessment_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE candidate_subdomain UUID; candidate_domain UUID; selected_ids JSONB; result assessment_attempts;
BEGIN
 SELECT domain_id,subdomain_id INTO candidate_domain,candidate_subdomain FROM candidate_profiles WHERE id=auth.uid() AND profile_complete=true;
 IF candidate_subdomain IS NULL THEN RAISE EXCEPTION 'PROFILE_OR_SUBDOMAIN_INCOMPLETE'; END IF;
 IF EXISTS(SELECT 1 FROM assessment_attempts WHERE candidate_id=auth.uid()) THEN RAISE EXCEPTION 'ATTEMPT_ALREADY_EXISTS'; END IF;
 SELECT jsonb_agg(id) INTO selected_ids FROM (SELECT id FROM assessment_questions WHERE subdomain_id=candidate_subdomain AND is_active=true ORDER BY random() LIMIT 15) picked;
 IF jsonb_array_length(COALESCE(selected_ids,'[]'::jsonb)) < 15 THEN RAISE EXCEPTION 'INSUFFICIENT_QUESTIONS'; END IF;
 INSERT INTO assessment_attempts(candidate_id,domain_id,subdomain_id,question_ids,time_limit_seconds) VALUES(auth.uid(),candidate_domain,candidate_subdomain,selected_ids,1500) RETURNING * INTO result;
 UPDATE candidate_profiles SET round_0_status='in_progress',status='round_0' WHERE id=auth.uid();
 RETURN result;
END;$$;

GRANT SELECT ON subdomains TO anon,authenticated;
GRANT EXECUTE ON FUNCTION is_recruitment_admin(TEXT[]) TO authenticated;
