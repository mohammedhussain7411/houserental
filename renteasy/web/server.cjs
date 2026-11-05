const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const PORT = parseInt(process.env.PORT || '10000', 10);
const DIST_DIR = path.resolve(__dirname, 'dist');
const DATA_DIR = path.resolve(__dirname, 'server-data');
const USERS_DIR = path.resolve(DATA_DIR, 'users');
const DB_FILE = path.resolve(DATA_DIR, 'renteasy-db.json');

// Ensure data directories exist
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_DIR)) {
    fs.mkdirSync(USERS_DIR, { recursive: true });
  }
} catch (err) {
  console.error('[RentEasy Server] Failed to create server-data directory:', err);
}

function getDbFileForEmail(email) {
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

let cachedDb = null;
let revision = 0;
let updatedAt = null;

// Initial database load from disk
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    cachedDb = JSON.parse(raw);
    revision = cachedDb?.meta?.revision || Date.now();
    updatedAt = cachedDb?.meta?.updated_at || new Date().toISOString();
    console.log(`[RentEasy Server] Loaded database from disk (Revision: ${revision})`);
  } else {
    console.log('[RentEasy Server] Ready to receive first sync from mobile or desktop.');
  }
} catch (err) {
  console.error('[RentEasy Server] Error reading initial DB from disk:', err);
}

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname || '/';
  const userEmail = (
    req.headers['x-user-email'] ||
    parsedUrl.query?.email ||
    ''
  ).toString().trim().toLowerCase();

  // Always enable CORS for API routes so mobile phones and local network clients can sync
  if (pathname.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-User-Email');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    // 1. Version check endpoint (per-user)
    if (pathname === '/api/sync/version' && req.method === 'GET') {
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
    if (pathname === '/api/sync' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;

      if (!userEmail) {
        // Unauthenticated client never receives another user's database
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
    if (pathname === '/api/sync' && req.method === 'POST') {
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

          if (payloadToSave.data && Array.isArray(payloadToSave.data.rent_charges) && payloadToSave.data.rent_charges.length > 1) {
            const map = new Map();
            for (const c of payloadToSave.data.rent_charges) {
              if (!c) continue;
              const normMonth = (c.period_month || '').trim();
              const normUnit = (c.unit_number || '').trim().toLowerCase();
              const normTenant = (c.tenant_name || '').trim().toLowerCase();
              const key = normUnit ? normUnit + '::' + normMonth : normTenant + '::' + normMonth;
              if (!map.has(key)) {
                map.set(key, { ...c });
              } else {
                const ex = map.get(key);
                const totalPaid = Math.max(Number(ex.amount_paid) || 0, Number(c.amount_paid) || 0);
                const bestOther = Math.max(Number(ex.other_charges) || 0, Number(c.other_charges) || 0);
                const rentAmt = Number(ex.rent_amount) || Number(c.rent_amount) || 0;
                const totalDue = rentAmt + bestOther;
                const outBal = Math.max(0, totalDue - totalPaid);
                ex.amount_paid = totalPaid;
                ex.other_charges = bestOther;
                ex.total_due = totalDue;
                ex.outstanding_balance = outBal;
                if (c.lease_id && !ex.lease_id) ex.lease_id = c.lease_id;
              }
            }
            payloadToSave.data.rent_charges = Array.from(map.values());
            if (payloadToSave.data.summary) {
              payloadToSave.data.summary.total_rent_charges = payloadToSave.data.rent_charges.length;
            }
          }

          // Save synchronously to user's isolated file
          fs.writeFileSync(targetFile, JSON.stringify(payloadToSave, null, 2), 'utf-8');

          console.log(`[RentEasy Server] Synced database for ${effectiveEmail}. Revision: ${newRevision} at ${newUpdatedAt}`);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              revision: newRevision,
              updated_at: newUpdatedAt
            })
          );
        } catch (err) {
          console.error('[RentEasy Server] Error saving user sync:', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // Unknown API endpoint
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
    return;
  }

  // Static File Serving (dist directory)
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(DIST_DIR, safePath);

  // If requesting root or directory, serve index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // SPA fallback: if file does not exist, serve dist/index.html
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.statusCode = 500;
      res.end(`Server Error: ${err.code}`);
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    // Cache static assets aggressively, keep index.html and service worker fresh
    if (ext === '.html' || filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[RentEasy Production Server] Running on http://0.0.0.0:${PORT}`);
  console.log(`[RentEasy Production Server] Static files from: ${DIST_DIR}`);
  console.log(`[RentEasy Production Server] Sync API active at /api/sync`);
});
