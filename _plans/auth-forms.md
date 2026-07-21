# Plan: Auth Forms (`/login`, `/signup`)

## Context

`_specs/auth-forms.md` calls for real forms on the currently-stub `/login` and `/signup` pages: email + password fields, a password show/hide toggle, a mode-appropriate submit button ("Login" / "Sign Up"), and an easy way to switch between the two forms. For now submission only needs to `console.log` the entered data — there's no backend yet. Three open questions in the spec were resolved by the user:

1. Switching between login/signup must be a **client-side toggle, not a route navigation** — flip the visible form in place.
2. Validation is light: basic email-shape check, password just needs to be non-empty.
3. On switching modes, the **email persists**, the **password resets**.

This is the first feature in the app that needs client-side interactivity (state, event handlers) — no `"use client"` component exists yet, so this also establishes that pattern for the codebase.

## Approach

Build a single shared client component, `AuthForm`, that both pages render with a different `initialMode` prop. Because the toggle is required to be client-state-only (not navigation) and email must persist across the switch, one component instance owning `mode`/`email`/`password` state is the natural fit — two separate components would just force the same state back up into a parent anyway, or violate the no-navigation constraint if built as `Link`s between routes.

Extract the password show/hide input into its own small reusable component, `PasswordField`, since it's a self-contained UI unit (input + toggle button + icon swap) with its own local visibility state, and keeps `AuthForm` focused on form/mode/validation concerns.

## Components to create

**`components/AuthForm/`** (`AuthForm.tsx`, `AuthForm.module.css`, `index.ts`) — client component (`"use client"`).
- State: `mode: "login" | "signup"` (seeded from `initialMode` prop), `email: string`, `password: string`, `errors: { email?: string; password?: string }`.
- Renders the `form-title` heading (text driven by `mode`, moved here from the page stubs so it updates on switch), an email `<input>` with inline error text, a `<PasswordField>` for the password, a submit `<button type="submit" className="btn">` labeled "Login" or "Sign Up", and a `type="button"` switch control (e.g. "Need an account? Sign Up" / "Already have an account? Login") — a plain button, not a `Link`, since it must not navigate.
- Switch handler: flips `mode`, clears `password` and `errors`, leaves `email` untouched (this is what satisfies the persist/reset requirement).
- Validation on submit: email checked against a simple shape regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), password checked for non-empty. On failure, set field errors and do not log or reset anything. On success, `console.log({ mode, email, password })`.
- Inline errors get `aria-describedby`/`aria-invalid` wiring on the inputs; use `noValidate` on the `<form>` so native browser validation doesn't short-circuit the custom messages.
- Styling: `AuthForm.module.css` starts with `@reference "../../app/globals.css";` and uses `@apply` for field spacing/error text (reusing `--color-error` → `text-error`), per CLAUDE.md's minimal-inline-Tailwind rule.

**`components/PasswordField/`** (`PasswordField.tsx`, `PasswordField.module.css`, `index.ts`) — client component.
- Props: `{ id, label, value, onChange, error?, autoComplete? }` — fully controlled, parent owns the value.
- Local state: `visible: boolean` for show/hide.
- Renders a `<label>`, an `<input type={visible ? "text" : "password"}>`, and a `type="button"` toggle button (positioned via CSS Module, `position: relative`/absolute) showing `Eye`/`EyeOff` from `lucide-react` (already a dependency, same import pattern as `Clock8` in `Navbar`), with `aria-label` reflecting the action available ("Show password"/"Hide password").

## Pages to modify

- `app/(public)/login/page.tsx` — fix the copy/paste bug (function is currently named `SignupPage`, rename to `LoginPage`), strip it down to render `<AuthForm initialMode="login" />` inside the existing `center-content`/`page-content` wrapper (heading moves into `AuthForm`).
- `app/(public)/signup/page.tsx` — same treatment, rendering `<AuthForm initialMode="signup" />`.

No changes needed to `app/(public)/layout.tsx` or `app/globals.css` — existing tokens/utility classes (`.btn`, `.form-title`, `--color-error`) cover everything needed.

## Tests

`tests/components/AuthForm.test.tsx` (Vitest + Testing Library + `@testing-library/user-event`, already a devDependency), covering:
1. Login mode renders email input, password input, "Login" button.
2. Signup mode renders "Sign Up" button.
3. Password toggle: input starts `type="password"`, click flips to `type="text"` and back, accessible name of the toggle button updates accordingly.
4. Valid submit calls `console.log` (spied via `vi.spyOn`) with `{ mode, email, password }`.
5. Submit with an empty field does not call `console.log`, and shows the relevant inline error.
6. Submit with a malformed email does not call `console.log`, shows the email error.
7. Clicking the switch control flips the visible submit button's label/mode with no router involved (proving it's pure client state).
8. Switching modes retains the typed email but clears the typed password.

## Verification

- `npm test` (or `npx vitest run tests/components/AuthForm.test.tsx`) — all new tests passing.
- `npm run lint` — clean.
- `npm run dev` — manually visit `/login` and `/signup`, confirm: fields render, show/hide toggle works, submitting valid data logs to the browser console, submitting empty/invalid fields shows inline errors and does not log, and the switch control toggles the form in place without the URL changing.
