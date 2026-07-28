# Plan: App Footer

## Context

`_specs/app-footer.md` asks for a site-wide footer showing the project name/logo, the app version, a GitHub repo link, and the MIT license text. Resolved decisions: it lives in the root `app/layout.tsx` (shared by both `(public)` and `(dashboard)` route groups), the license is plain text (no link), and the GitHub link shows both an icon and text.

While tracing the existing "logo" mark to reuse, it turns out the exact `P<Clock8/>cket Heist` wordmark is already duplicated inline in two places (`components/Navbar/Navbar.tsx` and `app/(public)/page.tsx`), each with its own copy of the same `svg.logo { display: inline-block; }` CSS rule (one in `Navbar.module.css`, one in `app/globals.css`). Adding the Footer as a third inline copy would make it three. This plan extracts a shared `Logo` component instead — consolidating three implementations into one and cleaning up the pre-existing duplicate CSS rule as a natural side effect, not scope creep for its own sake.

## Codebase facts confirmed by exploration

- `app/layout.tsx` is the root layout: a Server Component (no `"use client"`) rendering `<html><body><UserProvider>{children}</UserProvider></body></html>`. Adding `<Footer />` as a sibling to `<UserProvider>` inside `<body>` requires no new client boundary, since `Footer` itself needs no interactivity.
- `components/Navbar/Navbar.tsx` (line 28) and `app/(public)/page.tsx` (line 10) each inline `P<Clock8 ... />cket Heist` — same mark, different call sites, neither currently marks the icon `aria-hidden`. Neither existing test file (`tests/components/Navbar.test.tsx`, `tests/app/(public)/page.test.tsx`) asserts on the exact logo markup or the `logo` class name — only text/role content — so swapping in a shared component is safe.
- `package.json` has `"version": "0.1.0"`; `tsconfig.json` has `resolveJsonModule: true`, so `import { version } from "@/package.json"` works directly, no extra tooling.
- `lucide-react` (already a dependency, used throughout) exports a `Github` icon — reused for the repo link rather than an SVG asset.
- Git remote confirms the repo URL: `https://github.com/sabink6/claude-code-starter`.
- `.splash-footnote a` (`app/globals.css`) already establishes the muted-link-in-footer-like-context treatment (`text-primary`, underline on hover) — the Footer's GitHub link reuses that pattern rather than inventing a new one.
- No existing precedent in this repo for unit-testing `app/layout.tsx` itself — it returns `<html><body>`, which isn't rendered the way component tests normally work (all other tested layouts, `(public)/layout.tsx` and `(dashboard)/layout.tsx`, return plain wrapper `div`s, not `<html>`). This plan does not add a test for `app/layout.tsx` directly; see Tests below for how "appears on both areas" is actually covered.

## Approach

**New `components/Logo/`** — extracts the wordmark, used by `Navbar`, the splash page, and the new `Footer`:
- `Logo.tsx`: `type LogoProps = { size?: number }`; renders `P<Clock8 className={styles.icon} size={size} strokeWidth={2.75} aria-hidden="true" />cket Heist` as a fragment (no wrapping heading/link — callers keep control of that, since Navbar wraps it in `<h1><Link href="/heists">`, the splash page wraps it in `<h1 className="splash-title">`, and the Footer wraps it in something smaller/muted).
- `Logo.module.css`: `.icon { display: inline-block; }` — the one rule both existing duplicates already had.
- `index.ts` barrel.
- Bonus (small, in-scope): adds `aria-hidden="true"` to the icon, since it's purely decorative — the visible "P...cket Heist" text already conveys the name. Neither existing inline copy had this; flagging since it's a minor improvement beyond pure extraction.

**Modify `components/Navbar/Navbar.tsx`**: replace the inline mark with `<Logo size={14} />` (keeping the existing `<h1><Link href="/heists">` wrapper). Remove the now-redundant `svg.logo` rule from `Navbar.module.css`.

**Modify `app/(public)/page.tsx`**: replace the inline mark with `<Logo />` (no `size`, matching today's unset/default behavior). Remove the now-redundant `svg.logo` rule from `app/globals.css`.

**New `components/Footer/`**:
- `Footer.tsx` (Server Component): renders `<Logo size={14} />`, `v{version}` (imported from `@/package.json`), a GitHub link (`Github` icon marked `aria-hidden`, visible "GitHub" text, `href="https://github.com/sabink6/claude-code-starter"`, `target="_blank" rel="noopener noreferrer"`), and the plain text "MIT License".
- `Footer.module.css`: a simple flex-wrap row (`bg-light`, `text-body`, small text, gap, wraps on narrow viewports per the spec's edge case), GitHub link styled like `.splash-footnote a` (`text-primary`, underline on hover).
- `index.ts` barrel.

**Modify `app/layout.tsx`**: import `Footer`, render it as a sibling immediately after `<UserProvider>{children}</UserProvider>` inside `<body>`. No new client boundary needed.

## Tests

- `tests/components/Logo.test.tsx` (new): renders the "Pocket Heist" text; the `Clock8` icon is `aria-hidden` (not exposed as an accessible element).
- `tests/components/Footer.test.tsx` (new): renders the project name/logo text, `v0.1.0` (mocking or reading the real `package.json` version), a link with the correct GitHub `href` plus `target="_blank"` and `rel="noopener noreferrer"`, and the "MIT License" text.
- `tests/components/Navbar.test.tsx` / `tests/app/(public)/page.test.tsx`: no changes needed — neither asserts on the old inline markup, only on unrelated text/role content that's unaffected by the swap.
- **Scope note on the spec's "footer appears on both a public-area page and a dashboard-area page" guideline**: since `app/layout.tsx` has no existing test precedent (see above) and per-page tests in this repo render page components in isolation, not the root layout around them, this is covered by construction (one root layout, rendered around every route, with `Footer` added once) plus `Footer`'s own thorough unit test — not by a literal per-page assertion. Flagging this interpretation in case a different kind of verification (e.g. an end-to-end tool) was actually wanted.

## Verification

1. `npx vitest run tests/components/Logo.test.tsx tests/components/Footer.test.tsx tests/components/Navbar.test.tsx "tests/app/(public)/page.test.tsx"`
2. `npm test`, `npm run lint`, `npm run build`
3. `npm run dev` — confirm the footer renders on both a public page (e.g. `/`) and a dashboard page (e.g. `/heists`), shows the correct version/GitHub link/license, and that the Navbar/splash-page logos still render identically to before.
