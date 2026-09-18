// Time allowed per question: 0.5 minutes.
export const SECONDS_PER_QUESTION = 30;

export async function initializeCloudIntelligence(pool) {
  // 1. Questions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cloud_intelligence_questions (
      id SERIAL PRIMARY KEY,
      question_text TEXT NOT NULL,
      question_type VARCHAR(32) NOT NULL DEFAULT 'mcq',
      difficulty VARCHAR(16) NOT NULL DEFAULT 'medium',
      assertion TEXT,
      reason TEXT,
      options JSONB DEFAULT '[]'::jsonb,
      correct_answer JSONB NOT NULL,
      points NUMERIC(3,2) DEFAULT 1.0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 2. Settings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cloud_intelligence_settings (
      key VARCHAR(64) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const defaultSettings = [
    ['status', JSON.stringify('frozen')], // 'frozen' | 'unfrozen' (default is frozen)
    ['title', JSON.stringify('Cloud Intelligence Assessment')],
    ['duration_minutes', JSON.stringify(30)],
    ['results_released', JSON.stringify(false)], // marks stay hidden until an admin releases them
  ];

  for (const [key, val] of defaultSettings) {
    await pool.query(
      `INSERT INTO cloud_intelligence_settings (key, value)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO NOTHING`,
      [key, val]
    );
  }

  // 3. Submissions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cloud_intelligence_submissions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      participant_name VARCHAR(128) NOT NULL,
      participant_email VARCHAR(255) NOT NULL,
      participant_reg_no VARCHAR(64),
      score NUMERIC(6,2) NOT NULL DEFAULT 0,
      total_marks NUMERIC(6,2) NOT NULL DEFAULT 0,
      percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
      composite_score NUMERIC(6,2) NOT NULL DEFAULT 0,
      accuracy_score NUMERIC(6,2) NOT NULL DEFAULT 0,
      speed_score NUMERIC(6,2) NOT NULL DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      unanswered_count INTEGER DEFAULT 0,
      time_taken_seconds INTEGER DEFAULT 0,
      total_allotted_seconds INTEGER DEFAULT 1800,
      answers JSONB DEFAULT '{}'::jsonb,
      breakdown JSONB DEFAULT '[]'::jsonb,
      submitted_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 3b. Start times, so the elapsed clock comes from the server, not the browser.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cloud_intelligence_attempts (
      participant_email VARCHAR(255) PRIMARY KEY,
      started_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // One submission per email, enforced by the database and not just a lookup.
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS cloud_intelligence_submissions_email_key
    ON cloud_intelligence_submissions (LOWER(participant_email));
  `);

  // 4. Seed questions in Database if empty or incomplete
  const qCountRes = await pool.query('SELECT COUNT(*)::int as count FROM cloud_intelligence_questions');
  const existingCount = parseInt(qCountRes.rows[0]?.count || 0, 10);
  if (existingCount < 30) {
    try {
      const fs = await import('fs');
      const seedPath = './server/cloud_intelligence_seed.json';
      if (fs.existsSync(seedPath)) {
        const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        if (Array.isArray(seedData) && seedData.length > 0) {
          for (const q of seedData) {
            const opts = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []);
            const ans = q.correct_answer !== undefined ? q.correct_answer : q.answer;

            await pool.query(
              `INSERT INTO cloud_intelligence_questions (
                id, question_text, question_type, difficulty, assertion, reason, options, correct_answer, points
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
              ON CONFLICT (id) DO UPDATE
              SET question_text = EXCLUDED.question_text,
                  question_type = EXCLUDED.question_type,
                  difficulty = EXCLUDED.difficulty,
                  assertion = EXCLUDED.assertion,
                  reason = EXCLUDED.reason,
                  options = EXCLUDED.options,
                  correct_answer = EXCLUDED.correct_answer,
                  points = EXCLUDED.points`,
              [
                q.id,
                q.question_text || q.text,
                q.question_type || q.type || 'mcq',
                (q.difficulty || 'medium').toLowerCase(),
                q.assertion || null,
                q.reason || null,
                JSON.stringify(opts),
                typeof ans === 'string' ? JSON.stringify(ans) : JSON.stringify(ans),
                q.points || 1.0,
              ]
            );
          }
          try {
            await pool.query("SELECT setval('cloud_intelligence_questions_id_seq', (SELECT MAX(id) FROM cloud_intelligence_questions))");
          } catch {}
          console.log(`Loaded ${seedData.length} questions from cloud_intelligence_seed.json`);
        }
      }
    } catch (seedErr) {
      console.warn('Could not load cloud_intelligence_seed.json:', seedErr.message);
    }
  }
}

// ── 1-Mark per Question Scoring Engine ────────────────────────
// Each question = 1.0 Mark Total:
// - 0.6 Marks for Correctness (60% weightage)
// - 0.4 Marks for Speed (40% weightage, scaled with accuracy)
// Total Max Score = Total Questions Count (e.g. 20 Questions = 20.00 Marks)
export function evaluateQuizSubmission({ questions, userAnswers, timeTakenSeconds, allottedSeconds = 0 }) {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  const breakdown = [];

  for (const q of questions) {
    const diff = (q.difficulty || 'medium').toLowerCase();
    const uAns = userAnswers[q.id];
    const qType = q.question_type;
    let isCorrect = false;
    let isAnswered = uAns !== undefined && uAns !== null && uAns !== '' && !(Array.isArray(uAns) && uAns.length === 0);

    if (!isAnswered) {
      unansweredCount++;
      breakdown.push({
        questionId: q.id,
        difficulty: diff,
        isAnswered: false,
        isCorrect: false,
        userAnswer: null,
        correctAnswer: q.correct_answer,
      });
      continue;
    }

    if (qType === 'mcq' || qType === 'assertion_reason') {
      const correctText = typeof q.correct_answer === 'object' ? JSON.stringify(q.correct_answer) : String(q.correct_answer).trim();
      const userText = typeof uAns === 'object' ? JSON.stringify(uAns) : String(uAns).trim();
      isCorrect = correctText.toLowerCase() === userText.toLowerCase();
    } else if (qType === 'multi_select') {
      const correctArr = Array.isArray(q.correct_answer) ? q.correct_answer.map(s => String(s).trim().toLowerCase()).sort() : [];
      const userArr = Array.isArray(uAns) ? uAns.map(s => String(s).trim().toLowerCase()).sort() : [];
      isCorrect = correctArr.length > 0 && correctArr.length === userArr.length && correctArr.every((val, index) => val === userArr[index]);
    } else if (qType === 'objective') {
      const cleanUser = String(uAns).trim().toLowerCase();
      if (Array.isArray(q.correct_answer)) {
        isCorrect = q.correct_answer.some(ans => String(ans).trim().toLowerCase() === cleanUser);
      } else {
        isCorrect = cleanUser === String(q.correct_answer).trim().toLowerCase();
      }
    }

    if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    breakdown.push({
      questionId: q.id,
      difficulty: diff,
      isAnswered: true,
      isCorrect,
      userAnswer: uAns,
      correctAnswer: q.correct_answer,
    });
  }

  const totalQuestions = Math.max(1, questions.length);
  const totalMaxMarks = totalQuestions * 1.0; // 1 mark per question

  // 1. Correctness Score (Max = Total Questions * 0.6)
  const accuracyScore = correctCount * 0.6;

  // 2. Speed Score (Max = Total Questions * 0.4)
  // Allotted duration is n * 30 seconds (0.5 * n minutes)
  const totalAllotted = allottedSeconds || (totalQuestions * SECONDS_PER_QUESTION);
  const validAllotted = Math.max(30, totalAllotted);
  const actualTime = Math.min(timeTakenSeconds, validAllotted);
  const timeSavedRatio = Math.max(0, (validAllotted - actualTime) / validAllotted);
  const accuracyRatio = correctCount / totalQuestions;
  
  // Speed bonus scales with accuracy so guessing fast without correctness yields 0 speed bonus
  const speedScore = timeSavedRatio * (totalQuestions * 0.4) * accuracyRatio;

  const totalFinalScore = parseFloat((accuracyScore + speedScore).toFixed(2));
  const percentage = parseFloat(((totalFinalScore / totalMaxMarks) * 100).toFixed(2));

  return {
    score: totalFinalScore,
    totalMarks: totalMaxMarks,
    percentage,
    compositeScore: totalFinalScore,
    accuracyScore: parseFloat(accuracyScore.toFixed(2)),
    speedScore: parseFloat(speedScore.toFixed(2)),
    correctCount,
    incorrectCount,
    unansweredCount,
    breakdown,
  };
}

/** Correct answers stay hidden while the quiz is open, so nobody can farm them. */
function hideAnswers(breakdown) {
  const rows = Array.isArray(breakdown) ? breakdown : [];
  return rows.map((row) => {
    const copy = { ...row };
    delete copy.correctAnswer;
    return copy;
  });
}

/** Everything that gives a score away, kept back until results are released. */
const SCORE_FIELDS = [
  'score', 'total_marks', 'percentage', 'composite_score', 'accuracy_score', 'speed_score',
  'correct_count', 'incorrect_count', 'unanswered_count',
];

/**
 * What a participant may see about their own submission. Until an admin
 * releases the results this is only proof of submission: no marks, no answer
 * key, and never someone else's raw answers.
 */
function publicSubmission(row, resultsReleased) {
  if (!row) return row;
  const safe = { ...row };
  delete safe.answers;
  delete safe.participant_reg_no;
  safe.resultsReleased = Boolean(resultsReleased);
  if (!resultsReleased) {
    for (const field of SCORE_FIELDS) delete safe[field];
    delete safe.breakdown;
    return safe;
  }
  safe.breakdown = row.breakdown;
  return safe;
}

/**
 * The full paper for the review screen: every question with its options, the
 * correct one and what the participant chose. Only built once released.
 */
async function buildReview(pool, submission) {
  const breakdown = Array.isArray(submission.breakdown) ? submission.breakdown : [];
  if (!breakdown.length) return [];
  const ids = breakdown.map((row) => row.questionId).filter(Boolean);
  if (!ids.length) return [];
  const { rows } = await pool.query(
    'SELECT id, question_text, question_type, difficulty, assertion, reason, options, correct_answer FROM cloud_intelligence_questions WHERE id = ANY($1::int[])',
    [ids]
  );
  const byId = new Map(rows.map((q) => [q.id, q]));
  return breakdown.map((row, index) => {
    const q = byId.get(row.questionId) ?? {};
    return {
      number: index + 1,
      questionId: row.questionId,
      questionText: q.question_text ?? 'Question no longer available',
      questionType: q.question_type ?? 'mcq',
      difficulty: q.difficulty ?? row.difficulty ?? 'medium',
      assertion: q.assertion ?? null,
      reason: q.reason ?? null,
      options: Array.isArray(q.options) ? q.options : [],
      correctAnswer: q.correct_answer ?? row.correctAnswer ?? null,
      userAnswer: row.userAnswer ?? null,
      isAnswered: Boolean(row.isAnswered),
      isCorrect: Boolean(row.isCorrect),
    };
  });
}

export function registerCloudIntelligenceRoutes(app, { pool, adminMiddleware }) {
  const quizStatus = async () => {
    const r = await pool.query("SELECT value FROM cloud_intelligence_settings WHERE key = 'status'");
    return r.rows[0]?.value === 'unfrozen' ? 'unfrozen' : 'frozen';
  };
  const resultsReleased = async () => {
    const r = await pool.query("SELECT value FROM cloud_intelligence_settings WHERE key = 'results_released'");
    return r.rows[0]?.value === true;
  };
  // ── Public / Participant Quiz Endpoints ──────────────────────

  // 1. Get Quiz Public Info
  app.get('/api/cloud-intelligence/quiz-info', async (req, res) => {
    try {
      const settingsRes = await pool.query('SELECT key, value FROM cloud_intelligence_settings');
      const settings = {};
      settingsRes.rows.forEach(r => { settings[r.key] = r.value; });

      const countRes = await pool.query('SELECT COUNT(*)::int as count FROM cloud_intelligence_questions');
      const totalQuestions = countRes.rows[0]?.count || 0;
      // Default to frozen unless explicitly set to 'unfrozen'
      const isFrozen = settings.status !== 'unfrozen';
      // Duration is 0.5 minutes (30 seconds) per question
      const perQuestionMinutes = SECONDS_PER_QUESTION / 60;
      const durationMinutes = Number(((totalQuestions || 1) * perQuestionMinutes).toFixed(1));
      const allottedSeconds = Math.max(SECONDS_PER_QUESTION, totalQuestions * SECONDS_PER_QUESTION);

      res.json({
        resultsReleased: settings.results_released === true,
        title: settings.title || 'Cloud Intelligence Assessment',
        durationMinutes,
        allottedSeconds,
        isFrozen,
        totalQuestions,
      });
    } catch (error) {
      console.error('Quiz info error:', error);
      res.status(500).json({ error: 'Failed to retrieve quiz status' });
    }
  });

  // 2. Get Randomized Questions for Participant
  app.get('/api/cloud-intelligence/questions', async (req, res) => {
    try {
      const statusRes = await pool.query("SELECT value FROM cloud_intelligence_settings WHERE key = 'status'");
      const status = statusRes.rows[0]?.value;
      if (status !== 'unfrozen') {
        return res.status(403).json({ error: 'Quiz is currently frozen by the administrator.' });
      }

      // The clock starts here, on the server. The browser's own number is only a fallback.
      const email = String(req.query.email || '').trim().toLowerCase();
      if (email) {
        await pool.query(
          `INSERT INTO cloud_intelligence_attempts (participant_email, started_at)
           VALUES ($1, NOW())
           ON CONFLICT (participant_email) DO UPDATE SET started_at = NOW()`,
          [email]
        );
      }

      const result = await pool.query(`
        SELECT id, question_text, question_type, difficulty, assertion, reason, options
        FROM cloud_intelligence_questions
        ORDER BY RANDOM()
      `);

      res.json({
        questions: result.rows,
        totalCount: result.rows.length,
        secondsPerQuestion: SECONDS_PER_QUESTION,
      });
    } catch (error) {
      console.error('Participant questions error:', error);
      res.status(500).json({ error: 'Failed to load assessment questions' });
    }
  });

  // 3. Submit Participant Assessment
  app.post('/api/cloud-intelligence/submit', async (req, res) => {
    try {
      const {
        participantName,
        participantEmail,
        participantRegNo,
        answers = {},
        timeTakenSeconds = 0,
      } = req.body;

      if (!participantName || !participantEmail) {
        return res.status(400).json({ error: 'Participant name and email are required.' });
      }

      if (await quizStatus() !== 'unfrozen') {
        return res.status(403).json({ error: 'The quiz is closed. Submissions are not being accepted.' });
      }

      // Check duplicate submission
      const existing = await pool.query(
        'SELECT * FROM cloud_intelligence_submissions WHERE LOWER(participant_email) = LOWER($1) ORDER BY submitted_at DESC LIMIT 1',
        [participantEmail.trim()]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          error: 'You have already submitted this assessment.',
          submission: publicSubmission(existing.rows[0], await resultsReleased()),
        });
      }

      const allQuestionsRes = await pool.query('SELECT * FROM cloud_intelligence_questions');
      const allQuestions = allQuestionsRes.rows;
      const totalQuestions = allQuestions.length;
      const allottedSeconds = Math.max(SECONDS_PER_QUESTION, totalQuestions * SECONDS_PER_QUESTION);

      // Evaluate with 1-mark system (0.6 correctness + 0.4 speed against dynamic 30s/q)
      // Elapsed time comes from the start row written when the questions were fetched;
      // a browser-supplied number is used as fallback.
      const startedRes = await pool.query(
        'SELECT started_at FROM cloud_intelligence_attempts WHERE participant_email = $1',
        [participantEmail.trim().toLowerCase()]
      );
      const startedAt = startedRes.rows[0]?.started_at;
      const elapsedSeconds = startedAt
        ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
        : Math.max(0, Number(timeTakenSeconds) || 0);
      const measuredTime = Math.min(elapsedSeconds, allottedSeconds);

      const evaluation = evaluateQuizSubmission({
        questions: allQuestions,
        userAnswers: answers,
        timeTakenSeconds: measuredTime,
        allottedSeconds,
      });

      const insertRes = await pool.query(
        `INSERT INTO cloud_intelligence_submissions (
          participant_name, participant_email, participant_reg_no,
          score, total_marks, percentage, composite_score, accuracy_score, speed_score,
          correct_count, incorrect_count, unanswered_count,
          time_taken_seconds, total_allotted_seconds, answers, breakdown
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::jsonb)
        RETURNING id, score, total_marks, percentage, composite_score, accuracy_score, speed_score,
                  correct_count, incorrect_count, unanswered_count, time_taken_seconds, submitted_at, breakdown`,
        [
          participantName.trim(),
          participantEmail.trim().toLowerCase(),
          (participantRegNo || '').trim().toUpperCase(),
          evaluation.score,
          evaluation.totalMarks,
          evaluation.percentage,
          evaluation.compositeScore,
          evaluation.accuracyScore,
          evaluation.speedScore,
          evaluation.correctCount,
          evaluation.incorrectCount,
          evaluation.unansweredCount,
          measuredTime,
          allottedSeconds,
          JSON.stringify(answers),
          JSON.stringify(evaluation.breakdown),
        ]
      );

      // Clean up the attempt record after successful submission
      await pool.query(
        'DELETE FROM cloud_intelligence_attempts WHERE participant_email = $1',
        [participantEmail.trim().toLowerCase()]
      ).catch(() => {});

      const released = await resultsReleased();
      res.status(201).json({
        success: true,
        submission: publicSubmission(insertRes.rows[0], released),
        review: released ? await buildReview(pool, insertRes.rows[0]) : [],
      });
    } catch (error) {
      // 23505: two submissions for the same email at the same moment.
      if (error.code === '23505') {
        return res.status(409).json({ error: 'You have already submitted this assessment.' });
      }
      console.error('Quiz submission error:', error);
      res.status(500).json({ error: 'Failed to process assessment: ' + error.message });
    }
  });

  // 4. Check If Participant Already Submitted
  app.get('/api/cloud-intelligence/submission/:email', async (req, res) => {
    try {
      const { email } = req.params;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      const result = await pool.query(
        'SELECT * FROM cloud_intelligence_submissions WHERE LOWER(participant_email) = LOWER($1) ORDER BY submitted_at DESC LIMIT 1',
        [email.trim()]
      );

      if (result.rows.length === 0) {
        return res.json({ hasSubmitted: false });
      }

      const released = await resultsReleased();
      res.json({
        hasSubmitted: true,
        resultsReleased: released,
        submission: publicSubmission(result.rows[0], released),
        review: released ? await buildReview(pool, result.rows[0]) : [],
      });
    } catch (error) {
      console.error('Check submission error:', error);
      res.status(500).json({ error: 'Failed to check submission history' });
    }
  });

  // ── Admin Endpoints ──────────────────────────────────────────

  // Get all questions
  app.get('/api/admin/cloud-intelligence/questions', adminMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM cloud_intelligence_questions ORDER BY id ASC');
      res.json(result.rows);
    } catch (error) {
      console.error('Fetch questions error:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  });

  // Create question (1 mark fixed)
  app.post('/api/admin/cloud-intelligence/questions', adminMiddleware, async (req, res) => {
    try {
      const {
        question_text,
        question_type = 'mcq',
        difficulty = 'medium',
        assertion,
        reason,
        options = [],
        correct_answer,
      } = req.body;

      if (!question_text && question_type !== 'assertion_reason') {
        return res.status(400).json({ error: 'Question text is required' });
      }
      if (question_type === 'assertion_reason' && (!assertion || !reason)) {
        return res.status(400).json({ error: 'Both Assertion and Reason statements are required' });
      }
      if (correct_answer === undefined || correct_answer === null || correct_answer === '') {
        return res.status(400).json({ error: 'Correct answer is required' });
      }

      const parsedOptions = Array.isArray(options) ? options : [];

      const result = await pool.query(
        `INSERT INTO cloud_intelligence_questions (
          question_text, question_type, difficulty, assertion, reason, options,
          correct_answer, points
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 1.0)
        RETURNING *`,
        [
          question_text || `Assertion: ${assertion}`,
          question_type,
          difficulty.toLowerCase(),
          assertion || null,
          reason || null,
          JSON.stringify(parsedOptions),
          typeof correct_answer === 'string' ? JSON.stringify(correct_answer) : JSON.stringify(correct_answer),
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create question error:', error);
      res.status(500).json({ error: 'Failed to create question: ' + error.message });
    }
  });

  // Update question
  app.put('/api/admin/cloud-intelligence/questions/:id', adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const {
        question_text,
        question_type = 'mcq',
        difficulty = 'medium',
        assertion,
        reason,
        options = [],
        correct_answer,
      } = req.body;

      const parsedOptions = Array.isArray(options) ? options : [];

      const result = await pool.query(
        `UPDATE cloud_intelligence_questions
         SET question_text = $1,
             question_type = $2,
             difficulty = $3,
             assertion = $4,
             reason = $5,
             options = $6::jsonb,
             correct_answer = $7::jsonb,
             points = 1.0,
             updated_at = NOW()
         WHERE id = $8
         RETURNING *`,
        [
          question_text || `Assertion: ${assertion}`,
          question_type,
          difficulty.toLowerCase(),
          assertion || null,
          reason || null,
          JSON.stringify(parsedOptions),
          typeof correct_answer === 'string' ? JSON.stringify(correct_answer) : JSON.stringify(correct_answer),
          id,
        ]
      );

      if (result.rows.length === 0) return res.status(404).json({ error: 'Question not found' });
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update question error:', error);
      res.status(500).json({ error: 'Failed to update question: ' + error.message });
    }
  });

  // Delete question
  app.delete('/api/admin/cloud-intelligence/questions/:id', adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM cloud_intelligence_questions WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Question not found' });
      res.json({ success: true, deletedId: id });
    } catch (error) {
      console.error('Delete question error:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  });

  // Freeze / Unfreeze toggle
  app.post('/api/admin/cloud-intelligence/freeze', adminMiddleware, async (req, res) => {
    try {
      const { status } = req.body; // 'frozen' | 'unfrozen'
      if (!['frozen', 'unfrozen'].includes(status)) {
        return res.status(400).json({ error: 'Status must be "frozen" or "unfrozen"' });
      }

      await pool.query(
        `INSERT INTO cloud_intelligence_settings (key, value, updated_at)
         VALUES ('status', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`,
        [JSON.stringify(status)]
      );

      res.json({ success: true, status });
    } catch (error) {
      console.error('Freeze toggle error:', error);
      res.status(500).json({ error: 'Failed to toggle freeze state' });
    }
  });

  // Release / hide results for every participant
  app.post('/api/admin/cloud-intelligence/results/release', adminMiddleware, async (req, res) => {
    try {
      const released = Boolean(req.body?.released);
      await pool.query(
        `INSERT INTO cloud_intelligence_settings (key, value, updated_at)
         VALUES ('results_released', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`,
        [JSON.stringify(released)]
      );
      res.json({ success: true, released });
    } catch (error) {
      console.error('Release results error:', error);
      res.status(500).json({ error: 'Failed to update result visibility' });
    }
  });

  // Get settings
  app.get('/api/admin/cloud-intelligence/settings', adminMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT key, value FROM cloud_intelligence_settings');
      const settings = {};
      result.rows.forEach(r => { settings[r.key] = r.value; });

      const countRes = await pool.query('SELECT COUNT(*)::int as count FROM cloud_intelligence_questions');
      const qCount = countRes.rows[0]?.count || 0;
      settings.duration_minutes = Number(((qCount || 1) * (SECONDS_PER_QUESTION / 60)).toFixed(1));

      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  // Update settings
  app.post('/api/admin/cloud-intelligence/settings', adminMiddleware, async (req, res) => {
    try {
      const { title, duration_minutes } = req.body;
      if (title) {
        await pool.query(
          "INSERT INTO cloud_intelligence_settings (key, value, updated_at) VALUES ('title', $1::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()",
          [JSON.stringify(title)]
        );
      }
      if (duration_minutes) {
        await pool.query(
          "INSERT INTO cloud_intelligence_settings (key, value, updated_at) VALUES ('duration_minutes', $1::jsonb, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()",
          [JSON.stringify(Number(duration_minutes))]
        );
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // Results & Leaderboard
  app.get('/api/admin/cloud-intelligence/results', adminMiddleware, async (req, res) => {
    try {
      const submissionsRes = await pool.query(`
        SELECT * FROM cloud_intelligence_submissions
        ORDER BY score DESC, accuracy_score DESC, time_taken_seconds ASC, submitted_at ASC
      `);

      const statsRes = await pool.query(`
        SELECT
          COUNT(*)::int as total_participants,
          COALESCE(AVG(score), 0)::numeric(6,2) as avg_score,
          COALESCE(MAX(score), 0)::numeric(6,2) as max_score,
          COALESCE(AVG(time_taken_seconds), 0)::int as avg_time_seconds
        FROM cloud_intelligence_submissions
      `);

      res.json({
        submissions: submissionsRes.rows,
        stats: statsRes.rows[0] || {},
      });
    } catch (error) {
      console.error('Results query error:', error);
      res.status(500).json({ error: 'Failed to retrieve results' });
    }
  });

  // Reset Results
  app.post('/api/admin/cloud-intelligence/results/reset', adminMiddleware, async (req, res) => {
    try {
      await pool.query('TRUNCATE TABLE cloud_intelligence_submissions');
      await pool.query('TRUNCATE TABLE cloud_intelligence_attempts').catch(() => {});
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reset results' });
    }
  });

  // Delete single result
  app.delete('/api/admin/cloud-intelligence/results/:id', adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const subRes = await pool.query('SELECT participant_email FROM cloud_intelligence_submissions WHERE id = $1', [id]);
      if (subRes.rows.length > 0 && subRes.rows[0].participant_email) {
        await pool.query('DELETE FROM cloud_intelligence_attempts WHERE participant_email = $1', [subRes.rows[0].participant_email]).catch(() => {});
      }
      await pool.query('DELETE FROM cloud_intelligence_submissions WHERE id = $1', [id]);
      res.json({ success: true, deletedId: id });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete result' });
    }
  });
}
