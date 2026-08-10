# AGENTS.md — Reporte Vehículos GDR

> Static single-page web app for daily vehicle inspection reports (RDV). No build step. Now connected to Supabase for cloud persistence.

## Run / Verify
- Open `index.html` directly in any modern browser. No server or build required.
- To preview changes: refresh the browser. There is no hot-reload or watch mode.
- Test offline behavior with DevTools → Network → Offline.

## Deployment
- Hosted on **GitHub Pages**. `.nojekyll` at root disables Jekyll processing.
- **Cache busting:** bump the `?v=...` query string in `index.html` and `dashboard.html` when editing `styles.css`, `app.js`, `supabase-client.js`, `offline-queue.js`, or `dashboard.js`.

## Architecture
- **Entry / Form:** `index.html` (form UI + printable report layout + chatbot markup + language toggle)
- **Logic:** `app.js` — validation, `localStorage` drafts, Canvas image resize, report generation, chatbot, i18n engine, Supabase save
- **Constants:** `constants.js` — shared `MAINTENANCE_ALERTS`, `ALERT_RANGE` and status color map used by `app.js` and `dashboard.js`
- **Supabase client:** `supabase-client.js` — initialize Supabase JS SDK and expose `saveReportToSupabase()`, `getReportsFromSupabase()`, `getStatsFromSupabase()`
- **Offline queue:** `offline-queue.js` — IndexedDB queue (`RDV_GDR_DB`) + automatic sync when the browser comes back online
- **Dashboard:** `dashboard.html` + `dashboard.js` — KPIs, charts (Chart.js), filters by date/vehicle/status
- **Styles:** `styles.css` — custom dark-mode UI + extensive `@media print` rules for A4 output
- **Database schema:** `schema.sql` — Supabase PostgreSQL tables, indexes and RLS policies
- **Migration:** `migrate_to_supabase.py` — one-time script to import `DB_RDV.sqlite` into Supabase
- **Assets:** `ECUACORRIENTE.png`, `LOGO GDR.jpeg` (logos used in header and print)
- **Tailwind + Chart.js + Supabase JS:** loaded from CDN in `index.html` and `dashboard.html`

## State & Persistence
- **Cloud database:** Supabase project `dzmhhlsttqygjvfabdxx`.
  - Tables: `reports`, `report_systems`, `report_photos`.
  - Anonymous inserts allowed; no auth required.
- **Drafts** auto-save to `localStorage` under key **`RDV_GDR_DRAFT`**.
- On browser reload, drafts are **cleared intentionally** (see `loadDraft()` logic using `performance.navigation`).
- **Offline queue:** when a report is generated, the app first tries to save to Supabase. If it fails (no connection), the full payload is queued in IndexedDB and synced automatically on `window.online`.
- Successfully synced reports are removed from IndexedDB.
- **Language preference** is saved to `localStorage` under key **`RDV_GDR_LANG`** (`es` or `zh`).

## Internationalization (i18n)
- The app supports **Spanish (es)** and **Simplified Chinese (zh)** via a floating language toggle (`#lang-toggle`, bottom-left).
- Translation object `I18N` lives in `app.js` with three blocks:
  - `I18N.es` — all UI strings, system names, status options, validation messages, chatbot texts.
  - `I18N.zh` — Chinese equivalents.
  - `I18N.report` — **fixed Spanish strings** used exclusively by `fillReport()` so the printed report is always in Spanish regardless of UI language.
- **System names in the report:** when building the systems table, each `<select>` gets:
  - `data-sys` = localized name (for display in the form UI)
  - `data-sys-es` = Spanish name (used by `fillReport()`, `saveDraft()` and Supabase `nombre_es`)
- When adding/removing systems, update **both** `I18N.es.systems` and `I18N.zh.systems` (keep them in the same order).
- **Current system count:** 16 systems. A duplicate `Frenos` was removed; if a 17th system is needed later, add it to both language arrays.

## Data Hardcoded in `app.js`
- `vehiclePlateMap` — maps vehicle codes (e.g., `ECO04`) to license plates.
- `MAINTENANCE_ALERTS` — per-vehicle motor/gearbox maintenance thresholds.
- `SYSTEMS` — the inspected systems (sourced from `I18N[currentLang].systems`).
- If adding/removing vehicles or changing thresholds, edit `app.js` directly.

## Image Handling
- Photos are resized client-side with Canvas API to **1400px width**, JPEG **85% quality**.
- Resized data URLs are stored in memory (`foto1Data`, `foto2Data`) and `localStorage`.
- **Photos are kept local only.** Supabase stores only metadata (`report_photos.tiene_foto`).
- Keep images reasonable; large originals are never uploaded.

## Print / Report Generation
- The report is a hidden DOM section (`#report`) shown via CSS `@media print`.
- `styles.css` has aggressive print overrides to force white background/black text because the UI is dark mode.
- Any CSS change that affects `#report`, `.rep-card`, `.rep-table`, or `.print-grid` must be verified with **Ctrl+P → Print to PDF**.
- Report code format: `YYMM-<vehicle>-RDV-0<DAY>-V<version>`
  - `<version>` is `V0` before 18:00, `V1` at 18:00 or later (determined by `fecha` field hour in `generateCode()`).
- **Important:** the printed report is **always in Spanish**. Do not use UI translation keys (`t()`) inside `fillReport()`; use report-only keys (`tr()`) or hardcoded Spanish.

## Database / Supabase
- Schema definition lives in `schema.sql`.
- RLS policies allow anonymous `SELECT`, `INSERT` and `UPDATE` (upsert by `cod_reporte` requires UPDATE when a report is regenerated the same day); `DELETE` is not exposed to the anon key.
- The `SUPABASE_ANON_KEY` is visible in `supabase-client.js`. This is acceptable for an open insert-only endpoint but limits RLS to read/insert only.
- The `service_role key` must never be committed to the repo or placed in the frontend. It is only used in `migrate_to_supabase.py` (run once locally).
- After migration, rotate the `service_role key` in Supabase Dashboard → Project Settings → API.

## Dashboard
- URL: `dashboard.html`
- Charts: reports per day, top systems with failures, operational-status distribution, latest mileage per vehicle, critical-failures trend by system, vehicle operational-status comparison (stacked bars), maintenance projection with km trend.
- Filters: date presets (last 7 days, last month default, this month, last calendar month, this year), date range, vehicle code, operational status.
- Uses Chart.js via CDN.

## Existing Docs
- `GEMINI.md` contains a longer project description. Treat it as background, not source of truth; executable behavior lives in `app.js`, `dashboard.js`, `supabase-client.js`, `offline-queue.js`, and `styles.css`.
