/**
 * Portfolio — script.js
 * Features:
 *  - Theme (light/dark) toggle with localStorage persistence
 *  - Language (EN/AR) toggle with RTL/LTR + font switching
 *  - Cross-tab sync via StorageEvent
 *  - Scroll-reveal animations via IntersectionObserver
 *  - Contact form validation
 *  - Placeholder i18n
 *  - Respects prefers-color-scheme on first visit
 */

'use strict';

/* ── CONSTANTS ──────────────────────────────────────────────── */
const STORAGE_THEME = 'pf_theme';
const STORAGE_LANG  = 'pf_lang';

/* ── HELPERS ────────────────────────────────────────────────── */

/**
 * Safe localStorage get (SSR / private-mode proof).
 */
function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

/**
 * Safe localStorage set.
 */
function storageSet(key, val) {
  try { localStorage.setItem(key, val); } catch { /* silently ignore */ }
}

/* ── THEME ──────────────────────────────────────────────────── */

/**
 * Detect user's preferred colour scheme if no saved preference exists.
 */
function getDefaultTheme() {
  const saved = storageGet(STORAGE_THEME);
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply theme to <html> and announce it for screen-readers.
 */
function applyTheme(theme) {
  const html = document.documentElement;
  html.setAttribute('data-theme', theme);
  storageSet(STORAGE_THEME, theme);

  const btn = document.getElementById('themeToggle');
  if (btn) {
    const isDark = theme === 'dark';
    const labelEn = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    const labelAr = isDark ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع الداكن';
    const lang = html.getAttribute('data-lang') || 'en';
    btn.setAttribute('aria-label', lang === 'ar' ? labelAr : labelEn);
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ── LANGUAGE ───────────────────────────────────────────────── */

/**
 * Update every [data-en] / [data-ar] element's text content,
 * manage RTL direction, font family, and form placeholders.
 */
function applyLanguage(lang) {
  const html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  html.setAttribute('data-lang', lang);

  storageSet(STORAGE_LANG, lang);

  // --- Text content ---
  document.querySelectorAll('[data-en][data-ar]').forEach(el => {
    const text = el.getAttribute(`data-${lang}`);
    if (text !== null) {
      // For inputs/textareas, update placeholder; for everything else, textContent
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.setAttribute('placeholder', text);
      } else {
        el.textContent = text;
      }
    }
  });

  // --- Placeholder-only elements (use separate attrs to not stomp slot content) ---
  document.querySelectorAll('[placeholder-en][placeholder-ar]').forEach(el => {
    const ph = el.getAttribute(`placeholder-${lang}`);
    if (ph !== null) el.setAttribute('placeholder', ph);
  });

  // --- Update lang toggle button label ---
  const langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.setAttribute(
      'aria-label',
      lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'
    );
    langBtn.setAttribute('aria-pressed', lang === 'ar' ? 'true' : 'false');
    // Update inner icon text
    const icon = langBtn.querySelector('.lang-icon');
    if (icon) icon.textContent = lang === 'ar' ? 'EN' : 'ع';
  }

  // --- Re-apply theme aria-label in correct language ---
  const currentTheme = html.getAttribute('data-theme') || 'light';
  applyTheme(currentTheme); // re-calls to update aria-label language
}

function toggleLanguage() {
  const current = document.documentElement.getAttribute('data-lang') || 'en';
  applyLanguage(current === 'ar' ? 'en' : 'ar');
}

/* ── CROSS-TAB / CROSS-WINDOW SYNC ─────────────────────────── */

/**
 * Listen to localStorage changes fired by other tabs/windows.
 * This achieves "sync between different browsers tabs" on the same device.
 */
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_THEME && (e.newValue === 'dark' || e.newValue === 'light')) {
    applyTheme(e.newValue);
  }
  if (e.key === STORAGE_LANG && (e.newValue === 'en' || e.newValue === 'ar')) {
    applyLanguage(e.newValue);
  }
});

/* ── SCROLL REVEAL ──────────────────────────────────────────── */

function initScrollReveal() {
  // Mark elements for reveal
  const targets = document.querySelectorAll(
    '.section-header, .skill-card, .project-card, .about-text, .about-image, ' +
    '.contact-lead, .contact-form, .contact-links, .floating-card'
  );

  targets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${Math.min(i * 0.04, 0.3)}s`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach(el => observer.observe(el));
}

/* ── CONTACT FORM VALIDATION ────────────────────────────────── */

function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const isAr = () => document.documentElement.getAttribute('data-lang') === 'ar';

  const messages = {
    name: {
      en: 'Please enter your name.',
      ar: 'يرجى إدخال اسمك.'
    },
    email: {
      en: 'Please enter a valid email address.',
      ar: 'يرجى إدخال بريد إلكتروني صحيح.'
    },
    message: {
      en: 'Please write a message.',
      ar: 'يرجى كتابة رسالة.'
    },
    success: {
      en: 'Thank you! Your message has been received.',
      ar: 'شكراً! تم استلام رسالتك.'
    },
    sending: {
      en: 'Sending…',
      ar: 'جارٍ الإرسال…'
    },
    error: {
      en: 'Something went wrong. Please try again.',
      ar: 'حدث خطأ ما. يرجى المحاولة مجدداً.'
    },
    noEndpoint: {
      en: 'Form not configured yet. Set your Formspree endpoint in Admin → Settings.',
      ar: 'النموذج غير مُهيَّأ بعد. أضف رابط Formspree من إعدادات المسؤول.'
    }
  };

  function showError(input, key) {
    const lang = isAr() ? 'ar' : 'en';
    const errorEl = input.parentElement.querySelector('.field-error');
    if (errorEl) errorEl.textContent = messages[key][lang];
    input.classList.add('error');
    input.setAttribute('aria-invalid', 'true');
  }

  function clearError(input) {
    const errorEl = input.parentElement.querySelector('.field-error');
    if (errorEl) errorEl.textContent = '';
    input.classList.remove('error');
    input.removeAttribute('aria-invalid');
  }

  // Live validation on blur
  form.querySelectorAll('input, textarea').forEach(field => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.classList.contains('error')) validateField(field);
    });
  });

  function validateField(field) {
    clearError(field);
    const val = field.value.trim();

    if (field.name === 'name') {
      if (!val) { showError(field, 'name'); return false; }
    }
    if (field.name === 'email') {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!val || !emailRe.test(val)) { showError(field, 'email'); return false; }
    }
    if (field.name === 'message') {
      if (val.length < 5) { showError(field, 'message'); return false; }
    }
    return true;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;
    form.querySelectorAll('input, textarea').forEach(field => {
      if (!validateField(field)) valid = false;
    });

    if (!valid) return;

    const btn     = form.querySelector('.submit-btn');
    const btnSpan = btn.querySelector('span');
    const lang    = isAr() ? 'ar' : 'en';
    const origText = btnSpan.textContent;

    // Load saved endpoint (set in Admin → Settings) or fall back to action attribute
    const savedEndpoint = (() => { try { return localStorage.getItem('pf_form_endpoint'); } catch (_) { return null; } })();
    const endpoint = savedEndpoint || form.getAttribute('action') || '';

    if (!endpoint || endpoint.includes('YOUR_FORM_ID')) {
      // Not yet configured — show friendly message
      btnSpan.textContent = messages.noEndpoint[lang];
      setTimeout(() => { btnSpan.textContent = origText; }, 4000);
      return;
    }

    btn.disabled = true;
    btnSpan.textContent = messages.sending[lang];

    fetch(endpoint, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (ok && data.ok !== false) {
        btnSpan.textContent = messages.success[lang];
        form.reset();
        setTimeout(() => { btn.disabled = false; btnSpan.textContent = origText; }, 4000);
      } else {
        const serverMsg = data.errors?.map(e => e.message).join(' ') || messages.error[lang];
        btnSpan.textContent = serverMsg;
        setTimeout(() => { btn.disabled = false; btnSpan.textContent = origText; }, 4000);
      }
    })
    .catch(() => {
      btnSpan.textContent = messages.error[lang];
      setTimeout(() => { btn.disabled = false; btnSpan.textContent = origText; }, 4000);
    });
  });
}

/* ── NAVBAR ACTIVE LINK ON SCROLL ───────────────────────────── */

function initNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.remove('active'));
          const link = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
          if (link) link.classList.add('active');
        }
      });
    },
    { threshold: 0.4 }
  );

  sections.forEach(s => observer.observe(s));
}

/* ── PROJECT CARD KEYBOARD ──────────────────────────────────── */

function initProjectCards() {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
}

/* ── INIT ───────────────────────────────────────────────────── */

function init() {
  // 1. Restore preferences (theme first to avoid FOUC)
  const savedTheme = getDefaultTheme();
  const savedLang  = storageGet(STORAGE_LANG) || 'en';

  applyTheme(savedTheme);
  applyLanguage(savedLang);

  // 2. Wire up toggle buttons
  const themeBtn = document.getElementById('themeToggle');
  const langBtn  = document.getElementById('langToggle');

  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  if (langBtn)  langBtn.addEventListener('click', toggleLanguage);

  // 3. Keyboard shortcut: Alt+D = dark/light, Alt+L = language
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'd') { e.preventDefault(); toggleTheme(); }
    if (e.altKey && e.key === 'l') { e.preventDefault(); toggleLanguage(); }
  });

  // 4. Scroll reveal
  if ('IntersectionObserver' in window) {
    initScrollReveal();
    initNavHighlight();
  }

  // 5. Form
  initContactForm();

  // 6. Project cards
  initProjectCards();

  // 7. Watch OS-level dark mode changes (respects in real-time)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-switch if the user has not explicitly chosen a theme
    if (!storageGet(STORAGE_THEME)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* ══════════════════════════════════════════════════════════
   ADMIN MODULE
   ══════════════════════════════════════════════════════════

   Default password: admin
   Change it in Admin → Settings after first login.

   Architecture:
   - SHA-256 password hash stored in localStorage (pf_admin_hash)
   - Admin session in sessionStorage (expires on tab close)
   - All content edits saved to localStorage (pf_content)
   - On page load, stored content overrides HTML defaults
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────── */
  const STORAGE_CONTENT    = 'pf_content';
  const STORAGE_ADMIN_HASH = 'pf_admin_hash';
  const SESSION_ADMIN      = 'pf_admin_session';

  // SHA-256 of 'admin' — change via Settings after first login
  const DEFAULT_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

  // SVG icons for skill cards (cycled when adding new cards)
  const SKILL_ICONS = [
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  ];

  // Social platform icon + label map
  const SOCIAL_PLATFORMS = {
    github:    { label: 'GitHub',      svgHtml: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>` },
    linkedin:  { label: 'LinkedIn',    svgHtml: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>` },
    twitter:   { label: 'Twitter / X', svgHtml: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.735-8.835L1.254 2.25H8.08l4.254 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>` },
    instagram: { label: 'Instagram',   svgHtml: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>` },
    youtube:   { label: 'YouTube',     svgHtml: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>` },
    email:     { label: 'Email',       svgHtml: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>` },
    website:   { label: 'Website',     svgHtml: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>` },
    custom:    { label: 'Link',        svgHtml: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>` },
  };

  /* ── Crypto helpers ─────────────────────────────────── */
  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getStoredHash() {
    try { return localStorage.getItem(STORAGE_ADMIN_HASH) || DEFAULT_HASH; } catch { return DEFAULT_HASH; }
  }

  function setStoredHash(hash) {
    try { localStorage.setItem(STORAGE_ADMIN_HASH, hash); } catch {}
  }

  /* ── Session ────────────────────────────────────────── */
  function isLoggedIn()    { try { return sessionStorage.getItem(SESSION_ADMIN) === '1'; } catch { return false; } }
  function setLoggedIn(v)  { try { if (v) sessionStorage.setItem(SESSION_ADMIN, '1'); else sessionStorage.removeItem(SESSION_ADMIN); } catch {} }

  /* ── Login rate-limiting state ──────────────────────── */
  let _loginFailures    = 0;
  let _loginLockedUntil = 0;

  /* ── Content store ──────────────────────────────────── */
  function getContent() {
    try { return JSON.parse(localStorage.getItem(STORAGE_CONTENT) || '{}'); } catch { return {}; }
  }

  function saveContentStore(data) {
    try { localStorage.setItem(STORAGE_CONTENT, JSON.stringify(data)); } catch {}
  }

  /** Snapshot the current DOM state into the content store and persist. */
  function snapshotAndSave() {
    const data = getContent();
    if (!data.fields) data.fields = {};

    // Snapshot all [data-field] text elements
    document.querySelectorAll('[data-field]').forEach(el => {
      const key = el.getAttribute('data-field');
      const en  = el.getAttribute('data-en');
      const ar  = el.getAttribute('data-ar');
      if (en !== null || ar !== null) {
        data.fields[key] = { en: en || '', ar: ar || '' };
      }
    });

    // Snapshot skill cards
    data.skills = [];
    document.querySelectorAll('.skill-card[data-skill-id]').forEach((card, idx) => {
      const icon = card.querySelector('.skill-icon');
      data.skills.push({
        id: idx,
        iconSvg: icon ? icon.innerHTML.trim() : SKILL_ICONS[idx % SKILL_ICONS.length],
        title: {
          en: card.querySelector('.skill-title')?.getAttribute('data-en') || '',
          ar: card.querySelector('.skill-title')?.getAttribute('data-ar') || '',
        },
        desc: {
          en: card.querySelector('.skill-desc')?.getAttribute('data-en') || '',
          ar: card.querySelector('.skill-desc')?.getAttribute('data-ar') || '',
        },
        tags: Array.from(card.querySelectorAll('.skill-tags li')).map(li => li.textContent.trim()),
      });
    });

    // Snapshot social links (full array for add/remove support)
    data.socialLinks = [];
    document.querySelectorAll('a[data-link-id]').forEach(el => {
      const id        = el.getAttribute('data-link-id');
      const labelSpan = el.querySelector('[data-field]');
      data.socialLinks.push({
        id,
        href:     el.getAttribute('data-href') || el.href,
        labelEn:  labelSpan?.getAttribute('data-en') || '',
        labelAr:  labelSpan?.getAttribute('data-ar') || '',
        platform: el.getAttribute('data-platform') || 'custom',
      });
    });

    // Snapshot floating stat cards
    data.fcs = [];
    document.querySelectorAll('.floating-card[data-fc-id]').forEach(card => {
      data.fcs.push({
        label: {
          en: card.querySelector('.fc-label')?.getAttribute('data-en') || '',
          ar: card.querySelector('.fc-label')?.getAttribute('data-ar') || '',
        },
        val: {
          en: card.querySelector('.fc-val')?.getAttribute('data-en') || '',
          ar: card.querySelector('.fc-val')?.getAttribute('data-ar') || '',
        },
      });
    });

    // Snapshot project entries
    data.projects = [];
    document.querySelectorAll('.project-card[data-project-id]').forEach((card, idx) => {
      data.projects.push({
        id: idx,
        year: card.querySelector('.project-year')?.textContent.trim() || '',
        title: {
          en: card.querySelector('.project-title')?.getAttribute('data-en') || '',
          ar: card.querySelector('.project-title')?.getAttribute('data-ar') || '',
        },
        desc: {
          en: card.querySelector('.project-desc')?.getAttribute('data-en') || '',
          ar: card.querySelector('.project-desc')?.getAttribute('data-ar') || '',
        },
        stack: Array.from(card.querySelectorAll('.project-stack span')).map(s => s.textContent.trim()),
      });
    });

    saveContentStore(data);
  }

  /** Apply stored content to the DOM on page load. */
  function applyStoredContent() {
    const data = getContent();
    if (!data.fields && !data.skills && !data.projects) return;

    // Apply field overrides
    if (data.fields) {
      Object.entries(data.fields).forEach(([key, val]) => {
        const el = document.querySelector(`[data-field="${key}"]`);
        if (!el) return;
        if (val.en !== undefined) el.setAttribute('data-en', val.en);
        if (val.ar !== undefined) el.setAttribute('data-ar', val.ar);
      });
    }

    // Restore social links
    if (data.socialLinks) {
      if (Array.isArray(data.socialLinks)) {
        // New format: full array → rebuild DOM
        renderSocialLinksFromData(data.socialLinks);
      } else {
        // Legacy format: {id: href} object → just update hrefs in-place
        Object.entries(data.socialLinks).forEach(([id, href]) => {
          const el = document.querySelector(`a[data-link-id="${id}"]`);
          if (el && href) {
            const safe = sanitizeUrl(href);
            el.href = safe;
            el.setAttribute('data-href', safe);
          }
        });
      }
    }

    // Rebuild floating stat cards if stored
    if (data.fcs && data.fcs.length > 0) {
      renderFcsFromData(data.fcs);
    }

    // Rebuild skill cards if stored
    if (data.skills && data.skills.length > 0) {
      renderSkillsFromData(data.skills);
    }

    // Rebuild project cards if stored
    if (data.projects && data.projects.length > 0) {
      renderProjectsFromData(data.projects);
    }

    // Re-apply language to refresh visible text
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    if (typeof applyLanguage === 'function') applyLanguage(lang);
  }

  /* ── Social link dialog ─────────────────────────────── */
  let _linkEl   = null;
  let _linkMode = 'edit'; // 'edit' | 'add'

  function openLinkDialog(linkId) {
    const el = document.querySelector(`a[data-link-id="${linkId}"]`);
    if (!el) return;
    _linkMode = 'edit';
    _linkEl = el;
    const labelSpan = el.querySelector('[data-field]');
    document.getElementById('ld-label-en').value = labelSpan?.getAttribute('data-en') || '';
    document.getElementById('ld-label-ar').value = labelSpan?.getAttribute('data-ar') || '';
    document.getElementById('ld-url').value = el.getAttribute('data-href') || el.href || '';
    const platformSel = document.getElementById('ld-platform');
    if (platformSel) platformSel.value = el.getAttribute('data-platform') || 'custom';
    document.getElementById('ldError').textContent = '';
    document.getElementById('linkDialogTitle').textContent = 'Edit Link';
    document.getElementById('linkDialogSaveBtn').textContent = 'Save';
    openModal('linkDialogOverlay');
    document.getElementById('ld-url').focus();
  }

  function openAddLinkDialog() {
    _linkMode = 'add';
    _linkEl = null;
    document.getElementById('ld-label-en').value = '';
    document.getElementById('ld-label-ar').value = '';
    document.getElementById('ld-url').value = '';
    const platformSel = document.getElementById('ld-platform');
    if (platformSel) platformSel.value = 'github';
    document.getElementById('ldError').textContent = '';
    document.getElementById('linkDialogTitle').textContent = 'Add Social Link';
    document.getElementById('linkDialogSaveBtn').textContent = 'Add Link';
    openModal('linkDialogOverlay');
    platformSel?.focus();
  }

  function saveLinkDialog() {
    const labelEn  = document.getElementById('ld-label-en').value.trim();
    const labelAr  = document.getElementById('ld-label-ar').value.trim();
    const url      = sanitizeUrl(document.getElementById('ld-url').value);
    const platform = document.getElementById('ld-platform')?.value || 'custom';
    const errEl    = document.getElementById('ldError');
    if (!url || url === '#') { errEl.textContent = 'Please enter a valid URL or mailto: address.'; return; }
    errEl.textContent = '';
    const pData = SOCIAL_PLATFORMS[platform] || SOCIAL_PLATFORMS.custom;
    const lang  = document.documentElement.getAttribute('data-lang') || 'en';

    if (_linkMode === 'add') {
      const safePlatform = platform !== 'custom' ? platform : 'link';
      const newId = `social.${safePlatform}.${Date.now()}`;
      const finalLabelEn = labelEn || pData.label;
      const newEl = buildSocialLink({ id: newId, href: url, labelEn: finalLabelEn, labelAr: labelAr || finalLabelEn, platform });
      const container = document.querySelector('.contact-links');
      if (container) {
        container.appendChild(newEl);
        if (typeof applyLanguage === 'function') applyLanguage(lang);
      }
    } else if (_linkEl) {
      const finalLabelEn = labelEn || pData.label;
      _linkEl.href = url;
      _linkEl.setAttribute('data-href', url);
      _linkEl.setAttribute('data-platform', platform);
      // Swap the platform icon
      const svgEl = _linkEl.querySelector('svg[aria-hidden]');
      if (svgEl) {
        const tmp = document.createElement('div');
        tmp.innerHTML = pData.svgHtml;
        if (tmp.firstElementChild) _linkEl.replaceChild(tmp.firstElementChild, svgEl);
      }
      // Update label span
      const labelSpan = _linkEl.querySelector('[data-field]');
      if (labelSpan) {
        labelSpan.setAttribute('data-en', finalLabelEn);
        labelSpan.setAttribute('data-ar', labelAr || finalLabelEn);
        labelSpan.textContent = lang === 'ar' ? (labelAr || finalLabelEn) : finalLabelEn;
      }
    }
    closeModal('linkDialogOverlay');
    _linkEl = null;
  }

  /* ── Social link DOM helpers ────────────────────────── */
  function buildSocialLink(link) {
    const { id, href, labelEn, labelAr, platform } = link;
    const pData = SOCIAL_PLATFORMS[platform] || SOCIAL_PLATFORMS.custom;
    const isEmail = platform === 'email' || (typeof href === 'string' && href.startsWith('mailto:'));
    const finalLabelEn = labelEn || pData.label;
    const finalLabelAr = labelAr || finalLabelEn;
    const a = document.createElement('a');
    a.className = 'social-link';
    a.setAttribute('role', 'listitem');
    const safeHref = sanitizeUrl(href);
    a.href = safeHref;
    a.setAttribute('data-link-id', id);
    a.setAttribute('data-href', safeHref);
    a.setAttribute('data-platform', platform || 'custom');
    if (!isEmail) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.setAttribute('aria-label', finalLabelEn);
    a.innerHTML = `
      <div class="admin-card-controls admin-only">
        <button class="admin-edit-btn"   data-action="edit-link"   data-id="${escAttr(id)}">✏</button>
        <button class="admin-remove-btn" data-action="remove-link" data-id="${escAttr(id)}">×</button>
      </div>
      ${pData.svgHtml}
      <span data-field="${escAttr(id)}.label" data-en="${escAttr(finalLabelEn)}" data-ar="${escAttr(finalLabelAr)}">${escHtml(finalLabelEn)}</span>`;
    return a;
  }

  function renderSocialLinksFromData(links) {
    const container = document.querySelector('.contact-links');
    if (!container) return;
    container.innerHTML = '';
    links.forEach(link => container.appendChild(buildSocialLink(link)));
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    if (typeof applyLanguage === 'function') applyLanguage(lang);
  }

  function removeSocialLink(id) {
    const el = document.querySelector(`a[data-link-id="${id}"]`);
    if (el) el.remove();
  }

  /* ── Floating card helpers ──────────────────────────── */
  const FC_POS_CLASSES = ['fc-1','fc-2','fc-3','fc-4'];

  function buildFloatingCard(fc, id) {
    const posClass = FC_POS_CLASSES[id] || 'fc-1';
    const fcNum    = id + 1;
    const div = document.createElement('div');
    div.className = `floating-card ${posClass}`;
    div.setAttribute('data-fc-id', id);
    div.innerHTML = `
      <div class="admin-card-controls admin-only">
        <button class="admin-edit-btn"   data-action="edit-fc"   data-id="${id}">✏</button>
        <button class="admin-remove-btn" data-action="remove-fc" data-id="${id}">×</button>
      </div>
      <span class="fc-label" data-field="hero.fc${fcNum}.label" data-en="${escAttr(fc.label.en)}" data-ar="${escAttr(fc.label.ar)}">${escHtml(fc.label.en)}</span>
      <span class="fc-val"   data-field="hero.fc${fcNum}.val"   data-en="${escAttr(fc.val.en)}"   data-ar="${escAttr(fc.val.ar)}">${escHtml(fc.val.en)}</span>`;
    return div;
  }

  function renderFcsFromData(fcs) {
    const container = document.querySelector('.hero-visual');
    if (!container) return;
    container.querySelectorAll('.floating-card').forEach(el => el.remove());
    const addRow = container.querySelector('.fc-add-row');
    fcs.forEach((fc, id) => {
      container.insertBefore(buildFloatingCard(fc, id), addRow || null);
    });
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    if (typeof applyLanguage === 'function') applyLanguage(lang);
  }

  function renumberFcs() {
    document.querySelectorAll('.floating-card[data-fc-id]').forEach((card, idx) => {
      card.setAttribute('data-fc-id', idx);
      FC_POS_CLASSES.forEach(c => card.classList.remove(c));
      card.classList.add(FC_POS_CLASSES[idx] || 'fc-1');
      card.querySelectorAll('[data-action]').forEach(btn => btn.setAttribute('data-id', idx));
      const fcNum = idx + 1;
      const lbl = card.querySelector('.fc-label');
      const val = card.querySelector('.fc-val');
      if (lbl) lbl.setAttribute('data-field', `hero.fc${fcNum}.label`);
      if (val) val.setAttribute('data-field', `hero.fc${fcNum}.val`);
    });
  }

  function removeFc(id) {
    const card = document.querySelector(`.floating-card[data-fc-id="${id}"]`);
    if (card) card.remove();
    renumberFcs();
  }

  /* ── Floating card dialog state ─────────────────────── */
  let _fcEditId = null;

  function openFcDialog(editId) {
    _fcEditId = editId;
    const isEdit = editId !== null && editId !== undefined;
    document.getElementById('fcDialogTitle').textContent  = isEdit ? 'Edit Stat Card' : 'Add Stat Card';
    document.getElementById('fcDialogSaveBtn').textContent = isEdit ? 'Save Changes' : 'Add Card';
    document.getElementById('fcError').textContent = '';

    if (isEdit) {
      const card = document.querySelector(`.floating-card[data-fc-id="${editId}"]`);
      if (card) {
        document.getElementById('fc-label-en').value = card.querySelector('.fc-label')?.getAttribute('data-en') || '';
        document.getElementById('fc-label-ar').value = card.querySelector('.fc-label')?.getAttribute('data-ar') || '';
        document.getElementById('fc-val-en').value   = card.querySelector('.fc-val')?.getAttribute('data-en')   || '';
        document.getElementById('fc-val-ar').value   = card.querySelector('.fc-val')?.getAttribute('data-ar')   || '';
      }
    } else {
      ['fc-label-en','fc-label-ar','fc-val-en','fc-val-ar'].forEach(id => { document.getElementById(id).value = ''; });
    }
    openModal('fcDialogOverlay');
    document.getElementById('fc-label-en').focus();
  }

  function saveFcDialog() {
    const labelEn = document.getElementById('fc-label-en').value.trim();
    const labelAr = document.getElementById('fc-label-ar').value.trim();
    const valEn   = document.getElementById('fc-val-en').value.trim();
    const valAr   = document.getElementById('fc-val-ar').value.trim();
    const errEl   = document.getElementById('fcError');

    if (!labelEn || !valEn) { errEl.textContent = 'English label and value are required.'; return; }
    errEl.textContent = '';

    const fc = { label: { en: labelEn, ar: labelAr || labelEn }, val: { en: valEn, ar: valAr || valEn } };

    if (_fcEditId !== null && _fcEditId !== undefined) {
      // Update existing card in-place
      const card = document.querySelector(`.floating-card[data-fc-id="${_fcEditId}"]`);
      if (card) {
        const lbl = card.querySelector('.fc-label');
        const val = card.querySelector('.fc-val');
        if (lbl) { lbl.setAttribute('data-en', fc.label.en); lbl.setAttribute('data-ar', fc.label.ar); }
        if (val) { val.setAttribute('data-en', fc.val.en);   val.setAttribute('data-ar', fc.val.ar);   }
        const lang = document.documentElement.getAttribute('data-lang') || 'en';
        if (lbl) lbl.textContent = lang === 'ar' ? fc.label.ar : fc.label.en;
        if (val) val.textContent = lang === 'ar' ? fc.val.ar   : fc.val.en;
      }
    } else {
      const existing = document.querySelectorAll('.floating-card[data-fc-id]').length;
      if (existing >= 4) { errEl.textContent = 'Maximum 4 stat cards allowed.'; return; }
      const newCard = buildFloatingCard(fc, existing);
      const container = document.querySelector('.hero-visual');
      const addRow    = container?.querySelector('.fc-add-row');
      if (container) container.insertBefore(newCard, addRow || null);
      const lang = document.documentElement.getAttribute('data-lang') || 'en';
      if (typeof applyLanguage === 'function') applyLanguage(lang);
    }
    closeModal('fcDialogOverlay');
    _fcEditId = null;
  }

  /* ── DOM rendering helpers ──────────────────────────── */
  function buildSkillCard(skill, id) {
    // Always use a trusted built-in icon; never inject stored SVG into innerHTML
    const iconSvg = SKILL_ICONS[id % SKILL_ICONS.length];
    const tagsHtml = (skill.tags || []).map(t => `<li>${escHtml(t)}</li>`).join('');
    const div = document.createElement('div');
    div.className = 'skill-card';
    div.setAttribute('data-skill-id', id);
    div.innerHTML = `
      <div class="admin-card-controls admin-only">
        <button class="admin-edit-btn"   data-action="edit-skill"   data-id="${id}" aria-label="Edit skill">✏ Edit</button>
        <button class="admin-remove-btn" data-action="remove-skill" data-id="${id}" aria-label="Remove skill">×</button>
      </div>
      <div class="skill-icon" aria-hidden="true">${iconSvg}</div>
      <h3 class="skill-title" data-field="skill.${id}.title" data-en="${escAttr(skill.title.en)}" data-ar="${escAttr(skill.title.ar)}">${escHtml(skill.title.en)}</h3>
      <p class="skill-desc"   data-field="skill.${id}.desc"  data-en="${escAttr(skill.desc.en)}"  data-ar="${escAttr(skill.desc.ar)}">${escHtml(skill.desc.en)}</p>
      <ul class="skill-tags"  data-field="skill.${id}.tags"  aria-label="Technologies">${tagsHtml}</ul>`;
    return div;
  }

  function buildProjectCard(proj, idx) {
    const num  = String(idx + 1).padStart(2, '0');
    const stackHtml = (proj.stack || []).map(s => `<span>${escHtml(s)}</span>`).join('');
    const art = document.createElement('article');
    art.className = 'project-card';
    art.setAttribute('data-project-id', idx);
    art.setAttribute('tabindex', '0');
    art.innerHTML = `
      <div class="admin-card-controls admin-only">
        <button class="admin-edit-btn"   data-action="edit-project"   data-id="${idx}">✏ Edit</button>
        <button class="admin-remove-btn" data-action="remove-project" data-id="${idx}">×</button>
      </div>
      <div class="project-meta">
        <span class="project-num">${num}</span>
        <span class="project-year">${escHtml(proj.year || '')}</span>
      </div>
      <div class="project-body">
        <h3 class="project-title" data-field="project.${idx}.title" data-en="${escAttr(proj.title.en)}" data-ar="${escAttr(proj.title.ar)}">${escHtml(proj.title.en)}</h3>
        <p  class="project-desc"  data-field="project.${idx}.desc"  data-en="${escAttr(proj.desc.en)}"  data-ar="${escAttr(proj.desc.ar)}">${escHtml(proj.desc.en)}</p>
        <div class="project-stack" data-field="project.${idx}.stack">${stackHtml}</div>
      </div>
      <div class="project-arrow" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </div>`;
    return art;
  }

  function renderSkillsFromData(skills) {
    const grid = document.getElementById('skillsGrid');
    if (!grid) return;
    // Remove existing cards (keep admin-add-row)
    grid.querySelectorAll('.skill-card').forEach(c => c.remove());
    skills.forEach((s, i) => grid.insertBefore(buildSkillCard(s, i), grid.querySelector('.admin-add-row')));
  }

  function renderProjectsFromData(projects) {
    const list = document.getElementById('projectsList');
    if (!list) return;
    list.querySelectorAll('.project-card').forEach(c => c.remove());
    projects.forEach((p, i) => list.insertBefore(buildProjectCard(p, i), list.querySelector('.admin-add-row')));
  }

  function renumberProjects() {
    document.querySelectorAll('.project-card[data-project-id]').forEach((card, idx) => {
      card.setAttribute('data-project-id', idx);
      const numEl = card.querySelector('.project-num');
      if (numEl) numEl.textContent = String(idx + 1).padStart(2, '0');
      // Update data-field keys
      card.querySelectorAll('[data-field]').forEach(el => {
        const old = el.getAttribute('data-field');
        el.setAttribute('data-field', old.replace(/^project\.\d+\./, `project.${idx}.`));
      });
      card.querySelectorAll('[data-action]').forEach(btn => btn.setAttribute('data-id', idx));
    });
  }

  function renumberSkills() {
    document.querySelectorAll('.skill-card[data-skill-id]').forEach((card, idx) => {
      card.setAttribute('data-skill-id', idx);
      card.querySelectorAll('[data-field]').forEach(el => {
        const old = el.getAttribute('data-field');
        el.setAttribute('data-field', old.replace(/^skill\.\d+\./, `skill.${idx}.`));
      });
      card.querySelectorAll('[data-action]').forEach(btn => btn.setAttribute('data-id', idx));
    });
  }

  /* ── Security helpers ───────────────────────────────── */
  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(str) {
    return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  }

  /**
   * Sanitize a URL — block javascript:, data:, vbscript: and other
   * dangerous schemes.  Returns '#' for anything that doesn't match
   * a safe protocol pattern.
   */
  function sanitizeUrl(rawUrl) {
    const str = String(rawUrl || '').trim();
    if (!str) return '#';
    if (/^https?:\/\//i.test(str)) return str;
    if (/^mailto:[^\s]+@[^\s]+/i.test(str)) return str;
    if (/^tel:[+\d\s().-]+$/i.test(str)) return str;
    if (str.startsWith('//')) return 'https:' + str;
    // Bare domain without scheme → prepend https://
    if (/^[\w][\w.-]*\.[a-z]{2,}/i.test(str) && !/[<>"'`]/.test(str)) {
      return 'https://' + str;
    }
    return '#'; // Reject javascript:, data:, vbscript:, etc.
  }

  /* ── Admin mode on/off ──────────────────────────────── */
  function enterAdminMode() {
    setLoggedIn(true);
    document.body.classList.add('admin-mode');
    document.getElementById('adminBar').classList.remove('hidden');
    // Apply stored content before editing session
    applyStoredContent();
  }

  function exitAdminMode() {
    setLoggedIn(false);
    document.body.classList.remove('admin-mode');
    document.getElementById('adminBar').classList.add('hidden');
    closeAllModals();
  }

  /* ── Toast ──────────────────────────────────────────── */
  function showToast(msg) {
    let toast = document.getElementById('adminToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'adminToast';
      toast.className = 'admin-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  /* ── Modal helpers ──────────────────────────────────── */
  function openModal(id)  { document.getElementById(id)?.classList.remove('hidden'); }
  function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

  function closeAllModals() {
    ['adminLoginOverlay','editPopover','projectDialogOverlay',
     'skillDialogOverlay','adminSettingsOverlay','fcDialogOverlay',
     'linkDialogOverlay'].forEach(closeModal);
  }

  // Close modal on backdrop click
  document.addEventListener('click', e => {
    if (e.target.classList.contains('admin-overlay')) closeAllModals();
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });

  /* ── Edit popover state ─────────────────────────────── */
  let _editTarget = null; // the [data-field] element being edited

  function openEditPopover(el) {
    _editTarget = el;
    const field = el.getAttribute('data-field') || 'field';
    document.getElementById('epTitle').textContent = 'Edit: ' + field.split('.').pop();
    document.getElementById('ep-en').value = el.getAttribute('data-en') || '';
    document.getElementById('ep-ar').value = el.getAttribute('data-ar') || '';

    const pop  = document.getElementById('editPopover');
    const rect = el.getBoundingClientRect();
    pop.classList.remove('hidden');

    // position:fixed uses viewport coords — do NOT add scrollY/scrollX
    const popH = pop.offsetHeight || 280;
    let top = rect.bottom + 8;
    if (rect.bottom + popH + 16 > window.innerHeight) {
      top = rect.top - popH - 8;
    }
    // Clamp so popover always stays fully within viewport
    top = Math.max(8, Math.min(top, window.innerHeight - popH - 16));
    let left = rect.left;
    const maxLeft = window.innerWidth - (pop.offsetWidth || 420) - 16;
    left = Math.max(8, Math.min(left, maxLeft));
    pop.style.top  = top + 'px';
    pop.style.left = left + 'px';

    document.getElementById('ep-en').focus();
  }

  function saveEditPopover() {
    if (!_editTarget) return;
    const enVal = document.getElementById('ep-en').value;
    const arVal = document.getElementById('ep-ar').value;
    _editTarget.setAttribute('data-en', enVal);
    _editTarget.setAttribute('data-ar', arVal);

    // Re-render visible text for current language
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    if (_editTarget.tagName !== 'A') {
      _editTarget.textContent = lang === 'ar' ? arVal : enVal;
    }
    closeModal('editPopover');
    _editTarget = null;
  }

  /* ── Project dialog state ───────────────────────────── */
  let _projectEditId = null; // null = add, number = edit existing

  function openProjectDialog(editId) {
    _projectEditId = editId;
    const isEdit = editId !== null && editId !== undefined;
    document.getElementById('projectDialogTitle').textContent = isEdit ? 'Edit Project' : 'Add Project';
    document.getElementById('projectDialogSaveBtn').textContent = isEdit ? 'Save Changes' : 'Add Project';
    document.getElementById('pdError').textContent = '';

    if (isEdit) {
      const card = document.querySelector(`.project-card[data-project-id="${editId}"]`);
      if (card) {
        document.getElementById('pd-title-en').value = card.querySelector('.project-title')?.getAttribute('data-en') || '';
        document.getElementById('pd-title-ar').value = card.querySelector('.project-title')?.getAttribute('data-ar') || '';
        document.getElementById('pd-desc-en').value  = card.querySelector('.project-desc')?.getAttribute('data-en')  || '';
        document.getElementById('pd-desc-ar').value  = card.querySelector('.project-desc')?.getAttribute('data-ar')  || '';
        document.getElementById('pd-year').value     = card.querySelector('.project-year')?.textContent.trim() || '';
        document.getElementById('pd-stack').value    = Array.from(card.querySelectorAll('.project-stack span')).map(s => s.textContent.trim()).join(', ');
      }
    } else {
      ['pd-title-en','pd-title-ar','pd-desc-en','pd-desc-ar','pd-stack'].forEach(id => { document.getElementById(id).value = ''; });
      document.getElementById('pd-year').value = new Date().getFullYear().toString();
    }
    openModal('projectDialogOverlay');
    document.getElementById('pd-title-en').focus();
  }

  function saveProjectDialog() {
    const titleEn = document.getElementById('pd-title-en').value.trim();
    const titleAr = document.getElementById('pd-title-ar').value.trim();
    const descEn  = document.getElementById('pd-desc-en').value.trim();
    const descAr  = document.getElementById('pd-desc-ar').value.trim();
    const year    = document.getElementById('pd-year').value.trim();
    const stack   = document.getElementById('pd-stack').value.split(',').map(s => s.trim()).filter(Boolean);

    if (!titleEn) {
      document.getElementById('pdError').textContent = 'English title is required.';
      document.getElementById('pd-title-en').focus();
      return;
    }

    const projData = { title: { en: titleEn, ar: titleAr || titleEn }, desc: { en: descEn, ar: descAr || descEn }, year, stack };

    if (_projectEditId !== null) {
      // Edit existing
      const card = document.querySelector(`.project-card[data-project-id="${_projectEditId}"]`);
      if (card) {
        card.querySelector('.project-title').setAttribute('data-en', titleEn);
        card.querySelector('.project-title').setAttribute('data-ar', titleAr || titleEn);
        card.querySelector('.project-desc').setAttribute('data-en', descEn);
        card.querySelector('.project-desc').setAttribute('data-ar', descAr || descEn);
        if (card.querySelector('.project-year')) card.querySelector('.project-year').textContent = year;
        const stackDiv = card.querySelector('.project-stack');
        if (stackDiv) stackDiv.innerHTML = stack.map(s => `<span>${escHtml(s)}</span>`).join('');
        // Refresh visible text
        const lang = document.documentElement.getAttribute('data-lang') || 'en';
        card.querySelector('.project-title').textContent = lang === 'ar' ? (titleAr || titleEn) : titleEn;
        card.querySelector('.project-desc').textContent  = lang === 'ar' ? (descAr  || descEn)  : descEn;
      }
    } else {
      // Add new
      const list  = document.getElementById('projectsList');
      const count = list.querySelectorAll('.project-card').length;
      const newCard = buildProjectCard(projData, count);
      list.insertBefore(newCard, list.querySelector('.admin-add-row'));
      // Trigger language for the new card
      const lang = document.documentElement.getAttribute('data-lang') || 'en';
      if (lang === 'ar') {
        newCard.querySelector('.project-title').textContent = titleAr || titleEn;
        newCard.querySelector('.project-desc').textContent  = descAr  || descEn;
      }
    }

    closeModal('projectDialogOverlay');
  }

  /* ── Skill dialog state ─────────────────────────────── */
  let _skillEditId = null;

  function openSkillDialog(editId) {
    _skillEditId = editId;
    const isEdit = editId !== null && editId !== undefined;
    document.getElementById('skillDialogTitle').textContent = isEdit ? 'Edit Skill' : 'Add Skill';
    document.getElementById('skillDialogSaveBtn').textContent = isEdit ? 'Save Changes' : 'Add Skill';
    document.getElementById('sdError').textContent = '';

    if (isEdit) {
      const card = document.querySelector(`.skill-card[data-skill-id="${editId}"]`);
      if (card) {
        document.getElementById('sd-title-en').value = card.querySelector('.skill-title')?.getAttribute('data-en') || '';
        document.getElementById('sd-title-ar').value = card.querySelector('.skill-title')?.getAttribute('data-ar') || '';
        document.getElementById('sd-desc-en').value  = card.querySelector('.skill-desc')?.getAttribute('data-en')  || '';
        document.getElementById('sd-desc-ar').value  = card.querySelector('.skill-desc')?.getAttribute('data-ar')  || '';
        document.getElementById('sd-tags').value     = Array.from(card.querySelectorAll('.skill-tags li')).map(li => li.textContent.trim()).join(', ');
      }
    } else {
      ['sd-title-en','sd-title-ar','sd-desc-en','sd-desc-ar','sd-tags'].forEach(id => { document.getElementById(id).value = ''; });
    }
    openModal('skillDialogOverlay');
    document.getElementById('sd-title-en').focus();
  }

  function saveSkillDialog() {
    const titleEn = document.getElementById('sd-title-en').value.trim();
    const titleAr = document.getElementById('sd-title-ar').value.trim();
    const descEn  = document.getElementById('sd-desc-en').value.trim();
    const descAr  = document.getElementById('sd-desc-ar').value.trim();
    const tags    = document.getElementById('sd-tags').value.split(',').map(s => s.trim()).filter(Boolean);

    if (!titleEn) {
      document.getElementById('sdError').textContent = 'English title is required.';
      document.getElementById('sd-title-en').focus();
      return;
    }

    if (_skillEditId !== null) {
      // Edit existing
      const card = document.querySelector(`.skill-card[data-skill-id="${_skillEditId}"]`);
      if (card) {
        card.querySelector('.skill-title').setAttribute('data-en', titleEn);
        card.querySelector('.skill-title').setAttribute('data-ar', titleAr || titleEn);
        card.querySelector('.skill-desc').setAttribute('data-en', descEn);
        card.querySelector('.skill-desc').setAttribute('data-ar', descAr || descEn);
        const tagList = card.querySelector('.skill-tags');
        if (tagList) tagList.innerHTML = tags.map(t => `<li>${escHtml(t)}</li>`).join('');
        // Refresh visible text
        const lang = document.documentElement.getAttribute('data-lang') || 'en';
        card.querySelector('.skill-title').textContent = lang === 'ar' ? (titleAr || titleEn) : titleEn;
        card.querySelector('.skill-desc').textContent  = lang === 'ar' ? (descAr  || descEn)  : descEn;
      }
    } else {
      // Add new
      const grid  = document.getElementById('skillsGrid');
      const count = grid.querySelectorAll('.skill-card').length;
      const skillData = {
        title: { en: titleEn, ar: titleAr || titleEn },
        desc:  { en: descEn,  ar: descAr  || descEn  },
        tags,
        iconSvg: SKILL_ICONS[count % SKILL_ICONS.length],
      };
      const newCard = buildSkillCard(skillData, count);
      grid.insertBefore(newCard, grid.querySelector('.admin-add-row'));
      const lang = document.documentElement.getAttribute('data-lang') || 'en';
      if (lang === 'ar') {
        newCard.querySelector('.skill-title').textContent = titleAr || titleEn;
        newCard.querySelector('.skill-desc').textContent  = descAr  || descEn;
      }
    }

    closeModal('skillDialogOverlay');
  }

  /* ── Remove card helpers ────────────────────────────── */
  function removeProject(id) {
    const card = document.querySelector(`.project-card[data-project-id="${id}"]`);
    if (card) { card.remove(); renumberProjects(); }
  }

  function removeSkill(id) {
    const card = document.querySelector(`.skill-card[data-skill-id="${id}"]`);
    if (card) { card.remove(); renumberSkills(); }
  }

  /* ── Settings / change password ─────────────────────── */
  async function changePassword() {
    const current  = document.getElementById('set-current-pw').value;
    const newPw    = document.getElementById('set-new-pw').value;
    const confirmPw = document.getElementById('set-confirm-pw').value;
    const errEl     = document.getElementById('settingsPwError');

    errEl.textContent = '';

    if (!current || !newPw || !confirmPw) { errEl.textContent = 'All fields are required.'; return; }
    if (newPw.length < 8) { errEl.textContent = 'New password must be at least 8 characters.'; return; }
    if (newPw !== confirmPw) { errEl.textContent = 'Passwords do not match.'; return; }

    const currentHash = await sha256(current);
    if (currentHash !== getStoredHash()) { errEl.textContent = 'Current password is incorrect.'; return; }

    setStoredHash(await sha256(newPw));
    ['set-current-pw','set-new-pw','set-confirm-pw'].forEach(id => { document.getElementById(id).value = ''; });
    closeModal('adminSettingsOverlay');
    showToast('Password updated successfully.');
  }

  /* ── Delegate event handler for dynamic elements ────── */
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !document.body.classList.contains('admin-mode')) return;

    const action = btn.getAttribute('data-action');
    const id     = parseInt(btn.getAttribute('data-id'), 10);

    if (action === 'edit-project')   { e.stopPropagation(); openProjectDialog(id); }
    if (action === 'remove-project') { e.stopPropagation(); if (confirm('Remove this project?')) removeProject(id); }
    if (action === 'edit-skill')     { e.stopPropagation(); openSkillDialog(id); }
    if (action === 'remove-skill')   { e.stopPropagation(); if (confirm('Remove this skill card?')) removeSkill(id); }
    if (action === 'edit-fc')        { e.stopPropagation(); openFcDialog(id); }
    if (action === 'remove-fc')      { e.stopPropagation(); if (confirm('Remove this stat card?')) removeFc(id); }
    if (action === 'edit-link')      { e.preventDefault(); e.stopPropagation(); openLinkDialog(btn.getAttribute('data-id')); }
    if (action === 'remove-link')    { e.preventDefault(); e.stopPropagation(); if (confirm('Remove this social link?')) removeSocialLink(btn.getAttribute('data-id')); }
  });

  /* ── Click on [data-field] to edit text ─────────────── */
  document.addEventListener('click', e => {
    if (!document.body.classList.contains('admin-mode')) return;
    if (e.target.closest('[data-action]')) return; // skip admin buttons
    if (e.target.closest('.admin-card-controls')) return;

    const el = e.target.closest('[data-field]');
    if (!el) return;

    const field = el.getAttribute('data-field');
    // Tags and stacks on skill/project cards are edited via card dialog, skip
    if (/^(skill|project)\.\d+\.(tags|stack)$/.test(field)) return;

    openEditPopover(el);
  });

  /* ── Wire up all static buttons ─────────────────────── */
  function wireAdminButtons() {
    // Access button (footer)
    document.getElementById('adminAccessBtn')?.addEventListener('click', () => {
      if (isLoggedIn()) { enterAdminMode(); return; }
      openModal('adminLoginOverlay');
      setTimeout(() => document.getElementById('adminPassword')?.focus(), 50);
    });

    // Login
    document.getElementById('adminLoginBtn')?.addEventListener('click', async () => {
      const pw    = document.getElementById('adminPassword').value;
      const errEl = document.getElementById('adminPasswordError');
      errEl.textContent = '';
      // Rate-limit: lock for 30 s after 5 consecutive failures
      if (Date.now() < _loginLockedUntil) {
        const secs = Math.ceil((_loginLockedUntil - Date.now()) / 1000);
        errEl.textContent = `Too many failed attempts. Try again in ${secs}s.`;
        return;
      }
      if (!pw) { errEl.textContent = 'Please enter your password.'; return; }
      const hash = await sha256(pw);
      if (hash !== getStoredHash()) {
        _loginFailures++;
        if (_loginFailures >= 5) {
          _loginLockedUntil = Date.now() + 30_000;
          _loginFailures = 0;
          errEl.textContent = 'Too many failed attempts. Locked for 30 seconds.';
        } else {
          const left = 5 - _loginFailures;
          errEl.textContent = `Incorrect password. ${left} attempt${left !== 1 ? 's' : ''} remaining.`;
        }
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
        return;
      }
      _loginFailures = 0;
      closeModal('adminLoginOverlay');
      document.getElementById('adminPassword').value = '';
      enterAdminMode();
    });

    document.getElementById('adminPassword')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('adminLoginBtn')?.click();
    });

    document.getElementById('adminLoginClose')?.addEventListener('click',  () => closeModal('adminLoginOverlay'));
    document.getElementById('adminLoginCancel')?.addEventListener('click', () => closeModal('adminLoginOverlay'));

    // Admin bar
    document.getElementById('adminSaveBtn')?.addEventListener('click', () => {
      snapshotAndSave();
      showToast('All changes saved!');
    });

    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
      if (confirm('Exit admin mode? Unsaved changes will be lost.')) exitAdminMode();
    });

    document.getElementById('adminSettingsBtn')?.addEventListener('click', () => {
      ['set-current-pw','set-new-pw','set-confirm-pw'].forEach(id => { document.getElementById(id).value = ''; });
      document.getElementById('settingsPwError').textContent = '';
      document.getElementById('settingsFormspreeMsg').textContent = '';
      // Pre-fill saved endpoint
      const saved = (() => { try { return localStorage.getItem('pf_form_endpoint'); } catch (_) { return null; } })();
      const formEl = document.getElementById('contactForm');
      const current = saved || formEl?.getAttribute('action') || '';
      const inputEl = document.getElementById('set-formspree');
      if (inputEl) inputEl.value = current.includes('YOUR_FORM_ID') ? '' : current;
      openModal('adminSettingsOverlay');
    });

    // Edit popover
    document.getElementById('epSaveBtn')?.addEventListener('click',   saveEditPopover);
    document.getElementById('epCancelBtn')?.addEventListener('click', () => closeModal('editPopover'));
    document.getElementById('epClose')?.addEventListener('click',     () => closeModal('editPopover'));

    // Project dialog
    document.getElementById('addProjectBtn')?.addEventListener('click',          () => openProjectDialog(null));
    document.getElementById('projectDialogSaveBtn')?.addEventListener('click',   saveProjectDialog);
    document.getElementById('projectDialogCancelBtn')?.addEventListener('click', () => closeModal('projectDialogOverlay'));
    document.getElementById('projectDialogClose')?.addEventListener('click',     () => closeModal('projectDialogOverlay'));

    // Skill dialog
    document.getElementById('addSkillBtn')?.addEventListener('click',          () => openSkillDialog(null));
    document.getElementById('skillDialogSaveBtn')?.addEventListener('click',   saveSkillDialog);
    document.getElementById('skillDialogCancelBtn')?.addEventListener('click', () => closeModal('skillDialogOverlay'));
    document.getElementById('skillDialogClose')?.addEventListener('click',     () => closeModal('skillDialogOverlay'));

    // Settings
    document.getElementById('settingsSaveBtn')?.addEventListener('click',   changePassword);
    document.getElementById('settingsCancelBtn')?.addEventListener('click', () => closeModal('adminSettingsOverlay'));
    document.getElementById('settingsClose')?.addEventListener('click',     () => closeModal('adminSettingsOverlay'));

    // Formspree endpoint save
    document.getElementById('settingsFormspreeBtn')?.addEventListener('click', () => {
      const input  = document.getElementById('set-formspree');
      const msgEl  = document.getElementById('settingsFormspreeMsg');
      const val    = input?.value.trim();
      if (!val) { msgEl.textContent = 'Please enter a URL.'; msgEl.style.color = '#ef4444'; return; }
      try {
        const _u = new URL(val);
        if (_u.protocol !== 'https:' || _u.hostname !== 'formspree.io') throw new Error();
      } catch {
        msgEl.textContent = 'Must be a valid https://formspree.io/... URL.';
        msgEl.style.color = '#ef4444';
        return;
      }
      try { localStorage.setItem('pf_form_endpoint', val); } catch (_) {}
      const form = document.getElementById('contactForm');
      if (form) form.setAttribute('action', val);
      msgEl.textContent = 'Saved!';
      msgEl.style.color = '#22c55e';
      setTimeout(() => { msgEl.textContent = ''; }, 2500);
    });

    // Floating stat card dialog
    document.getElementById('addFcBtn')?.addEventListener('click', () => {
      const count = document.querySelectorAll('.floating-card[data-fc-id]').length;
      if (count >= 4) { showToast('Maximum 4 stat cards allowed.'); return; }
      openFcDialog(null);
    });
    document.getElementById('fcDialogSaveBtn')?.addEventListener('click',   saveFcDialog);
    document.getElementById('fcDialogCancelBtn')?.addEventListener('click', () => closeModal('fcDialogOverlay'));
    document.getElementById('fcDialogClose')?.addEventListener('click',     () => closeModal('fcDialogOverlay'));

    // Social link dialog
    document.getElementById('addSocialBtn')?.addEventListener('click', openAddLinkDialog);
    document.getElementById('ld-platform')?.addEventListener('change', function () {
      const urlInput = document.getElementById('ld-url');
      if (urlInput) urlInput.placeholder = this.value === 'email' ? 'mailto:your@email.com' : 'https://...';
    });
    document.getElementById('linkDialogSaveBtn')?.addEventListener('click',   saveLinkDialog);
    document.getElementById('linkDialogCancelBtn')?.addEventListener('click', () => closeModal('linkDialogOverlay'));
    document.getElementById('linkDialogClose')?.addEventListener('click',     () => closeModal('linkDialogOverlay'));

    // Photo upload
    document.getElementById('photoInput')?.addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Please upload an image file (PNG, JPG, WebP, etc.)');
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image too large. Please use an image under 5 MB.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        const data = ev.target.result;
        try { localStorage.setItem('pf_photo', data); } catch (_) {/* quota */}
        applyStoredPhoto(data);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    document.getElementById('photoRemoveBtn')?.addEventListener('click', () => {
      localStorage.removeItem('pf_photo');
      applyStoredPhoto(null);
    });

    // Keyboard shortcut: Ctrl+Shift+A
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (document.body.classList.contains('admin-mode')) { exitAdminMode(); }
        else { document.getElementById('adminAccessBtn')?.click(); }
      }
    });
  }

  /* ── Profile photo helpers ──────────────────────────── */
  function applyStoredPhoto(src) {
    const img    = document.getElementById('profilePhoto');
    const svg    = document.getElementById('profilePhotoPlaceholder');
    const removeBtn = document.getElementById('photoRemoveBtn');
    if (!img) return;
    if (src) {
      img.src = src;
      img.classList.remove('hidden');
      if (svg) svg.style.display = 'none';
      if (removeBtn) removeBtn.classList.remove('hidden');
    } else {
      img.src = '';
      img.classList.add('hidden');
      if (svg) svg.style.display = '';
      if (removeBtn) removeBtn.classList.add('hidden');
    }
  }

  function loadStoredPhoto() {
    const data = (() => { try { return localStorage.getItem('pf_photo'); } catch (_) { return null; } })();
    applyStoredPhoto(data || null);
  }

  /* ── Init admin module ──────────────────────────────── */
  function initAdmin() {
    wireAdminButtons();
    loadStoredPhoto();
    // Apply any previously saved content on every page load
    applyStoredContent();
    // Restore saved Formspree endpoint
    const savedEndpoint = (() => { try { return localStorage.getItem('pf_form_endpoint'); } catch (_) { return null; } })();
    if (savedEndpoint) {
      const formEl = document.getElementById('contactForm');
      if (formEl) formEl.setAttribute('action', savedEndpoint);
    }
    // If session was active (same tab, rare — e.g. HMR), restore admin mode
    if (isLoggedIn()) enterAdminMode();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
  } else {
    initAdmin();
  }

}()); // end admin IIFE
