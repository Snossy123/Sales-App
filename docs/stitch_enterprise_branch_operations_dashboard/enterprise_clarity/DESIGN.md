---
name: Enterprise Clarity
colors:
  surface: '#f9f9ff'
  surface-dim: '#cadbfc'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dfe8ff'
  surface-container-highest: '#d6e3ff'
  on-surface: '#091c35'
  on-surface-variant: '#414754'
  inverse-surface: '#20314b'
  inverse-on-surface: '#ecf0ff'
  outline: '#727785'
  outline-variant: '#c1c6d6'
  surface-tint: '#005bc0'
  primary: '#005bbf'
  on-primary: '#ffffff'
  primary-container: '#1a73e8'
  on-primary-container: '#ffffff'
  inverse-primary: '#adc7ff'
  secondary: '#5c5f60'
  on-secondary: '#ffffff'
  secondary-container: '#e1e3e4'
  on-secondary-container: '#626566'
  tertiary: '#9e4300'
  on-tertiary: '#ffffff'
  tertiary-container: '#c55500'
  on-tertiary-container: '#0e0200'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc7ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#e1e3e4'
  secondary-fixed-dim: '#c5c7c8'
  on-secondary-fixed: '#191c1d'
  on-secondary-fixed-variant: '#454748'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#783100'
  background: '#f9f9ff'
  on-background: '#091c35'
  surface-variant: '#d6e3ff'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 24px
  gutter: 16px
---

## Brand & Style

This design system is engineered for high-density enterprise ERP environments where data clarity and cognitive load management are paramount. The aesthetic follows a **Corporate / Modern** philosophy, blending the structured logic of Material Design with the refined precision of Ant Design. 

The personality is authoritative, reliable, and invisible—prioritizing the user’s workflow over visual flair. It utilizes a vast amount of whitespace to separate complex data sets, ensuring that even the most information-heavy screens feel breathable and navigable. The emotional response should be one of confidence and control, achieved through perfect alignment, consistent geometry, and a sober professional palette.

## Colors

The palette is anchored by **Deep Blue (#1A73E8)**, used strategically for primary actions and active states to guide the user’s eye. The background utilizes a three-tier "Grey-to-White" system: a light grey canvas (`#F4F7FA`) to provide contrast for white cards, and a subtle secondary grey for headers or sidebars.

Semantic colors are strictly reserved for status communication. Success, Warning, and Danger colors follow standard industry expectations but are slightly desaturated to maintain a professional tone. Text colors use a dark navy-grey rather than pure black to reduce eye strain during long-working sessions.

## Typography

**Inter** is the sole typeface for this design system, chosen for its exceptional legibility in data-heavy interfaces and its comprehensive weight range. 

- **Headlines:** Use Semi-Bold (600) for page titles to establish clear hierarchy.
- **Body:** The standard size is `body-md` (14px). This is the workhorse for table data and form labels.
- **Labels:** Use `label-md` for table headers and section overviews; the slight tracking (letter-spacing) and uppercase treatment differentiate metadata from actionable data.
- **Numeric Data:** For KPI cards, use `display-lg` with a Bold weight (700) to ensure high-speed scanning of metrics.

## Layout & Spacing

The design system employs a **12-column fluid grid** with fixed margins. The spacing rhythm is based on a **4px baseline grid**, with `16px (md)` being the default padding for cards and containers.

- **Desktop:** 24px outer margins with 16px gutters. Sidebars are fixed at 256px.
- **Tablet:** 16px outer margins. Sidebars collapse to icons-only (64px).
- **Mobile:** 12px outer margins. Grids reflow to a single column. 

Layouts should prioritize a "Top-Down" hierarchy: Global Navigation (Top) -> Contextual Navigation (Breadcrumbs) -> Page Header -> Content Area.

## Elevation & Depth

Depth is communicated through **Tonal Layers** supplemented by **Ambient Shadows**. This design system avoids heavy shadows to maintain a clean, flat appearance suitable for enterprise software.

- **Level 0 (Canvas):** `#F4F7FA` - The lowest layer.
- **Level 1 (Surface):** `#FFFFFF` - Primary cards and content areas. Use a subtle 1px border (`#E1E4E8`) and no shadow.
- **Level 2 (Raised):** Used for hover states on interactive cards. Apply a soft shadow: `0px 4px 12px rgba(0, 0, 0, 0.05)`.
- **Level 3 (Overlay):** Used for modals and dropdowns. Use a more pronounced shadow: `0px 8px 24px rgba(0, 0, 0, 0.12)` and a 1px border.

Background blurs are not used; clarity and contrast are prioritized over translucency.

## Shapes

The shape language is modern and approachable, utilizing a consistent **12px (0.75rem)** radius for major components.

- **Cards & Modals:** 12px (`rounded-xl` in this context) to create a soft, professional container.
- **Buttons & Inputs:** 8px (`rounded-lg`) to balance the larger radius of the containers.
- **Badges/Chips:** Full pill-shape for status indicators to distinguish them from actionable buttons.
- **Data Table Rows:** 0px radius (sharp) to maintain a rigid, grid-like structure for scanning, but the containing table card remains 12px.

## Components

### KPI Cards
Standardized containers for high-level metrics. They must include a `title-lg` value, a `label-sm` category name, and a small trend indicator (percentage + icon) using semantic colors.

### Data Tables
The core of the ERP experience.
- **Header:** `label-md` text with a subtle grey background (`#F8F9FA`).
- **Rows:** 48px height for standard density; 40px for compact.
- **Selection:** Use a 2px primary blue left-border highlight for selected rows.

### Buttons
- **Primary:** Solid `#1A73E8` with white text. 
- **Secondary:** White background with `#1A73E8` border and text.
- **Ghost:** No border or background until hover; used for tertiary actions in tables.

### Status Badges
Small, pill-shaped indicators. Use a 10% opacity background of the semantic color with 100% opacity text of the same color (e.g., Success: Background `#EAF6ED`, Text `#34A853`).

### Search Inputs
Large, prominent inputs in page headers. Include a leading search icon (20px) and a subtle placeholder text. Focus state must show a 2px primary blue ring with 4px offset.

### Breadcrumbs
Located above the page title. Use `body-sm` grey text with a simple `/` or `>` separator. The current page should be bold and non-linked.