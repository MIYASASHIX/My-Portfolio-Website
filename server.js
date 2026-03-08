'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Security headers ────────────────────────────────────────────────────────
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

  // Content-Security-Policy (mirrors the meta-tag in index.html)
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'self' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src https://formspree.io",
      "form-action https://formspree.io 'self'",
      "base-uri 'self'",
    ].join('; ')
  );

  next();
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

// ─── Root → index.html ───────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('index.html not found.');
  }
  res.sendFile(indexPath);
});

// ─── Catch-all: SPA fallback to index.html ───────────────────────────────────
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
