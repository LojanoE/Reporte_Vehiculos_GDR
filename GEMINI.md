# Reporte Vehiculos GDR

## Project Overview

**Reporte Vehiculos GDR** is a single-page web application designed for the "Departamento de Gestión de Depósitos de Relaves" (Tailings Deposit Management Department) to manage Daily Vehicle Inspections (RDV - Revisión Diaria de Vehículos). It allows users to fill out a digital inspection form, attach photographic evidence, and generate a printable report (PDF) with a professional layout.

## Tech Stack

*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla ES6+).
*   **Styling:** Tailwind CSS (via CDN) and custom `styles.css`.
*   **Storage:** `localStorage` for saving drafts automatically.
*   **Logic:** No backend; runs entirely in the browser.

## Key Features

1.  **Vehicle Inspection Form:**
    *   Selection of vehicle codes (pre-mapped to license plates).
    *   Evaluation of 17 vehicle systems (Motor, Brakes, Lights, etc.).
    *   Status selection (OK, Attention, Critical) with optional notes.
2.  **Image Processing:**
    *   Client-side image resizing and compression using the Canvas API to ensure performance.
    *   Previews for up to 2 required photos.
3.  **Report Generation:**
    *   Generates a unique report code (e.g., `2509-ECO62-RDV-009-V0`).
    *   Formats the data into a clean, printable layout (A4 friendly).
4.  **Persistence:**
    *   Auto-saves progress to `localStorage` to prevent data loss on refresh.
    *   Restores drafts automatically.
5.  **Interactive Help:**
    *   Includes a built-in chatbot assistant to guide users through the form sections.

## Directory Structure

*   **`index.html`**: The main entry point containing the form structure, report layout, and chatbot UI.
*   **`app.js`**: Contains all application logic:
    *   Form validation and handling.
    *   `localStorage` management (save/load drafts).
    *   Image resizing (`resizeDataURL`).
    *   Report generation and printing logic.
    *   Chatbot interaction logic.
*   **`styles.css`**: Custom styles for the dark mode UI and specific print media queries (`@media print`) to ensure the report prints correctly on white paper.
*   **`QWEN.md`**: Existing project documentation.

## Usage

Since this is a static web application, no build process is required.

1.  **Run:** Open `index.html` directly in any modern web browser (Chrome, Edge, Firefox).
2.  **Fill Form:** Complete the inspection details.
3.  **Generate:** Click "Generar informe" to create the read-only report view.
4.  **Print/Save:** Use the "Imprimir / Guardar PDF" button (or `Ctrl+P`) to save the report as a PDF.

## Development Conventions

*   **DOM Manipulation:** Uses helper functions `$` and `$$` for `querySelector`.
*   **State Management:** Relies on the DOM as the source of truth, backed by `localStorage` for session persistence.
*   **Styling:** Uses Tailwind utility classes for layout and spacing, with custom CSS for specific component overrides and print styles.
*   **Dates:** Handles local time formatting explicitly to avoid timezone issues.
