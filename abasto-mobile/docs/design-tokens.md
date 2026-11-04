# Design tokens

`docs/ui/*.html` is the visual reference; its shared Tailwind configuration (for example, `docs/ui/home.html`) supplies the palette, spacing, radius, and type scales. `tailwind.config.js` is the app utility source of truth. `src/global.css` mirrors reference tokens as CSS custom properties for web DOM consumers; update both mappings together when reference values change. The existing `home-*` type and numeric spacing utilities remain intact.

## Use

- Use semantic utility names such as `bg-primary`, `text-on-surface`, `bg-cream-canvas`, `text-stock-green`, `gap-space-sm`, `px-gutter`, and `rounded-xl` rather than hard-coded values in future UI work. Existing components need not be migrated as part of this token foundation.
- The complete reference palette includes primary, secondary, tertiary, surface, status, and inverse roles. Do not substitute `text-carbon` for `on-surface` blindly: these intentionally have different reference values.
- The reference spacing scale is `space-xs` (4px), `space-sm` (8px), `space-md` (16px), `space-lg` (24px), `space-xl` (32px), plus `gutter-mobile` (12px), `gutter` and `margin-mobile` (16px), and `margin` (24px). Radius defaults are 4px, `lg` 8px, `xl` 12px, and `full` 9999px. Numeric Tailwind spacing remains available.
- Named reference text scales are available as `text-headline-md`, `text-body-md`, `text-price-hero`, etc. Each carries reference line-height, weight, and where defined, letter spacing. The matching `font-headline-md`, `font-body-md`, etc. are browser family stacks, **not native font face names**.

## Web and native typography

`src/app/_layout.tsx` loads Inter and PlusJakartaSans faces with weight-specific names (`Inter-400` through `Inter-800`, and `PlusJakartaSans-400` through `PlusJakartaSans-800` for available weights). `src/components/ui/brand-text.tsx` selects the loaded face using the `body`/`display` variant and explicit `font-medium`, `font-semibold`, `font-bold`, or `font-extrabold` classes. Keep using that native mechanism; a Tailwind `font-body-md` browser stack does not select `Inter-400` on React Native. When adding a text preset or weight, confirm the required asset exists and how BrandText resolves it. In particular, a named `text-*` scale's weight does not automatically make BrandText pick the corresponding native face: supply the matching explicit weight class when needed.

CSS variables such as `--color-primary` and `--spacing-space-sm` are for web DOM styling only. NativeWind resolves native static classes from `tailwind.config.js`; CSS custom properties do **not** automatically govern React Native static classes. Do not make native utilities depend on `var(--...)`. Keep the static Tailwind values and CSS mirror in sync. Browser use of Inter or Plus Jakarta Sans requires actual browser font loading; the Expo native registration alone is not a web font import.

## Next stage

Extract shared UI primitives such as Button only after this foundation is verified. This change introduces no primitives, screen migrations, theme switch, or behavior changes.
