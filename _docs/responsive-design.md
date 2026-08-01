# Responsive Design

> Status: Active project convention
> Established by: `_specs/responsive-design-pass.md`
> Last validated against: 2026-08-01

This document captures the responsive-layout conventions this codebase follows, established during the initial responsive-design pass.

## Scope

This guide governs layout, spacing, and type scale across viewports. It does not govern colour, motion, or component API design — those have their own conventions in `CLAUDE.md`.

---

## Mandatory conventions

Rules that apply to every new component and every page, not just the ones touched in the initial pass.

### Mobile-first authoring

Unprefixed declarations describe the **smallest** supported viewport. Breakpoint prefixes only ever add or override upward from there.

- Never write `md:flex-col` to undo a base `flex-row` — invert it: base `flex-col`, then `md:flex-row`.
- Never use a max-width variant (`max-md:`) to hide a mobile problem.
- If a rule reads "on desktop, do X," the base (unprefixed) rule is the mobile one.

### Where a responsive rule lives

| Situation | Where it goes |
|---|---|
| One utility, one element, page-specific | Directly in markup (max one class — see `CLAUDE.md`'s "Minimal Tailwind in templates" rule) |
| Two or more utilities on a component element | `@apply` in that component's `<Name>.module.css` |
| A class shared by 2+ pages / route groups | `app/globals.css` |
| A design token (colour, font, breakpoint, radius) | `@theme` in `app/globals.css` — never hardcoded |

Any CSS Module using `@apply` must open with `@reference "../../app/globals.css";` (see `Navbar.module.css` for the pattern).

### Container sizing

**Never put `min-w-*` on a page wrapper, layout container, or anything that spans the viewport.** `min-width` beats `max-width` per the CSS cascade, so `min-w-2xl max-w-full` is not "capped at the viewport" — it's an unconditional floor.

- The idiom for a centred, capped column is **`mx-auto w-full max-w-<size>`** — never `w-<size> max-w-full`.
- **Horizontal page gutters live in exactly one place: `body > main` in `app/globals.css`.** Inner wrappers (`.page-content`, `.siteNav`, etc.) set width and vertical rhythm only. Don't add your own `px-*` to a page-level wrapper — see [Common failure patterns](#common-failure-patterns) for why.
- `min-w-*` is legitimate on small, intrinsically-sized things (a badge, an icon button). It is never legitimate on something that has to fit the viewport.

### Touch targets

Target **≥44×44 CSS px** for anything tappable. `.btn`/`.btn-reject` use `min-h-11 md:min-h-0` — 44px on touch-sized viewports, reverting to the natural ~40px height at `md:` and up so desktop is unaffected. Follow this pattern for any new interactive control.

### Never do this

- **No `overflow-x: hidden` on `html` or `body`.** It hides overflow bugs rather than fixing them, and this guide exists so they get fixed instead.
- **No `user-scalable=no` / `maximum-scale=1`** in a viewport meta tag — a WCAG 1.4.4 failure.
- **No `display: none` to solve a mobile layout problem.** Hiding content on small screens is a product decision that needs explicit approval, not a CSS workaround.
- **Don't add a `viewport` export/meta tag.** Next.js's App Router already injects `width=device-width, initial-scale=1` by default. Adding one that just restates this buys nothing and creates a place for someone to later add a scale-locking option.
- No hand-written pixel-value media queries in a CSS Module when a Tailwind breakpoint variant already covers it.

---

## Project decisions

Choices specific to this app, recorded so they aren't re-litigated by the next person who hits the same question.

### Supported viewports

**375px is the project's polished minimum viewport.** Layouts down to approximately 320px must still reflow without horizontal page scrolling, supporting the intent of WCAG 2.2 Success Criterion 1.4.10, but 320px is not treated as a separately polished design target.

### Breakpoints

Tailwind v4's default breakpoints are used as-is — no custom breakpoints are currently defined in `@theme`.

| Prefix | Min width | Intent in this codebase |
|---|---|---|
| *(none)* | 0 | Phone portrait. The base layer — single column, stacked, wrapped. |
| `sm:` | 40rem / 640px | Large phone landscape, small tablet portrait. First point where two columns become viable. |
| `md:` | 48rem / 768px | Tablet portrait. The Navbar returns to a single row here; card grid goes 2-up. |
| `lg:` | 64rem / 1024px | Laptop. Card grid goes 3-up. |
| `xl:` | 80rem / 1280px | Unused today. Reserve for wide-screen refinements. |
| `2xl:` | 96rem / 1536px | Unused today. |

**Only add a custom breakpoint when real content demonstrably breaks between two defaults.** If you need one, declare it centrally:

```css
@theme {
  --breakpoint-<name>: <value>rem;
}
```

Use `rem`, matching the defaults — mixing units causes the generated utilities to sort unpredictably. Never reach for an inline arbitrary variant like `min-[712px]:` in markup.

### Navigation pattern

**Site navigation wraps onto multiple rows on small screens; it does not collapse behind a toggle.** This was a deliberate choice, not an oversight. Rationale: with only three items in the nav, wrapping needs zero new state, zero new ARIA surface, and no focus management, and it degrades better than a stacked layout — if a width estimate is ever off, wrapping just wraps, where a hard `flex-col`/`md:flex-row` switch would jump visibly at the wrong breakpoint. `components/Footer/Footer.module.css` was the in-repo precedent this followed.

**If a future nav ever needs to collapse behind a toggle** (e.g. the item count grows significantly), the control must have an accessible name, be operable by keyboard, and expose its state via `aria-expanded`.

---

## Common failure patterns

Real bugs found during the initial pass, and the mechanism behind each — recognize the shape, not just the specific file.

**A hard `min-width` floor on a page wrapper.** `.page-content` had `min-w-2xl` (672px). `min-width` always wins over `max-width` in the CSS cascade, so this wasn't "capped at the viewport" as it looked — it was an unconditional floor, and every page using it scrolled sideways on any phone. Any container that's meant to shrink with the viewport must never carry a `min-w-*`.

**A fixed-size element inside a flex row with no `shrink-0`.** `Avatar`'s `size-12` circle had no `shrink-0`. Next to a long sibling (a codename) in a flex row, the avatar was squashed into an ellipse instead of staying circular. A flex child without `shrink-0` will always yield to a sibling demanding more space first.

**An absolutely-positioned decoration resolving against the wrong element's padding box.** `.splash-hero::before`/`::after` (the corner brackets) are positioned relative to `.splash-hero` itself. Adding a gutter as padding on `.splash-hero` (or any inner wrapper) would not move them correctly, because they resolve against *that specific element's* padding box — not a parent's or a sibling's. This is why the gutter lives once, on `body > main`, upstream of everything.

**Long unbroken text inside a flex or grid child.** A flex or grid item defaults to `min-width: auto`, meaning it refuses to shrink below its content's natural width — so one long unbroken string (a title, a codename, a pasted URL) widens its container and the whole page with it. This is the cause of nearly every "mystery" horizontal-overflow bug. Fix with `min-w-0` on the child, paired with `truncate`, `break-words`, or `line-clamp-N` depending on how the text should degrade.

**A non-wrapping flex row of independently-sized items.** The Navbar's `nav` and `ul` had no `flex-wrap`. Once their combined content (brand + tagline + greeting + two buttons) exceeded the available width, they simply overflowed instead of reflowing. Any horizontal row whose total content width isn't guaranteed to fit needs `flex-wrap`.

**Double-gutter from padding on nested wrappers.** Only one element in this app owns the horizontal page gutter (`body > main`). Adding `px-*` to an inner wrapper too doesn't just look wrong — it double-insets content and, per the pattern above, still won't reposition any absolutely-positioned children of that inner wrapper correctly.

### Overflow guards cheat sheet

| Guard | Use when |
|---|---|
| `min-w-0` | On any flex/grid child that contains text and must be allowed to shrink. Almost always paired with one of the next three. |
| `truncate` | Single-line text where the tail is expendable (a codename in a card row). |
| `line-clamp-N` | Multi-line text with a hard cap (a card title). Also sets `overflow: hidden`, so it contains its own overflow. |
| `break-words` | Text that must stay fully readable but might contain a long unbroken token (a heist title, a description, a codename). Breaks only when there's no other option. |
| `shrink-0` | Anything with a fixed intrinsic size that must not be squashed: avatars, icons, badges. |
| `flex-wrap` | Any horizontal row of independently-sized items (nav actions, button groups, metadata rows). Cheap, and the default answer for a row that might overflow. |
| `whitespace-nowrap` | Short labels that read badly if broken mid-phrase (a status badge). Pair with `shrink-0`. |

---

## Manual verification

Layout correctness isn't meaningfully assertable in this project's jsdom-based test setup — jsdom implements no layout engine (`getBoundingClientRect()` returns zeros), and `vitest.setup.ts` has no `matchMedia` polyfill. Verify manually in a browser instead.

**Console check**, at every width, every page — should be `false`:

```js
document.documentElement.scrollWidth > document.documentElement.clientWidth
```

To find the culprit when it's `true`:

```js
[...document.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth)
```

**Reference widths:**

| Width | Represents |
|---|---|
| 375 × 667 | iPhone SE / the committed minimum — must pass |
| 390 × 844 | Common modern phone — must pass |
| 667 × 375 | Phone landscape — easy to forget, must pass |
| 640 | Exact `sm:` boundary |
| 768 | Exact `md:` boundary — the width where the Navbar returns to a single row |
| 1024 | Exact `lg:` boundary |
| 1280 / 1440 / 1920 | Desktop — confirm layout is unchanged from before this pass |
| 320 | Below the commitment — should still not scroll sideways |

Test the exact breakpoint values, not just "somewhere in the middle" — off-by-one boundary bugs are the classic failure of a mobile-first pass.

---

## Reference implementations

- `components/Footer/Footer.module.css` — a wrapping row (`flex flex-wrap`), the pattern the Navbar fix followed.
- `.heist-card-grid` in `app/globals.css` — a responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- `components/HeistCard/HeistCard.module.css` — the full overflow-guard set in one file: `line-clamp-2`, `truncate`, `shrink-0`.

---

## Checklist for new features

Before opening a PR that adds or changes UI:

- [ ] New page content sits inside the existing `main`/`.page-content` gutter — no new `px-*` added to a page-level wrapper.
- [ ] Any new horizontal row of independently-sized items (buttons, badges, nav items) has `flex-wrap`.
- [ ] Any flex/grid child holding variable-length or user-generated text has `min-w-0` plus `truncate`, `break-words`, or `line-clamp-N`.
- [ ] Any fixed-size decorative element (avatar, icon, badge) inside a flex row has `shrink-0`.
- [ ] New interactive controls meet the ≥44px touch target (`min-h-11 md:min-h-0` or equivalent).
- [ ] Nothing is hidden (`display: none`) to solve a mobile layout problem without explicit product approval.
- [ ] Verified at 375px, 768px, and desktop width — no horizontal scroll at any of them.
- [ ] If a new breakpoint felt necessary, it's declared centrally in `@theme`, not inlined as an arbitrary value.
