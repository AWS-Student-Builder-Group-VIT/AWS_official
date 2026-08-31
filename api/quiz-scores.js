import { getPool, authMiddleware } from './_utils.js';

// Handles both:
//   POST /api/quiz-scores        — submit a score
//   GET  /api/quiz-scores/me     — fetch current user's score history
//   GET  /api/quiz-scores        — (also returns score history for backward compat)
export default async function handler(req, res) {
  const user = authMiddleware(req, res);
  if (!user) return;

  const db = getPool();

  // GET — return user's score history
  if (req.method === 'GET') {
    try {
      const result = await db.query(
        'SELECT * FROM quiz_scores WHERE user_id = $1 ORDER BY attempted_at DESC',
        [user.id]
      );
      return res.status(200).json(result.rows);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch scores' });
    }
  }

  // POST — submit a new score
  if (req.method === 'POST') {
    try {
      const { quizId, quizTitle, quizType, score, total } = req.body;
      if (quizId === undefined || score === undefined || !total)
        return res.status(400).json({ error: 'Missing required fields' });

      const pct = Math.round((score / total) * 100);
      const result = await db.query(
        `INSERT INTO quiz_scores (user_id, quiz_id, quiz_title, quiz_type, score, total, pct)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [user.id, quizId, quizTitle, quizType || 'quiz', score, total, pct]
      );
      return res.status(201).json({ message: 'Score saved', score: result.rows[0] });
    } catch (error) {
      console.error('Score save error:', error);
      return res.status(500).json({ error: 'Failed to save score' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
