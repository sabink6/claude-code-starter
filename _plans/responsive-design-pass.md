# Responsive Design Pass — Implementation Plan

Spec: `_specs/responsive-design-pass.md` · Branch: `claude/feature/responsive-design-pass`

## Context

Pocket Heist is desktop-only in practice. Nothing in `components/` uses a Tailwind breakpoint prefix, no CSS Module contains a media query, and the only responsive rules in the codebase are four lines in `app/globals.css`. Two constraints actively break the app on phones:

1. **`app/globals.css:46`** — `.page-content { @apply my-4 mx-auto w-6xl min-w-2xl max-w-full; }`. `min-w-2xl` is a **672px hard floor**, and `min-width` beats `max-width` per CSS spec, so `max-w-full` does not rescue it. This class wraps 5 of 7 pages, so every one of them scrolls sideways on any phone.
2. **`components/Navbar/Navbar.module.css:8` and `:16`** — two nested flex rows, neither with `flex-wrap`. Signed in at 375px the nav demands **~655px against ~359px available** and simply overflows.

Everything else already adapts (`.heist-card-grid`, `.heist-detail-people`, `Footer`, `HeistActions`) or is narrow-safe (`HeistForm`/`AuthForm` at `max-w-sm`). So this is a targeted fix plus a durable convention, not a redesign.

Outcome: someone on a 375px phone can land on the splash, sign in, browse heists, open one, act on it, and navigate anywhere — with no horizontal scroll, and with desktop appearance unchanged.

## Decisions locked (from spec answers + follow-up)

- Minimum supported width **375px**; Tailwind v4 default breakpoints only (add a custom one *only* if content demonstrably breaks between defaults, declared in `@theme`).
- Mobile nav **wraps onto rows** — no hamburger, no state, no new ARIA surface. **Centred**, mirroring `Footer`.
- Hybrid scope: improve mobile layout/spacing/type scale, but **hide nothing**. The Navbar tagline stays visible at every width.
- Guide lives in `_docs/`. **Do not touch `CLAUDE.md`** — link from `README.md` instead.
- **Defer** the `viewport` export (`colorScheme`/`themeColor`) — theming, not responsiveness. Separate PR.

## Key architectural choice: gutter on `body > main`, not `.page-content`

Put the horizontal gutter on `body > main` (`app/globals.css:40-42`). This is strictly better and resolves four problems at once:

| | gutter on `main` | gutter on `.page-content` |
|---|---|---|
| 5 pages using `.page-content` | fixed | fixed |
| `/login` + `/signup` (no `.page-content`) | **fixed** | not fixed — needs a 2nd change |
| `.splash-hero::before/::after` corner brackets | **moves them inward** | no effect — abs-pos resolves against the *padding* box |
| Desktop column width | **byte-identical** at ≥1200px | shrinks 72rem by the padding |

Verified: all five `.page-content` call sites sit inside a route-group `<main>`; `UserProvider` emits no DOM element so `body > main` matches; `Navbar`/`Footer` are outside `main` and keep their full-bleed bands.

---

## Phase 1 — Unblock (P1)

**`app/globals.css`**

```css
/* :40-42 — keep existing comment, note this is the app's single gutter source */
body > main { @apply flex flex-1 flex-col px-4 sm:px-6; }

/* :45-47 — remove the floor; w-full max-w-* is the correct idiom */
.page-content { @apply mx-auto my-4 w-full max-w-6xl; }

/* :48-50 — justified text at a ~343px measure produces severe rivers */
.center-content { @apply flex flex-1 flex-col justify-center text-left md:text-justify; }
```

**`components/Avatar/Avatar.module.css:3`** — add `shrink-0`. Highest value-per-character edit in the pass: `size-12` with no `shrink-0` inside the `.heist-detail-person` flex row turns the circle into an ellipse next to a long codename. Sibling components already got this right (`Skeleton.module.css` `.avatar`, `HeistCardSkeleton.module.css` `.iconBar`) — `Avatar` is the outlier. **This is a real latent bug independent of viewport width.**

Verify J1/J4/J5 at 375px in isolation — this phase alone should clear horizontal scroll on all seven pages.

## Phase 2 — Navigation (P1)

**`components/Navbar/Navbar.module.css`** — full replacement:

```css
@reference "../../app/globals.css";

.siteNav { @apply bg-light px-4 py-4 sm:px-6; }
.siteNav nav {
  @apply mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-3 md:justify-between;
}
.siteNav header {
  @apply flex flex-col items-center text-center md:items-start md:text-left;
}
.siteNav h1 { @apply text-xl font-bold; }
.tagline { @apply text-xs text-body md:text-sm; }
.siteNav ul { @apply flex flex-wrap items-center justify-center gap-2 sm:gap-3; }
.logoutBtn { @apply border border-body bg-none bg-transparent text-heading; }
.logoutBtn:hover { @apply bg-lighter opacity-100; }
```

Behaviour: **375px** → `ul` wraps below the brand block, then wraps internally; brand + tagline centred on row 1, actions centred below. **768px+** → fits one line and `md:justify-between` restores today's exact desktop layout.

`px-2` → `px-4 sm:px-6` because the inner `nav` has no horizontal padding of its own, and this aligns the brand with page content at every width. Tagline `text-xs md:text-sm` cuts the header block's intrinsic width ~175px → ~130px and reads as a proper subtitle — **it stays rendered at every width**.

Prefer `flex-wrap` over a `flex-col`/`md:flex-row` switch: if the `md:` threshold estimate is off, wrapping just wraps, whereas a hard switch jumps visibly at the wrong breakpoint.

**`components/Navbar/Navbar.tsx:33`** — one attribute, nothing else:
```tsx
<div className={styles.tagline}>Small heists. Big chaos.</div>
```
No new state, imports, hooks, or props. All 11 existing Navbar tests assert by role/text, so none can break.

## Phase 3 — Guards and polish (P2/P3)

**`app/globals.css`**
- `.splash-actions:54` → add `flex-wrap`. Speculative today (splash has 1 button, `/preview` has 2, both fit) but `/preview` is the scratch page for new UI. One word. **P2**
- `.status-badge:150` → add `shrink-0` and `whitespace-nowrap`. `"pending confirmation"` is the longest label; one edit covers `HeistCard`, `HeistList`, and the detail header. **P2**
- `.btn:226` / `.btn-reject:239` → add `min-h-11 md:min-h-0` (44px touch target on mobile, natural 40px restored at `md:` so desktop is byte-identical). **P2**
- `.heist-detail-person-info:190` → add `min-w-0`; `.heist-detail-person-name:196` → add `break-words`. Do **not** add `flex-wrap` to `.heist-detail-person` — an avatar wrapping above its own label reads as broken. **P2**
- `.heist-detail-header h2:176` → `min-w-0 text-xl break-words md:text-2xl` (type-scale improvement + long-token guard). **P2**
- `.heist-detail-description:205` → add `break-words` (500-char free text, pasted URLs realistic). **P2**
- `.heist-detail-timeline:208` → nested `span` gets `min-w-0`, add nested `svg { @apply shrink-0; }`. Outer already wraps; only the unguarded `Calendar`/`Clock` icons are a real defect. **P3**
- `.heist-panel:130` → `p-3 sm:p-4`, recovering 8px per panel at 375px. Marginal. **P3 / optional**

**`components/HeistList/HeistList.module.css` + `HeistList.tsx`** — `.item` gets `flex-wrap`; add `.itemTitle { @apply min-w-0 break-words; }` and apply it to the title `<Link>`. Ordinary long titles already wrap at spaces; the real failure is a single unbroken token >~181px. **P2**

**`.splash-tag` (`app/globals.css:83-98`) — verify, then fix if needed.** The `splash-stamp` keyframe starts at `scale(1.5)`; transforms don't affect layout but *do* contribute to scrollable overflow, so expect a possible **brief scrollbar flash during the 0.5s entrance**, not persistent overflow. If it flashes, reduce the start scale to `1.2`. The existing `prefers-reduced-motion` block already covers opt-outs. **P3**

**No change needed** (state this so nobody "improves" them): `HeistCard.module.css` (already has `line-clamp-2` + `truncate` + `shrink-0`; `line-clamp` implies `overflow:hidden`, so it self-contains), `HeistActions.module.css` (already `flex-wrap`), `HeistForm`/`AuthForm` (`max-w-sm`, `w-full` inputs), `Footer.module.css` (the reference implementation).

## Phase 4 — The guide

**`_docs/responsive-design.md`** (~160–200 lines), written **last** so it documents what was actually built — including the real `md:` threshold the Navbar settled on. Sections:

1. **Scope** — governs layout/spacing/type scale, not colour/motion/component APIs.
2. **Supported viewports** — 375px committed; nothing may impose a hard floor, so 320px degrades gracefully. Note the WCAG 1.4.10 gap (400% zoom on 1280px ≈ 320 CSS px) as a documented position.
3. **Breakpoints** — table of Tailwind v4 defaults *with an intent column*. Adding one requires demonstrated breakage + a central `--breakpoint-*` token in `@theme`, in `rem`; never an inline `min-[712px]:`.
4. **Mobile-first authoring** — unprefixed = smallest viewport; prefixes only add upward; never `md:flex-col` to undo a base `flex-row`; no `max-*` variants to paper over a mobile bug.
5. **Where a rule lives** — decision table honouring the repo's "one Tailwind class max in markup, else `@apply`" rule; reminder that `@apply` modules need `@reference "../../app/globals.css";`.
6. **Container sizing** — *the rule that caused this pass*: never `min-w-*` on anything spanning the viewport; the idiom is `mx-auto w-full max-w-<size>`, never `w-<size> max-w-full`; gutters live in exactly one place (`body > main`).
7. **Overflow guards cookbook** — lead with *why* (`min-width: auto` on flex/grid children is the cause of nearly every mystery overflow), then a table: `min-w-0`, `truncate`, `line-clamp-N`, `break-words`, `shrink-0`, `flex-wrap`, `whitespace-nowrap`.
8. **Touch targets** — ≥44px; the `min-h-11 md:min-h-0` idiom.
9. **Navigation pattern** — state the wrap decision and its rationale so it isn't re-litigated; note the conditional ARIA requirements *if* a future nav ever collapses.
10. **What we don't do** — no `overflow-x: hidden` on `html`/`body` (it hides the exact bugs this guide exists to catch), no `user-scalable=no`, no `display:none` to solve layout, no hand-written px media queries, **don't add a `viewport` meta — Next.js provides it**.
11. **Verification** — the protocol below, plus the console one-liner, plus why jsdom can't test any of it.
12. **Reference implementations** — `Footer.module.css` (wrapping row), `.heist-card-grid` (responsive grid), `HeistCard.module.css` (full guard set).

**`README.md`** — add the link near the existing `_docs/github-setup.md` reference (~:157) and/or the Repository Structure block (~:185).

> Note for the PR: the spec's acceptance criterion says the guide is linked from "the project's existing conventions documentation," which is `CLAUDE.md`. Linking from `README.md` is the agreed substitute given `CLAUDE.md` was explicitly deferred — call this out as a knowing partial satisfaction.

---

## Tests

**The spec's first two Testing Guidelines bullets are moot.** Both are conditioned on *"If navigation gains a small-screen toggle"* — the approved approach adds no toggle, no state, no `aria-expanded`. **Do not write them.** Say so in the PR so a reviewer sees the omission is intentional.

**Layout is not assertable here, for two independent reasons:** jsdom implements no layout engine (`getBoundingClientRect()` returns zeros, no viewport to overflow), and the styles aren't present anyway — `vitest.setup.ts` is one line with no `matchMedia` polyfill, and CSS Modules never go through Tailwind's `@apply` in the Vitest pipeline. Usefully, class-name assertions are *physically unwriteable*: every rule here lives in `@apply`, so the DOM only ever sees an opaque hash.

**Do write** — extend `tests/components/Navbar.test.tsx` with a small item-inventory block (two tests). The one realistic regression from this refactor is *silently losing a nav item*:
1. **Signed out** — level-1 heading, brand link → `/heists`, tagline text, "Create New Heist" → `/heists/create` all present; greeting and Logout absent.
2. **Signed in** — all of the above plus `"Hello, {codename}"` and the Logout button.

The tagline assertion is the genuinely new coverage: it pins the exact element that must **not** be hidden, encoding that decision where the next contributor will trip over it. Follow the file's existing conventions (`vi.mock` on `auth-context` + `logout`, `fireEvent` not `userEvent`, queries by role/text).

> Extend the existing file rather than adding a parallel one — `CLAUDE.md` mandates tests mirror the source path 1:1.

**Do not write:** `matchMedia` mocks (nothing reads media state in JS), Navbar snapshots, or anything touching `window.innerWidth`.

**Regression surface:** this touches globally shared classes (`.btn`, `.status-badge`, `.center-content`), so run the **full** suite. All existing tests should pass **unchanged** — they assert roles, text, `href`, and `disabled`, never geometry. A failure is a real signal, not a test to update.

## Verification

Baseline `npm run lint` + `npm test -- --run` **before** starting, then after each phase. `npm run build` catches malformed `@apply` (Tailwind fails the build on an unknown utility) — run it before opening the PR.

**Console check** at every width, every page — must be `false`:
```js
document.documentElement.scrollWidth > document.documentElement.clientWidth
```
To find a culprit when true:
```js
[...document.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth)
```

**Widths** (test the exact boundary values, not just "somewhere in the middle"): **375**, 390, 430, **667×375 landscape**, 640 (`sm:` ±1px), **768 (`md:` — the width where the Navbar must return to one row)**, 1024, 1280, 1440/1920 (confirm desktop unchanged), 320 (graceful degradation), 1280 @200% and @400% zoom.

**Journeys:** J1 splash → signup · J2 login (incl. the client-side login↔signup flip) · **J3 Navbar sweep 375→1440**, confirming the snap to one row at exactly 768 — if it still wraps there, move `md:justify-between` to `lg:` rather than inventing a breakpoint · J4 heists list (grid 1/2/3-up) · J5 detail (**avatars are circles, not ellipses**) · J6 status actions incl. the creator's two-button Confirm/Reject row and the `w-full` error row · J7 create form · J8 loading/skeleton states via Slow 3G · J9 `/preview` · **J10 adversarial content — create heists with an 80-char title and with a 40-char unbroken token, and check all three render sites.** J10 is most likely to find a residual bug.

> QA note: the signed-out Navbar is **unreachable in the running app** — `Navbar` mounts only in `(dashboard)/layout.tsx`, which gates on `user`. So the always-rendered "Create New Heist" `<li>` never actually appears signed-out in production. Verifiable only via the test suite. Pre-existing quirk; not in scope.
>
> Also pre-existing, observe but **do not fix**: the `(public)` Spinner branch returns no `<main>`, so `body > main` (and now the gutter) don't apply in that state.

## Explicitly out of scope

`viewport` export / `colorScheme` / `themeColor` (deferred by decision) · `CLAUDE.md` (deferred) · the `(public)` Spinner missing-`<main>` inconsistency · any hamburger or disclosure component · hiding any content at any width.
