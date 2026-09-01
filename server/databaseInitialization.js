export async function initializeVersionedSchema({ pool, version, migrate }) {
  try {
    const marker = await pool.query(
      'SELECT key FROM hackathon_scoring_migrations WHERE key=$1 LIMIT 1',
      [version],
    );
    if (marker.rows.length) return { migrated: false };
  } catch (error) {
    if (error.code !== '42P01') throw error;
  }

  await migrate();
  await pool.query(
    `INSERT INTO hackathon_scoring_migrations (key)
     VALUES ($1)
     ON CONFLICT (key) DO NOTHING`,
    [version],
  );
  return { migrated: true };
}

