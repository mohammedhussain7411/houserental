import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'server-data');
const DB_FILE = path.resolve(DATA_DIR, 'renteasy-db.json');

export function renteasySyncPlugin(): Plugin {
  // Ensure data directory exists on startup
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[RentEasy Sync] Failed to create server-data directory:', err);
  }

  let cachedDb: any = null;
  let revision: number = 0;
  let updatedAt: string | null = null;

  // Attempt initial load from disk if file exists
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      cachedDb = JSON.parse(raw);
      revision = cachedDb?.meta?.revision || Date.now();
      updatedAt = cachedDb?.meta?.updated_at || new Date().toISOString();
      console.log(`[RentEasy Sync] Loaded central database from disk (Revision: ${revision})`);
    } else {
      console.log('[RentEasy Sync] Central database file initialized (ready to receive first sync)');
    }
  } catch (err) {
    console.error('[RentEasy Sync] Error reading initial DB from disk:', err);
  }

  const handleSyncRequest = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const rawUrl = req.url || '/';
    const parsedPath = rawUrl.split('?')[0];

    // Only intercept /api/sync routes
    if (parsedPath !== '/api/sync' && !parsedPath.startsWith('/api/sync/')) {
      return next();
    }

    // Standard CORS headers for mobile phones and local network access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // 1. Version Check Endpoint (ultra-fast polling)
    if (parsedPath === '/api/sync/version' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          success: true,
          revision,
          updated_at: updatedAt
        })
      );
      return;
    }

    // 2. Full Sync Fetch
    if (parsedPath === '/api/sync' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;

      // Check if file modified on disk directly
      try {
        if (fs.existsSync(DB_FILE)) {
          const raw = fs.readFileSync(DB_FILE, 'utf-8');
          cachedDb = JSON.parse(raw);
          revision = cachedDb?.meta?.revision || revision;
          updatedAt = cachedDb?.meta?.updated_at || updatedAt;
        }
      } catch (e) {
        // use in-memory cachedDb
      }

      res.end(
        JSON.stringify({
          success: true,
          exists: !!cachedDb,
          revision,
          updated_at: updatedAt,
          data: cachedDb?.data || cachedDb || null
        })
      );
      return;
    }

    // 3. Save / Update Database
    if (parsedPath === '/api/sync' && req.method === 'POST') {
      let bodyStr = '';
      req.on('data', chunk => {
        bodyStr += chunk;
      });

      req.on('end', () => {
        try {
          const parsed = JSON.parse(bodyStr || '{}');
          const newRevision = parsed.revision || Date.now();
          const newUpdatedAt = new Date().toISOString();

          const payloadToSave = {
            meta: {
              revision: newRevision,
              updated_at: newUpdatedAt,
              client_id: parsed.client_id || 'web-or-phone',
              saved_at: newUpdatedAt
            },
            data: parsed.data || parsed
          };

          // Save synchronously to disk
          fs.writeFileSync(DB_FILE, JSON.stringify(payloadToSave, null, 2), 'utf-8');

          cachedDb = payloadToSave;
          revision = newRevision;
          updatedAt = newUpdatedAt;

          console.log(`[RentEasy Sync] Successfully synced database. Revision: ${revision} at ${newUpdatedAt}`);

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              revision: newRevision,
              updated_at: newUpdatedAt
            })
          );
        } catch (err: any) {
          console.error('[RentEasy Sync] Failed to parse and save POST sync:', err);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              success: false,
              error: err?.message || 'Invalid JSON payload'
            })
          );
        }
      });
      return;
    }

    next();
  };

  return {
    name: 'renteasy-sync-plugin',
    configureServer(server) {
      server.middlewares.use(handleSyncRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleSyncRequest);
    }
  };
}
