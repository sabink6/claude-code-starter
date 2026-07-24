# Spec for auth-state-hook

branch: claude/feature/auth-state-hook
figma_component (if used): N/A

## Summary
Introduce a single, app-wide source of truth for "who is the current user" backed by Firebase Authentication's real-time auth state listener, exposed to any page or component through a `useUser` hook. The hook returns `null` when logged out and the Firebase user object when logged in, updating automatically whenever auth state changes (sign-in, sign-out, or session expiry happening elsewhere). This spec covers only the state-management plumbing — reading and reacting to auth state — not any sign-up, login, or logout UI/flow, which will be specced separately.

## Functional Requirements
- Provide a `useUser` hook that can be called from any Server or Client Component tree location that needs to know the current user (the hook itself must be used from a Client Component, per React/Next.js rules, but should be easy to drop into any existing page/component).
- The hook subscribes to Firebase Auth's real-time auth-state listener under the hood, so it reflects changes immediately without requiring a page refresh or manual re-fetch.
- The hook's return value distinguishes three states over its lifecycle: "not yet determined" (auth check still in flight on first load), "logged out" (`null` user), and "logged in" (user object present) — the shape of this return value (e.g. a single value vs. a value+loading pair) is an open question below.
- The underlying subscription should be set up once and shared, not re-subscribed per component instance, so multiple components calling `useUser` simultaneously don't create redundant listeners.
- Update `app/(public)/page.tsx`, the current splash-page stub, to use `useUser` so its documented redirect intent (logged in → `/heists`, logged out → `/login`) becomes possible to implement against real auth state. (Wiring the actual `redirect()` calls may be left as a follow-up if it depends on the "not yet determined" loading state being resolved first — see Open Questions.)
- Audit the rest of the codebase for any other place that will need current-user information (e.g. Navbar, heists pages) and note them for follow-up; as of this spec, `app/(public)/page.tsx` is the only page with an explicit (currently unimplemented) dependency on user state.

## Figma Design Reference (only if referenced)
- N/A — this is a state-management feature with no visual component.

## Possible Edge Cases
- Initial page load / hard refresh: Firebase Auth's listener fires asynchronously, so there's a brief window before the first callback where the user's status is genuinely unknown (neither confirmed logged-in nor logged-out) — consumers need a way to distinguish this from "logged out" to avoid a flash of logged-out UI.
- Firebase Auth becoming unavailable or the listener erroring — the hook should not crash the consuming component; existing user state should not incorrectly flip.
- Multiple components mounted at once (e.g. Navbar and a page body) all calling `useUser` — should share one underlying listener rather than each opening its own connection to Firebase Auth.
- Server Components cannot use hooks or read this client-side state directly — any Server Component that needs user state will need a different approach, which is out of scope here but should be called out as a known limitation.
- Sign-out or token expiry happening in another browser tab — real-time listener should still reflect the change in the current tab without requiring a manual reload.
- Rapid authentication state changes (quick login/logout succession) — the hook should settle on the correct final state rather than getting stuck on a stale intermediate value or firing consumers out of order.

## Acceptance Criteria
- A `useUser` hook exists and can be imported and called from components/pages across the app.
- When no user is signed in, the hook reflects a logged-out state.
- When a user is signed in (e.g. via the Firebase console or a manually triggered sign-in for testing, since no login flow exists yet), the hook reflects the logged-in state with the user's data available.
- Changes to auth state (signing in or out via Firebase directly) are reflected by the hook without a page reload.
- `app/(public)/page.tsx` reads user state via `useUser` instead of being a static stub with no auth awareness.
- No sign-up, login, or logout UI/logic is added as part of this work.
- Authentication state persists correctly across browser refreshes.
- No console warnings or errors related to authentication state management.

## Open Questions
- What should the hook's return shape be — a single nullable user value, or an object/tuple that also exposes a "loading/not yet determined" flag for the initial-load edge case? This affects every consumer, including the splash-page redirect logic. A: expose loading
- Should the underlying auth-state subscription be implemented via React Context (a provider wrapping the app) or a module-level shared subscription that `useUser` reads from — both satisfy "not re-subscribing per component," but have different implications for where the provider needs to live in the route tree (recall the app has two separate root layouts for the `(public)` and `(dashboard)` route groups). A: React Context backed by a single Firebase listener.
- Once `app/(public)/page.tsx` can determine auth state, should this spec include wiring the actual conditional `redirect()` calls, or is exposing the state enough and the redirect logic is a follow-up? A: keep redirects out of this spec.
- What shape/fields does the codebase expect from "the user object" — just Firebase's built-in `User` (uid, email, etc.), or does the app anticipate merging in additional profile data later (out of scope for now, but worth flagging)? A: Firebase's native User object

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- `useUser` returns a logged-out (`null`) state when no user is authenticated.
- `useUser` returns the user object when a user is authenticated.
- `useUser` updates its return value when the underlying auth state changes (simulate the listener firing with a different state).
- `app/(public)/page.tsx` renders/behaves correctly for both a logged-in and logged-out `useUser` result (mocking the hook).
- `useUser` throws a helpful error (or returns an expected value) when used outside its provider, if a provider-based architecture is chosen.
