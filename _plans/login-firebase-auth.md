# Plan: Login with Firebase Auth

## Context

`_specs/login-firebase-auth.md` calls for wiring the `login` mode of the shared `AuthForm` component to real Firebase Authentication: sign the user in with `signInWithEmailAndPassword`, show a "Login successful" success message reusing the form's existing error/alert area, and show a mapped error message on failure. No redirect. Today `AuthForm.handleSubmit` in `login` mode just does `console.log("auth form submitted", { form: mode })` and returns — this makes login actually authenticate.

Open questions resolved by the user (in the spec):
1. Success message: "Login successful", shown by reusing the existing error/alert area.
2. Something should reset after login rather than persisting as-is — resolved as: clear the password field, but keep the success message visible (mirrors not wanting a stale password sitting in state longer than needed, while still confirming success to the user).
3. Submit button gets a pending/disabled state during sign-in, mirroring the signup pattern.
4. Login logic lives in a separate helper file, mirroring `lib/firebase/signup.ts`.
5. Error message wording left to implementation judgment.

Codebase facts confirmed by exploration (current state on this branch, freshly read):
- `AuthForm.tsx`: `handleSubmit` is already `async`, already has `isSubmitting` state and `disabled={isSubmitting}` on the submit button (added for signup) — but today `isSubmitting` is only toggled in the `signup` branch; the `login` branch short-circuits before it with a bare `console.log`. This plan extends the shared `isSubmitting` handling to cover login too, rather than duplicating it.
- The only message-display element today is a single conditional block: `{error && <p className={styles.error} role="alert">{error}</p>}`, driven by a plain `error: string` state. There is no existing `.success` CSS class or non-error message path.
- `app/globals.css` already defines `--color-success: #05DF72` (right next to `--color-error: #FF6467`) in the `@theme` block, but nothing consumes it yet. Since `--color-error` already powers a `text-error` Tailwind utility (used by `.error`), `--color-success` should symmetrically power `text-success` — confirm this works when styling `.success`.
- `lib/firebase/signup.ts` is the exact style to mirror for `lib/firebase/login.ts`: an exported `FALLBACK_MESSAGE` constant, an exported `mapFirebaseAuthError`-style function taking `code: string | undefined` and switching over known codes, and a public async function that catches the specific Firebase call, extracts `err.code` via `err instanceof Error && "code" in err ? String(err.code) : undefined`, and throws `new Error(mappedMessage)`.
- `lib/firebase/config.ts` exports `auth` (and `db`, unused here).
- `signInWithEmailAndPassword` and the sign-in error codes (`auth/invalid-credential`, `auth/too-many-requests`, etc.) are not used anywhere in the codebase yet — first use.
- `tests/components/AuthForm.test.tsx` currently has two tests that assert the OLD login placeholder behavior (`console.log("auth form submitted", { form: "login" })` and `signUp` not called) — these must be replaced, not just extended, since that console.log path is being removed entirely. The empty-field/invalid-email validation tests for login mode remain valid in spirit but should assert `signIn` was not called (mirroring how the signup validation tests already assert `signUp` was not called) rather than asserting on `console.log`.
- `tests/lib/firebase/signup.test.ts` is the exact mocking convention to mirror: `vi.mock("@/lib/firebase/config", () => ({ auth: {} }))`, `vi.mock("firebase/auth", () => ({ <fn>: vi.fn() }))`, `vi.mocked(fn).mockReset().mockResolvedValue(...)` in `beforeEach`, errors simulated via `Object.assign(new Error("msg"), { code: "auth/..." })`, assertions via `rejects.toThrow(...)`.
- Per CLAUDE.md, check Context7 docs for `signInWithEmailAndPassword`'s exact modular-SDK signature before writing `login.ts` (same quick confirmation done for `signOut` and the signup-flow Auth/Firestore calls).

## Approach

**`signIn(email, password)` is a plain async function** in a new `lib/firebase/login.ts`, structured identically to `signup.ts`'s `signUp`/`mapFirebaseAuthError` pair (its own `FALLBACK_MESSAGE` and `mapSignInError`, kept separate from signup's since the two flows have entirely different error-code sets — no shared code needed between the files).

**`AuthForm` gets a single unified message state** instead of a plain `error: string`, since it now needs to show either an error or a success message in the same visual slot:
```
type FormMessage = { type: "success" | "error"; text: string } | null
const [message, setMessage] = useState<FormMessage>(null)
```
This replaces `error` everywhere `setError(...)` was called, and the render block becomes one conditional `<p>` whose class (`styles.error` / `styles.success`) and ARIA role switch on `message.type`. Rationale for the role switch: `role="alert"` is semantically an assertive interruption meant for errors/warnings; a "Login successful" message is not an error, so it gets `role="status"` (a polite live region) instead, while errors keep `role="alert"`. This still satisfies "reuse the error/alert area" — same conditional slot, same styling pattern, just role/class driven by message type — without misusing ARIA semantics for a first-of-its-kind success case.

**`handleSubmit` unifies both branches under one `try/finally` with shared `isSubmitting`**, rather than only wrapping the signup branch: validation stays exactly as-is (still returns early before touching `isSubmitting` or Firebase), then both `login` and `signup` set `isSubmitting(true)`, await their respective helper, and reset it in `finally`. This is a natural extension of the existing pattern rather than a new one, and it's what gives login its double-submit protection (spec edge case) for free.

## File 1 (new): `lib/firebase/login.ts`

```ts
export const FALLBACK_MESSAGE = "Something went wrong. Please try again."

export function mapSignInError(code: string | undefined): string
export async function signIn(email: string, password: string): Promise<void>
```
- `mapSignInError`: `auth/invalid-credential` (modern SDK's unified code for wrong password/no such user), plus legacy `auth/wrong-password` and `auth/user-not-found` (older SDK behavior/emulator) all map to the SAME message — "Incorrect email or password." — deliberately not distinguishing which one it was, per the spec's account-enumeration-safety edge case. `auth/too-many-requests` maps to its own "Too many attempts. Please wait a moment and try again." Anything else falls back to `FALLBACK_MESSAGE`.
- `signIn`: `try { await signInWithEmailAndPassword(auth, email, password) } catch (err) { throw new Error(mapSignInError(code)) }` — same error-extraction style as `signUp`.

## File 2 (modify): `components/AuthForm/AuthForm.tsx`

- Import `signIn` from `@/lib/firebase/login`.
- Replace `const [error, setError] = useState("")` with the `FormMessage` union state described above (`const [message, setMessage] = useState<FormMessage>(null)`).
- Validation branches: replace `setError("...")` with `setMessage({ type: "error", text: "..." })`.
- After validation passes: `setMessage(null)`, then `setIsSubmitting(true)`, then a single `try { ... } catch (err) { setMessage({ type: "error", text: err instanceof Error ? err.message : "Something went wrong. Please try again." }) } finally { setIsSubmitting(false) }` wrapping BOTH branches:
  - `login`: `await signIn(email, password)`, then `setPassword("")` and `setMessage({ type: "success", text: "Login successful" })`.
  - `signup`: unchanged — `await signUp(email, password)`, then `router.push("/heists")`.
- `switchMode`: replace `setError("")` with `setMessage(null)` (clears any success/error message when toggling modes, per the resolved edge case).
- Render: replace the single error `<p>` with:
  ```tsx
  {message && (
    <p
      className={message.type === "success" ? styles.success : styles.error}
      role={message.type === "success" ? "status" : "alert"}
    >
      {message.text}
    </p>
  )}
  ```
- Submit button's `disabled={isSubmitting}` needs no change — it already exists and now correctly covers login too since `isSubmitting` is set before both branches.

## File 3 (modify): `components/AuthForm/AuthForm.module.css`

Add directly after `.error`, mirroring its shape:
```css
.success {
  @apply text-sm text-success;
}
```

## Tests

**`tests/lib/firebase/login.test.ts`** (new), mirroring `signup.test.ts`'s exact conventions:
```ts
vi.mock("@/lib/firebase/config", () => ({ auth: {} }))
vi.mock("firebase/auth", () => ({ signInWithEmailAndPassword: vi.fn() }))
```
Cases: calls `signInWithEmailAndPassword` with the entered email/password; `auth/invalid-credential` (and `auth/wrong-password`/`auth/user-not-found`) map to "Incorrect email or password."; `auth/too-many-requests` maps to its own message; an unmapped code falls back to `FALLBACK_MESSAGE`.

**`tests/components/AuthForm.test.tsx`** (modify):
- Add `vi.mock("@/lib/firebase/login", () => ({ signIn: vi.fn() }))`, import `signIn`, reset it in `beforeEach` (same pattern as the existing `signUp` mock).
- Remove the `vi.spyOn(console, "log")` setup entirely — no code path logs anymore once login is wired up.
- Replace `"logs the form data on submit with valid input"` with `"signs the user in and shows a success message on valid login"`: types valid credentials, clicks Login, asserts `signIn` called with `("thief@example.com", "loot123")`, a success message ("Login successful") is shown, the password field is cleared, and `mockPush` was never called.
- Update the two login validation tests (empty field / invalid email) to assert `expect(signIn).not.toHaveBeenCalled()` instead of the old `logSpy` assertion (mirroring the existing signup validation tests' pattern), keeping the `role="alert"` presence assertion.
- Add `"shows an error message and does not show success on failed login"`: `signIn` rejects with `new Error("Incorrect email or password.")`, assert the alert shows that text and no success message appears.
- Add `"disables the submit button while signIn is pending"`: same manually-controlled-promise pattern as the existing signup pending-button test, applied to `login` mode and `signIn`.
- Add `"does not call signIn in signup mode"` for symmetry with the existing `"does not call signUp when ... in signup mode"`... actually this is already implied by existing signup tests asserting `signIn` was never touched; add a light explicit assertion (`expect(signIn).not.toHaveBeenCalled()`) to the existing successful-signup test for parity with how login tests assert `signUp` was not called.

## Verification

- `npx vitest run tests/lib/firebase/login.test.ts tests/components/AuthForm.test.tsx` — new/updated tests passing.
- `npm test` — full suite green, no regressions (signup flow untouched in behavior, just sharing more of the submit-handler structure).
- `npm run lint` — clean.
- `npm run build` — confirms no prerendering issues from the state-shape change.
- `npm run dev` manual check: submit login with a valid existing account's credentials — confirm sign-in succeeds (verifiable via the Navbar's logout button now appearing, since `useUser()` picks up the change), "Login successful" appears in a distinctly-colored (green/`text-success`) message, the password field clears, and no navigation occurs. Submit with wrong credentials — confirm "Incorrect email or password." appears in the normal error color, no sign-in occurs. Rapid double-click submit — confirm only one `signInWithEmailAndPassword` call fires (button disables immediately).

## Risks / edge cases

- Reusing a single `message` state for both error and success means switching from an error to triggering a new submit correctly clears it via `setMessage(null)` right before the async call — verified this happens before both branches, not just login.
- `role="status"` vs `role="alert"` for the success case is a deliberate accessibility improvement beyond a literal one-element reuse; if this reads as over-engineering, the fallback is trivial — just keep `role="alert"` for both and only vary the CSS class.
- The `useUser` app-wide auth listener will reflect the newly signed-in user immediately (e.g. Navbar's logout button will appear) even though the user stays on `/login` — this is expected/accepted per the spec, not a bug.
