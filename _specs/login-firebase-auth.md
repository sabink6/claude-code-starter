# Spec for login-firebase-auth

branch: claude/feature/login-firebase-auth
figma_component (if used): N/A

## Summary
Wire the login path of the shared `AuthForm` component (rendered by `app/(public)/login/page.tsx` in `login` mode) to real Firebase Authentication. Today `AuthForm.handleSubmit` validates the inputs and then only `console.log`s them in `login` mode. Submitting valid, existing credentials should sign the user in via the Firebase Web SDK and show a success message on the page. No redirect is in scope for this spec — the user stays on the login page after a successful sign-in. Signup-mode behavior is unaffected. Only the Firebase Web (client) SDK is used, via the `auth` export from `lib/firebase/config.ts`.

## Functional Requirements
- On submit in `login` mode (after the form's existing checks: both fields present, email matches `EMAIL_PATTERN`), sign the user in with the entered email and password using the Web SDK `auth` instance from `lib/firebase/config.ts`.
- On successful sign-in, display a success message on the page. No navigation/redirect occurs — the user remains on `/login`.
- On failed sign-in (e.g. wrong password, no account with that email), surface a clear error message in the form's existing error area instead of a raw Firebase error code.
- Restrict the new behavior to `login` mode; `signup` mode submission is unaffected by this spec.
- Use only the Firebase Web SDK — no Admin SDK, no Firebase calls from server components / route handlers.

## Figma Design Reference (only if referenced)
- N/A — no design changes; this is behavioral wiring on the existing form. The form markup, fields, and styles (`AuthForm.tsx`, `Field.tsx`, `AuthForm.module.css`) stay visually the same aside from whatever surfaces the new success message.

## Possible Edge Cases
- Wrong password or no account exists for the entered email — Firebase's modern SDK typically returns a single `auth/invalid-credential` code for both cases (rather than distinguishing `auth/wrong-password` / `auth/user-not-found`); the error message should not reveal which one it was, for basic account-enumeration safety.
- Too many failed attempts — Firebase returns `auth/too-many-requests`; this must be caught and surfaced clearly rather than as a raw code.
- In-flight double submit — submitting again while a login is already running should not trigger a second `signInWithEmailAndPassword` call; consider disabling the submit button or guarding on a pending flag, matching the existing signup-mode pattern.
- Network failure / Firebase unavailable mid-flow — fail gracefully with a visible error message, no misleading success state.
- Switching from `login` to `signup` mode (or back) after a success or error message is shown — decide whether the message should be cleared.
- Re-submitting the login form again after a successful login (e.g. user hits submit twice) — decide what should happen since a session already exists.
- The `useUser` auth-state hook (used elsewhere in the app, e.g. the Navbar) will observe the newly signed-in user immediately; confirm this doesn't cause any unexpected UI change on the login page itself, since no redirect is happening.

## Acceptance Criteria
- Submitting the login form with a valid, existing email and its correct password signs the user in (verifiable via the app's own auth-state hook reflecting the signed-in user, or the Firebase console).
- A success message is visibly displayed on the page after a successful login.
- Submitting incorrect credentials shows a clear error message in the form's error area and does not sign the user in.
- No navigation or redirect occurs as a result of a successful or failed login attempt.
- Signup-mode submission and all existing form validation continue to behave exactly as before.
- Only the Firebase Web SDK is used; no Admin SDK or server-side Firebase code is added.

## Open Questions
- What should the success message say, and where should it appear — reuse the existing error/alert area (styled differently for success) or introduce a new distinct element? A: Login succesful, reuse error/alert area
- Should the success message and/or form fields persist as-is after login, or should something reset (e.g. clear the password field) now that the user is authenticated but still viewing the login form? A: no
- Should the submit button show a pending/disabled state while the sign-in call is in flight, mirroring the signup form's existing pattern? A: yes
- Should the login Firebase logic live in a separate helper (mirroring `lib/firebase/signup.ts`'s `signUp` function), consistent with the architecture decision made for signup? A: yes
- Is there a preferred wording for the sign-in error message(s), or should that be left to implementation judgment (similar to how signup's error mapping was decided)? A: no

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- A successful login submit calls the Web SDK sign-in function with the entered email and password (Firebase mocked).
- On success, a success message is displayed and no navigation occurs.
- A Firebase sign-in error (e.g. invalid credentials) is surfaced in the form's alert area and no success message is shown.
- Existing validation still blocks submission (empty fields / malformed email) before any Firebase call is made, and signup mode does not trigger the login logic.
- Submitting again while a login request is already in flight does not trigger a second sign-in call.
