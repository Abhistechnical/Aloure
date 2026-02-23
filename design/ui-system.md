# Alouré UI System — Luxury Beauty × Color Science

## 1. Brand-at-a-glance
- **Positioning:** Couture foundation formulas, engineered by color science but delivered like a private Atelier experience. Think Dior/Chanel/Sephora counter gloss with a whisper of lab precision.
- **Tagline (used in hero):** *Precision Color. Perfectly Yours.*
- **Mood keywords:** Elegant, luminous, quiet power, pampering precision.

## 2. Color & Typography palette
| Element | Value | Note |
| --- | --- | --- |
| Warm beige (background) | `#F6F1ED` | Base, keeps space bright and soft.
| Soft blush gradient | `linear-gradient(135deg, #FDE9E6 0%, #F7DCC9 60%, #F3C9B3 100%)` | Hero accent/backdrop.
| Champagne gold | `#C9A56A` | CTAs, accent lines, glowing borders.
| Ivory / white cards | `#FFFFFF` @ 0.9 opacity | Glass-like surfaces.
| Matte charcoal text | `#1E1B18` | Primary text.
| Subtle graphite | `#2B2826` for body text; lighten for helper text.
| Soft shadow | `0 24px 45px rgba(30, 27, 24, 0.06)` | Cards, CTA containers.

**Fonts**
- Headings: *Cormorant Garamond* (serif) or *Playfair Display* — tall, graceful letterforms.
- Body: *Inter* or *Neue Haas Grotesk* — clean, legible sans.
- Use letter spacing `0.02em` for hero/section titles, `0.04em` for CTA labels.

## 3. Layout + Screen flow
### Hero / Dashboard
- **Structure:** Full-bleed soft gradient hero with left-aligned copy, right-hand floating glass card showing quick swatch preview and CTA buttons.
- **Copy:** 
  - Headline: *Precision Color. Perfectly Yours.*
  - Subtext: "Alouré marries couture cosmetics with color science to deliver bespoke foundation ratios in seconds." 
- **CTAs:** 
  - Primary gold button `Create Custom Foundation` (glow on hover). 45px height, pill-shaped edges.
  - Secondary text button `Enter Color Code` (underline on hover).
- **Floating card content:** swatch (circle) + quick data (LAB + HEX), "Powered by Color Science" badge (micro badge with icon, letter spacing). Use subtle glass blur effect (backdrop-filter) and gradient border.

### Step-Based Workflow
Use a horizontal timeline on desktop (stacked vertical on mobile/tablet). Each step displayed inside glass/matte cards with subtle drop shadow.

#### Step 1 — Input Skin Data
- Three large cards side-by-side (image input, manual values, spectro readings). Each card uses soft curved borders and contains:
  - Icon (thin-line, cosmetic-inspired) + headline.
  - CTA button (rounded). e.g., "Upload Face Image" triggers file picker.
  - Helper text: "Jawline + cheek samples recommended" (secondary color). 
- Support multi-readings: Under cards, show small chips for "Jawline", "Cheek", "Forehead" with LAB values displayed upon active selection.
- Calibration input area below: small card to set white reference; include slider or toggle for lighting (Daylight / Studio LED / Warm Tungsten).

#### Step 2 — Skin Tone Analysis
- Central visual area: large color swatch preview (circle), background animated halo pulsing softly.
- Display LAB values in light sans font, spaced horizontally with subtle separators.
- Microcopy: "Analyzing tone…" (fading animation) + small progress dots.
- Show normalized values & delta readings in small callouts.

#### Step 3 — Pigment Formula
- Layout: left column — pigment ratio list; right column — circular mix visualization + soft bar chart.
- Each pigment row: pigment color marker, name, percentage, and small tooltip icon for `Yellow (primary brightening agent)`. Use small icons for info.
- Visual mix: circular `donut` or gradient ring representing pigment blend; center shows resulting LAB + ΔE.
- Soft horizontal bar chart (matching pigment colors) to reinforce percentages. Use gold highlight for dominant pigments.

#### Step 4 — Final Result
- Large swatch card (glass) with drop shadow. 
- Display codes: `LAB L*: 59.3 • a*: 12.4 • b*: 25.3` and HEX `#f0c7a1` with copy button.
- Buttons: `Generate Formula Sheet` (primary) and `Refine Match` (secondary). 
- Include comparison slider: left shows original skin tone (photo/circle), right shows final mix swatch. Slider handle shaped like a rounded gem.

### Export screen
- Layout: top summary of LAB + HEX, below two cards: 
  - JSON export (show snippet, button to download). 
  - PDF Formula Sheet (preview thumbnail of luxe card with ratios + brand). 
- Add `Share to Lab` toggle for future hardware.

## 4. Components / Interactions
- **Buttons:** Pill-shaped, 14px letter spacing, champagne gold fill for primary, white on black border for monochrome. Hover adds `box-shadow: 0 12px 25px rgba(201,165,106,0.35)` and slight upward translate.
- **Cards:** `background: rgba(255,255,255,0.9)` with `backdrop-filter: blur(16px)`. Border `1px solid rgba(255,255,255,0.5)` and faint gradient stroke.
- **Swatch:** Circular, soft shadow, gradient overlay. Add tiny label showing delta-E.
- **Tooltips:** Triggered on hover for lab terms or pigment names. Use rounded rectangles with `#2B2826` background, `#fff` text.
- **Badges:** e.g., "Powered by Color Science" — small pill with gold stroke.
- **Icons:** Use line-art (stroke 1.2) resembling cosmetics (mirror, brush, droplet). Keep color `#1E1B18` with opacity 0.6.

## 5. Responsive behavior
- **Mobile:** Stack steps vertically; hero becomes full screen with CTA buttons centered. Input cards collapse into accordion toggles.
- **Tablet:** Use two-column layout for steps 2-4; keep swatch prominent.
- **Desktop:** Full horizontal timeline with connectors (thin gold line connecting step cards). Add subtle parallax on hero background gradient when user scrolls.

## 6. Science storytelling
- Softly display LAB values near swatches with microcopy: "CIELAB represents perceived brightness (L*) and chromaticity (a*, b*)."
- Include info card: “How it works” (two bullet lines). Show small icons of spectrophotometer, mixer, and skin.
- Provide subtle timeline tip: "Delta-E: 0.34 (industry-grade match)." Use pastel accent.

## 7. Emotional tone
- Use matte backgrounds, generous spacing, and tactile-looking buttons to make the user feel like they’re at a couture makeup counter.
- Avoid charts that feel like dashboards; instead, rely on curves, swatches, and minimal text.
- Ensure every screen ends with a gentle CTA (“Refine Match”, “Book a consultation”) to reinforce the luxury treatment.

**Callouts for Implementation:**
- Build the stepper as a controlled component so the frontend can highlight the active step, show progress with a gold line, and support future hardware triggers.
- Use CSS transitions and pseudo-elements to create the high-polish glass effect and soft glow for CTAs.
- Keep typography consistent by using Google Fonts (Cormorant Garamond / Inter). Use `font-feature-settings: 'liga'` for the serif to feel premium.

Let me know if you’d like me to translate this into Figma mockups, CSS prototypes, or begin implementing the Next.js components with this aesthetic guidance.