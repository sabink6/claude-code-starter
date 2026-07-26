# Plan: Navbar Logout Button

## Context

`_specs/navbar-logout-button.md` calls for a logout control in the shared `Navbar` component: visible only when a user is signed in, signs the user out of Firebase Auth on click, positioned left of the existing "Create New Heist" button, no redirect. The design reference (`public/LogoutButton.png`, 128×38px white-on-transparent) is a visual guide only — the user confirmed it should be recreated with markup, not embedded as a raw image.

Open questions resolved by the user (in the spec):
1. Failed sign-out: console-log only, no user-facing error UI.
2. Show a pending/disabled state on the button while sign-out is in flight (mirroring `AuthForm`'s `isSubmitting` pattern).
3. Button placement is a visual guide, positioned left of "Create New Heist".
4. Styling: left to my judgment — reuse `.btn` base or give distinct sub-styling.

Codebase facts confirmed by exploration:
- `Navbar.tsx` is currently a Server Component (no `"use client"`), rendering a logo `<Link>`, a tagline, and a `<ul>` with a single `<li>` containing the "Create New Heist" `<Link className="btn">`. The `<ul>` has no flex styling today since it only ever had one item.
- `lib/firebase/auth-context.tsx` exports `useUser()` → `{ user: User | null, loading: boolean }`, backed by `onAuthStateChanged`. `UserProvider` wraps the whole app in `app/layout.tsx`, so `useUser()` is already available in Navbar.
- **No client-island precedent exists in this repo.** The only precedent for a component needing `useUser()` (`app/(public)/page.tsx`) converts the *entire* component to `"use client"`, even though most of its content is static. Navbar will follow this same precedent rather than introducing a new split-component pattern.
- `firebase/auth`'s `signOut` is not used anywhere yet — first use. `lib/firebase/signup.ts` is the only precedent for wrapping a Firebase Auth action in a plain async helper (not a hook) — mirror that style for a new `logout.ts`.
- `lucide-react` (already a dependency) exports a `LogOut` icon — confirmed available. Use it sized `size={20}` to match the existing `Plus` icon on "Create New Heist".
- `AuthForm.tsx`'s `isSubmitting` + `disabled={isSubmitting}` + global `.btn:disabled` is the only existing "pending button" precedent — mirror it with a local `isLoggingOut` state, and do **not** swap the button's label text while pending (AuthForm doesn't either — keep the label constant, rely on `disabled`/opacity for feedback, avoid inventing a new UX pattern beyond what's needed).
- `tests/components/Navbar.test.tsx` currently renders `<Navbar />` bare, with zero mocking. Once Navbar calls `useUser()`, both existing tests will throw `"useUser must be used within a UserProvider"` unless updated. The repo's established convention (from `tests/app/(public)/page.test.tsx`, the only precedent) is to mock the hook directly via `vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))` — never wrap tests in a real `<UserProvider>`.
- Per CLAUDE.md, check Context7 docs for `signOut`'s exact modular-SDK signature before writing `logout.ts` (quick confirmation, same as was done for the signup feature's Auth/Firestore calls).

## Approach

**`logOut()` is a plain async function** in `lib/firebase/logout.ts`, mirroring `signup.ts`'s style. Unlike `signUp`, it never throws — it catches and `console.error`s any failure internally, since there's no UI in Navbar to surface an error message (per the resolved open question). This means Navbar's click handler doesn't need its own try/catch; it just awaits and resets pending state.

**Navbar converts entirely to `"use client"`**, following the repo's only existing precedent for a component needing `useUser()`, rather than introducing a new nested-client-island pattern.

**Styling reuses `.btn` as a structural base** (`className="btn {styles.logoutBtn}"`), layering a `logoutBtn` override for a transparent/outlined look instead of the CTA gradient — this keeps the disabled-state mechanics (`.btn:disabled`) and shared button geometry (padding, radius, flex) for free, while visually de-emphasizing logout as a secondary action next to the primary "Create New Heist" CTA.

## File 1 (new): `lib/firebase/logout.ts`

```ts
export async function logOut(): Promise<void>
```
- `await signOut(auth)` inside a try/catch; on failure, `console.error("Failed to sign out:", err)` and resolve normally (never rejects).
- Imports: `signOut` from `firebase/auth`, `auth` from `@/lib/firebase/config`.

## File 2 (modify): `components/Navbar/Navbar.tsx`

- Add `"use client"` at the top.
- Import `LogOut` from `lucide-react` (alongside existing `Clock8`, `Plus`), `useUser` from `@/lib/firebase/auth-context`, `logOut` from `@/lib/firebase/logout`, and `useState` from `react`.
- `const { user, loading } = useUser()` and `const [isLoggingOut, setIsLoggingOut] = useState(false)`.
- `handleLogout`: async function — early-return if already `isLoggingOut` (defense against rapid double-click alongside the `disabled` attribute), else `setIsLoggingOut(true)`, `await logOut()`, `setIsLoggingOut(false)`.
- In the `<ul>`, add a new `<li>` **before** the existing "Create New Heist" `<li>` (first DOM child = leftmost in the flex row), conditionally rendered as `{!loading && user && (<li>...)}` so the button never flashes in/out during the initial auth-state resolution.
- The new `<li>` contains a `<button type="button" className="btn {styles.logoutBtn}" onClick={handleLogout} disabled={isLoggingOut}>` with a `<LogOut size={20} />` icon and constant "Logout" label text (no text swap while pending — matches `AuthForm`'s precedent of relying on `disabled` alone).

## File 3 (modify): `components/Navbar/Navbar.module.css`

- Add `.siteNav ul { @apply flex items-center gap-3; }` — required now that there are two `<li>` items (previously unstyled since only one existed).
- Add a `.logoutBtn` class layered on top of the global `.btn`: transparent background, `border border-body`, `text-heading` (matches the white-on-transparent look of the design reference), plus a subtle `.logoutBtn:hover` fill (e.g. `bg-lighter`) that doesn't compete with the CTA's gradient hover. The `:disabled` dimming comes for free from the existing global `.btn:disabled` rule — no need to redeclare it here.

## Tests

**`tests/components/Navbar.test.tsx`** (modify): add `vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))` and `vi.mock("@/lib/firebase/logout", () => ({ logOut: vi.fn() }))`, with `vi.mocked(...)` refs reset/re-stubbed in `beforeEach`. Fix the two existing tests by adding `mockedUseUser.mockReturnValue({ user: null, loading: false })` before each render (required, or `useUser()` throws). Add new cases: logout button shown when a user is present; hidden when logged out; hidden while `loading: true` even with a user; clicking it calls `logOut()` (assert via `waitFor`); button is `disabled` while `logOut()`'s promise is pending (control the promise manually, same pattern used in `AuthForm.test.tsx`'s pending-button test).

**`tests/lib/firebase/logout.test.ts`** (new), mirroring `signup.test.ts`'s mocking conventions: `vi.mock("@/lib/firebase/config", () => ({ auth: {} }))`, `vi.mock("firebase/auth", () => ({ signOut: vi.fn() }))`. Cases: calls `signOut` with the shared `auth` instance; logs the error via `console.error` and still resolves (doesn't throw) when `signOut` rejects.

## Verification

- `npx vitest run tests/components/Navbar.test.tsx tests/lib/firebase/logout.test.ts` — new/updated tests passing.
- `npm test` — full suite green, no regressions in unrelated tests.
- `npm run lint` — clean.
- `npm run build` — confirms the Server→Client conversion of `Navbar` doesn't break its Server Component parent (`app/(dashboard)/layout.tsx` renders `<Navbar />` with no props, so this should be a non-issue, but build confirms it).
- `npm run dev` manual check: logged out, only "Create New Heist" shows with no flash of a logout button on load; log in via `/login` and confirm the logout button appears to the left of "Create New Heist" without a page reload; click it and confirm the button briefly disables, no navigation occurs, and it disappears once signed out; force a network failure during logout and confirm no UI error appears but the console logs one, and the button un-disables afterward.

## Risks / edge cases

- Multiple tabs open with the same session: only the current tab's Firebase Auth instance signs out directly; other tabs reflect the change independently via their own `onAuthStateChanged` listeners — accepted as-is per the spec, no special handling.
- Converting `Navbar` to a Client Component means it can no longer do server-side data fetching directly in the future without reintroducing a server/client split — worth flagging since Navbar is the only shared-layout component in the app, but out of scope to address now.
