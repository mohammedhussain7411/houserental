import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'server-data');
const USERS_DIR = path.resolve(DATA_DIR, 'users');
const DB_FILE = path.resolve(DATA_DIR, 'renteasy-db.json');

function getDbFileForEmail(email?: string): string | null {
  const clean = (email || '').trim().toLowerCase();
  if (!clean) return null; // Unauthenticated
  if (clean.includes('mohammedhussain') || clean.includes('admin@renteasy') || clean === 'admin') {
    const mhFile = path.resolve(USERS_DIR, 'mohammedhussain.json');
    if (!fs.existsSync(mhFile) && fs.existsSync(DB_FILE)) {
      try {
        fs.copyFileSync(DB_FILE, mhFile);
      } catch (e) {}
    }
    return fs.existsSync(mhFile) ? mhFile : DB_FILE;
  }
  const safeName = clean.replace(/[^a-z0-9_.-]/g, '_');
  return path.resolve(USERS_DIR, `${safeName}.json`);
}

export function renteasySyncPlugin(): Plugin {
  // Ensure data directories exist on startup
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(USERS_DIR)) {
      fs.mkdirSync(USERS_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[RentEasy Sync] Failed to create server-data directory:', err);
  }

  const handleSyncRequest = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const rawUrl = req.url || '/';
    const parsedPath = rawUrl.split('?')[0];

    // Only intercept /api/sync routes
    if (parsedPath !== '/api/sync' && !parsedPath.startsWith('/api/sync/')) {
      return next();
    }

    const queryMatch = rawUrl.match(/[?&]email=([^&]+)/);
    const queryEmail = queryMatch ? decodeURIComponent(queryMatch[1]) : '';
    const userEmail = (
      req.headers['x-user-email'] ||
      queryEmail ||
      ''
    ).toString().trim().toLowerCase();

    // Standard CORS headers for mobile phones and local network access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-User-Email');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // 1. Version Check Endpoint (ultra-fast polling per user)
    if (parsedPath === '/api/sync/version' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      if (!userEmail) {
        res.end(JSON.stringify({ success: true, revision: 0, updated_at: null }));
        return;
      }
      const targetFile = getDbFileForEmail(userEmail);
      let userRev = 0;
      let userUpAt = null;
      try {
        if (targetFile && fs.existsSync(targetFile)) {
          const raw = fs.readFileSync(targetFile, 'utf-8');
          const db = JSON.parse(raw);
          userRev = db?.meta?.revision || 0;
          userUpAt = db?.meta?.updated_at || null;
        }
      } catch (e) {}
      res.end(
        JSON.stringify({
          success: true,
          revision: userRev,
          updated_at: userUpAt
        })
      );
      return;
    }

    // 2. Full Sync Fetch (strictly isolated by account)
    if (parsedPath === '/api/sync' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;

      if (!userEmail) {
        res.end(JSON.stringify({ success: true, exists: false, revision: 0, updated_at: null, data: null }));
        return;
      }

      const targetFile = getDbFileForEmail(userEmail);
      if (!targetFile || !fs.existsSync(targetFile)) {
        res.end(JSON.stringify({ success: true, exists: false, revision: 0, updated_at: null, data: null }));
        return;
      }

      try {
        const raw = fs.readFileSync(targetFile, 'utf-8');
        const db = JSON.parse(raw);
        res.end(
          JSON.stringify({
            success: true,
            exists: true,
            revision: db?.meta?.revision || 0,
            updated_at: db?.meta?.updated_at || null,
            data: db?.data || db || null
          })
        );
      } catch (e) {
        res.end(JSON.stringify({ success: true, exists: false, data: null }));
      }
      return;
    }

    // 3. Save / Update Database (POST, per-user isolated)
    if (parsedPath === '/api/sync' && req.method === 'POST') {
      let bodyStr = '';
      req.on('data', chunk => {
        bodyStr += chunk;
      });

      req.on('end', () => {
        try {
          const parsed = JSON.parse(bodyStr || '{}');
          const effectiveEmail = (userEmail || parsed.email || parsed.meta?.user_email || '').trim().toLowerCase();
          if (!effectiveEmail) {
            res.statusCode = 401;
            res.end(JSON.stringify({ success: false, error: 'User email required to sync database' }));
            return;
          }

          const targetFile = getDbFileForEmail(effectiveEmail);
          const newRevision = parsed.revision || Date.now();
          const newUpdatedAt = new Date().toISOString();

          const payloadToSave = {
            meta: {
              revision: newRevision,
              updated_at: newUpdatedAt,
              client_id: parsed.client_id || 'web-or-phone',
              user_email: effectiveEmail,
              saved_at: newUpdatedAt
            },
            data: parsed.data || parsed
          };

          if (targetFile) {
            fs.writeFileSync(targetFile, JSON.stringify(payloadToSave, null, 2), 'utf-8');
          }

          console.log(`[RentEasy Sync] Successfully synced database for ${effectiveEmail}. Revision: ${newRevision} at ${newUpdatedAt}`);

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
              error: err?.message || 'Invalid JSON'
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
