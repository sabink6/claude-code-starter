# Plan: Heist Card Component

## Context

`_specs/heist-card-component.md` calls for a `HeistCard` component (visual reference: `public/Card.png`) shown in a 3-column grid on `/heists` for the Active and Assigned sections only, a matching `HeistCardSkeleton` loading placeholder, and a `next/link` on each card's title to the (still-stub) `/heists/[id]` detail page. The Expired section is unaffected — it keeps its existing `HeistList` plain-list rendering.

Resolved decisions (spec's Open Questions + this session's follow-ups):
- Empty section still shows "Nothing here yet." text, same as today.
- While loading, render exactly one row of skeletons (3, matching the 3-column layout).
- Do not reuse/adapt the generic `components/Skeleton/` (circle-avatar profile shimmer) — new skeleton mirrors `HeistCard`'s own shape, reusing only the `animate-pulse` + token-scale-contrast *technique*.
- Card.png's "Overdue" tag is **omitted entirely** — Active/Assigned heists are queried with `deadline > now`, so they can never be overdue; the card shows only a plain formatted deadline.
- Today's `.heists-grid` puts Active/Assigned side-by-side (2-col page layout, each panel ~half width). That's **dropped** — both sections become full-width stacked panels, so the 3-column card grid actually has room to render 3 real columns. This is a visible layout change beyond "swap list-for-cards," confirmed with the user.
- `app/(dashboard)/heists/[id]/page.tsx` stays untouched (still the `<h2>Heist Details</h2>` stub).

## Codebase facts confirmed by exploration

- `components/HeistList/HeistList.tsx` already establishes the title-heading + null(loading)/empty/list 3-way branch this new work mirrors for cards; `HeistList` itself is untouched, kept for the Expired section only.
- `components/Skeleton/` (`Skeleton.tsx`/`.module.css`) is the existing shimmer idiom: `animate-pulse` + `bg-lighter` blocks on a `bg-light` card. `HeistCard`'s own card already sits at `bg-lighter` (the lightest surface token), so its skeleton mirrors the same technique in the other direction (`bg-dark` blocks) rather than inventing a new token.
- `lucide-react` (`^0.556.0`) is already a project dependency, already used in `components/AuthForm/`, `components/Navbar/`, `components/Spinner/` — safe to reuse for icons here, not a new dependency.
- `components/Navbar/Navbar.tsx` confirms the `next/link` convention: `import Link from "next/link"`, `<Link href="...">`.
- `app/globals.css` theme tokens to reuse (no new tokens needed): `--color-primary` (#C27AFF), `--color-secondary` (#FB64B6), `--color-dark`/`--color-light`/`--color-lighter`, `--color-heading`, `--color-body`, `--radius-btn`. `.heists-grid` (`grid grid-cols-1 gap-4 md:grid-cols-2`) is used nowhere else in the codebase, so it's safe to repurpose/replace.
- Tests mirror `tests/components/HeistList.test.tsx` (Testing Library + Vitest globals, no explicit describe/it/expect imports) and the existing `tests/app/(dashboard)/heists/page.test.tsx` structure.

## Approach

**New `components/HeistCard/`** — `HeistCard.tsx` takes `{ heist: Heist }`, renders: title as an `<h3>` wrapped in `<Link href={`/heists/${heist.id}`}>`, a `Clock` icon (lucide) accent top-right, then three rows (each with a small lucide icon): "To: @{assignedToCodename}" (`text-secondary`), "By: @{createdByCodename}" (`text-primary`), and a plain formatted deadline (`Calendar` icon + `Intl.DateTimeFormat` short date/time, no "Overdue" tag). Card surface: `bg-lighter` on `border-dark`, `rounded-btn`, `p-4`. Title inherits `font-sans` (the mock's title isn't in the display/typewriter font used for section headings). `HeistCard.module.css` uses `@reference "../../app/globals.css";` per convention.

**New `components/HeistCardSkeleton/`** — same card shape/spacing as `HeistCard` (header bar + icon-bar, three row bars, one narrower for the deadline row), `animate-pulse`, `bg-dark` bars on the `bg-lighter` card. Each instance gets `role="status"` + `aria-label="Loading heist"` per the CLAUDE.md route-guard convention for loading indicators.

**New `components/HeistCardGrid/`** — a thin wrapper mirroring `HeistList`'s internal branching, but for cards: `{ title, heists }` props, renders the title `<h2>`, then:
- `heists === null` → a `.heist-card-grid` div with 3 `HeistCardSkeleton`
- `heists.length === 0` → "Nothing here yet." paragraph
- otherwise → a `.heist-card-grid` div mapping `HeistCard` per heist

This avoids duplicating the same 3-way conditional at both the Active and Assigned call sites in `page.tsx`. `HeistList` itself is not modified — it keeps serving Expired only.

**`app/globals.css`** — replace `.heists-grid` with `.heist-card-grid` (`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3`), and add `@apply mt-4;` to `.assigned-heists` (since the two panels are no longer siblings inside a shared grid wrapper providing that gap).

**`app/(dashboard)/heists/page.tsx`** — remove the `.heists-grid` wrapper div; Active and Assigned each become their own top-level `.heist-panel` using `HeistCardGrid` instead of `HeistList`; Expired stays exactly as-is with `HeistList`.

## Tests

- `tests/components/HeistCard.test.tsx` (new): renders title/assignedToCodename/createdByCodename/a formatted time (loose regex to dodge timezone flakiness); title's link `href` matches `/heists/{id}` for a parametrized id (proves it's not hardcoded); no "Overdue" text anywhere.
- `tests/components/HeistCardSkeleton.test.tsx` (new): renders with `role="status"` + `aria-label="Loading heist"`, no heading/link roles present (no real content leaks through).
- `tests/components/HeistCardGrid.test.tsx` (new, mirrors `HeistList.test.tsx`): title heading renders; `heists=null` → exactly 3 `role="status"` elements; `heists=[]` → "Nothing here yet."; `heists` with items → one `HeistCard` per heist in order, zero skeletons present.
- `tests/app/(dashboard)/heists/page.test.tsx` (modified): existing section/heading assertions still pass unchanged; add — active/assigned render a `HeistCard` link with the right `href` per heist; active/assigned show 3 skeletons each while `useHeists` returns `null`; expired section still renders as a plain list (`listitem` roles), not cards, confirming it's unaffected.

## Verification

1. `npx vitest run tests/components/HeistCard.test.tsx tests/components/HeistCardSkeleton.test.tsx tests/components/HeistCardGrid.test.tsx "tests/app/(dashboard)/heists/page.test.tsx"`
2. `npm test`, `npm run lint`, `npm run build`
3. `npm run dev` — visually confirm against `public/Card.png`: sign in, load `/heists`, check Active/Assigned render as 3-column card grids (full-width, stacked sections) matching the mock's colors/layout, and Expired is unchanged as a plain list.
