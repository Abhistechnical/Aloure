# Data Flow — Alouré

1. **Input intake**
   - User lands on the input screen. Chooses LAB / RGB / HEX, uploads an image, or pastes values.
   - Optional white reference and multiple region readings are collected via UI.
   - Data is posted to `/api/v1/color/normalize` with metadata (lighting info, sensor type).

2. **Color normalization**
   - Backend converts RGB/HEX to CIELAB via `colour-science`.
   - If image provided, run simple segmentation (average of crop) or placeholder logic to estimate LAB.
   - Apply calibration using white reference and reading weights (e.g., 40% jawline, 30% cheek, 30% forehead).
   - Return final LAB + HEX + delta-e diagnostics to frontend.

3. **Pigment solving**
   - Frontend triggers `POST /api/v1/color/pigment-formula` with the normalized LAB.
   - Backend solver solves constrained least squares to match target.
   - Returns pigment percentages and resulting LAB.

4. **Visualization & export**
   - Frontend displays color swatch, lab/hex codes, before/after comparison.
   - Shows pigment percentages table.
   - Export options:
     - JSON download of formula data.
     - PDF formula sheet (via client-side rendering or headless print).

5. **Persistence (future)**
   - Store user skin profile (316) for reuse.
   - Provide history of pigments used, adjustments applied, etc.

This flow keeps the color math centralized in the backend while the frontend focuses on luxury-grade UX and storytelling.