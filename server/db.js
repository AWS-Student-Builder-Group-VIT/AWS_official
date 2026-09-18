import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';

// The workspace keeps a single .env.local at the repository root; plain
// .env is loaded afterwards so it can fill any gaps without overriding.
dotenv.config({ path: '.env.local' });
dotenv.config();

let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
  });
} else {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    // PGlite writes to disk and keeps nothing between requests, so in production
    // a missing DATABASE_URL must be an obvious failure, not a silent local database.
    throw new Error('DATABASE_URL is not set. Refusing to start the embedded development database in production.');
  }
  console.log('ℹ️ DATABASE_URL not provided. Initializing local embedded PostgreSQL (PGlite)...');
  // Loaded only here: the package is a devDependency and may be absent in production.
  const { PGlite } = await import('@electric-sql/pglite');
  const lockFile = './server/.pglite_data/postmaster.pid';
  if (fs.existsSync(lockFile)) {
    try {
      fs.unlinkSync(lockFile);
    } catch {}
  }
  let db;
  try {
    db = new PGlite('./server/.pglite_data');
  } catch (err) {
    console.warn('Recovering PGlite data directory...');
    try {
      fs.rmSync('./server/.pglite_data', { recursive: true, force: true });
    } catch {}
    db = new PGlite('./server/.pglite_data');
  }
  let tail = Promise.resolve();
  const query = async (sql, args) => {
    if (args && args.length > 0) {
      return db.query(sql, args);
    }
    if (!sql.includes(';')) {
      return db.query(sql, args);
    }
    const results = await db.exec(sql);
    return results.at(-1) || { rows: [] };
  };
  pool = {
    query,
    async connect() {
      const previous = tail;
      let release;
      tail = new Promise((r) => { release = r; });
      await previous;
      return { query, release: () => { if (release) release(); } };
    },
  };
}

export default pool;

