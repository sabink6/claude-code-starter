# Plan: Expired Heist History List + Heist Detail Page

## Context

`_specs/expired-heist-card.md` asks for three related pieces: (1) the expired-heists section becomes "History", showing only name + success/failure status per heist, sorted most-recently-expired first; (2) every heist card/list item on `/heists` (Active, Assigned, History) links to `/heists/[id]`; (3) `/heists/[id]` — currently a static `<h2>Heist Details</h2>` stub — renders real heist details.

Resolved decisions (spec's Open Questions + this session's follow-ups):
- "History" fully replaces the "All Expired Heists" heading, and still includes all expired heists (no other change to what's included).
- `/heists/[id]` fetches its own data via a new `useHeist(id)` live single-document hook — not a shared cache from the list page. The id itself is the only thing "passed from the parent view," via the existing `Link href="/heists/{id}"` pattern already used by `HeistCard`.
- **`components/HeistList/` is extended, not replaced with a new component.** `HeistList` already renders exactly title + success/failure status in a single-column list (see `components/HeistList/HeistList.tsx`) — that's already the History item. It only needs a `next/link` added to the title, mirroring `HeistCard`'s existing `<Link href={`/heists/${heist.id}`}>` pattern. Building a separate near-duplicate component was considered and rejected as needless duplication (confirmed with the user).
- Sort order: most-recently-expired-first is a query-level change (`orderBy("deadline", "desc")` for the `'expired'` filter only), not a client-side sort — Active/Assigned keep ascending (soonest-first) as today.
- Loading/not-found wording on the detail page: loading uses a plain text placeholder (`role="status"`, matching this app's existing plain-copy loading style, not `Spinner`); not-found shows "Heist not found."

## Codebase facts confirmed by exploration

- `lib/firebase/heists.ts`: `useHeists('expired')` currently queries `where('finalStatus','in',['success','failure'])`, `where('deadline','<=',now)`, `orderBy('deadline','asc')` — only the `orderBy` direction needs to change, to `'desc'`.
- `components/HeistList/HeistList.tsx` + `.module.css`: renders `<h2>{title}</h2>` then a `<ul>` of `<li>` with the heist title and a status pill (`.statusSuccess`/`.statusFailure`, scoped CSS-module classes) when `finalStatus` is set. Used today only for the Expired section (`app/(dashboard)/heists/page.tsx`); Active/Assigned use `HeistCardGrid`/`HeistCard` instead.
- `components/HeistCard/HeistCard.tsx` already establishes the exact `next/link` pattern to reuse: `import Link from "next/link"`, `<Link href={`/heists/${heist.id}`}>{heist.title}</Link>`, plus a private `formatDeadline()` date formatter.
- `app/(dashboard)/heists/[id]/page.tsx` is a plain Server Component stub today (no params usage yet).
- `app/(dashboard)/layout.tsx` already gates all children on `useUser()` (redirects to `/login` otherwise) — by the time any `/heists*` page renders, a user is guaranteed. `useHeists` still defensively no-ops when `user` is null; `useHeist` follows the same defensive pattern for consistency.
- `app/globals.css` already holds all cross-component "case-file" visual classes (`.case-tag`, `.heist-panel`, `.heist-card-grid`, etc.) rather than co-located CSS Modules, since `app/` route pages aren't components per this repo's folder convention — the detail page's own styling follows that same precedent.
- The status-pill styles (`.statusSuccess`/`.statusFailure`) are currently CSS-module-scoped to `HeistList` only, so they can't be reused as plain class names from the detail page. Since a second consumer now needs the identical look, they're promoted to `app/globals.css` as global classes (matching how `.heist-panel`/`.case-tag` etc. are already shared globally), and removed from `HeistList.module.css`.
- `HeistCard.tsx`'s `formatDeadline()` is extracted to a small shared util (`lib/formatDeadline.ts`) so both `HeistCard` and the detail page use one definition instead of drifting copies.

## Approach

**`lib/firebase/heists.ts` (modified)**
- Change the `'expired'` branch's `orderBy("deadline", "asc")` to `orderBy("deadline", "desc")`. No other query changes.
- Add `useHeist(id: string): { heist: Heist | null; loading: boolean }`: guards on `useUser()` the same way `useHeists` does; subscribes via `onSnapshot(doc(db, COLLECTIONS.HEISTS, id).withConverter(heistConverter), ...)`; on snapshot, sets `heist` to `snapshot.data()` if `snapshot.exists()`, else `null`, and `loading` to `false` either way; errors are `console.error`'d (not surfaced to the UI), matching `useHeists`; unsubscribes on unmount/id change.

**`lib/formatDeadline.ts` (new)** — the existing `formatDeadline` function moved here verbatim; `HeistCard.tsx` imports it instead of defining it locally.

**`app/globals.css` (modified)** — add `.status-badge`, `.status-badge-success`, `.status-badge-failure` (the exact rules currently in `HeistList.module.css`), for use as plain class names by both `HeistList` and the detail page.

**`components/HeistList/HeistList.tsx` + `.module.css` (modified)**
- Wrap the title `<span>` in `<Link href={`/heists/${heist.id}`}>`, importing `next/link`.
- Swap `styles.statusSuccess`/`styles.statusFailure` for the new global `.status-badge-success`/`.status-badge-failure` classes; remove those two rules (and the shared `.statusSuccess, .statusFailure` rule) from `HeistList.module.css`.

**`app/(dashboard)/heists/page.tsx` (modified)** — change the Expired panel's `<HeistList title="All Expired Heists" ...>` to `title="History"`. No structural change.

**`app/(dashboard)/heists/[id]/page.tsx` (modified)** — becomes a `"use client"` component: reads `id` via `useParams()` (`next/navigation`), calls `useHeist(id)`, and renders:
- `loading` → a `role="status"` placeholder (plain text, matching `HeistList`'s existing loading-copy style)
- `heist === null` (not loading) → "Heist not found."
- otherwise → title, description, "To: @assignedToCodename" / "By: @createdByCodename" rows (same icon+row pattern as `HeistCard`), the formatted deadline (via the shared `formatDeadline`), and the `.status-badge-*` pill only when `finalStatus` is set (an active/assigned heist has no status yet, same truthy check `HeistList` already uses).

## Tests

- `tests/lib/firebase/heists.test.ts`: update the existing `'expired'` test's `orderBy` assertion to `'desc'`. Add a new `describe('useHeist', ...)` block mirroring the existing capture-the-snapshot-callback pattern: builds the right doc ref/subscribes via `onSnapshot`; returns `{heist: null, loading: true}` before the first snapshot; returns the mapped heist with `loading: false` once a snapshot with `exists()` true fires; returns `{heist: null, loading: false}` once a snapshot with `exists()` false fires (not-found); unsubscribes on unmount; logs subscription errors via `console.error` without throwing.
- `tests/components/HeistList.test.tsx`: add a test asserting each rendered item's title is a link with `href="/heists/{id}"` for its own heist id. Existing tests (heading, loading, empty, item order, status pill) stay as-is since they only check text/role content, which the added `Link` wrapper doesn't change.
- New `tests/app/(dashboard)/heists/[id]/page.test.tsx`: mocks `next/navigation`'s `useParams` and `@/lib/firebase/heists`'s `useHeist`. Cases: loading state renders the status placeholder; not-found state renders "Heist not found."; loaded state renders title, description, both codenames, the formatted deadline, and the status badge when `finalStatus` is set; loaded state renders with no status badge when `finalStatus` is `null` (an active/assigned heist being viewed).
- `tests/app/(dashboard)/heists/page.test.tsx`: update the heading assertion from "All Expired Heists" to "History".

## Verification

1. `npx vitest run tests/lib/firebase/heists.test.ts tests/components/HeistList.test.tsx "tests/app/(dashboard)/heists/[id]/page.test.tsx" "tests/app/(dashboard)/heists/page.test.tsx"`
2. `npm test`, `npm run lint`, `npm run build`
3. `npm run dev` — sign in, load `/heists`: confirm History section heading, name+status-only items sorted latest-first, and that clicking any Active/Assigned/History item navigates to `/heists/[id]` and shows real details (or "Heist not found." for a bad id).
