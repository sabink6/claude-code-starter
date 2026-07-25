# Spec for signup-firebase-auth

branch: feature/user-signup
figma_component (if used): N/A

## Summary
Turn the signup path of the shared `AuthForm` component (rendered by `app/(public)/signup/page.tsx` in `signup` mode) into a real account-creation flow using the Firebase Web SDK. Today `AuthForm.handleSubmit` validates the inputs and then only `console.log`s them. For signup, it should instead create a Firebase Auth user with the entered email + password, generate a random human-readable "codename," set it as the user's Auth `displayName`, and write a document to a Firestore `users` collection holding the codename and the user's uid — but **not** their email. Login-mode behavior is unchanged. Only the Firebase Web (client) SDK is used, via the `auth` and `db` exports from `lib/firebase/config.ts`.

## Functional Requirements
- On submit in `signup` mode (after the form's existing checks: both fields present, email matches `EMAIL_PATTERN`), create a Firebase Auth account with the entered email and password using the Web SDK `auth` instance from `lib/firebase/config.ts`.
- Generate a codename by picking one word from each of three distinct word sets and concatenating them in PascalCase (e.g. `SilentCrimsonFox`). Each set holds a distinct category of word, and words within a set are unique.
- Set the newly created user's Firebase Auth `displayName` to the generated codename.
- Create a document in a Firestore `users` collection (via the `db` export) storing the codename under a field named `codename` and the user's uid, and explicitly **not** the email.
- Surface signup failures in the form's existing error area (the `styles.error` / `role="alert"` paragraph, driven by the `error` state) instead of only logging — this will require `handleSubmit` to become async and handle rejected Firebase promises.
- Restrict the new behavior to `signup` mode; `login` mode submission stays as-is for this spec (a separate login spec will handle it).
- Use only the Firebase Web SDK — no Admin SDK, no Firebase calls from server components / route handlers.

## Figma Design Reference (only if referenced)
- N/A — no design changes; this is behavioral wiring on the existing form. The form markup, fields, and styles (`AuthForm.tsx`, `Field.tsx`, `AuthForm.module.css`) stay visually the same.

## Possible Edge Cases
- Email already registered — Firebase returns `auth/email-already-in-use`; show a clear message in the error area, not a raw code.
- Weak password — the form only checks non-empty, but Firebase enforces a 6-character minimum and returns `auth/weak-password`; this must be caught from the Firebase response and surfaced.
- Partial success — the Auth user is created but a follow-up step (`updateProfile` for displayName, or the `users` doc write) fails, leaving a signed-in user with no codename and/or no profile document. Define what the user sees and whether/how this is recovered or retried.
- In-flight double submit — submitting again while a signup is already running should not trigger a second `createUserWithEmailAndPassword`; consider disabling the submit button or guarding on a pending flag.
- Codename collision — two signups could randomly produce the same codename; clarify whether uniqueness is required (see Open Questions).
- The global `useUser` auth listener (from the merged auth-state-hook feature) will immediately observe the newly signed-in user; confirm this does not cause an unwanted redirect/flash mid-signup before any intended post-signup navigation.
- Network failure / Firebase unavailable mid-flow — fail gracefully with a visible message and no misleading success state.
- Firestore test-mode rules currently allow open writes (expiring ~2026-08-23), so the `users` write will succeed now; note this is relying on temporary open rules.

## Acceptance Criteria
- Submitting the signup form with a valid, unused email and an acceptable password creates a real Firebase Auth user (verifiable in the Firebase console).
- The created user's `displayName` is a non-empty three-word PascalCase codename.
- A document exists in the `users` collection containing the user's uid and a `codename` field equal to the `displayName`, with no email stored anywhere in the document.
- Repeated signups produce varying codenames drawn across all three sets.
- Signup errors (email already in use, weak password, network failure) appear in the form's error area and do not silently create a broken/partial account without feedback.
- Login-mode submission and all existing form validation still behave exactly as before.
- Only the Firebase Web SDK is used; no Admin SDK or server-side Firebase code is added.

## Open Questions
- After successful signup, should the user be redirected (e.g. to `/heists`) or stay put in a signed-in state? (Redirect wiring was intentionally deferred in the auth-state-hook spec; this may want to align with that follow-up.) A: redirect to heists
- Firestore `users` document ID: use the user's uid as the doc ID (one doc per user, natural key) or an auto-generated ID with the uid as a field? The requirement says store the "id" — clarify doc-id vs. field. A: field 'id' (string) is the user's Firebase Auth UID, ocument ID is matching FirebaseAuth user ID
- Must codenames be globally unique (requiring a Firestore check + regenerate-on-collision loop), or is random collision acceptable for now? A: unique
- Where should the codename generator and its three word sets live (e.g. a `lib/` utility), and how many words per set (this determines the number of possible unique combinations)? A: `lib/` utility, 3 distinct word sets you decide how many words 
- Should the shared `AuthForm` component own the Firebase signup logic directly, or should that logic be extracted into a separate helper/hook that the form calls (keeping `AuthForm` focused on form state)? This is an architecture choice for the plan stage. A: a separate helper/hook
- Is revisiting the open Firestore security rules in scope here, or explicitly left to a later security-rules spec? A: password strenth, email errors, you decide

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- The codename generator returns three PascalCase words, one from each set, and varies across calls (seed/mock randomness for determinism where needed).
- A successful signup submit calls the Web SDK account-creation function with the entered email and password (Firebase mocked).
- On success, `displayName` is set to the generated codename and a `users` document is written with the codename and uid but **no** email (assert the written payload shape).
- A Firebase signup error (e.g. email already in use) is surfaced in the form's alert area and no `users` write is attempted.
- Existing validation still blocks submission (empty fields / malformed email) before any Firebase call is made, and login mode does not trigger the signup logic.
