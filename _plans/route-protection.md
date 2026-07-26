# Plan: Route Protection by Auth State

## Context

`_specs/route-protection.md` calls for gating the two route groups by Firebase auth state: `(public)` routes should redirect an authenticated user to `/heists`, `(dashboard)` routes should redirect an unauthenticated user to `/login`, both showing a simple spinner while `useUser()` is still resolving. `/preview` (a dev-only scratch page) is explicitly exempt from all of this. The root splash page (`/`) currently has its own stale, half-implemented redirect TODO and loading guard that this feature supersedes — it becomes a plain page with links instead.

**Important scope note:** these are client-side navigation guards only — they control what the UI navigates to and when, for UX purposes. They are not a security boundary. Firebase Security Rules (`firestore.rules`) remain solely responsible for actually protecting user and heist data; this feature does not touch those rules and must not be treated as a substitute for them.

Open questions resolved by the user (in the spec):
1. `/preview` is fully excluded — no loading wait, no redirect, ever.
2. The splash page (`/`) gains plain links to `/login` and `/heists` (not `/signup`); its old self-redirect TODO is dropped.
3. The spinner is the existing `Clock8` icon (already used as the Pocket Heist wordmark's glyph), animated.
4. Dashboard's redirect target is a hardcoded `/login` (no return-URL param).

Additional decisions from user review of this plan:
- Redirects use `router.replace()`, not `router.push()` — an auth redirect shouldn't leave the disallowed page in browser history (no reason a signed-out user should be able to hit "back" into a dashboard route they were just bounced from, or vice versa).
- The spinner carries `role="status"` + `aria-label="Loading authentication status"` on its wrapper, and `aria-hidden="true"` on the decorative icon itself, so it's announced properly to assistive tech and tests can target it by accessible role.
- Redirect assertions in tests must be wrapped in `waitFor`, not asserted synchronously right after render.

Codebase facts confirmed by exploration:
- Both `app/(public)/layout.tsx` and `app/(dashboard)/layout.tsx` are currently plain Server Components (no `"use client"`) with no auth logic at all — this is a from-scratch addition to both, not an edit to existing conditional logic.
- `useUser()` (`@/lib/firebase/auth-context`) returns `{ user: User | null, loading: boolean }`, backed by `onAuthStateChanged`; `UserProvider` wraps the whole app already, so both layouts can call it directly.
- `app/(public)/page.tsx` currently: `"use client"`, calls `useUser()` only for its own `if (loading) return null` guard, and carries a stale `TODO(follow-up, out of scope for auth-state-hook spec): ... redirect() to /heists or /login` comment. Once the parent layout gates all rendering on loading/redirect state, this page's own guard becomes dead code — it should drop `"use client"` and `useUser` entirely and revert to a plain Server Component.
- Exactly 3 routes live under `(dashboard)`: `/heists`, `/heists/create`, `/heists/[id]` — protected uniformly via the one shared layout, no per-route exclusions needed there (unlike `(public)`'s single `/preview` exclusion).
- `components/Navbar/Navbar.tsx` already calls its own independent `useUser()` to show/hide its logout button. If `<Navbar />` were rendered during the dashboard layout's own loading/redirect-pending window, it would show its own transient states on top of the layout's spinner — so `<Navbar />` should only mount once the layout itself has confirmed `loading === false && user` is present.
- `tests/components/AuthForm.test.tsx` is the existing precedent for mocking a `next/navigation` redirect (there via `useRouter().push(...)`) — this plan's tests mirror that shape but mock `replace` instead, since these layouts use `router.replace()`.
- `usePathname` has zero existing usages in the repo — first use, needed only in the `(public)` layout for the `/preview` exemption.
- **No existing precedent for testing a `layout.tsx` file directly** — these will be the first. Confirmed via the existing `tests/app/(public)/page.test.tsx` that importing a component from a parenthesized route-group path (`@/app/(public)/page`) already works fine with the `@/*` alias; the same will work for `@/app/(public)/layout` and `@/app/(dashboard)/layout`.
- `app/globals.css` already has `.center-content { @apply flex flex-col justify-center text-justify min-h-lvh; }`, used by the login/signup page wrappers to vertically center content — reusable as-is for a full-page spinner wrapper. `.center-content` only centers along the vertical axis; horizontal centering of a lone child needs its own `mx-auto` (mirroring how `AuthForm.module.css`'s `.form { @apply mx-auto ... }` centers itself inside the same `.center-content` wrapper on the login/signup pages).
- Per `CLAUDE.md`'s "minimal Tailwind in templates" rule (max one class directly in markup, otherwise combine via `@apply`), both the spinner's `animate-spin` and the splash page's new two-link row's `flex`/`gap` need to live in CSS (a module class for the spinner, a new global class for the splash page row) rather than being stacked directly as multiple Tailwind classes in JSX.

## Approach

**A small reusable `Spinner` component** (`components/Spinner/`), following the established `components/<Name>/{<Name>.tsx, <Name>.module.css, index.ts}` convention (mirrors `Skeleton`, `Avatar`, `Navbar`). It's a prop-less Server Component (no hooks needed) — trivial to render from inside either `"use client"` layout, since Server Components can be children of Client Components. It reuses `.center-content` for full-page centering, carries `role="status"`/`aria-label` for accessibility, and a single module class (`styles.spinner`, itself applying `mx-auto animate-spin` via `@apply`) on a large `Clock8` icon marked `aria-hidden`, keeping exactly one class in markup per CLAUDE.md's Tailwind convention.

**Both layouts become `"use client"`** and follow the same shape: read `useUser()`, compute a boolean "should redirect" condition, fire the redirect inside a `useEffect` via `router.replace(...)` (not `push`, so the gated page never lands in history), and render `<Spinner />` instead of the real content whenever `loading` is true OR a redirect is about to happen — this second half of the condition (not just `loading`) is what prevents a flash of the wrong content in the gap between `user`/`loading` resolving and the `useEffect`-driven navigation actually completing.

**`(public)`'s `/preview` exemption is a full early-out**, checked before the loading/redirect guard: if `pathname === "/preview"`, render children immediately regardless of `loading`/`user` — no spinner, no redirect, ever. The `useEffect` still runs unconditionally (hooks can't be conditional) but no-ops immediately when on `/preview`.

**The splash page drops all auth awareness.** Since the parent layout now guarantees the page only ever renders once confirmed logged-out (and not on `/preview`), `app/(public)/page.tsx` no longer needs `"use client"`, `useUser`, or its own loading guard — it becomes a plain Server Component with two added links.

## File 1 (new): `components/Spinner/`

**`Spinner.module.css`**:
```css
@reference "../../app/globals.css";

.spinner {
  @apply mx-auto animate-spin;
}
```

**`Spinner.tsx`**:
```tsx
import { Clock8 } from "lucide-react"

import styles from "./Spinner.module.css"

export default function Spinner() {
  return (
    <div
      className="center-content"
      role="status"
      aria-label="Loading authentication status"
    >
      <Clock8
        className={styles.spinner}
        size={48}
        strokeWidth={2.75}
        aria-hidden="true"
      />
    </div>
  )
}
```
- `size={48}`: larger than Navbar's `size={14}` (which borrows visual weight from the surrounding "Pocket Heist" wordmark text) since here it's the sole content on an otherwise blank page and needs to register at a glance on its own.
- `strokeWidth={2.75}` matches both existing `Clock8` usages for visual consistency.
- `role="status"` + `aria-label` on the wrapper announce the loading state to assistive tech; `aria-hidden="true"` on the icon itself prevents the decorative SVG from being separately exposed to screen readers.

**`index.ts`**: `export { default } from "./Spinner"`

## File 2 (modify): `app/(public)/layout.tsx`

```tsx
"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import Spinner from "@/components/Spinner"
import { useUser } from "@/lib/firebase/auth-context"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user, loading } = useUser()
  const pathname = usePathname()
  const router = useRouter()
  const isPreview = pathname === "/preview"

  useEffect(() => {
    if (isPreview) return
    if (!loading && user) {
      router.replace("/heists")
    }
  }, [isPreview, loading, user, router])

  if (isPreview) {
    return <main className="public">{children}</main>
  }

  if (loading || user) {
    return <Spinner />
  }

  return <main className="public">{children}</main>
}
```
`pathname === "/preview"` is an exact match (there's exactly one route there today, no nested subroutes) — a deliberate, revisitable choice, not an oversight.

## File 3 (modify): `app/(dashboard)/layout.tsx`

```tsx
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import Navbar from "@/components/Navbar"
import Spinner from "@/components/Spinner"
import { useUser } from "@/lib/firebase/auth-context"

export default function HeistsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  if (loading || !user) {
    return <Spinner />
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}
```
No pathname exemption needed — all 3 dashboard routes protected uniformly. `<Navbar />` only renders once `loading || !user` is false, i.e. auth is confirmed — avoiding Navbar's own independent `useUser()`-driven logout-button flicker during the gate.

## File 4 (modify): `app/(public)/page.tsx`

- Remove `"use client"`, the `useUser` import/call, the `if (loading) return null` guard, and the entire stale comment block (the "this page should be used only..." explanation plus the `TODO(follow-up, ...)` line) — all superseded by the parent layout.
- Add `import Link from "next/link"`.
- Add a new paragraph below the existing descriptive copy with two links, styled with the existing global `.btn` class (same class used by Navbar's "Create New Heist" and AuthForm's submit button):
  ```tsx
  <p className="splash-actions">
    <Link href="/login" className="btn">
      Log In
    </Link>
    <Link href="/heists" className="btn">
      View Heists
    </Link>
  </p>
  ```
- Add a new global class in `app/globals.css` (next to `.page-content`/`.center-content`) rather than stacking `flex gap-3` directly in markup:
  ```css
  .splash-actions {
    @apply flex gap-3;
  }
  ```

## Tests

**New `tests/app/(public)/layout.test.tsx`**: mocks `next/navigation` (`useRouter` → `{ replace: mockReplace }`, `usePathname` → controllable `mockUsePathname`) and `@/lib/firebase/auth-context` (`useUser` → `vi.fn()`). Cases:
- Loading shows the spinner (assert via `screen.getByRole("status")`) and does not redirect.
- Logged-out renders children, no redirect.
- Logged-in on `/` redirects to `/heists` and doesn't render children — assert the redirect with `await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/heists"))`, not a synchronous assertion right after `render(...)`.
- Logged-in on `/preview` renders children immediately (even while `loading: true`), no redirect ever (`expect(mockReplace).not.toHaveBeenCalled()`).

**New `tests/app/(dashboard)/layout.test.tsx`**: same pattern, plus mocks `@/lib/firebase/logout` (`logOut: vi.fn()`) since the real `Navbar` renders and imports it (mirroring `tests/components/Navbar.test.tsx`'s existing precedent). Cases:
- Loading shows the spinner, no Navbar/children, no redirect.
- Logged-out redirects to `/login` — again via `await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/login"))` — and does not render Navbar/children.
- Logged-in renders Navbar (assert `"Create New Heist"` text) + children, no redirect.

**Rewrite `tests/app/(public)/page.test.tsx`** (full replacement, not incremental — `Home` drops its only dependency): no `useUser` mock needed anymore. Cases: renders the splash content; renders a "Log In" link with `href="/login"`; renders a "View Heists" link with `href="/heists"`.

## Verification

- `npx vitest run "tests/app/(public)/layout.test.tsx" "tests/app/(dashboard)/layout.test.tsx" "tests/app/(public)/page.test.tsx"` — new/rewritten tests passing.
- `npm test` — full suite green, `Navbar.test.tsx`/`AuthForm.test.tsx` unaffected.
- `npm run lint` — clean, including `react-hooks/exhaustive-deps` on both new `useEffect`s.
- `npm run build` — confirms both Client Component layouts compile with their now-Server-Component children (`page.tsx` under `(public)`), and that Next.js accepts the route-group layout structure unchanged.
- `npm run dev` manual walkthrough: `/` logged out shows splash + links, no redirect; logged in and visiting `/`, `/login`, or `/signup` redirects to `/heists`; `/heists` (or any dashboard route) logged out redirects to `/login`; `/heists` logged in shows Navbar + content; `/preview` renders immediately regardless of auth state in either direction; clicking the Navbar's Logout button while on `/heists` reactively redirects to `/login` with no manual refresh; confirm the browser's back button doesn't return to a just-redirected-away-from page (verifying `replace` behaves as intended, unlike `push`).

## Risks / edge cases

- These are client-side navigation guards for UX only — they are not a security boundary. Firebase Security Rules (`firestore.rules`) remain solely responsible for actually protecting user and heist data; this feature doesn't change those rules and isn't a substitute for them.
- The `loading || user` (public) / `loading || !user` (dashboard) render-guards intentionally keep the spinner up during the brief gap between auth state resolving and `useEffect`'s `router.replace` actually completing navigation — without this, there'd be a one-frame flash of the wrong content.
- `/preview`'s exact-match check (`pathname === "/preview"`) doesn't account for any hypothetical future nested preview routes; revisit with a `startsWith` check if that ever changes.
- Removing `page.tsx`'s own loading guard relies entirely on the parent layout never rendering `{children}` while `loading` is true — verified true in both new layouts' logic, but worth re-checking if either layout's guard structure changes later.
