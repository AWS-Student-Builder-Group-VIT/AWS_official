-- ──────────────────────────────────────────────────────────
-- AWS-SBG Recruitment Portal — Supabase Schema
-- Run this in Supabase SQL editor
-- ──────────────────────────────────────────────────────────

-- Enums
CREATE TYPE question_type AS ENUM ('mcq','multiple_select','short_answer','code','scenario');
CREATE TYPE difficulty_level AS ENUM ('easy','medium','hard');
CREATE TYPE round_status AS ENUM ('not_started','in_progress','submitted','under_review','qualified','not_qualified');
CREATE TYPE candidate_status AS ENUM ('pending','round_0','round_1','round_2','selected','waitlisted','rejected');
CREATE TYPE final_result AS ENUM ('selected','waitlisted','not_selected');

-- ── Domains ────────────────────────────────────────────────
CREATE TABLE domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO domains (name, slug, description, icon) VALUES
  ('Web Development','web','Build modern web applications using frontend and backend technologies.','🌐'),
  ('App Development','app','Create mobile applications and cross-platform experiences.','📱'),
  ('Game Development','game','Build interactive games, mechanics and engaging experiences.','🎮'),
  ('AI / ML','ai_ml','Build intelligent applications using machine learning, data and AI.','🤖');

-- ── Candidate Profiles ─────────────────────────────────────
CREATE TABLE candidate_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  registration_number TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  year INTEGER CHECK (year BETWEEN 1 AND 5),
  branch TEXT,
  avatar_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  profile_complete BOOLEAN DEFAULT false,
  domain_id UUID REFERENCES domains(id),
  domain_locked BOOLEAN DEFAULT false,
  current_round INTEGER DEFAULT 0,
  status candidate_status DEFAULT 'pending',
  round_0_status round_status DEFAULT 'not_started',
  round_0_score DECIMAL,
  round_1_status round_status DEFAULT 'not_started',
  round_1_score DECIMAL,
  interview_status round_status DEFAULT 'not_started',
  final_status final_result,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Assessment Questions ───────────────────────────────────
CREATE TABLE assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id),
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL,
  options JSONB,
  correct_answers JSONB,
  marks INTEGER DEFAULT 1,
  difficulty difficulty_level DEFAULT 'medium',
  explanation TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Assessment Attempts ────────────────────────────────────
CREATE TABLE assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES domains(id),
  question_ids JSONB NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_limit_seconds INTEGER DEFAULT 1500,
  auto_submitted BOOLEAN DEFAULT false,
  score DECIMAL,
  total_marks INTEGER,
  status TEXT DEFAULT 'in_progress',
  admin_qualified BOOLEAN,
  admin_notes TEXT,
  evaluated_at TIMESTAMPTZ,
  results_released_at TIMESTAMPTZ,
  results_released_by UUID,
  UNIQUE(candidate_id)
);

-- ── Assessment Answers (autosaved) ─────────────────────────
CREATE TABLE assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID REFERENCES assessment_questions(id),
  answer JSONB,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

-- ── Projects ───────────────────────────────────────────────
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  requirements TEXT NOT NULL,
  aws_services TEXT[] NOT NULL,
  task_document_url TEXT CHECK (task_document_url IS NULL OR task_document_url ~ '^https?://'),
  optional_features TEXT,
  free_execution_path TEXT NOT NULL DEFAULT 'Develop locally first; deploy the frontend on Vercel and use AWS Free Tier or an AWS Educate sandbox. Ask the team for an approved alternative before enabling billing.',
  evaluation_rubric JSONB,
  deadline_days INTEGER DEFAULT 7,
  difficulty difficulty_level DEFAULT 'medium',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Project Assignments ────────────────────────────────────
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE UNIQUE,
  project_id UUID REFERENCES projects(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'assigned'
);

-- ── Project Submissions ────────────────────────────────────
CREATE TABLE project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES project_assignments(id) ON DELETE CASCADE UNIQUE,
  candidate_id UUID REFERENCES candidate_profiles(id),
  github_url TEXT NOT NULL,
  deployed_url TEXT,
  demo_video_url TEXT,
  notes TEXT,
  aws_services_used TEXT[],
  hardest_problem TEXT,
  improvements TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  is_late BOOLEAN DEFAULT false
);

-- ── Project Evaluations ────────────────────────────────────
CREATE TABLE project_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES project_submissions(id) ON DELETE CASCADE UNIQUE,
  candidate_id UUID REFERENCES candidate_profiles(id),
  technical_score INTEGER CHECK (technical_score BETWEEN 0 AND 25),
  problem_solving_score INTEGER CHECK (problem_solving_score BETWEEN 0 AND 20),
  aws_score INTEGER CHECK (aws_score BETWEEN 0 AND 20),
  code_quality_score INTEGER CHECK (code_quality_score BETWEEN 0 AND 15),
  ux_score INTEGER CHECK (ux_score BETWEEN 0 AND 10),
  documentation_score INTEGER CHECK (documentation_score BETWEEN 0 AND 10),
  total_score INTEGER GENERATED ALWAYS AS (
    COALESCE(technical_score,0) + COALESCE(problem_solving_score,0) +
    COALESCE(aws_score,0) + COALESCE(code_quality_score,0) +
    COALESCE(ux_score,0) + COALESCE(documentation_score,0)
  ) STORED,
  comments TEXT,
  qualified BOOLEAN,
  evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Interview Dates ────────────────────────────────────────
CREATE TABLE interview_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES domains(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 15,
  location TEXT,
  meeting_link TEXT,
  interviewers TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Interview Slots ────────────────────────────────────────
CREATE TABLE interview_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_id UUID REFERENCES interview_dates(id) ON DELETE CASCADE,
  slot_time TIME NOT NULL,
  is_booked BOOLEAN DEFAULT false
  ,status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','booked','disabled'))
);

-- ── Interview Bookings ─────────────────────────────────────
CREATE TABLE interview_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE UNIQUE,
  slot_id UUID REFERENCES interview_slots(id) UNIQUE,
  booking_ref TEXT UNIQUE DEFAULT UPPER(CONCAT('ASBG-', SUBSTRING(gen_random_uuid()::TEXT, 1, 6))),
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'confirmed'
);

-- ── Admin Users ────────────────────────────────────────────
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'recruitment_admin' CHECK (role IN ('super_admin','recruitment_admin','assessment_evaluator','project_evaluator','interviewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE recruitment_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Final Results ──────────────────────────────────────────
CREATE TABLE final_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE UNIQUE,
  result final_result NOT NULL,
  feedback TEXT,
  announced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- Functions
-- ──────────────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidate_updated_at
  BEFORE UPDATE ON candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate slots when an interview_date is inserted
CREATE OR REPLACE FUNCTION generate_interview_slots()
RETURNS TRIGGER AS $$
DECLARE
  cur_time TIME := NEW.start_time;
BEGIN
  WHILE cur_time < NEW.end_time LOOP
    INSERT INTO interview_slots (date_id, slot_time) VALUES (NEW.id, cur_time);
    cur_time := cur_time + (NEW.slot_duration_minutes || ' minutes')::INTERVAL;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_slots
  AFTER INSERT ON interview_dates
  FOR EACH ROW EXECUTE FUNCTION generate_interview_slots();

-- ──────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────

ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Candidates see only their own data
CREATE POLICY "candidates_own_profile" ON candidate_profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "candidates_own_attempt" ON assessment_attempts
  FOR ALL USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "candidates_own_answers" ON assessment_answers
  FOR ALL USING (
    attempt_id IN (SELECT id FROM assessment_attempts WHERE candidate_id = auth.uid())
  ) WITH CHECK (attempt_id IN (SELECT id FROM assessment_attempts WHERE candidate_id = auth.uid()));

CREATE POLICY "candidates_own_assignment" ON project_assignments
  FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "candidates_own_submission" ON project_submissions
  FOR ALL USING (auth.uid() = candidate_id) WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "candidates_own_booking" ON interview_bookings
  FOR SELECT USING (auth.uid() = candidate_id);

CREATE POLICY "candidates_own_result" ON final_results
  FOR SELECT USING (auth.uid() = candidate_id);

-- Public reads
CREATE POLICY "public_domains" ON domains FOR SELECT USING (true);
CREATE POLICY "public_slots" ON interview_slots FOR SELECT USING (true);
CREATE POLICY "public_dates" ON interview_dates FOR SELECT USING (is_active = true);
CREATE POLICY "public_projects" ON projects FOR SELECT USING (is_active = true);
CREATE POLICY "candidates_own_notifications" ON notifications FOR SELECT USING (auth.uid() = candidate_id);

-- Question delivery never exposes correct_answers or explanations.
CREATE OR REPLACE FUNCTION get_attempt_questions(p_attempt_id UUID)
RETURNS TABLE(id UUID,domain_id UUID,question_text TEXT,question_type question_type,options JSONB,marks INTEGER,difficulty difficulty_level)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT q.id,q.domain_id,q.question_text,q.question_type,q.options,q.marks,q.difficulty
 FROM assessment_questions q JOIN assessment_attempts a ON q.id IN (SELECT jsonb_array_elements_text(a.question_ids)::uuid)
 WHERE a.id=p_attempt_id AND a.candidate_id=auth.uid();
$$;

CREATE OR REPLACE FUNCTION start_assessment()
RETURNS assessment_attempts LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE candidate_domain UUID; selected_ids JSONB; result assessment_attempts;
BEGIN
 SELECT domain_id INTO candidate_domain FROM candidate_profiles WHERE id=auth.uid() AND profile_complete=true;
 IF candidate_domain IS NULL THEN RAISE EXCEPTION 'PROFILE_OR_DOMAIN_INCOMPLETE'; END IF;
 IF EXISTS(SELECT 1 FROM assessment_attempts WHERE candidate_id=auth.uid()) THEN RAISE EXCEPTION 'ATTEMPT_ALREADY_EXISTS'; END IF;
 SELECT jsonb_agg(id) INTO selected_ids FROM (SELECT id FROM assessment_questions WHERE domain_id=candidate_domain AND is_active=true ORDER BY random() LIMIT 15) picked;
 IF jsonb_array_length(COALESCE(selected_ids,'[]'::jsonb)) < 15 THEN RAISE EXCEPTION 'INSUFFICIENT_QUESTIONS'; END IF;
 INSERT INTO assessment_attempts(candidate_id,domain_id,question_ids,time_limit_seconds) VALUES(auth.uid(),candidate_domain,selected_ids,1500) RETURNING * INTO result;
 UPDATE candidate_profiles SET round_0_status='in_progress',status='round_0' WHERE id=auth.uid();
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION start_assessment() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_assessment() TO authenticated;

-- Atomic booking prevents two candidates from claiming the same slot.
CREATE OR REPLACE FUNCTION book_interview_slot(p_slot_id UUID)
RETURNS interview_bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result interview_bookings;
BEGIN
 UPDATE interview_slots SET is_booked=true,status='booked' WHERE id=p_slot_id AND is_booked=false AND status='available';
 IF NOT FOUND THEN RAISE EXCEPTION 'SLOT_UNAVAILABLE'; END IF;
 INSERT INTO interview_bookings(candidate_id,slot_id) VALUES(auth.uid(),p_slot_id) RETURNING * INTO result;
 UPDATE candidate_profiles SET interview_status='in_progress',status='round_2' WHERE id=auth.uid();
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION book_interview_slot(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION book_interview_slot(UUID) TO authenticated;

-- ──────────────────────────────────────────────────────────
-- Seed: Sample Questions
-- ──────────────────────────────────────────────────────────

-- Web Dev questions
INSERT INTO assessment_questions (domain_id, question_text, question_type, options, correct_answers, marks, difficulty) VALUES
((SELECT id FROM domains WHERE slug='web'),
'A page loads data from an API using JavaScript. The API takes ~3 seconds to respond and the page appears blank during that time. Which is the best solution?',
'mcq',
'[{"id":"A","text":"Reload the page repeatedly"},{"id":"B","text":"Display a loading state until the API resolves"},{"id":"C","text":"Store the API response in HTML permanently"},{"id":"D","text":"Increase the browser timeout"}]',
'["B"]', 2, 'easy'),

((SELECT id FROM domains WHERE slug='web'),
'Consider: const user = { name: "Alex", profile: { age: 19 } }. Which expression safely accesses `city` even when it may not exist?',
'mcq',
'[{"id":"A","text":"user.profile.city"},{"id":"B","text":"user?.profile?.city"},{"id":"C","text":"user.profile[city]"},{"id":"D","text":"user.city.profile"}]',
'["B"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='web'),
'A website shows duplicate data every time a React component re-renders. The data fetching function is called inside the component without controlling when it executes. What is the most likely problem?',
'mcq',
'[{"id":"A","text":"CSS specificity"},{"id":"B","text":"Uncontrolled side effect during rendering"},{"id":"C","text":"Invalid HTML"},{"id":"D","text":"Incorrect DNS configuration"}]',
'["B"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='web'),
'You are building an event registration website. Two users click the final available seat at nearly the same moment. Which layer should ultimately prevent both users from receiving the same seat?',
'mcq',
'[{"id":"A","text":"CSS"},{"id":"B","text":"Browser validation"},{"id":"C","text":"Database / backend transaction logic"},{"id":"D","text":"React state"}]',
'["C"]', 3, 'hard'),

((SELECT id FROM domains WHERE slug='web'),
'A user submits a registration form twice because their internet connection is slow. How would you prevent duplicate registrations? Describe your approach covering frontend protection, backend validation, and database constraints.',
'short_answer', NULL, '["idempotency","unique constraint","debounce","disable submit"]', 3, 'hard'),

((SELECT id FROM domains WHERE slug='web'),
'Which HTTP method is most appropriate for creating a new resource via a REST API?',
'mcq',
'[{"id":"A","text":"GET"},{"id":"B","text":"PUT"},{"id":"C","text":"POST"},{"id":"D","text":"PATCH"}]',
'["C"]', 1, 'easy'),

((SELECT id FROM domains WHERE slug='web'),
'What does the `useEffect` hook with an empty dependency array `[]` do in React?',
'mcq',
'[{"id":"A","text":"Runs on every render"},{"id":"B","text":"Runs only once after the initial render"},{"id":"C","text":"Runs before the component mounts"},{"id":"D","text":"Never runs"}]',
'["B"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='web'),
'Which of the following are valid ways to prevent XSS in a web application? (Select all that apply)',
'multiple_select',
'[{"id":"A","text":"Sanitize user inputs server-side"},{"id":"B","text":"Use innerHTML for all dynamic content"},{"id":"C","text":"Use Content Security Policy headers"},{"id":"D","text":"Escape output before rendering"},{"id":"E","text":"Store passwords as plain text"}]',
'["A","C","D"]', 3, 'hard'),

((SELECT id FROM domains WHERE slug='web'),
'A web page score poorly on Core Web Vitals due to a large image that loads immediately. Which optimization would most directly improve Largest Contentful Paint?',
'mcq',
'[{"id":"A","text":"Add more CSS animations"},{"id":"B","text":"Lazy load the image and use modern formats like WebP"},{"id":"C","text":"Increase server RAM"},{"id":"D","text":"Remove all JavaScript"}]',
'["B"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='web'),
'What is the output of: console.log(typeof null)?',
'mcq',
'[{"id":"A","text":"null"},{"id":"B","text":"undefined"},{"id":"C","text":"object"},{"id":"D","text":"string"}]',
'["C"]', 2, 'medium');

-- AI/ML questions
INSERT INTO assessment_questions (domain_id, question_text, question_type, options, correct_answers, marks, difficulty) VALUES
((SELECT id FROM domains WHERE slug='ai_ml'),
'Your ML model achieves 99% training accuracy but only 72% test accuracy. What is the most likely issue?',
'mcq',
'[{"id":"A","text":"Underfitting"},{"id":"B","text":"Overfitting"},{"id":"C","text":"Encryption error"},{"id":"D","text":"Data normalization failed"}]',
'["B"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='ai_ml'),
'A dataset has 95% samples in Class A and 5% in Class B. A model predicts Class A every time and achieves 95% accuracy. Why is accuracy misleading here?',
'short_answer', NULL, '["class imbalance","precision","recall","F1","confusion matrix"]', 3, 'hard'),

((SELECT id FROM domains WHERE slug='ai_ml'),
'Which dataset split is used for evaluating performance on unseen data?',
'mcq',
'[{"id":"A","text":"Training set"},{"id":"B","text":"Test set"},{"id":"C","text":"Duplicate set"},{"id":"D","text":"Feature set"}]',
'["B"]', 1, 'easy'),

((SELECT id FROM domains WHERE slug='ai_ml'),
'A model performs poorly because input features have dramatically different numerical scales. Which preprocessing technique may help?',
'mcq',
'[{"id":"A","text":"Scaling / normalization"},{"id":"B","text":"Increase HTML size"},{"id":"C","text":"Change database"},{"id":"D","text":"CSS reset"}]',
'["A"]', 2, 'easy'),

((SELECT id FROM domains WHERE slug='ai_ml'),
'You build a spam email detector. Explain why precision and recall can be more useful than accuracy for evaluating this model.',
'short_answer', NULL, '["false positive","false negative","precision","recall","imbalanced"]', 3, 'hard'),

((SELECT id FROM domains WHERE slug='ai_ml'),
'Which of the following are supervised learning algorithms? (Select all that apply)',
'multiple_select',
'[{"id":"A","text":"Linear Regression"},{"id":"B","text":"K-Means Clustering"},{"id":"C","text":"Decision Tree"},{"id":"D","text":"Random Forest"},{"id":"E","text":"DBSCAN"}]',
'["A","C","D"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='ai_ml'),
'What does gradient descent minimize during training?',
'mcq',
'[{"id":"A","text":"The number of parameters"},{"id":"B","text":"The loss/cost function"},{"id":"C","text":"Training dataset size"},{"id":"D","text":"Inference time"}]',
'["B"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='ai_ml'),
'A convolutional neural network (CNN) is most appropriate for which type of task?',
'mcq',
'[{"id":"A","text":"Time series forecasting"},{"id":"B","text":"Natural language processing"},{"id":"C","text":"Image classification"},{"id":"D","text":"Tabular regression"}]',
'["C"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='ai_ml'),
'Dropout layers in a neural network are used to:',
'mcq',
'[{"id":"A","text":"Increase model size"},{"id":"B","text":"Reduce overfitting by randomly deactivating neurons during training"},{"id":"C","text":"Speed up inference"},{"id":"D","text":"Add more training data"}]',
'["B"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='ai_ml'),
'You have 10,000 labeled images. You split them 80/10/10 for train/validation/test. After training, you tune hyperparameters until validation accuracy improves. Is the test set still a reliable measure of real-world performance? Explain.',
'short_answer', NULL, '["data leakage","validation contamination","unseen","holdout"]', 3, 'hard');

-- Game Dev questions
INSERT INTO assessment_questions (domain_id, question_text, question_type, options, correct_answers, marks, difficulty) VALUES
((SELECT id FROM domains WHERE slug='game'),
'A character movement system uses: position += speed. The game behaves differently on computers with different frame rates. What is missing?',
'mcq',
'[{"id":"A","text":"Sprite animation"},{"id":"B","text":"Delta time / frame-independent movement"},{"id":"C","text":"Collision mesh"},{"id":"D","text":"Background music"}]',
'["B"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='game'),
'A player passes through a wall when moving at high speed. What could be responsible?',
'mcq',
'[{"id":"A","text":"Collision detection not handling fast movement (tunneling)"},{"id":"B","text":"Wrong music file"},{"id":"C","text":"Incorrect texture resolution"},{"id":"D","text":"UI scaling"}]',
'["A"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='game'),
'Enemies continuously spawn throughout a game. Creating and destroying hundreds of enemy objects causes performance problems. Suggest a better approach.',
'short_answer', NULL, '["object pool","object pooling","reuse","pool"]', 3, 'hard'),

((SELECT id FROM domains WHERE slug='game'),
'Which of the following best describes the Entity-Component-System (ECS) pattern in game development?',
'mcq',
'[{"id":"A","text":"A CSS layout system"},{"id":"B","text":"A design pattern where game objects are composed of reusable components"},{"id":"C","text":"A multiplayer networking protocol"},{"id":"D","text":"A shader pipeline"}]',
'["B"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='game'),
'A game renders at 30 FPS on the developer''s high-end PC but at 12 FPS on the target device. Which of the following would most likely help? (Select all that apply)',
'multiple_select',
'[{"id":"A","text":"Reduce draw calls by batching sprites"},{"id":"B","text":"Add more particle effects"},{"id":"C","text":"Use object pooling instead of Instantiate/Destroy"},{"id":"D","text":"Implement level-of-detail (LOD) for distant objects"},{"id":"E","text":"Increase texture resolution"}]',
'["A","C","D"]', 3, 'hard'),

((SELECT id FROM domains WHERE slug='game'),
'In a 2D platformer, what is the most common approach for detecting whether a player is standing on a platform?',
'mcq',
'[{"id":"A","text":"Checking if player Y position equals zero"},{"id":"B","text":"Raycasting downward from player and checking for collision"},{"id":"C","text":"Reading keyboard input"},{"id":"D","text":"Checking asset names"}]',
'["B"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='game'),
'What is the purpose of a game loop?',
'mcq',
'[{"id":"A","text":"To load assets at startup"},{"id":"B","text":"To continuously update game state and render each frame"},{"id":"C","text":"To connect to a server"},{"id":"D","text":"To manage audio"}]',
'["B"]', 1, 'easy'),

((SELECT id FROM domains WHERE slug='game'),
'A strategy game has 500 units on screen. Each unit independently checks distance to every other unit every frame. What is the time complexity and what data structure could improve this?',
'short_answer', NULL, '["O(n^2)","spatial hashing","quadtree","grid partitioning"]', 3, 'hard');

-- App Dev questions
INSERT INTO assessment_questions (domain_id, question_text, question_type, options, correct_answers, marks, difficulty) VALUES
((SELECT id FROM domains WHERE slug='app'),
'An app fetches user data whenever a screen opens. The user switches screens repeatedly causing unnecessary API requests. What would be an appropriate improvement?',
'mcq',
'[{"id":"A","text":"Hard-code the API response"},{"id":"B","text":"Add caching or proper lifecycle/state management"},{"id":"C","text":"Restart the application"},{"id":"D","text":"Increase screen timeout"}]',
'["B"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='app'),
'A mobile app works correctly on WiFi but crashes when the network becomes unavailable. Which implementation was likely missing?',
'mcq',
'[{"id":"A","text":"Custom fonts"},{"id":"B","text":"Offline/network error handling"},{"id":"C","text":"Dark mode"},{"id":"D","text":"Push notifications"}]',
'["B"]', 2, 'easy'),

((SELECT id FROM domains WHERE slug='app'),
'Users expect notes to remain available after closing the app. Which approach is most suitable?',
'mcq',
'[{"id":"A","text":"Store notes only in component state"},{"id":"B","text":"Persist them using local storage or a database"},{"id":"C","text":"Store them as UI widgets"},{"id":"D","text":"Keep the application running permanently"}]',
'["B"]', 1, 'easy'),

((SELECT id FROM domains WHERE slug='app'),
'Your app shows a list of 10,000 records. Rendering all items at once causes performance issues. Describe a better approach.',
'short_answer', NULL, '["virtualization","pagination","lazy load","FlatList","infinite scroll"]', 3, 'medium'),

((SELECT id FROM domains WHERE slug='app'),
'Which of the following are valid strategies for reducing app bundle size? (Select all that apply)',
'multiple_select',
'[{"id":"A","text":"Code splitting and lazy loading screens"},{"id":"B","text":"Adding more libraries"},{"id":"C","text":"Tree shaking unused imports"},{"id":"D","text":"Using vector icons instead of bitmap images"},{"id":"E","text":"Importing entire utility libraries when only one function is needed"}]',
'["A","C","D"]', 3, 'medium'),

((SELECT id FROM domains WHERE slug='app'),
'In React Native, what is the difference between the JavaScript thread and the UI thread, and why does it matter for animations?',
'short_answer', NULL, '["bridge","native thread","jank","useNativeDriver","Animated"]', 3, 'hard'),

((SELECT id FROM domains WHERE slug='app'),
'A user opens your app, navigates through 5 screens, and then returns to the home screen. Which of the following is true about Android''s back stack?',
'mcq',
'[{"id":"A","text":"All screens are destroyed on back press"},{"id":"B","text":"The back stack maintains screen history and back press pops the top screen"},{"id":"C","text":"Navigation is handled only by CSS"},{"id":"D","text":"Back stack is the same as browser history"}]',
'["B"]', 2, 'medium'),

((SELECT id FROM domains WHERE slug='app'),
'An app needs to send a notification when a user-set alarm fires, even if the app is closed. What is required?',
'mcq',
'[{"id":"A","text":"Keeping the app in foreground indefinitely"},{"id":"B","text":"A background service or scheduled notification using platform APIs"},{"id":"C","text":"CSS animations"},{"id":"D","text":"WebSocket connection"}]',
'["B"]', 2, 'hard');

-- Sample projects
INSERT INTO projects (domain_id, code, title, problem_statement, requirements, aws_services, optional_features, evaluation_rubric, deadline_days) VALUES
((SELECT id FROM domains WHERE slug='web'), 'WD-01', 'Serverless Event Registration System',
'Build a web application where students can view an event, register for it, and receive confirmation. Admins can view and search registrations.',
'1. Event listing page with details
2. Registration form with validation (name, email, college, year)
3. Prevent duplicate registrations for same email
4. Admin view to see all registrations with search
5. Responsive design',
ARRAY['AWS Lambda','Amazon API Gateway','Amazon DynamoDB'],
'Amazon SES for confirmation emails, Amazon S3 for static hosting',
'{"technical":25,"problem_solving":20,"aws_integration":20,"code_quality":15,"ux":10,"documentation":10}',
7),

((SELECT id FROM domains WHERE slug='web'), 'WD-02', 'Cloud File Sharing Portal',
'Build a file-sharing web application where authenticated users can upload, view, download, and delete their own files.',
'1. User authentication (can use any auth method)
2. File upload with progress indicator
3. File listing with name, size, upload date
4. Secure download (pre-signed URLs)
5. Delete own files',
ARRAY['Amazon S3','Amazon API Gateway','AWS Lambda'],
'Amazon Cognito for auth, file type/size validation',
'{"technical":25,"problem_solving":20,"aws_integration":20,"code_quality":15,"ux":10,"documentation":10}',
7),

((SELECT id FROM domains WHERE slug='ai_ml'), 'AI-01', 'Image Classification Application',
'Build an application that classifies uploaded images into categories. You can train your own model or use an appropriate pretrained model. The application must integrate with AWS for storage and/or inference.',
'1. Image upload interface
2. Classification result display with confidence score
3. Support at least 3 image categories
4. Store uploaded images on S3
5. Clear explanation of model and dataset used',
ARRAY['Amazon S3','AWS Lambda'],
'Amazon SageMaker for model hosting, Amazon Rekognition as alternative',
'{"technical":25,"problem_solving":20,"aws_integration":20,"code_quality":15,"ux":10,"documentation":10}',
10),

((SELECT id FROM domains WHERE slug='game'), 'GD-01', 'Cloud Leaderboard Game',
'Create a simple playable browser game (endless runner, platformer, puzzle, or arcade) with a real cloud-based leaderboard. Players submit scores which persist globally.',
'1. Playable game with clear win/lose condition and scoring
2. Real-time or near-real-time leaderboard
3. Score submission after game ends
4. Top 10 leaderboard display
5. Persistent data (scores survive page refresh)',
ARRAY['Amazon API Gateway','AWS Lambda','Amazon DynamoDB'],
'Player authentication, game replay, time-based challenges',
'{"technical":25,"problem_solving":20,"aws_integration":20,"code_quality":15,"ux":10,"documentation":10}',
10),

((SELECT id FROM domains WHERE slug='app'), 'APP-01', 'Campus Issue Reporting App',
'Build a mobile application (React Native, Flutter, or native) where students can report and track campus-related issues with optional image attachments.',
'1. Report submission with title, description, category, location
2. View submitted reports with status
3. Optional image attachment
4. Filter by category or status
5. Basic admin view to update status',
ARRAY['Amazon S3','AWS Lambda','Amazon API Gateway','Amazon DynamoDB'],
'Push notifications via SNS, Amazon Cognito for auth',
'{"technical":25,"problem_solving":20,"aws_integration":20,"code_quality":15,"ux":10,"documentation":10}',
10);
