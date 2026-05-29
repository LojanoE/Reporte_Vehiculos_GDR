# AGENTS.md — Reporte Vehículos GDR

> Static single-page web app for daily vehicle inspection reports (RDV). No backend, no build step.

## Run / Verify
- Open `index.html` directly in any modern browser. No server or build required.
- To preview changes: refresh the browser. There is no hot-reload or watch mode.

## Deployment
- Hosted on **GitHub Pages**. `.nojekyll` at root disables Jekyll processing.
- **Cache busting:** `index.html` references `styles.css?v=260330-14` and `app.js?v=260330-14`. Bump the query string when editing those files so browsers load the new version.

## Architecture
- **Entry:** `index.html` (form UI + printable report layout + chatbot markup)
- **Logic:** `app.js` — validation, `localStorage` drafts, Canvas image resize, report generation, chatbot
- **Styles:** `styles.css` — custom dark-mode UI + extensive `@media print` rules for A4 output
- **Assets:** `ECUACORRIENTE.png`, `LOGO GDR.jpeg` (logos used in header and print)
- **Tailwind:** loaded from CDN in `index.html`; do not assume a build pipeline

## State & Persistence
- Drafts auto-save to `localStorage` under key **`RDV_GDR_DRAFT`**.
- On browser reload, drafts are **cleared intentionally** (see `loadDraft()` logic using `performance.navigation`).
- Do not add a backend or external storage without explicit user request.

## Data Hardcoded in `app.js`
- `vehiclePlateMap` — maps vehicle codes (e.g., `ECO04`) to license plates.
- `MAINTENANCE_ALERTS` — per-vehicle motor/gearbox maintenance thresholds.
- `SYSTEMS` — the 17 inspected systems.
- If adding/removing vehicles or changing thresholds, edit `app.js` directly.

## Image Handling
- Photos are resized client-side with Canvas API to **1400px width**, JPEG **85% quality**.
- Resized data URLs are stored in memory (`foto1Data`, `foto2Data`) and `localStorage`.
- Keep images reasonable; large originals are never uploaded.

## Print / Report Generation
- The report is a hidden DOM section (`#report`) shown via CSS `@media print`.
- `styles.css` has aggressive print overrides to force white background/black text because the UI is dark mode.
- Any CSS change that affects `#report`, `.rep-card`, `.rep-table`, or `.print-grid` must be verified with **Ctrl+P → Print to PDF**.
- Report code format: `YYMM-<vehicle>-RDV-0<DAY>-V0`

## Existing Docs
- `GEMINI.md` and `QWEN.md` contain longer project descriptions. Treat them as background, not source of truth; executable behavior lives in `app.js` and `styles.css`.
