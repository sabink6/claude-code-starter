# Plan: Signup with Firebase Auth and Codename

## Context

`_specs/signup-firebase-auth.md` calls for wiring the signup path of the shared `AuthForm` component to real Firebase Authentication: create an account, generate a random 3-word PascalCase "codename" as the `displayName`, write a `users/{uid}` Firestore doc with `{ id: uid, codename }` (no email), enforce codename uniqueness with regenerate-on-collision, and redirect to `/heists` on success. Today `AuthForm.handleSubmit` is synchronous and only `console.log`s — this makes signup actually create accounts. Login mode is untouched (separate spec later).

Open questions resolved by the user:
1. Redirect to `/heists` after successful signup.
2. Firestore: doc ID = uid, and a field `id` (string) also stores that same uid, plus a `codename` field. No email.
3. Codenames must be unique — check-and-regenerate against Firestore, accepting the small race-condition window as a known limitation (no Cloud Functions/transactions needed for a starter app).
4. Codename generator + word sets live in a new `lib/` utility (not `lib/firebase/`, since it has no Firebase dependency).
5. Firebase signup logic lives in a separate helper, not inside `AuthForm` directly.
6. Firestore security rules stay out of scope (current test-mode wildcard rules already permit everything needed). Left to my judgment: mapping Firebase Auth error codes to friendly messages.

Codebase facts confirmed by exploration:
- `AuthForm.tsx`'s `handleSubmit` is synchronous today; validates then only logs. No `isSubmitting` state exists, no `disabled` on the submit button.
- `AuthForm.module.css` has no disabled-button style; the submit button actually uses the **global** `.btn` class from `app/globals.css` (shared with the Navbar CTA `<a>`, which can never be `:disabled` — safe to extend there).
- `lib/` currently holds only `lib/firebase/config.ts` (exports `auth`, `db`) and `lib/firebase/auth-context.tsx` (exports `UserProvider`, `useUser`, backed by a shared `onAuthStateChanged` listener — this will independently observe the new user the instant the account is created, uncoordinated with this feature's own redirect).
- `tests/lib/firebase/auth-context.test.tsx` established the only existing Firebase-mocking convention: `vi.mock` just the specific imports used, `vi.mocked(...)` for typed refs. No precedent yet for mocking promise-based calls — this feature extends that pattern.
- `firestore.rules` is fully open (wildcard, expires ~2026-08-23) — already permits the uniqueness query and the `users/{uid}` write, no rule changes needed.
- No `useRouter`/`next/navigation` usage exists anywhere in the repo yet — this is the first use of client-side navigation.
- Firebase v12.16.0 is installed; no new npm packages needed (`createUserWithEmailAndPassword`, `updateProfile`, `deleteUser` from `firebase/auth`; `doc`, `setDoc`, `collection`, `query`, `where`, `getDocs` from `firebase/firestore`).

## Approach

**Signup helper is a plain async function**, not a hook: `signUp(email, password)` in `lib/firebase/signup.ts`. It's a single imperative action with no ongoing reactive state of its own — `AuthForm` already owns `isSubmitting`/`error` locally to drive the button and error UI, so a hook would just duplicate that state awkwardly. This also keeps the helper framework-agnostic and trivially testable with plain `await`/`rejects` assertions, no `renderHook` needed.

**Operation order matters** for avoiding partial state: generate-and-verify a unique codename **before** touching Firebase Auth (so a codename failure never leaves a half-created account), then create the Auth account, then attempt `updateProfile`/`setDoc` with a best-effort `deleteUser` rollback if either fails.

## File 1 (new): `lib/codename.ts`

Pure logic, no Firebase import.

```ts
export const ADJECTIVES = ["Silent","Sly","Swift","Clever","Daring","Quiet","Sneaky","Bold","Cunning","Nimble"] as const
export const COLORS = ["Crimson","Golden","Emerald","Violet","Amber","Onyx","Silver","Scarlet","Cobalt","Ivory"] as const
export const NOUNS = ["Fox","Raven","Wolf","Viper","Falcon","Panther","Cobra","Jackal","Lynx","Hawk"] as const

export function generateCodename(random: () => number = Math.random): string
```
- 10 words per set, each set internally unique, already PascalCase so straight concatenation of one pick per set works (e.g. `SilentCrimsonFox`).
- `random` is injectable (defaults to `Math.random`) so tests can force deterministic picks without mocking globals.

## File 2 (new): `lib/firebase/signup.ts`

```ts
export async function signUp(email: string, password: string): Promise<void>
export function mapFirebaseAuthError(code: string | undefined): string
```

Sequence inside `signUp`:
1. **`generateUniqueCodename()`** (internal helper): loop up to `MAX_CODENAME_ATTEMPTS = 5` — call `generateCodename()`, query `getDocs(query(collection(db, "users"), where("codename", "==", candidate)))`; return the candidate once `snapshot.empty`. If all attempts collide, `throw new Error(FALLBACK_MESSAGE)` — no Auth account exists yet, nothing to roll back.
2. **Create the account**: `await createUserWithEmailAndPassword(auth, email, password)`. On rejection, read `.code`, map via `mapFirebaseAuthError`, `throw new Error(mappedMessage)`.
3. **Post-creation** (`updateProfile` + `setDoc`), wrapped in one try/catch:
   - `await updateProfile(credential.user, { displayName: codename })`
   - `await setDoc(doc(db, "users", credential.user.uid), { id: credential.user.uid, codename })` — exactly these two fields, no `email`.
   - On failure of either: best-effort `try { await deleteUser(credential.user) } catch { /* log, swallow */ }`, then `throw new Error(FALLBACK_MESSAGE)`.

Error mapping:
| code | message |
|---|---|
| `auth/email-already-in-use` | "That email is already registered. Try logging in instead." |
| `auth/weak-password` | "Choose a password with at least 6 characters." |
| `auth/invalid-email` | "Please enter a valid email address." |
| anything else / undefined | `FALLBACK_MESSAGE = "Something went wrong. Please try again."` (also reused for codename-exhaustion and rollback-triggering failures) |

## File 3 (modify): `components/AuthForm/AuthForm.tsx`

- Import `useRouter` from `next/navigation` and `signUp` from `@/lib/firebase/signup`.
- Add `const router = useRouter()` and `const [isSubmitting, setIsSubmitting] = useState(false)`.
- `handleSubmit` becomes `async`. Keep existing synchronous validation exactly as-is (still returns early before anything async, so validation still gates any Firebase call).
- After `setError("")`, branch on `mode`:
  - `login`: unchanged — still just `console.log(...)`.
  - `signup`: `setIsSubmitting(true)`; `try { await signUp(email, password); router.push("/heists") } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong. Please try again.") } finally { setIsSubmitting(false) }`.
- Submit button: add `disabled={isSubmitting}`.

## File 4 (modify): `app/globals.css`

Add directly after `.btn:focus-visible`, matching the existing plain-selector convention:
```css
.btn:disabled {
  @apply opacity-50 cursor-not-allowed;
}
```
Lives in the global stylesheet (not the CSS module) because the submit button uses the shared global `.btn` class; safe no-op on the Navbar's `<a>`-based CTA.

## Tests

**`tests/lib/codename.test.ts`** (new, no mocking): deterministic `random` returning `0` yields `${ADJECTIVES[0]}${COLORS[0]}${NOUNS[0]}`; two different deterministic `random` fns yield different codenames; each word list has no duplicates (`new Set(list).size === list.length`); output matches `/^[A-Z][a-z]+[A-Z][a-z]+[A-Z][a-z]+$/`.

**`tests/lib/firebase/signup.test.ts`** (new), extending the established mocking convention to promise-based calls:
```ts
vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }))
vi.mock("firebase/auth", () => ({ createUserWithEmailAndPassword: vi.fn(), updateProfile: vi.fn(), deleteUser: vi.fn() }))
vi.mock("firebase/firestore", () => ({ collection: vi.fn(), doc: vi.fn(), getDocs: vi.fn(), query: vi.fn(), setDoc: vi.fn(), where: vi.fn() }))
vi.mock("@/lib/codename", () => ({ generateCodename: vi.fn() }))
```
Cases: calls `createUserWithEmailAndPassword` with the entered email/password; calls `updateProfile` with the codename and `setDoc` with exactly `{ id, codename }` (assert no `email` key); regenerates on collision (`getDocs` resolves `{ empty: false }` then `{ empty: true }`, asserts final write uses the second candidate); `auth/email-already-in-use` rejection maps to its message and never calls `setDoc`/`updateProfile`; unmapped error code falls back to the generic message; `updateProfile`/`setDoc` rejecting triggers `deleteUser` (rollback) and still rejects with the fallback message.

**`tests/components/AuthForm.test.tsx`** (modify): add file-scoped mocks —
```ts
vi.mock("@/lib/firebase/signup", () => ({ signUp: vi.fn() }))
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))
```
New/extended cases: signup submit calls `signUp(email, password)` then `router.push("/heists")` on success; `signUp` rejecting shows the thrown message in `role="alert"` and never calls `push`; existing login "logs the form data" test gets an added `expect(signUp).not.toHaveBeenCalled()` assertion; signup-mode empty-field/invalid-email cases assert `signUp` is not called; submit button is `disabled` while `signUp`'s promise is pending (control the promise manually in the test).

## Verification

- `npx vitest run tests/lib/codename.test.ts tests/lib/firebase/signup.test.ts tests/components/AuthForm.test.tsx` — new and updated tests passing.
- `npm test` — full suite still green (confirms the login-mode path is untouched).
- `npm run lint` — clean.
- `npm run build` — confirms the new `next/navigation` usage and async `handleSubmit` don't break prerendering.
- `npm run dev` — manually sign up with a fresh email, confirm: a real user appears in the Firebase console with a PascalCase `displayName`, a matching `users/{uid}` doc exists with `codename`/`id` and no email, the app redirects to `/heists`, and re-submitting the same email shows the "already registered" message instead of a raw error code.

## Risks / edge cases

- Query-then-write race on codename uniqueness is an accepted limitation (no transactions) — extremely unlikely collision window for near-simultaneous signups, intentionally not engineered further.
- `deleteUser` rollback assumes Firebase's "recent login" requirement is satisfied (true here since the account was just created) — if the rollback itself ever fails, its own catch swallows the error and only logs it, so the user still sees the same generic fallback message rather than a confusing second error.
- `useUser`'s app-wide `onAuthStateChanged` listener and this feature's manual `router.push` both react to the same sign-in event independently, with no coordination between them — fine for this scope, just worth knowing if a future spec adds its own auth-state-driven redirect.
- `next/navigation`'s `useRouter` needs mocking file-wide in `AuthForm.test.tsx`, or every existing test in that file will throw for lack of router context in jsdom.
