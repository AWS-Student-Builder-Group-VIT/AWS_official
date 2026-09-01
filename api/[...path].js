import process from 'node:process';
import app, { dbReady } from '../server/index.js';

export default async function handler(req, res) {
  try {
    await dbReady;
    return app(req, res);
  } catch (error) {
    console.error('Serverless database initialization failed:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'API initialization failed',
        message: process.env.NODE_ENV === 'production' ? undefined : error.message,
      });
    }
    return undefined;
  }
}
