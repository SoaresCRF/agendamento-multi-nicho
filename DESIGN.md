---
version: alpha
name: agendamento-multi-nicho-design
description: >
  A scheduling-product design system combining Cal.com's booking-flow structure
  (calendar, time slots, service cards, booking forms, nav) with Notion's warm,
  paper-calm palette (soft off-white canvas, humanist type, restrained single
  accent color, decorative-only pastel tags). Built for a multi-niche booking
  SaaS (psychologists, personal trainers, hairdressers) where the end client is
  often a person seeking personal or therapeutic care — the interface should
  read as trustworthy and human, never as a cold technical tool or a hard sell.

colors:
  primary: "#0075de"          # source: notion.primary — CTAs, links, selected states
  primary-active: "#005bab"   # source: notion.primary-active — pressed state
  primary-soft: "#e6f2fb"     # derived: ~12% tint of primary over canvas — selected-slot fill, info banners
  primary-disabled: "#e5e7eb" # source: cal.primary-disabled — notion has no disabled token
  secondary-dark: "#213183"   # source: notion.secondary — the one deliberate dark accent moment
  on-primary: "#ffffff"
  on-secondary-dark: "#ffffff"
  ink: "#000000"              # source: notion.ink — render at ~92% opacity on canvas (Notion's own soft-black convention)
  body: "#31302e"             # source: notion.ink-secondary
  muted: "#615d59"            # source: notion.ink-muted
  muted-soft: "#a39e98"       # source: notion.ink-faint
  canvas: "#f6f5f4"           # source: notion.canvas-soft — DEFAULT page background (see Conflict Resolutions)
  surface: "#ffffff"          # both systems agree — cards, inputs, nav bars
  surface-soft: "#f8f9fa"     # source: cal.surface-soft — nested zones (e.g. calendar month-nav strip)
  surface-strong: "#e5e7eb"   # source: cal.surface-strong — disabled fills, strong dividers
  hairline: "#e6e6e6"         # source: notion.hairline
  hairline-soft: "#f3f4f6"    # source: cal.hairline-soft
  success: "#10b981"          # source: cal.success — kept, neither system redefines
  warning: "#f59e0b"          # source: cal.warning — kept
  error: "#e35d52"            # derived: cal.error (#ef4444) desaturated/warmed — see Conflict Resolutions
  accent-teal: "#2a9d99"      # source: notion.accent-teal — calm/available indicators, niche badges
  accent-terracotta: "#dd5b00" # source: notion.accent-orange — decorative niche badges only, never CTAs
  accent-lilac: "#d6b6f6"     # source: notion.accent-purple — decorative niche badges only

typography:
  display-lg:
    fontFamily: "Lora, Georgia, serif"
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: 0
  display-md:
    fontFamily: "Lora, Georgia, serif"
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0
  display-sm:
    fontFamily: "Lora, Georgia, serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0
  title-lg:
    fontFamily: "Inter, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.2px
  title-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontFamily: "Inter, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  button:
    fontFamily: "Inter, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0
  nav-link:
    fontFamily: "Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "12px 22px"
    height: "44px"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.muted}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    border: "1px solid {colors.hairline}"
  button-text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
  slot-button-available:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.hairline}"
  slot-button-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  slot-button-unavailable:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.muted-soft}"
    rounded: "{rounded.md}"
  calendar-day-cell:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  calendar-day-cell-available:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
  calendar-day-cell-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
  calendar-day-cell-disabled:
    backgroundColor: transparent
    textColor: "{colors.muted-soft}"
    rounded: "{rounded.full}"
  service-type-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: "20px"
    border: "1px solid {colors.hairline}"
  service-type-card-selected:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.primary}"
  text-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    height: "44px"
    border: "1px solid {colors.hairline}"
  text-input-focused:
    border: "1px solid {colors.primary}"
  text-input-error:
    border: "1px solid {colors.error}"
  nav-bar-public:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: "64px"
  app-shell-sidebar-row:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
  app-shell-sidebar-row-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary}"
    activeIndicator: "{colors.primary}"
  data-table-cell:
    headerBackground: "{colors.surface-soft}"
    headerTypography: "{typography.caption}"
    bodyTypography: "{typography.body-sm}"
    cellPadding: "12px 16px"
    rowBorder: "{colors.hairline}"
  badge-pill:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.body}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  badge-status-confirmed:
    backgroundColor: "#e3f6ef"
    textColor: "{colors.success}"
    rounded: "{rounded.pill}"
  badge-status-cancelled:
    backgroundColor: "#fbeae8"
    textColor: "{colors.error}"
    rounded: "{rounded.pill}"
  auth-form-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
  modal-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  empty-state-card:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xxl}"
    captionTypography: "{typography.body-md}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
    typography: "{typography.body-sm}"
  hero-band-public:
    backgroundColor: "{colors.secondary-dark}"
    textColor: "{colors.on-secondary-dark}"
    typography: "{typography.display-lg}"
    padding: "{spacing.section}"
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
    typography: "{typography.body-sm}"
    padding: "{spacing.xl}"
---

## Overview

This is a booking product for people who are often coming to the page in a vulnerable moment — booking a first therapy session, not comparing SaaS pricing tiers. The visual language borrows Cal.com's booking-app skeleton (calendar grid, time-slot list, service-type selection, dynamic forms, clear button states) because it is the right shape for the same category of product. But Cal.com's own voice — pure white canvas, near-black CTAs, a geometric display face — reads efficient and developer-facing, not warm. So the surface, type, and color decisions are pulled from Notion instead: a warm off-white paper canvas (`{colors.canvas}` — #f6f5f4, never clinical pure white), soft near-black ink rendered at reduced opacity, one restrained structural blue (`{colors.primary}` — #0075de) that carries every action, and a small decorative pastel set reserved strictly for niche/category tags — never for buttons.

The one addition neither source system has: a serif display face (**Lora**) for headings only. Cal Sans reads technical, and Notion's heavily-tracked Inter reads confident-but-corporate at display size. A quiet serif on `h1`/`h2` is what tips the balance toward "a person made this for people," which is the brief.

**Key characteristics:**
- Warm paper canvas (`{colors.canvas}`) as the page default — cards and inputs sit on pure white (`{colors.surface}`) above it for gentle contrast, never the reverse.
- Serif (`Lora`) display headings, Inter for everything functional — body, buttons, nav, form labels.
- One structural accent (`{colors.primary}` — #0075de) for every clickable/selected state. No second competing accent.
- A three-color decorative badge set (teal, terracotta, lilac) exists only to tell niches/categories apart (e.g. "Psicologia" vs "Personal Trainer") — it never paints a button or a selected state.
- Cal.com's booking-app skeleton — calendar, slot grid, service-type cards, dynamic form, clear available/selected/unavailable states — carried over structurally, restyled.
- Soft, many-layered shadows (Notion's elevation model) instead of Cal's flatter two-stop shadow — nothing on this interface should look hard-edged.
- Fully-pill CTAs (`{rounded.pill}`) against a friendlier `{rounded.md}` (8px, not Notion's 4px) on form inputs — see Conflict Resolutions.

## Colors

### Brand & Accent
- **Primary** (`{colors.primary}` — #0075de): the only structural color. Primary CTA fill, selected time slot, selected calendar day, active nav item, links, focus rings.
- **Primary Active** (`{colors.primary-active}` — #005bab): press state.
- **Primary Soft** (`{colors.primary-soft}` — #e6f2fb): a light tint of primary, used as a fill — the selected service-type card, the "available" wash on calendar days, info banners. Never used for text on its own; always paired with `{colors.primary}` or `{colors.ink}` text.
- **Secondary Dark** (`{colors.secondary-dark}` — #213183): the single deliberate dark moment in the whole system, reserved for the public booking page's top hero band (professional's name, niche, "book now" CTA). Not used anywhere else — no dark footer, no dark cards. See Conflict Resolutions.

### Surface
- **Canvas** (`{colors.canvas}` — #f6f5f4): default page background, every screen.
- **Surface** (`{colors.surface}` — #ffffff): cards, inputs, the nav bar, the sidebar — anything that should read as "raised" above the canvas.
- **Surface Soft** (`{colors.surface-soft}` — #f8f9fa): nested zones inside a surface — the calendar's month-nav strip, table header row.
- **Surface Strong** (`{colors.surface-strong}` — #e5e7eb): disabled button fill, unavailable time-slot fill, strong dividers.
- **Hairline** (`{colors.hairline}` — #e6e6e6) / **Hairline Soft** (`{colors.hairline-soft}` — #f3f4f6): card and input borders, section dividers.

### Text
- **Ink** (`{colors.ink}` — #000000, rendered ~92% opacity): headings, primary text.
- **Body** (`{colors.body}` — #31302e): running text, form labels, table body.
- **Muted** (`{colors.muted}` — #615d59): secondary text, helper copy under inputs.
- **Muted Soft** (`{colors.muted-soft}` — #a39e98): captions, timestamps, disabled/unavailable slot labels.
- **On Primary** / **On Secondary Dark** (`#ffffff`): text on the primary button and the hero band.

### Semantic
- **Success** (`{colors.success}` — #10b981): booking confirmed.
- **Warning** (`{colors.warning}` — #f59e0b): "only 2 slots left today"-type callouts.
- **Error** (`{colors.error}` — #e35d52): form validation, cancelled-booking state. Deliberately desaturated from a pure alert red — see Conflict Resolutions.

### Category Accents (multi-niche badges — decorative only)
- **Teal** (`{colors.accent-teal}` — #2a9d99), **Terracotta** (`{colors.accent-terracotta}` — #dd5b00), **Lilac** (`{colors.accent-lilac}` — #d6b6f6): a small rotating set used purely to color-code niches on badges (e.g. a "Psicologia" tag vs. a "Estética" tag) so a professional running multiple service types can scan their dashboard fast. Never apply these to a button, a selected state, or any structural element — that's what `{colors.primary}` is for.

## Typography

### Font Family
**Lora** (serif) carries every display heading — `display-lg`/`md`/`sm`. **Inter** carries everything else: body copy, buttons, nav, form labels, table cells. **JetBrains Mono** is kept from Cal.com for the one place monospace earns its keep — the professional's booking-link slug (`/joana-psicologa`) in the dashboard.

The split is functional and strict: never set a heading in Inter, never set body copy or a button label in Lora.

### Hierarchy

| Token | Size | Weight | Line Height | Use |
|---|---|---|---|---|
| `{typography.display-lg}` | 40px | 600 | 1.15 | Public page hero ("Agende com Joana") |
| `{typography.display-md}` | 30px | 600 | 1.2 | Section heads — "Escolha um horário" |
| `{typography.display-sm}` | 24px | 600 | 1.25 | Card-group titles, modal titles |
| `{typography.title-lg}` | 20px | 600 | 1.3 | Service-type card title |
| `{typography.title-md}` | 18px | 600 | 1.4 | Dashboard section titles |
| `{typography.title-sm}` | 16px | 600 | 1.4 | Table column emphasis, list item titles |
| `{typography.body-md}` | 16px | 400 | 1.6 | Default running text, form labels |
| `{typography.body-sm}` | 14px | 400 | 1.5 | Table cells, helper text |
| `{typography.caption}` | 13px | 500 | 1.4 | Badges, timestamps |
| `{typography.button}` | 15px | 600 | 1.0 | Button labels |
| `{typography.nav-link}` | 14px | 500 | 1.4 | Nav / sidebar items |
| `{typography.code}` | 14px | 400 | 1.5 | Booking-link slug display |

Note: there is no `display-xl`. Cal.com's 64px marketing hero size was dropped — this is a product, not a landing page selling itself, and a giant headline on a booking flow reads as a sales pitch to someone trying to book an appointment. 40px is the ceiling.

### Principles
Lora headings stay at weight 600 only — never bolder, never italic for emphasis (use `{colors.primary}` or size instead). Body line-height is a generous 1.6 (up from both sources' 1.5) — extra breathing room reads calmer and is easier to scan for someone filling out a form under stress.

## Layout

### Spacing System
- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 80px.
- Card padding: `{spacing.lg}` (24px) standard, `{spacing.xl}` (32px) for auth/onboarding cards.
- `{spacing.section}` (80px, trimmed from Cal's 96px) separates bands on the public booking page only — the dashboard never uses it; dashboards are dense, not editorial.

### Grid & Container
- **Public booking page:** centered column, max-width ~720px for the booking flow itself (service selection → slots → form) — narrower than a marketing page on purpose, so the flow feels like a guided conversation, not a browse-everything catalog.
- **Professional panel (painel do profissional):** app shell — fixed sidebar (`{component.app-shell-sidebar-row}`) at left, content area with `{spacing.lg}` gutters, data tables and cards flow in a single column or 2-up grid depending on screen (service types list, availability rules, upcoming bookings).

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | Hairline border only | Default cards, sidebar, table rows |
| Soft | Layered near-transparent shadow (Notion's multi-stop model) | Service-type cards, floating buttons, focused inputs |
| Elevated | Deeper layered stack | Modals, the hero band's booking-summary card |

Adopted wholesale from Notion rather than Cal.com's flatter two-stop shadow — see Conflict Resolutions.

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Small tags |
| `{rounded.sm}` | 6px | Sidebar rows, dropdown items |
| `{rounded.md}` | 8px | Text inputs, time-slot buttons, utility buttons |
| `{rounded.lg}` | 12px | Cards — service-type, dashboard, data cards |
| `{rounded.xl}` | 16px | Modals, auth cards, empty-state frames |
| `{rounded.pill}` | 9999px | Primary/secondary CTAs, badges |
| `{rounded.full}` | 9999px | Avatars, calendar day cells |

## Components

### Navigation
**`nav-bar-public`** — Top bar on the public booking page. White surface, 64px, professional's name/avatar at left, nothing else — no marketing menu. Keeps focus on the booking task.

**`app-shell-sidebar-row`** / **`app-shell-sidebar-row-active`** — Professional-panel sidebar item (Tipos de Serviço, Disponibilidade, Agenda, Bloqueios). Active row gets `{colors.primary-soft}` fill and a `{colors.primary}` text + left indicator — never a filled solid-primary row, which would be too loud for a persistent sidebar.

### Buttons
**`button-primary`** — Pill-shaped, `{colors.primary}` fill. Used for "Confirmar agendamento," "Salvar," "Adicionar tipo de serviço." Height 44px (up from Cal's 40px) — a slightly larger tap target reads more careful/considerate, appropriate for a form a client fills out once, carefully.

**`button-secondary`** — White pill, hairline border. Used for "Cancelar," "Voltar."

**`button-text-link`** — Inline, `{colors.primary}` text, no background. Used for "Editar," "Ver detalhes" inside tables/cards.

### Calendar & Time-Slot Picker
This is the structural core carried from Cal.com's `hero-app-mockup-card` pattern, restyled.

**`calendar-day-cell`** states:
- **Default** — transparent, `{colors.ink}` text: a day with no availability shown yet.
- **Available** (`calendar-day-cell-available`) — `{colors.primary-soft}` fill, `{colors.primary}` text: a day that has open slots for the selected service type.
- **Selected** (`calendar-day-cell-selected`) — solid `{colors.primary}` fill, white text: the day the client is currently viewing slots for.
- **Disabled** (`calendar-day-cell-disabled`) — transparent, `{colors.muted-soft}` text, not clickable: past days, days fully booked, days outside the professional's availability.

**`slot-button`** states — the actual bookable time (e.g. "14:00"), rendered as a wrapped grid below the calendar:
- **Available** (`slot-button-available`) — white surface, hairline border, `{colors.ink}` text. Default, clickable.
- **Selected** (`slot-button-selected`) — solid `{colors.primary}` fill, white text. The one slot the client has chosen; only one can be selected at a time.
- **Unavailable** (`slot-button-unavailable`) — `{colors.surface-strong}` fill, `{colors.muted-soft}` text, not clickable, no hover/press styling. Represents a slot already booked or blocked.

Slot grids regenerate per service type (different durations produce different grids on the same day) — this is a functional requirement, not a styling one, but the component must render cleanly for a variable number of slots per day (wrap, don't scroll horizontally).

### Service-Type Card
**`service-type-card`** — What a client picks first on the public page, and what a professional manages (CRUD) in the panel. White surface, hairline border, `{rounded.lg}`, `{spacing.lg}` padding. Shows: name (`title-lg`), duration badge, short description, and — only if `requiresCustomForm` is true — a small "formulário" icon + label so the client knows a longer flow is coming before they click.

**`service-type-card-selected`** — `{colors.primary-soft}` fill with a `{colors.primary}` border once chosen, on the public page's selection step.

### Booking Form (dynamic)
**`text-input`** / **`text-input-focused`** / **`text-input-error`** — `{rounded.md}` (8px — see Conflict Resolutions), white surface, hairline border by default, `{colors.primary}` border on focus, `{colors.error}` border + inline message on validation failure. Renders whatever `CustomFormField` rows exist for the selected service type (text, number, select, textarea) — same input chrome regardless of field type, so a dynamically-generated anamnesis form for a psychologist looks identical in quality to the hardcoded name/email fields.

**`auth-form-card`** — Login/cadastro card for the professional panel. `{rounded.xl}`, `{spacing.xl}` padding, contains stacked `text-input`s + `button-primary`.

### Data & Status
**`data-table-cell`** — Bookings list, service-types list. Soft header (`{colors.surface-soft}` background, `caption` typography), `body-sm` rows, hairline row dividers.

**`badge-pill`** — Neutral default badge (duration, e.g. "60 min").
**`badge-status-confirmed`** / **`badge-status-cancelled`** — Booking status in the agenda view. Soft tinted background (`#e3f6ef` / `#fbeae8`), never a solid saturated fill — status should be scannable, not shouting.

### Feedback
**`toast`** — Dark `{colors.ink}` fill, white text, `{rounded.lg}`. "Agendamento confirmado," "Alterações salvas."

**`modal-card`** — Cancel-booking confirmation, delete-service-type confirmation. `{rounded.xl}`, elevated shadow.

**`empty-state-card`** — "Nenhum agendamento ainda," "Nenhum tipo de serviço cadastrado." Warm canvas fill (not white — it's a background state, not a raised one), generous `{spacing.xxl}` padding, `body-md` caption + a `button-primary` CTA to create the first item.

### Public Page Hero
**`hero-band-public`** — The one dark moment: `{colors.secondary-dark}` full-width band at the top of `/{slug}`, carrying the professional's name/photo (`display-lg`, Lora, white) and niche badge. Everything below returns to the warm canvas.

**`footer`** — Light, `{colors.canvas}` background, `{colors.muted}` text, minimal (privacy link, "powered by" line). No dark footer — see Conflict Resolutions.

## Do's and Don'ts

### Do
- Keep `{colors.canvas}` (#f6f5f4) as the page background everywhere; reserve pure white for surfaces that sit above it.
- Reserve `{colors.primary}` for actions and selection states only — one accent, always the same one.
- Use the category accents (teal/terracotta/lilac) only on badges/tags, never on buttons or fills.
- Keep slot and calendar states visually distinct at a glance without relying on color alone — pair `slot-button-unavailable` with reduced contrast text *and* the removal of a border/shadow, so it doesn't read as clickable even to a colorblind user (see [§25 Accessibility]).
- Give forms room — 1.6 line-height, 44px input height, one field's error message directly beneath it.

### Don't
- Don't introduce a second structural accent color alongside `{colors.primary}`.
- Don't use `{colors.secondary-dark}` anywhere but the public-page hero band. No dark footer, no dark sidebar, no dark cards.
- Don't render the display face (Lora) below 24px or in a button/label — it's for headings only.
- Don't use a saturated pure red for errors on this product — the audience includes people in a vulnerable moment; `{colors.error}` is deliberately calmer.
- Don't let `service-type-card` visually compete with `slot-button` — cards are for choosing a service (step 1), slots are for choosing a time (step 2); keep the slot grid visually simpler (no border-radius-lg, no drop shadow) so the hierarchy between the two steps stays obvious.

## Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 640px | Single column everywhere; calendar shows one week at a time; slot grid is 2-up; sidebar collapses to a bottom or hamburger nav |
| Tablet | 640–1024px | Calendar shows full month; slot grid 3–4-up; sidebar becomes a collapsible rail |
| Desktop | > 1024px | Full sidebar always visible; booking flow stays centered at max-width ~720px (doesn't stretch full-width — see Layout) |

### Touch Targets
- `slot-button` and `calendar-day-cell` minimum 44×44px — these are tapped repeatedly by clients on mobile booking; undersized targets here directly cause booking errors.
- `button-primary` height 44px minimum, full-width on mobile for the final "Confirmar agendamento" action.

### Collapsing Strategy
- Public page: calendar + slot grid stack vertically on mobile (never side-by-side below tablet); service-type cards go 1-up.
- Professional panel: sidebar collapses to a hamburger/bottom-tab pattern below 640px; data tables switch to a stacked card-per-row layout rather than horizontal scroll, since horizontal-scrolling tables are a common accessibility failure on mobile.

## Conflict Resolutions

Brief log of the calls made whenever Cal.com and Notion (or the underlying goal) disagreed, per the tie-break rule: favor whichever reads more legible and less "corporate"/aggressive for an audience that includes people seeking therapy or personal care.

1. **Page background:** Notion's warm `canvas-soft` (#f6f5f4) wins over Cal's pure white — Notion's own doc explicitly warns against clinical white for full pages.
2. **Dark surface:** kept only Notion's single "night" hero-band idea; dropped Cal's dark footer entirely. A booking flow ending on a stark near-black footer felt like the wrong last note for this audience.
3. **Input border radius:** kept Cal's 8px (`{rounded.md}`) over Notion's tight 4px. Notion's contrast (pill CTAs vs. sharp-cornered inputs) works for a workspace tool; on a personal-data form it read closer to a bureaucratic document than intended.
4. **Error color:** desaturated Cal's alert red (#ef4444 → #e35d52). Neither source defines this choice; it's a deliberate softening given the audience.
5. **Display type scale:** dropped Cal's 64px marketing-hero size; capped at 40px. This is a product surface, not a page selling itself.
6. **Elevation model:** adopted Notion's soft layered shadows over Cal's flatter two-stop shadow — reads gentler.
7. **Line-height on body text:** bumped to 1.6 from both sources' 1.5 — small, deliberate legibility margin for anyone filling out a form under stress.

## Status

No screens exist in this project yet — `design-reference/` and this file are the first artifacts; the professional panel and public booking page described in `prompt-claude-code-agendamento.md` have not been implemented. Once that implementation starts, this file is the source of truth for color, type, and component styling, per that prompt's own instruction.
