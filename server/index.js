import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db.js';
import { initializeVersionedSchema } from './databaseInitialization.js';
import { isAllowedOrigin } from './corsOrigins.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import recruitmentRouter from './recruitmentRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const ADMIN_ID = process.env.ADMIN_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_JWT_SECRET = `${process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'development-only-change-me'}:admin`;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:3000',
  'https://aws-official.onrender.com',
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin, allowedOrigins)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// ── Recruitment API ───────────────────────────────────────────
app.use('/api/recruitment', recruitmentRouter);


// ── Auth middleware ───────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.admin = jwt.verify(token, ADMIN_JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid admin token' });
  }
}

// ── Database init ─────────────────────────────────────────────
async function runDatabaseMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_scores (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
      quiz_id      VARCHAR(64) NOT NULL,
      quiz_title   VARCHAR(128),
      quiz_type    VARCHAR(32) DEFAULT 'quiz',
      score        INTEGER NOT NULL,
      total        INTEGER NOT NULL,
      pct          INTEGER NOT NULL,
      time_taken   INTEGER DEFAULT 0,
      composite_score NUMERIC(5,2) DEFAULT 0,
      attempted_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    ALTER TABLE quiz_scores ADD COLUMN IF NOT EXISTS time_taken INTEGER DEFAULT 0;
    ALTER TABLE quiz_scores ADD COLUMN IF NOT EXISTS composite_score NUMERIC(5,2) DEFAULT 0;
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS global_settings (
      key VARCHAR(64) PRIMARY KEY,
      value VARCHAR(255) NOT NULL
    );
  `);
}

async function initDb() {
  const result = await initializeVersionedSchema({
    pool,
    version: 'v10-hackquest-removed',
    migrate: runDatabaseMigrations,
  });
  console.log(result.migrated ? 'Database tables ready (migrated to v10)' : 'Database schema already ready');
}
// An unhandled module-scope rejection kills the whole serverless function before
// any handler runs, taking the Supabase-only recruitment routes down with it —
// so a Postgres outage must not be fatal to the rest of the API.
export const dbReady = initDb().catch((error) => {
  console.error('Database initialisation failed:', error);
});

// ── Register ─────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ error: 'Please provide all required fields' });
    if (!email.toLowerCase().endsWith('@vitstudent.ac.in'))
      return res.status(400).json({ error: 'Only VIT students (@vitstudent.ac.in) are allowed' });
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0)
      return res.status(400).json({ error: 'User already exists with this email' });
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (first_name, last_name, email, phone, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id, first_name, last_name, email',
      [firstName, lastName, email, phone, passwordHash]
    );
    const token = jwt.sign({ id: newUser.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Account created successfully', token, user: newUser.rows[0] });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === '23505') return res.status(400).json({ error: 'User already exists' });
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// ── Login ─────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Please provide email and password' });
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0)
      return res.status(400).json({ error: 'Invalid email or password' });
    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword)
      return res.status(400).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ── User Profile — Update Name ────────────────────────────────
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    if (!firstName || !lastName) return res.status(400).json({ error: 'Missing fields' });
    const result = await pool.query(
      'UPDATE users SET first_name = $1, last_name = $2 WHERE id = $3 RETURNING id, first_name, last_name, email',
      [firstName, lastName, req.user.id]
    );
    res.json({ message: 'Profile updated', user: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── User Profile — Update Password ────────────────────────────
app.put('/api/user/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(oldPassword, userResult.rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Incorrect old password' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// ── Quiz Scores — Submit ──────────────────────────────────────
app.post('/api/quiz-scores', authMiddleware, async (req, res) => {
  try {
    const { quizId, quizTitle, quizType, score, total, timeTaken } = req.body;
    if (quizId === undefined || score === undefined || !total)
      return res.status(400).json({ error: 'Missing required fields' });

    const pct = Math.round((score / total) * 100);
    const maxTime = total * 60;
    const accuracyComponent = (score / total) * 100 * 0.7;
    const validTimeTaken = timeTaken !== undefined ? timeTaken : maxTime;
    const timeComponent = validTimeTaken < maxTime ? (1 - (validTimeTaken / maxTime)) * 100 * 0.3 : 0;
    const compositeScore = Math.min(100, Math.max(0, accuracyComponent + timeComponent)).toFixed(2);

    const result = await pool.query(
      `INSERT INTO quiz_scores (user_id, quiz_id, quiz_title, quiz_type, score, total, pct, time_taken, composite_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, quizId, quizTitle, quizType || 'quiz', score, total, pct, validTimeTaken, compositeScore]
    );
    res.status(201).json({ message: 'Score saved', score: result.rows[0] });
  } catch (error) {
    console.error('Score save error:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// ── Quiz Scores — My history ──────────────────────────────────
app.get('/api/quiz-scores/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM quiz_scores WHERE user_id = $1 ORDER BY attempted_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// ── Quiz Scores — Qualification Status ───────────────────────
app.get('/api/quiz-scores/round-status', authMiddleware, async (req, res) => {
  try {
    const myScoresResult = await pool.query(
      'SELECT quiz_id, MAX(composite_score) as best_score, MAX(pct) as best_pct FROM quiz_scores WHERE user_id = $1 GROUP BY quiz_id',
      [req.user.id]
    );
    const myScores = {};
    myScoresResult.rows.forEach(r => {
      myScores[r.quiz_id] = { attempted: true, bestScore: parseFloat(r.best_score || 0), bestPct: parseInt(r.best_pct || 0) };
    });

    const gates = [
      { id: 'fundamentals', cutoffPct: 0.70 },
      { id: 'advanced', cutoffPct: 0.40 }
    ];
    const statusMap = {
      fundamentals: { attempted: !!myScores['fundamentals'], qualified: true },
      advanced: { attempted: !!myScores['advanced'], qualified: false },
      security: { attempted: !!myScores['security'], qualified: false }
    };

    for (const gate of gates) {
      if (myScores[gate.id]) {
        const allScores = await pool.query(
          'SELECT user_id, MAX(composite_score) as best_score FROM quiz_scores WHERE quiz_id = $1 GROUP BY user_id ORDER BY best_score DESC',
          [gate.id]
        );
        const totalParticipants = allScores.rows.length;
        const cutoffRank = Math.max(1, Math.floor(totalParticipants * gate.cutoffPct));
        let userRank = -1;
        for (let i = 0; i < allScores.rows.length; i++) {
          if (allScores.rows[i].user_id === req.user.id) { userRank = i + 1; break; }
        }
        statusMap[gate.id].qualified = userRank > 0 && userRank <= cutoffRank;
        statusMap[gate.id].rank = userRank;
        statusMap[gate.id].total = totalParticipants;
        statusMap[gate.id].cutoffRank = cutoffRank;
      } else {
        statusMap[gate.id].qualified = false;
      }
    }
    res.json(statusMap);
  } catch (error) {
    console.error('Round status error:', error);
    res.status(500).json({ error: 'Failed to fetch round status' });
  }
});

// ── Admin — Login ─────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_ID || !ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin login is not configured' });
  const { adminId, password } = req.body;
  if (adminId !== ADMIN_ID || password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Invalid admin credentials' });
  const token = jwt.sign({ role: 'admin' }, ADMIN_JWT_SECRET, { expiresIn: '8h' });
  res.json({ message: 'Admin login successful', token });
});

// ── Admin — All scores ────────────────────────────────────────
app.get('/api/admin/scores', adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT qs.id, qs.quiz_id, qs.quiz_title, qs.quiz_type,
             qs.score, qs.total, qs.pct, qs.time_taken, qs.composite_score, qs.attempted_at,
             u.first_name, u.last_name, u.email
      FROM quiz_scores qs
      JOIN users u ON qs.user_id = u.id
      ORDER BY qs.attempted_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Admin scores error:', error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// ── Admin — Stats ─────────────────────────────────────────────
app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
  try {
    const [students, attempts, avg, top] = await Promise.all([
      pool.query('SELECT COUNT(DISTINCT user_id) as count FROM quiz_scores'),
      pool.query('SELECT COUNT(*) as count FROM quiz_scores'),
      pool.query('SELECT ROUND(AVG(pct)) as avg FROM quiz_scores'),
      pool.query(`
        WITH user_best AS (
          SELECT user_id, quiz_id, MAX(COALESCE(composite_score, pct)) as best_score
          FROM quiz_scores GROUP BY user_id, quiz_id
        )
        SELECT u.first_name, u.last_name, u.email,
               ROUND(SUM(ub.best_score)) as total_score,
               (SELECT COUNT(*) FROM quiz_scores WHERE user_id = u.id) as attempts
        FROM user_best ub
        JOIN users u ON ub.user_id = u.id
        GROUP BY u.id, u.first_name, u.last_name, u.email
        ORDER BY total_score DESC
      `),
    ]);
    res.json({
      totalStudents: parseInt(students.rows[0].count),
      totalAttempts: parseInt(attempts.rows[0].count),
      avgScore: parseInt(avg.rows[0].avg || 0),
      leaderboard: top.rows,
      topScorers: top.rows.slice(0, 5),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Global Quiz Status ───────────────────────────────────────
let cachedQuizStatus = 'inactive';
let lastStatusFetchTime = 0;

app.get('/api/quiz-status', async (req, res) => {
  try {
    if (Date.now() - lastStatusFetchTime > 2000) {
      const result = await pool.query("SELECT value FROM global_settings WHERE key = 'quiz_status'");
      cachedQuizStatus = result.rows.length > 0 ? result.rows[0].value : 'inactive';
      lastStatusFetchTime = Date.now();
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.status(200).json({ status: cachedQuizStatus });
  } catch {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

app.post('/api/admin/quiz-control', adminMiddleware, async (req, res) => {
  try {
    const { action } = req.body;
    if (!['initiate', 'terminate'].includes(action))
      return res.status(400).json({ error: 'Invalid action' });
    const status = action === 'initiate' ? 'active' : 'inactive';
    await pool.query(`
      INSERT INTO global_settings (key, value) VALUES ('quiz_status', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [status]);
    cachedQuizStatus = status;
    lastStatusFetchTime = Date.now();
    res.json({ message: `Quiz ${status} successfully`, status });
  } catch (error) {
    console.error('Quiz control error:', error);
    res.status(500).json({ error: 'Failed to update quiz status' });
  }
});

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', backend: 'running', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', backend: 'running', database: 'disconnected', error: err.message });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

if (!process.env.VERCEL) {
  const startServer = () => {
    const server = app.listen(PORT, () => {
      console.log('\n┌──────────────────────────────────────────┐');
      console.log(`│  ✅ Backend running  →  http://localhost:${PORT}  │`);
      console.log('│  🔑 Admin login     →  /admin              │');
      console.log('│  ❤️  Health check   →  /api/health         │');
      console.log('└──────────────────────────────────────────┘\n');
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.\n`);
      } else {
        console.error('❌ Server error:', err);
      }
    });
  };

  dbReady.then(() => {
    startServer();
  }).catch((error) => {
    console.warn('⚠️ Database connection deferred/offline:', error.message || error);
    startServer();
  });
}

export default app;
