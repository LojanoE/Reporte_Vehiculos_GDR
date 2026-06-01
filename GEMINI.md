# Reporte Vehiculos GDR

## Project Overview

**Reporte Vehiculos GDR** is a single-page web application designed for the "Departamento de Gestión de Depósitos de Relaves" (Tailings Deposit Management Department) to manage Daily Vehicle Inspections (RDV - Revisión Diaria de Vehículos). It allows users to fill out a digital inspection form, attach photographic evidence, and generate a printable report (PDF) with a professional layout.

The application is **bilingual**: the entire form UI can be switched between **Spanish** and **Simplified Chinese** via a floating language toggle. The generated printable report, however, is **always output in Spanish** to maintain consistency with official documentation.

## Tech Stack

*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla ES6+).
*   **Styling:** Tailwind CSS (via CDN) and custom `styles.css`.
*   **Storage:** `localStorage` for saving drafts automatically and persisting language preference.
*   **Logic:** No backend; runs entirely in the browser.

## Key Features

1.  **Vehicle Inspection Form:**
    *   Selection of vehicle codes (pre-mapped to license plates).
    *   Evaluation of 17 vehicle systems (Motor, Brakes, Lights, etc.) with bilingual labels.
    *   Status selection (OK, Attention / 注意, Critical / 需维修) with optional notes.
2.  **Bilingual UI (i18n):**
    *   Floating language toggle button (bottom-left) switches the entire form between Spanish and Chinese.
    *   Preference is saved to `localStorage` and restored on next visit.
    *   Includes translations for all labels, placeholders, validation messages, maintenance alerts, chatbot, and help texts.
3.  **Image Processing:**
    *   Client-side image resizing and compression using the Canvas API to ensure performance.
    *   Previews for up to 2 required photos.
4.  **Report Generation:**
    *   Generates a unique report code (e.g., `2509-ECO62-RDV-009-V0`).
    *   Formats the data into a clean, printable layout (A4 friendly).
    *   **Report is always in Spanish**, even when the UI is in Chinese, by using a dedicated `I18N.report` translation block and `data-sys-es` attributes.
5.  **Persistence:**
    *   Auto-saves progress to `localStorage` to prevent data loss on refresh.
    *   Restores drafts automatically (unless the page was reloaded, in which case the draft is intentionally cleared).
6.  **Interactive Help:**
    *   Includes a built-in chatbot assistant to guide users through the form sections, fully translated into both languages.

## Directory Structure

*   **`index.html`**: The main entry point containing the form structure, report layout, chatbot UI, and language toggle.
*   **`app.js`**: Contains all application logic:
    *   Form validation and handling.
    *   `localStorage` management (save/load drafts and language preference).
    *   Image resizing (`resizeDataURL`).
    *   Report generation and printing logic (always Spanish).
    *   Chatbot interaction logic.
    *   **i18n engine** (`I18N` object, `t()`, `tr()`, `setLanguage()`, `translateUI()`).
*   **`styles.css`**: Custom styles for the dark mode UI and specific print media queries (`@media print`) to ensure the report prints correctly on white paper. Also includes styles for the language toggle button (`#lang-toggle`).
*   **`AGENTS.md`**: Agent-focused development notes (architecture, data, print verification, i18n conventions).

## Usage

Since this is a static web application, no build process is required.

1.  **Run:** Open `index.html` directly in any modern web browser (Chrome, Edge, Firefox).
2.  **Fill Form:** Complete the inspection details. Use the language toggle (bottom-left) to switch between Spanish and Chinese as needed.
3.  **Generate:** Click "Generar informe" (or "生成报告" in Chinese) to create the read-only report view.
4.  **Print/Save:** Use the "Imprimir / Guardar PDF" button (or `Ctrl+P`) to save the report as a PDF. The PDF will always be in Spanish.

## Development Conventions

*   **DOM Manipulation:** Uses helper functions `$` and `$$` for `querySelector`.
*   **State Management:** Relies on the DOM as the source of truth, backed by `localStorage` for session persistence.
*   **Styling:** Uses Tailwind utility classes for layout and spacing, with custom CSS for specific component overrides and print styles.
*   **Dates:** Handles local time formatting explicitly to avoid timezone issues.
*   **i18n:**
    *   UI strings are tagged with `data-i18n` attributes in `index.html` and swapped by `translateUI()`.
    *   Dynamic arrays (systems, status options) are rebuilt by `buildSystemsTable()` on language change.
    *   The report uses a **separate** set of Spanish-only keys (`tr()`) to guarantee the printed output never changes with the UI language.
    *   When adding a new translatable string, add it to **both** `I18N.es` and `I18N.zh`.
