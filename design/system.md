# Abasto / Abarroteros design system

Captured from project source by design sync (2026-11-08); re-synced 2026-11-13 (store components, mobile app). Values are copied, never invented. Nothing here is a proposed starter: every entry exists in the repository.

Surfaces recorded:

- **Staff console** (this system): `abasto-web/src/styles.css`, `abasto-web/src/components/ui/*`, `abasto-web/src/components/layout/*`, report and executive components. All artboards for the console follow it.
- **Store surface** (customer store): `abasto-web/src/modules/store/styles/store.css`. Same palette family with its own `--color-st-*` aliases and `--font-st-sans`. Recorded separately below; do not mix its tokens into console artboards.
- **Mobile app**: `abasto-mobile/src/global.css` and `abasto-mobile/tailwind.config.js`. Separate app with its own palette and fonts. Recorded separately below; do not mix its tokens into console artboards.

Brand: raspberry primary on cream, plum secondary, dark plum sidebar. Light theme only (no `.dark` tokens defined in `styles.css`).

## Colors: console semantic (shadcn) — source `abasto-web/src/styles.css` `:root`

| Token | Value | Usage |
| --- | --- | --- |
| `--background` | `#fff8f0` | Page background (cream) |
| `--foreground` | `#1a1a1a` | Default text |
| `--card` | `#ffffff` | Card and panel surface |
| `--card-foreground` | `#1a1a1a` | Text on cards |
| `--popover` | `#ffffff` | Popover surface |
| `--popover-foreground` | `#1a1a1a` | Popover text |
| `--primary` | `#c81d4e` | Primary actions, active nav, key highlight (raspberry) |
| `--primary-foreground` | `#ffffff` | Text on primary |
| `--secondary` | `#f1eaf6` | Secondary surface (plum tint) |
| `--secondary-foreground` | `#5b2a86` | Text on secondary (plum) |
| `--muted` | `#f6efe6` | Muted surface, hover |
| `--muted-foreground` | `#74686a` | Secondary text |
| `--accent` | `#f8e8ee` | Raspberry tint surface |
| `--accent-foreground` | `#8e1438` | Text on accent |
| `--destructive` | `#b3261e` | Destructive, negative values |
| `--border` | `#ede3d6` | Default border |
| `--input` | `#e4d8ca` | Input border |
| `--ring` | `#5b2a86` | Focus ring (plum) |
| `--sidebar` | `#2a1c36` | Sidebar background |
| `--sidebar-foreground` | `#efe8f4` | Sidebar text |
| `--sidebar-primary` | `#c81d4e` | Sidebar primary |
| `--sidebar-primary-foreground` | `#ffffff` | Text on sidebar primary |
| `--sidebar-accent` | `#3a2849` | Sidebar accent surface |
| `--sidebar-accent-foreground` | `#ffffff` | Text on sidebar accent |
| `--sidebar-border` | `#3d2c4c` | Sidebar border |
| `--sidebar-ring` | `#f08aa6` | Sidebar focus ring |

## Colors: console design tokens — source `abasto-web/src/styles.css` `@theme`

| Token | Value | Usage |
| --- | --- | --- |
| `--color-focus` | `#5b2a86` | Focus outline on links and buttons (3px, offset 3px) |
| `--color-ink-heading` | `#4a2670` | Heading ink (plum) |
| `--color-ink-link` | `#a3173f` | Text links, inline actions |
| `--color-ink-row` | `#3d3438` | Table row text |
| `--color-ink-figure` | `#2a1d33` | Big figures, strong text |
| `--color-ink-muted` | `#7a6f72` | Descriptions, helper text |
| `--color-ink-subtle` | `#887c7f` | Subtle text |
| `--color-ink-faint` | `#938789` | Faint text |
| `--color-ink-eyebrow` | `#85797c` | Eyebrow labels |
| `--color-ink-footnote` | `#8f8386` | Footnotes |
| `--color-brand-hover` | `#a8173f` | Primary hover |
| `--color-brand-ink` | `#ffffff` | Text on brand |
| `--color-panel-border` | `#efe5d8` | Panel border |
| `--color-row-border` | `#f5ede3` | Row divider |
| `--color-metric-label` | `#85797c` | Metric labels |
| `--color-topbar-border` | `#eee4d7` | Topbar bottom border |
| `--color-crumb` | `#94888a` | Breadcrumb |
| `--color-crumb-strong` | `#3d3438` | Current breadcrumb |
| `--color-pill` | `#85797c` | Pill text |
| `--color-pill-bg` | `#fffcf8` | Pill background |
| `--color-pill-border` | `#eadfd1` | Pill border |
| `--color-avatar` | `#5b2a86` | Avatar text |
| `--color-avatar-bg` | `#ede3f5` | Avatar background |
| `--color-footer` | `#a89c9e` | Footer text |
| `--color-footer-border` | `#efe6da` | Footer border |
| `--color-sidebar-surface` | `#33233f` | Sidebar business card |
| `--color-sidebar-surface-border` | `#45334f` | Sidebar card border |
| `--color-sidebar-callout` | `#31213d` | Sidebar callout |
| `--color-sidebar-callout-border` | `#44324f` | Sidebar callout border |
| `--color-sidebar-hover` | `#382745` | Sidebar item hover |
| `--color-sidebar-divider` | `#3b2a49` | Sidebar divider |
| `--color-sidebar-text` | `#cbbfd6` | Sidebar item text |
| `--color-sidebar-label` | `#9886a8` | Sidebar labels |
| `--color-sidebar-caption` | `#a595b3` | Sidebar captions |
| `--color-sidebar-muted` | `#b3a5c0` | Sidebar muted text |
| `--color-sidebar-strong` | `#faf5fd` | Sidebar strong text |
| `--color-sidebar-tag` | `#f4a3b9` | Sidebar tag |
| `--color-sidebar-active` | `#ffffff` | Active nav item text |
| `--color-status-green` | `#39816e` | Status ok |
| `--color-status-green-bg` | `#e9f4ef` | Status ok surface |
| `--color-status-amber` | `#a77a24` | Status warning |
| `--color-status-amber-bg` | `#fff0d1` | Status warning surface |
| `--color-status-red` | `#bd5754` | Status error |
| `--color-status-red-bg` | `#fbeae7` | Status error surface |
| `--color-status-blue` | `#557caa` | Status info |
| `--color-status-blue-bg` | `#e9f0fa` | Status info surface |
| `--color-status-gray` | `#85909e` | Status neutral |
| `--color-status-gray-bg` | `#e9edf2` | Status neutral surface |
| `--color-saved` | `#3b9270` | Saved confirmation |

## Colors: component literals (recurring hex in components, not tokens)

Found as literal values in component classes. Use only when no token covers the role.

| Value | Usage | Source |
| --- | --- | --- |
| `#f0e9e1` | Metric strip and period panel border | `modules/reports/components/metric-strip.tsx`, `modules/executive/components/period-filters.tsx` |
| `#e5e9e2` | Metric cell divider | `metric-strip.tsx` |
| `#90757e` | Metric label | `metric-strip.tsx` |
| `#a38a92` | Metric note | `metric-strip.tsx` |
| `#f7f1ea` | Pill tabs group background | `modules/reports/components/pill-tabs.tsx` |
| `#866a73` | Pill tab text | `pill-tabs.tsx` |
| `#3f1266` | Active period preset (deep plum) | `period-filters.tsx` |
| `#fbf9f6` | Period group background | `period-filters.tsx` |
| `#e6dfeb` | Period group border, empty state dashed border | `period-filters.tsx`, `report-empty.tsx` |
| `#846d75` | Period preset text | `period-filters.tsx` |
| `#5d387e` | Date range text | `period-filters.tsx` |
| `#1d7a4b` | Delta up | `modules/executive/components/delta-text.tsx` |
| `#b3261e` | Delta down (same as destructive) | `delta-text.tsx` |
| `#958389` | Delta flat, cell notes | `delta-text.tsx`, `report-table.tsx` |
| `#fcfaf8` | Table header background | `report-table.tsx` |
| `#947f86` | Table header text | `report-table.tsx` |
| `#f5f1ed` | Table cell divider | `report-table.tsx` |
| `#f0eae3` | Bordered table frame | `report-table.tsx` |
| `#fefdfb` | Table row hover | `report-table.tsx` |
| `#9c898f` | Section description | `modules/reports/components/section-row.tsx` |
| `#e8e1e3` | Secondary button border | `report-buttons.tsx` |
| `#503f45` | Secondary button text | `report-buttons.tsx` |
| `#faf6f1` | Secondary button hover | `report-buttons.tsx` |
| `#826c73` | Icon button text | `report-buttons.tsx` |
| `#f6f0e9` | Icon button hover | `report-buttons.tsx` |
| `#a08f95` | Topbar role text | `components/layout/app-topbar.tsx` |

## Typography — source `abasto-web/src/styles.css`

One family, no webfont import: `--font-sans: Inter, 'Segoe UI', Arial, sans-serif`. Body 16px, antialiased. Line-height 1.5 on `text-xs` through `text-2xl`.

| Role | Size / weight / tracking | Source |
| --- | --- | --- |
| Page title (h1) | 31px (34px at `wide`) / 700 / -1.2px, line-height 1.3 | `components/page-heading.tsx` |
| Page description | 13px (14px at md) / 400 / `ink-muted` | `page-heading.tsx` |
| Section title (h2) | 20px / 650 / -0.4px | `modules/reports/components/section-row.tsx` |
| Section description | 12px / `#9c898f` | `section-row.tsx` |
| Metric value | 20px (23px at `metrics`) / 700 / -0.7px / `ink-figure` | `metric-strip.tsx` |
| Metric label | 11px | `metric-strip.tsx` |
| Metric note | 10px / 1.6 | `metric-strip.tsx` |
| Table header | 11px / 600 / 0.35px | `report-table.tsx` |
| Table cell | 13px | `report-table.tsx` |
| Cell note | 11px | `report-table.tsx` |
| Button | 14px / 650 | `report-buttons.tsx` |
| Pill / preset | 12-13px / 650 active | `pill-tabs.tsx`, `period-filters.tsx` |
| Sidebar item | 14px (13px secondary) / 700 active | `components/layout/sidebar-nav-item.tsx` |
| Brand mark | 22px / 750 / -1.1px | `components/layout/app-sidebar.tsx` |
| Topbar | 12px, name 650, avatar 750 | `components/layout/app-topbar.tsx` |

Weights used: 400, 550, 600, 650, 700, 750.

## Spacing

No spacing tokens. Tailwind's default 4px scale plus literal pixel values in components. Recurring: 7, 9, 13, 15, 18, 22, 23, 26 px.

| Role | Value | Source |
| --- | --- | --- |
| Topbar height | 77px (66px under md) | `app-topbar.tsx` |
| Sidebar width | 15.125rem (242px) | `components/layout/app-shell.tsx` |
| Content max width | 1640px | `app-shell.tsx` |
| Content padding | 26px (md), 38px (wide) horizontal; 29px / 36px top | `app-shell.tsx` |
| Page heading margin bottom | 22px (28px at md) | `page-heading.tsx` |
| Metric cell padding | 22px 16px | `metric-strip.tsx` |
| Period panel padding | 20px 23px | `period-filters.tsx` |
| Section top margin | 26px | `table-section.tsx` |
| Section row margin bottom | 23px | `section-row.tsx` |
| Table cell padding | 16px 14px | `report-table.tsx` |

Breakpoints (`@theme`): phone 381px, panels 1001px, tablet 1121px, metrics 1251px, wide 1351px.

## Radius — source `abasto-web/src/styles.css`

| Token | Value |
| --- | --- |
| `--radius` | `0.7rem` (11.2px) |
| `--radius-sm` | `calc(var(--radius) - 4px)` (7.2px) |
| `--radius-md` | `calc(var(--radius) - 2px)` (9.2px) |
| `--radius-lg` | `var(--radius)` (11.2px) |
| `--radius-xl` | `calc(var(--radius) + 4px)` (15.2px) |

Literals in use: 12px (`rounded-xl`, metric strip, table frame), 13px (period panel), 14px (empty state), 10px (pill group, business card), 9px (action button), 8px (period group, nav item), 7px (pill tab, icon button), 5px (preset), full (avatar).

## Shadows

Almost flat: borders carry the structure. Source literals:

| Value | Usage | Source |
| --- | --- | --- |
| `0 1px 5px #40166512` | Active pill tab | `pill-tabs.tsx` |
| `0 2px 3px #c81d4e0a` | Primary button | `report-buttons.tsx` |
| `0 3px 9px #c81d4e1c` | Primary button hover | `report-buttons.tsx` |
| `0 0 0 1px #e7e1e3` | Avatar ring | `app-topbar.tsx` |

## Component rules

- **App shell**: dark plum sidebar (242px) with brand mark "abarroteros." and a business card, white topbar (77px) with breadcrumb `Abasto › Page`, user name, role, avatar and sign out; cream content area, max 1640px. Nav items: 8px radius, 14px, active = raspberry background, white bold text. Source `components/layout/*`.
- **Page heading**: h1 31/34px bold with description below and actions at the right. Source `components/page-heading.tsx`.
- **Period filter**: white panel, radius 13px, border `#f0e9e1`. Segmented group (Hoy, 7 días, 30 días, Personalizado), active preset deep plum `#3f1266` with white text; date range on the right with calendar icon and "Ciudad de México". Source `executive/components/period-filters.tsx`.
- **Metric strip**: one white card, radius 12px, border `#f0e9e1`, 3 or 4 cells separated by a vertical divider; label 11px, value 20-23px bold, note 10px. Source `reports/components/metric-strip.tsx`.
- **Pill tabs**: group `#f7f1ea`, radius 10px; active tab white, 650, soft plum shadow. Source `pill-tabs.tsx`.
- **Section row**: h2 20px/650 + 12px description left, action control right. Source `section-row.tsx`.
- **Table**: white bordered frame radius 12px; header `#fcfaf8` 11px uppercase-free semibold; cells 13px with top border `#f5f1ed`; numbers right aligned; row hover `#fefdfb`. Source `report-table.tsx`.
- **Delta text**: green `#1d7a4b` with ▲, red `#b3261e` with ▼, flat `#958389`. Source `executive/components/delta-text.tsx`.
- **Buttons**: primary raspberry (radius 9px, min height 44px, 14px/650); secondary white with border `#e8e1e3`, text `#503f45`; text link `ink-link` 650. Source `report-buttons.tsx`, `components/ui/button.tsx`.
- **Empty state**: dashed border `#e6dfeb`, radius 14px, centered, text `#91757e`. Source `report-empty.tsx`.
- **Focus**: 3px solid `--color-focus` outline, 3px offset on buttons and links. Source `styles.css`.
- **Icons**: lucide-react (ChartColumn, Crown, Boxes, Warehouse, CalendarDays, Download).
- **Charts**: none exist yet. The rebuild adds shadcn/ui Chart (Recharts), so chart colors must come from the tokens above. Role mapping used by the reports-rebuild artboards: current/revenue = `--primary`; margin = `--secondary-foreground` (plum); previous period = `--color-ink-faint`; positive = `--color-status-green`; warning/aging = `--color-status-amber`; negative = `--color-status-red`; info = `--color-status-blue`; neutral = `--color-status-gray`; gridlines = `--border`. This is a usage mapping of existing tokens, not new tokens.

## Store surface — source `abasto-web/src/modules/store/styles/store.css`

Customer store, separate from the console. Same palette family under aliases: `--color-st-ground #fff8f0`, `st-sunk #f6efe6`, `st-card #ffffff`, `st-ink #2a1d33`, `st-ink-soft #503f45`, `st-muted #6f6366`, `st-brand #c81d4e`, `st-brand-hover #a8173f`, `st-brand-tint #f8e8ee`, `st-plum #5b2a86`, `st-plum-ink #4a2670`, `st-plum-tint #f1eaf6`, `st-line #ede3d6`, `st-line-strong #e4d8ca`, `st-control #9c8f92`, `st-danger #a3173f`, `st-danger-tint #fbeae7`, `st-ok #2f6b5a`, `st-ok-tint #e9f4ef`, `st-low #7d5a14`, `st-low-tint #fff0d1`. Font `--font-st-sans: Inter, 'Segoe UI', Arial, sans-serif`, focus `--st-focus` plum, easing `--st-ease cubic-bezier(0.25, 1, 0.5, 1)`. 21 color tokens, 1 font, 2 other.

Store literals (source `store.css`, not tokens): placeholder `#7a6f72`; disabled text `#7a6f72`; disabled stepper icon `#b3a8aa`; picked strip background `#fdf4f7`; product mat background `#fff`; sheet/dialog overlay `rgb(42 29 51 / 0.4)` (no blur).

Store radius (literals): 20px login card (`.st-door`), 16px panels, blocks, rail and reservation tag, 14px plate, 12px product mat, 10px buttons, fields, stepper, add and tabs, 999px availability tag, 4px / 2px steps and tab extent.

Store shadows: `0 2px 3px rgb(200 29 78 / 0.04)` button; `0 3px 9px rgb(200 29 78 / 0.11)` button hover; `0 8px 28px rgb(42 29 51 / 0.09)` login card.

Store type: names and numerals weight 650 (`.st-stencil` tracking -0.005em, `.st-num` tabular lining numerals); order codes `.st-code` 650, no tracking, no wrap (e.g. `PED-5D6635E3`); button 15px / 650; field 16px; label 14px / 600; tab 15px / 600; tag 12.5px / 600; stepper input 17px / 650; step label 13px.

Store components (source `store.css`):

- **Button** `.st-btn`: min height 48px, padding 0 20px, radius 10px, raspberry `st-brand`, hover `st-brand-hover`. Variants: `--quiet` (plum-ink text, plum-tint hover), `--outline` (card background, `st-line-strong` border, `st-ink-soft` text), `--danger` (card background, `st-danger` text, border `rgb(163 23 63 / 0.35)`).
- **Field** `.st-field`: min height 48px, border `st-control`, radius 10px, 16px text.
- **Availability tag** `.st-tag`: 24px high, pill, 6px dot; `--ok`, `--low`, `--out` (sunk background, muted text, hollow dot).
- **Product mat** `.st-mat`: 56px square, radius 12px, `st-line` border; `--empty` plum tint with 24px / 650 initial.
- **Stepper** `.st-stepper`: three columns 44px / 48px / 44px, 44px high, border `st-control`, radius 10px; minus, quantity input, plus. `--set` quantity on brand tint. `--compact`: columns 36px / 44px / 36px, 36px high, 16px icons. `.st-add`: 44px brand square for a line at zero. (Replaces the earlier 12-cell quantity bar `.st-cells`, removed from the source.)
- **Brand tabs** `.st-rail` / `.st-tab`: plum-tint rail radius 16px; tab min height 48px, radius 10px, 4px extent track proportional to product count; selected tab on card with brand extent.
- **Strip** `.st-strip`: grid `minmax(0,1fr) 76px auto`, padding 8px 12px, top border `st-line`; picked `#fdf4f7`; out of stock muted.
- **Order steps** `.st-steps`: three columns, 8px bars; done plum, current brand with 650 label; ended struck through.
- **Surfaces**: `.st-panel`, `.st-block`, `.st-hangtag` white, `st-line` border, radius 16px; `.st-plate` plum tint radius 14px (`--brand` brand tint); `.st-door` login card radius 20px.
- **Focus**: 3px solid `--st-focus` (plum), offset 2px (−4px on tabs). Motion 160ms `--st-ease`, `.st-tick` 200ms; all disabled under `prefers-reduced-motion`.

## Mobile — source `abasto-mobile/src/global.css` `:root` and `abasto-mobile/tailwind.config.js`

Separate app (NativeWind), own palette: institutional red, maize gold, tertiary green on a cream surface (Material-style role names). Do not mix with the console or store tokens. `global.css` mirrors `tailwind.config.js` ("Web mirrors of tailwind.config.js; native utilities use resolved static values"); the 58 color values are identical in both files. 58 color tokens, 14 type tokens (+5 `home-*` sizes), 12 spacing, 4 radius, 0 shadows.

### Colors (58) — source `abasto-mobile/tailwind.config.js` `theme.extend.colors`, mirrored as `--color-*` in `global.css`

**Brand red** (12)

| Token | Value |
| --- | --- |
| `primary` | `#960e12` |
| `primary-container` | `#b92b27` |
| `primary-fixed` | `#ffdad6` |
| `on-primary` | `#ffffff` |
| `on-primary-container` | `#ffd5d0` |
| `red-institutional` | `#b92b27` |
| `red-warm` | `#c83e3e` |
| `surface-tint` | `#b42724` |
| `on-primary-fixed` | `#410002` |
| `on-primary-fixed-variant` | `#91080f` |
| `primary-fixed-dim` | `#ffb4ab` |
| `inverse-primary` | `#ffb4ab` |

**Maize / secondary** (10)

| Token | Value |
| --- | --- |
| `maize-gold` | `#f5c542` |
| `maize-dark` | `#7d5d00` |
| `secondary-container` | `#ffce4b` |
| `secondary-fixed` | `#ffdf95` |
| `on-secondary-container` | `#735800` |
| `secondary` | `#765a00` |
| `secondary-fixed-dim` | `#f0c03e` |
| `on-secondary` | `#ffffff` |
| `on-secondary-fixed` | `#251a00` |
| `on-secondary-fixed-variant` | `#594400` |

**Tertiary green** (8)

| Token | Value |
| --- | --- |
| `tertiary` | `#00562f` |
| `tertiary-container` | `#1e7043` |
| `tertiary-fixed` | `#a4f4bc` |
| `tertiary-fixed-dim` | `#88d7a1` |
| `on-tertiary` | `#ffffff` |
| `on-tertiary-container` | `#a0f0b8` |
| `on-tertiary-fixed` | `#00210f` |
| `on-tertiary-fixed-variant` | `#00522c` |

**Text and stock** (4)

| Token | Value |
| --- | --- |
| `text-carbon` | `#20252b` |
| `text-muted` | `#66717a` |
| `stock-green` | `#2e7d4f` |
| `stock-green-bg` | `#eaf5ee` |

**Surfaces and background** (17)

| Token | Value |
| --- | --- |
| `surface` | `#fbf9f3` |
| `surface-container-lowest` | `#ffffff` |
| `surface-container-low` | `#f5f3ee` |
| `surface-container` | `#f0eee8` |
| `surface-container-high` | `#eae8e2` |
| `surface-container-highest` | `#e4e2dd` |
| `on-surface-variant` | `#5a413e` |
| `cream-card` | `#ffffff` |
| `cream-canvas` | `#faf8f2` |
| `on-surface` | `#1b1c19` |
| `on-background` | `#1b1c19` |
| `background` | `#fbf9f3` |
| `surface-bright` | `#fbf9f3` |
| `surface-dim` | `#dcdad4` |
| `surface-variant` | `#e4e2dd` |
| `inverse-surface` | `#30312d` |
| `inverse-on-surface` | `#f2f1eb` |

**Outline and border** (3)

| Token | Value |
| --- | --- |
| `border-warm` | `#e8e2d5` |
| `outline` | `#8e706d` |
| `outline-variant` | `#e2beba` |

**Error** (4)

| Token | Value |
| --- | --- |
| `error` | `#ba1a1a` |
| `error-container` | `#ffdad6` |
| `on-error` | `#ffffff` |
| `on-error-container` | `#93000a` |

### Typography — source `abasto-mobile/tailwind.config.js` `fontSize` / `fontFamily`, `--type-*` in `global.css`

Display and headline/price tokens use `--font-display: 'Plus Jakarta Sans', sans-serif`; body and label tokens use `--font-body: Inter, sans-serif`. Also declared: `--font-mono` (ui-monospace stack), `--font-rounded` (`'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif`), `--font-serif` (`Georgia, 'Times New Roman', serif`). Config also sets `sans` and `display` to `System` (native).

| Token | Family | Size / line-height / tracking / weight |
| --- | --- | --- |
| `display-lg` | Plus Jakarta Sans | 36px / 44px / -0.02em / 800 |
| `display-lg-mobile` | Plus Jakarta Sans | 28px / 36px / -0.02em / 800 |
| `price-hero` | Plus Jakarta Sans | 28px / 32px / -0.02em / 800 |
| `price-hero-mobile` | Plus Jakarta Sans | 22px / 26px / -0.02em / 800 |
| `headline-lg` | Plus Jakarta Sans | 24px / 32px / -0.01em / 700 |
| `headline-md` | Plus Jakarta Sans | 20px / 28px / -0.01em / 700 |
| `headline-sm` | Plus Jakarta Sans | 18px / 24px / 0 / 600 |
| `body-lg` | Inter | 16px / 24px / 0 / 400 |
| `body-md` | Inter | 14px / 20px / 0 / 400 |
| `body-sm` | Inter | 12px / 16px / 0 / 400 |
| `label-lg` | Inter | 14px / 20px / 0.01em / 600 |
| `label-md` | Inter | 12px / 16px / 0.02em / 700 |
| `label-sm` | Inter | 11px / 14px / 0.03em / 700 |
| `wholesale-unit` | Inter | 11px / 14px / 0.05em / 800 |

Home sizes (`fontSize`, size / line-height): `home-xs` 0.6875rem / 0.875rem, `home-sm` 0.8125rem / 1.125rem, `home-base` 0.9375rem / 1.375rem, `home-lg` 1.125rem / 1.5rem, `home-xl` 1.375rem / 1.75rem.

### Spacing (12) — source `abasto-mobile/tailwind.config.js` `spacing`, `--spacing-*` in `global.css`

`space-xs` 0.25rem, `space-sm` 0.5rem, `space-md` 1rem, `space-lg` 1.5rem, `space-xl` 2rem, `gutter-mobile` 0.75rem, `gutter` 1rem, `margin-mobile` 1rem, `margin` 1.5rem. Config only: `4.5` 1.125rem, `5.5` 1.375rem, `7.5` 1.875rem.

### Radius (4) — source `abasto-mobile/tailwind.config.js` `borderRadius`, `--radius-*` in `global.css`

`DEFAULT` 0.25rem (4px), `lg` 0.5rem (8px), `xl` 0.75rem (12px), `full` 9999px.

### Shadows

None defined in `tailwind.config.js` or `global.css`.
