# Spec for route-protection

branch: feature/route-protection
figma_component (if used): N/A

## Summary
Gate the two route groups by authentication state using the existing `useUser` hook. Pages in `app/(public)/` (the splash page, `/login`, `/signup`, `/preview`) should only be viewable by unauthenticated visitors; an authenticated user landing on any of them is redirected to `/heists`. Pages in `app/(dashboard)/` (the heists list, create, and detail pages) should only be viewable by authenticated users; an unauthenticated visitor is redirected to `/login`. While Firebase is still resolving the current auth state (`useUser().loading`), each group's layout shows a simple loading indicator instead of rendering its children or performing a redirect.

## Functional Requirements
- In the `(public)` group's layout, read auth state via `useUser()`. Once resolved (`loading` is `false`) and a user is present, redirect to `/heists`.
- In the `(dashboard)` group's layout, read auth state via `useUser()`. Once resolved and no user is present, redirect to `/login`.
- While `loading` is `true` in either group's layout, render a simple loading indicator in place of the page content — no flash of protected/restricted content and no premature redirect.
- Redirects are performed client-side using the existing `next/navigation` navigation pattern already used elsewhere in the app (e.g. `AuthForm`'s post-signup redirect).
- This protection applies at the layout level for each group, not on a per-page basis.

## Figma Design Reference (only if referenced)
- N/A — the loading indicator is described as "very simple"; no design reference is provided. Visual treatment is left to implementation.

## Possible Edge Cases
- `/preview` is a scratch/dev-only page (per `CLAUDE.md`, used for inspecting new UI in isolation) that lives in the `(public)` group; applying the group's rule uniformly means it would also redirect an authenticated visitor to `/heists`, which may or may not be desirable long-term.
- The root splash page (`/`) currently has its own `loading` guard and a code comment describing a planned redirect for logged-out visitors to `/login` (in addition to the logged-in-to-`/heists` redirect this spec covers). Under this spec's general rule, a logged-out visitor to `/` would just see the splash content as-is, not get redirected to `/login` — decide whether this fully supersedes that page's existing TODO.
- Redirect-loop risk: confirm a user can't end up ping-ponging between a public and dashboard route if `useUser()`'s `loading`/`user` values change in quick succession (e.g. right at sign-in/sign-out).
- Deep-linking directly to a protected route (e.g. `/heists/create`) while logged out should redirect to `/login` without briefly rendering the protected page first.
- Signing out via the Navbar's logout button while already on a dashboard page should trigger the redirect to `/login` reactively (no manual refresh needed), since `useUser()` is backed by a live `onAuthStateChanged` listener.
- Signing in successfully while sitting on a public page (e.g. `/login`) should redirect to `/heists` once the auth state updates.
- Slow or stalled Firebase auth-state resolution — should the loading indicator have any timeout/fallback, or is an indefinite loader acceptable for this scope?

## Acceptance Criteria
- Visiting any `(dashboard)` route while unauthenticated redirects to `/login`.
- Visiting any `(public)` route while authenticated redirects to `/heists`.
- While auth state is still loading on first load, a simple loading indicator is shown in both groups instead of a flash of the wrong content.
- Logging out while on a dashboard page redirects to `/login` without a manual page reload.
- Logging in while on a public page redirects to `/heists` without a manual page reload.
- No redirect loops occur between the two groups under normal use.

## Open Questions
- Should `/preview` be exempted from the `(public)` group's redirect rule (since it's a dev-only scratch page), or is it acceptable for it to behave like every other public route? A: exclude
- Should the root splash page (`/`) retain any special-cased behavior beyond this spec's general rule (e.g. its existing TODO to redirect logged-out visitors to `/login`), or does this spec's rule fully replace that? A: Add links to login/heists
- What should the "very simple loader" look like — reuse the existing `Skeleton` component, or something more minimal (plain text, a basic spinner)? A: spinner, use clock icon from the Pocket Heist title
- Should the dashboard's redirect preserve the originally-requested URL (e.g. a `?from=` param to return the user there after logging in), or is a hardcoded redirect to `/login` sufficient for now? A: /login 

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- The `(public)` layout redirects an authenticated user to `/heists`.
- The `(public)` layout renders its children normally for an unauthenticated user, with no redirect.
- The `(dashboard)` layout redirects an unauthenticated user to `/login`.
- The `(dashboard)` layout renders its children normally for an authenticated user, with no redirect.
- Both layouts show a loading indicator (and do not redirect or render children) while auth state is still loading.
