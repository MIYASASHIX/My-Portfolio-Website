'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Data store ───────────────────────────────────────────────────────────────
const DATA_DIR     = path.join(__dirname, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const ADMIN_FILE   = path.join(DATA_DIR, 'admin.json');

// SHA-256 of 'admin' — default until changed via Settings
const DEFAULT_ADMIN_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readContent() {
  try { return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')); } catch { return {}; }
}

function writeContent(data) {
  fs.writeFileSync(CONTENT_FILE, JSON.stringify(data));
}

function getAdminHash() {
  try {
    const stored = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8')).hash;
    return stored || DEFAULT_ADMIN_HASH;
  } catch { return DEFAULT_ADMIN_HASH; }
}

function setAdminHash(hash) {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify({ hash }));
}

// ─── Middleware ───────────────────────────────────────────────────────────────
// Parse JSON bodies up to 10 MB (to handle base64-encoded profile photos)
app.use(express.json({ limit: '10mb' }));

// ─── Security headers ─────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  // Enforce HTTPS in production
  if (process.env.NODE_ENV === 'production' && _req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, 'https://' + _req.headers.host + _req.url);
  }

  // Strict-Transport-Security (only meaningful over HTTPS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // X-Frame-Options — prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // X-Content-Type-Options — prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy — disable unneeded browser features
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Content-Security-Policy
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'self' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://formspree.io",
      "form-action https://formspree.io 'self'",
      "base-uri 'self'",
    ].join('; ')
  );

  next();
});

// ─── API routes ───────────────────────────────────────────────────────────────

// GET /api/content — public, returns the full content store
app.get('/api/content', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.json(readContent());
});

// POST /api/content — admin only, saves the full content store
app.post('/api/content', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const raw  = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  const valid = raw.length === 64 && /^[0-9a-f]+$/.test(raw) && raw === getAdminHash();
  if (!valid) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Invalid body' });
  }
  writeContent(req.body);
  res.json({ ok: true });
});

// POST /api/auth/password — change admin password (requires current hash)
app.post('/api/auth/password', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { oldHash, newHash } = req.body || {};
  if (!oldHash || oldHash !== getAdminHash()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!newHash || typeof newHash !== 'string' || newHash.length !== 64 || !/^[0-9a-f]+$/.test(newHash)) {
    return res.status(400).json({ error: 'Invalid hash' });
  }
  setAdminHash(newHash);
  res.json({ ok: true });
});

// ─── Static files ─────────────────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname);

app.use(
  express.static(PUBLIC_DIR, {
    // Cache static assets for 1 day in production, no cache in dev
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    // Don't expose directory listings
    index: false,
    // Send ETag headers for cache validation
    etag: true,
    // Deny dotfile access (.env, .git, etc.)
    dotfiles: 'deny',
    // Allowed file extensions (whitelist)
    extensions: ['html', 'css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'woff', 'woff2'],
  })
);

// ─── Root → index.html ────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) return res.status(404).send('index.html not found.');
  res.sendFile(indexPath);
});

// ─── Catch-all: SPA fallback to index.html ────────────────────────────────────
app.use((_req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.status(404).sendFile(indexPath);
  } else {
    res.status(404).send('Not found.');
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`\n  Portfolio server running`);
  console.log(`  ➜  Local:   http://localhost:${PORT}`);
  console.log(`  ➜  Mode:    ${env}\n`);
});
