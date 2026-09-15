-- Five replaceable sample questions for every event-management subdomain.
-- Technical subdomains already receive their sample banks from schema.sql.

WITH templates (position, prompt, options, correct_answers, difficulty) AS (
  VALUES
    (1, 'What should be established first when beginning work on %s?',
      '[{"id":"A","text":"A visual style without consulting anyone"},{"id":"B","text":"The objective, owner, constraints, and success criteria"},{"id":"C","text":"The final report"},{"id":"D","text":"A backup plan only"}]'::jsonb,
      '["B"]'::jsonb, 'easy'::difficulty_level),
    (2, 'A new constraint affects %s shortly before the event. What is the best response?',
      '[{"id":"A","text":"Ignore it and continue"},{"id":"B","text":"Assess the impact, inform owners, and update the plan"},{"id":"C","text":"Cancel without discussion"},{"id":"D","text":"Wait until the event begins"}]'::jsonb,
      '["B"]'::jsonb, 'medium'::difficulty_level),
    (3, 'Which practice makes a %s handoff most reliable?',
      '[{"id":"A","text":"Relying on verbal memory"},{"id":"B","text":"A documented checklist with owners, deadlines, and status"},{"id":"C","text":"Assigning every task to one person"},{"id":"D","text":"Removing escalation contacts"}]'::jsonb,
      '["B"]'::jsonb, 'easy'::difficulty_level),
    (4, 'Which signal best shows that %s is ready for execution?',
      '[{"id":"A","text":"The task was discussed once"},{"id":"B","text":"Dependencies are verified and an accountable owner has signed off"},{"id":"C","text":"No one has reported a problem"},{"id":"D","text":"The deadline has passed"}]'::jsonb,
      '["B"]'::jsonb, 'medium'::difficulty_level),
    (5, 'An issue occurs during %s. What should the responsible volunteer do first?',
      '[{"id":"A","text":"Hide the issue"},{"id":"B","text":"Protect safety and continuity, notify the owner, and record the resolution"},{"id":"C","text":"Post publicly before informing the team"},{"id":"D","text":"Leave the assigned area"}]'::jsonb,
      '["B"]'::jsonb, 'medium'::difficulty_level)
)
INSERT INTO assessment_questions (
  domain_id, subdomain_id, question_text, question_type, options,
  correct_answers, marks, difficulty, explanation, is_active
)
SELECT
  d.id,
  s.id,
  format(t.prompt, s.name),
  'mcq'::question_type,
  t.options,
  t.correct_answers,
  1,
  t.difficulty,
  'Sample question for workflow testing. Replace before production.',
  true
FROM domains d
JOIN subdomains s ON s.domain_id = d.id
CROSS JOIN templates t
WHERE d.slug IN (
  'event-ideation-planning',
  'logistics-participant-management',
  'operations-execution'
)
AND NOT EXISTS (
  SELECT 1
  FROM assessment_questions existing
  WHERE existing.subdomain_id = s.id
    AND existing.question_text = format(t.prompt, s.name)
);

NOTIFY pgrst, 'reload schema';
