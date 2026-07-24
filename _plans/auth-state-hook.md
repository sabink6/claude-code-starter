# Plan: Auth State Hook (`useUser`)

```
useUser()
  ↓
{
  user,
  loading
}
```

## Context

`_specs/auth-state-hook.md` calls for a single, app-wide source of truth for "who is the current user," backed by Firebase Auth's real-time `onAuthStateChanged` listener, exposed via a `useUser` hook usable from any page/component. It returns `{ user, loading }` — `user` is Firebase's native `User | null`, `loading` distinguishes "not yet determined" (first check in flight) from a confirmed logged-out state. This spec explicitly excludes any sign-up/login/logout UI or flow — just the state plumbing.

Open questions resolved by the user in the spec:
1. Return shape exposes a `loading` flag alongside `user`.
2. Architecture: React Context backed by one shared Firebase listener (not one listener per hook call).
3. Redirect logic for the splash page is a follow-up, out of scope here.
4. User object is Firebase's native `User` type, no custom merging.

Codebase facts confirmed by exploration:
- `app/layout.tsx` is a single shared root layout (Server Component) that both `app/(public)/layout.tsx` and `app/(dashboard)/layout.tsx` nest under — a provider placed here covers the whole app, no duplication needed.
- `lib/firebase/config.ts` exports `auth` (named export, `getAuth(app)`).
- `app/(public)/page.tsx` is currently a static Server Component stub — the only current consumer of "user state" anywhere in the app (checked Navbar and the heists pages — neither reference auth yet).
- There are currently **zero** hooks or Context providers anywhere in this codebase — this establishes a new pattern, not extends an existing one.
- No test in the repo currently uses `vi.mock` — this feature introduces that pattern for the first time, to mock Firebase's `onAuthStateChanged`.
- CI (`.github/workflows/ci.yml`) has no `NEXT_PUBLIC_FIREBASE_*` env vars configured, and runs `npm run build`/`npm test`/`npm run lint` — module-level Firebase init (`getApps()/initializeApp()/getAuth()`) doesn't make network calls so it won't fail the build, but tests must mock `@/lib/firebase/config` rather than rely on it importing meaningfully under test.

## Approach

One new file, `lib/firebase/auth-context.tsx`, holding a Context, a `UserProvider` client component owning the single shared `onAuthStateChanged` subscription, and the `useUser` hook that reads the context and throws if called outside the provider. This lives in `lib/firebase/` (next to `config.ts`, which it imports) rather than a new `hooks/`/`contexts/` directory — with exactly one hook so far, introducing a whole new top-level directory convention is speculative; CLAUDE.md's `components/<Name>/` + CSS Module + barrel convention is for renderable UI and doesn't fit a provider with no styling. Mount `UserProvider` once in `app/layout.tsx`, wrapping `{children}` — the layout itself stays a Server Component; a client component wrapping server-rendered children is a standard supported pattern.

Use `undefined` (not `null`) as the Context's "no provider" default, since `null` is a legitimate value for `user` (logged out) — only `undefined` can unambiguously mean "used outside `UserProvider`."

## File 1 (new): `lib/firebase/auth-context.tsx`

- `"use client"` at the top.
- `UserContext = createContext<{ user: User | null; loading: boolean } | undefined>(undefined)`.
- `UserProvider({ children })`: `useState` for `user` (init `null`) and `loading` (init `true`); one `useEffect` (empty deps) that calls `onAuthStateChanged(auth, onNext, onError)` — `onNext` sets `user` and sets `loading` false; `onError` just sets `loading` false without touching `user` (so a listener error can't crash the tree or silently log someone out). Returns the `unsubscribe` from the effect's cleanup.
- `useUser()`: `useContext(UserContext)`, throws `new Error("useUser must be used within a UserProvider")` if the result is `undefined`, otherwise returns it.
- Import `auth` from `@/lib/firebase/config`; import `onAuthStateChanged` and the `User` type from `firebase/auth` (already installed).

## File 2 (modify): `app/layout.tsx`

Import `UserProvider` from `@/lib/firebase/auth-context` and wrap `{children}` with it inside `<body>`. No other changes — file stays a Server Component (no `"use client"` needed at this level).

## File 3 (modify): `app/(public)/page.tsx`

- Add `"use client"`.
- `const { loading } = useUser()` — destructure only `loading`, not `user` (unused `user` would trip the lint unused-var rule; add it back when the redirect follow-up lands).
- `if (loading) return null` before the existing markup.
- Add a comment noting the follow-up: once `loading` resolves, redirect to `/heists` or `/login` based on `user` — deferred per `_specs/auth-state-hook.md`.
- No hydration mismatch risk: the effect never runs during SSR, so server and initial client render agree on `loading: true` → `null`.

## Tests

**`tests/lib/firebase/auth-context.test.tsx`** (new, mirrors source path) — first use of `vi.mock` in the repo:
- `vi.mock("@/lib/firebase/config", () => ({ auth: {} }))` — stub, never inspected since `onAuthStateChanged` itself is mocked.
- `vi.mock("firebase/auth", () => ({ onAuthStateChanged: vi.fn() }))`, with the mock implementation capturing the passed-in callback so tests can invoke it manually to simulate the listener firing.
- Use `renderHook`/`act` from `@testing-library/react` (already installed, v16.3.0 — no new dependency needed) with a `wrapper` that renders `<UserProvider>`.
- Cases: starts `loading: true`/`user: null` before the listener fires; reflects logged-out after firing with `null`; reflects logged-in after firing with a fake `User`; settles on the correct final state after several rapid successive fires; throws `"useUser must be used within a UserProvider"` when rendered without the wrapper (suppress the expected `console.error` via `vi.spyOn`, same pattern as `tests/components/AuthForm.test.tsx`).

**`tests/app/(public)/page.test.tsx`** (new) — mocks `useUser` directly (not the underlying listener), since this test is about the page's render logic, not re-testing the hook:
- `vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))`.
- Cases: renders nothing while `loading: true`; renders the splash content when resolved and logged out; renders the splash content when resolved and logged in (assert on the `"Small heists. Big chaos."` text node, not the `<h1>`, since the heading's text is split by the inline `Clock8` icon).

## Verification

- `npm test` (or `npx vitest run tests/lib/firebase/auth-context.test.tsx tests/app/\(public\)/page.test.tsx`) — all new tests passing.
- `npm run lint` — clean (in particular, confirms no unused-`user`-variable warning in `page.tsx`).
- `npm run build` — confirms the client-component conversion of the splash page and the new provider don't break prerendering.
- `npm run dev` — manually visit `/` and confirm no console errors/warnings, the page renders after a brief moment (loading resolves), and toggling a user's sign-in state directly in the Firebase console is reflected without a page reload (satisfies the real-time/no-reload and no-console-noise acceptance criteria).
