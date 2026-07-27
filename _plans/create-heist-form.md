# Plan: Create Heist Form

## Context

`_specs/create-heist-form.md` calls for turning the static stub at `app/(dashboard)/heists/create/page.tsx` into a working form: fill in a title, description, and an assignee, submit, and a new document lands in a Firestore `heists` collection using the `CreateHeistInput` type already defined in `types/firestore/heist.ts` (built in a prior session, alongside `Heist`, `UpdateHeistInput`, and `heistConverter`). `createdAt` and `deadline` must never be user input — `createdAt` is a Firestore `serverTimestamp()`, `deadline` is a client-computed Date 48 hours after creation. `finalStatus` always starts `null`. On success, redirect to `/heists`; on failure, show an error and stay put.

Open questions resolved by the user (in the spec):
1. No self-assignment — the assignee dropdown excludes the current signed-in user.
2. Light validation only (non-empty fields) — sensible max-lengths are my call.
3. If no other users exist yet, the assignee control shows an empty-state option and the form must not be submittable.

## Codebase facts confirmed by exploration

- `useUser()` (`@/lib/firebase/auth-context`) → `{ user: User | null, loading: boolean }`. The current user's codename is already sitting on `user.displayName` (set via `updateProfile(..., { displayName: codename })` at signup in `lib/firebase/signup.ts`) — no extra Firestore read needed to know the *current* user's own codename.
- `lib/firebase/config.ts` exports `auth`, `db`.
- `lib/firebase/signup.ts` is the established shape for a Firestore-writing action module: one action per file, a `FALLBACK_MESSAGE` const, try/catch wrapping the SDK call, throws a plain `Error` with a friendly message. It writes `users/{uid}` docs shaped `{ id, codename }` as an inline object literal — there's no shared type for that document today, and this feature shouldn't invent one (out of scope — keep the new "fetch users" helper's return type minimal and local).
- No `<select>`/dropdown/listbox precedent exists anywhere in the repo, and no headless-UI dependency is installed (`package.json` deps are only `firebase`, `lucide-react`, `next`, `react`, `react-dom`). Per CLAUDE.md's minimal-dependencies rule, this is a plain native `<select>`.
- `components/AuthForm/AuthForm.tsx` + `AuthForm.module.css` is the established client-form pattern: `FormMessage = { type: "success"|"error"; text } | null` state, `role="alert"` for errors, `isSubmitting` disabling submit during the async call, try/catch/finally, and — critically — `signUp`'s success path calls `router.push("/heists")` (not `replace`). That's the right precedent here too: this is a post-action navigation after a successful create, not an auth-redirect guard, so CLAUDE.md's `router.replace()` route-guard convention doesn't apply. `Field.tsx` is an internal, non-barrel-exported subcomponent of `AuthForm` — not importable from a new form, so `HeistForm` needs its own equivalent markup/styling (mirroring the same class-naming shape, not the file).
- Test-mocking convention for Firestore modules, exact shape from `tests/lib/firebase/signup.test.ts`, to extend for the new modules:
  ```ts
  vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }))
  vi.mock("firebase/firestore", () => ({
    collection: vi.fn((_db, path) => ({ type: "collection", path })),
    getDocs: vi.fn(),
    addDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ type: "serverTimestamp" })),
    // ...other SDK functions as needed, same pass-through-fake shape
  }))
  ```
- `app/(dashboard)/heists/page.tsx` and `heists/[id]/page.tsx` are both static stubs with zero Firestore logic — untouched, out of scope.
- `components/Navbar/Navbar.tsx` already links to `/heists/create` via a `.btn`-styled "Create New Heist" link — no Navbar change needed.
- `firestore.rules` is still the temporary wide-open rule (expires 2026-08-23) — not a blocker, not touched by this feature.
- Component convention: `components/<Name>/{<Name>.tsx, <Name>.module.css, index.ts}`, imported via `@/components/<Name>`. Test convention: mirrors source path under `tests/`. CSS Modules using `@apply` with theme tokens need `@reference "../../app/globals.css";` at the top. No semicolons. Tailwind utilities combine into a custom class via `@apply` rather than stacking in JSX.

## Architectural decision: extract `components/HeistForm/`

`app/(dashboard)/heists/create/page.tsx` stays a thin Server Component (no `"use client"`) that just renders `<HeistForm />` under its existing heading — mirroring how `login/page.tsx`/`signup/page.tsx` are thin wrappers around `<AuthForm />`.

The alternative — writing the form's state/effects directly inline in the page file — has exactly one precedent in this repo: `app/(public)/preview/page.tsx`, which is explicitly flagged (in its own comment and in CLAUDE.md) as a scratch/demo page, not a template for real features. Every other non-trivial piece of UI here (`Avatar/`, `Skeleton/`, `Spinner/`, `Navbar/`) lives under `components/<Name>/` regardless of how many routes call it — several of them have exactly one real call site today. So the deciding factor isn't "is this shared," it's "does this page hold non-trivial markup/state," and a three-field form with an async Firestore write, a user-fetch effect, and validation clearly does. Separately: `UpdateHeistInput` already exists in `types/firestore/heist.ts` today (not a hypothetical), so a standalone `HeistForm` leaves a clean seam for a future edit flow — without this pass adding any `mode`/`initialValues` plumbing for it (`/heists/[id]` stays untouched).

## Approach

**`lib/firebase/heists.ts` (new)** — one small Firestore-writing module, same shape as `signup.ts`. Exports `createHeist`, typed via `Omit<CreateHeistInput, "createdAt" | "deadline" | "finalStatus">` (derived from the real type so it can't drift), which internally computes `createdAt` (`serverTimestamp()`), `deadline` (`new Date(Date.now() + 48 * 60 * 60 * 1000)`), and `finalStatus: null` before calling `addDoc(collection(db, COLLECTIONS.HEISTS), ...)`. No `heistConverter` involved — that's documented as the read path; `CreateHeistInput` is already the write shape. Wraps the call in try/catch, throwing a `FALLBACK_MESSAGE` Error on failure. (Named `heists.ts`, not `create-heist.ts`, since — unlike login/signup/logout, which are genuinely distinct auth actions — heist operations are CRUD on one entity, and the anticipated future edit feature should land its `updateHeist` in this same file rather than a sibling `update-heist.ts`.)

**`lib/firebase/users.ts` (new)** — a minimal, generic "fetch all registered users" module: `getUsers(): Promise<AppUser[]>` where `AppUser = { id: string; codename: string }`, reading `getDocs(collection(db, "users"))` and mapping each doc to `{ id: doc.id, codename: doc.data().codename }`. Deliberately does *not* bake in "exclude current user" — that's presentation logic and belongs in `HeistForm`, which already has the current uid via `useUser()`. Hardcodes the `"users"` collection name literal, matching `signup.ts`'s existing style, rather than extending `types/firestore/index.ts`'s `COLLECTIONS` const (that's scoped to the heist feature today — adding a `USERS` entry there for one call site is unnecessary scope creep). Same try/catch/`FALLBACK_MESSAGE` shape as `heists.ts`.

**`components/HeistForm/HeistForm.tsx` (new)** — `"use client"`. State: `title`/`description`/`assignedTo` (uid, `""` = unselected), `users: AppUser[] | null` (`null` = still loading), `message: { type: "error"; text } | null`, `isSubmitting`. Derived: `eligibleUsers = (users ?? []).filter(u => u.id !== user?.uid)` — this is where self-assignment exclusion structurally happens, not just a validation check. On mount, an effect calls `getUsers()`; on failure, sets `users` to `[]` and shows an error (so the select never gets stuck loading forever).

The assignee `<select>` is disabled whenever `users === null || eligibleUsers.length === 0 || isSubmitting`, with its placeholder `<option>` text switching between "Loading crew members…" / "Select an assignee…" / "No crew members available yet" — and the submit button is disabled under the same condition, so an empty assignee list makes the form structurally unsubmittable, not just validated-against after a doomed click.

Validation on submit (light, mirroring `AuthForm`'s early-return style): trimmed title/description/assignee all non-empty; `MAX_TITLE_LENGTH = 80` / `MAX_DESCRIPTION_LENGTH = 500`; a defensive `!user?.displayName` guard (belt-and-suspenders — the dashboard layout guard already ensures `user` is non-null by the time this mounts); `assignedTo !== user.uid` (also already structurally prevented by `eligibleUsers` excluding self); and the selected id must resolve to a real entry in `eligibleUsers`. On any failure, `role="alert"` error text, mirroring `AuthForm`. On success, `router.push("/heists")` immediately (no inline success message — matches `AuthForm`'s `signUp` branch, not its `signIn` branch).

**`components/HeistForm/HeistForm.module.css` (new)** — same visual language as `AuthForm.module.css` (`@reference`, `.form`/`.field`/`.label`/`.error`), plus new `.textarea` and `.select` rules (including a `.select:disabled` state).

**`components/HeistForm/index.ts` (new)** — `export { default } from "./HeistForm"`.

**`app/(dashboard)/heists/create/page.tsx` (modified)** — minimal diff off the current stub: keep the `center-content`/`page-content`/`form-title` shell, add `import HeistForm from "@/components/HeistForm"` and render `<HeistForm />` under the existing `<h2>`. Stays a Server Component.

## Tests

**`tests/lib/firebase/heists.test.ts` (new)**: mocks `addDoc`/`collection`/`serverTimestamp` per the shape above.
- calls `addDoc` against the heists collection with the caller-supplied fields passed through unchanged
- sets `createdAt` to the `serverTimestamp()` sentinel
- sets `deadline` to exactly 48 hours after "now" (`vi.useFakeTimers()` + `vi.setSystemTime(...)`, restore in `afterEach`)
- always writes `finalStatus: null`
- throws `FALLBACK_MESSAGE` when `addDoc` rejects

**`tests/lib/firebase/users.test.ts` (new)**: mocks `collection`/`getDocs`.
- queries the `users` collection
- maps Firestore docs into `{ id, codename }[]`
- throws `FALLBACK_MESSAGE` when `getDocs` rejects

**`tests/components/HeistForm.test.tsx` (new)**: mocks `@/lib/firebase/heists` (`createHeist`), `@/lib/firebase/users` (`getUsers`), `@/lib/firebase/auth-context` (`useUser`), and `next/navigation` (`useRouter` → `{ push: mockPush }`).
- renders assignee options from `getUsers`, excluding the current signed-in user
- shows the empty-state option and disables submit when the only registered user is the current one
- submitting valid data calls `createHeist` with `title`/`description`, `createdBy`/`createdByCodename` from the current user, `assignedTo`/`assignedToCodename` from the selected option
- a successful submission calls `router.push("/heists")`
- a failed `createHeist` shows a `role="alert"` error and does not push
- empty title/description/assignee blocks submission (`role="alert"`, `createHeist` not called)
- over-max-length title or description blocks submission

## Verification

- `npx vitest run tests/lib/firebase/heists.test.ts tests/lib/firebase/users.test.ts tests/components/HeistForm.test.tsx`
- `npm test` — full suite green
- `npm run lint`
- `npm run build`
- `npm run dev` manual walkthrough:
  1. Normal creation — with at least two accounts existing, log in, go to `/heists/create`, fill in title + description, pick the other user as assignee, submit. Expect redirect to `/heists`; confirm in the Firebase console that the new `heists` doc has `createdAt` populated, `deadline` ~48h later, `finalStatus: null`, correct `assignedTo`/`assignedToCodename`.
  2. No-assignee-available — log in as the only registered user, go to `/heists/create`. Expect the assignee select to show the empty-state copy and be disabled, and the submit button disabled.
  3. Firestore failure isn't practically reproducible by hand through the UI (would need revoking rules mid-session) — this path is covered only by the automated `HeistForm.test.tsx` and `heists.test.ts` failure cases, not a manual repro.
