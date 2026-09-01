import process from 'node:process';
import app, { dbReady } from '../server/index.js';
import { restoreVercelApiPath } from '../server/vercelApiRequest.js';

export default async function handler(req, res) {
  try {
    restoreVercelApiPath(req);
    await dbReady;
    return app(req, res);
  } catch (error) {
    console.error('Serverless API initialization failed:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'API initialization failed',
        message: process.env.NODE_ENV === 'production' ? undefined : error.message,
      });
    }
    return undefined;
  }
}

