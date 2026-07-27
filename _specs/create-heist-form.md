# Spec for create-heist-form

branch: feature/create-heist-documents
figma_component (if used): N/A

## Summary

Add a working "create heist" form at `app/(dashboard)/heists/create/page.tsx`
so an authenticated user can open a job on another crew member: fill in the
details, assign it to a registered user, and have a new heist document
written to Firestore. On success, the user is redirected to `/heists` to see
it in the list.

## Functional Requirements

- A form collects the heist's `title`, `description`, and an `assignedTo`
  selection (the user the heist is being assigned to).
- The "assign to" selector is populated from the existing `users` Firestore
  collection, showing each user's codename and carrying their uid as the
  underlying value.
- On submit, a new document is written to a `heists` Firestore collection
  using the `CreateHeistInput` shape (`types/firestore/heist.ts`):
  - `title`, `description` — from the form.
  - `createdBy` / `createdByCodename` — the current signed-in user's uid and
    codename.
  - `assignedTo` / `assignedToCodename` — the uid and codename of the
    selected user.
  - `createdAt` — set programmatically at submit time, not user input.
  - `deadline` — set programmatically at submit time, 48 hours out from
    creation, not user input.
  - `finalStatus` — initialized to `null`.
- On a successful write, the user is redirected to `/heists`.
- On a failed write, the user stays on the form and sees an error message —
  no redirect happens.

## Possible Edge Cases

- No other registered users exist yet to assign the heist to (the assignee
  list is empty aside from the current user).
- A user tries to assign a heist to themselves.
- The current user's own codename hasn't finished loading yet when they
  submit.
- The Firestore write fails (permissions, network) after the form has
  already been filled in.
- Very long or empty `title`/`description` input.

## Acceptance Criteria

- Submitting the form with a title, description, and an assignee creates a
  heist document in the `heists` Firestore collection matching the
  `CreateHeistInput` shape.
- `createdAt` and `deadline` are always set by the app at submit time, never
  editable by the user — `deadline` is 48 hours after `createdAt`.
- `finalStatus` is always written as `null` on creation.
- The assignee selector shows codenames sourced from the `users` collection,
  and the chosen user's uid + codename both land on the created document.
- After a successful write, the user is redirected to `/heists`.
- A failed write surfaces an error message to the user and does not
  redirect.

## Open Questions

- Should a user be allowed to assign a heist to themselves? A: no
- Any length limits/validation on `title` or `description`? A: light validattion, decide yourself
- Should the assignee list exclude the current user, or show every
  registered user with no filtering? A: don't show current logged in user
- What should the assignee selector show if no other users exist yet? A: Select/Assign to.. with empty list, you decide

## Testing Guidelines

Create test file(s) in the ./tests folder for the new feature, and create
meaningful tests for the following cases, without going too heavy:

- Submitting valid form data writes a `heists` document with the correct
  shape (`createdBy`/`createdByCodename` from the current user,
  `assignedTo`/`assignedToCodename` from the selection, `createdAt` and
  `deadline` present, `finalStatus` null).
- A successful submission redirects to `/heists`.
- A failed Firestore write shows an error message and does not redirect.
- The assignee selector renders codenames fetched from the `users`
  collection.
