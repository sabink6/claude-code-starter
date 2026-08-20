# Write production Firestore Security Rules

## Context

The Firestore database is still in Test Mode (`firestore.rules` at repo root is the default wide-open rule set: `allow read, write: if request.time < timestamp.date(2026, 8, 23);`). Firebase auto-generated that 30-day expiry when the project was created, and it fires in 3 days (today is 2026-08-20, expiry is 2026-08-23) — after that, **all client reads/writes to Firestore will be denied**, breaking the app. This needs real rules that let the app keep functioning while actually protecting `users` and `heists` data (currently anyone on the internet can read/write everything).

Exploration confirmed there are exactly two collections, both accessed only from client code (no Admin SDK anywhere), so rules must cover 100% of the app's access patterns or something will break:

- `users/{uid}` — `lib/firebase/signup.ts` (`setDoc`, doc id = uid, fields `{id, codename}`), `lib/firebase/users.ts` (`getUsers()` does an **unfiltered `getDocs`** over the whole collection, used to populate the assignee dropdown in `HeistForm`). No update/delete path exists anywhere.
- `heists/{id}` (`types/firestore/heist.ts`, `COLLECTIONS.HEISTS`) — created via `addDoc` in `lib/firebase/heists.ts:createHeist`, read via filtered/unfiltered queries in `useHeists`/`useHeist`, and updated via exactly three narrow patches: `claimHeistSuccess` (assignee sets `successClaimedAt`), `confirmHeistSuccess` (creator sets `finalStatus: "success"`), `rejectHeistSuccess` (creator resets both to `null`). No other field is ever updated after creation, and there's no delete path.

## Approach

Replace `firestore.rules` with rules that:

**`users/{uid}`**
- `read` (get + list): any authenticated user — required because `getUsers()` lists the whole collection for the assignee picker.
- `create`: only by the user themself (`request.auth.uid == uid`), payload restricted to exactly `{id, codename}`, `id` must equal `uid`, `codename` must be a non-empty string.
- `update`, `delete`: denied — no code path ever does either.

**`heists/{id}`**
- `read`: any authenticated user — the app's "expired heists" history view queries with no participant filter, so a per-doc rule can't be narrower than this without also changing app query logic (out of scope here).
- `create`: `request.auth != null`, `createdBy == request.auth.uid`, `assignedTo != request.auth.uid` (can't assign to self), `createdAt == request.time` (real server timestamp, not client-supplied), `deadline is timestamp`, `successClaimedAt == null`, `finalStatus == null`, `title`/`description`/`createdByCodename`/`assignedToCodename` are non-empty strings within the app's size limits (80 / 500 chars for title/description), and the payload has no extra fields.
- `update`: only three exact transitions allowed, matched by `request.resource.data.diff(resource.data).affectedKeys()` so no other field can be smuggled into the same request:
  1. **Claim**: caller is `resource.data.assignedTo`, current state is "open" (`finalStatus == null && successClaimedAt == null`), only `successClaimedAt` changes, and it must be set to `request.time`.
  2. **Confirm**: caller is `resource.data.createdBy`, current state is "pending" (`successClaimedAt != null && finalStatus == null`), only `finalStatus` changes, and it must become `"success"`.
  3. **Reject**: caller is `resource.data.createdBy`, current state is "pending", both `successClaimedAt` and `finalStatus` change and both must become `null`.
  All other fields (`title`, `description`, `createdBy`, `createdByCodename`, `assignedTo`, `assignedToCodename`, `createdAt`, `deadline`) are implicitly immutable since none of the three allowed diffs touch them.
- `delete`: denied — no delete path in the app.

## File to change

- `firestore.rules` (repo root) — full rewrite, `rules_version = '2'`.

No app code changes are needed; the rules are designed to match existing client behavior exactly (verified against `lib/firebase/heists.ts`, `lib/firebase/users.ts`, `lib/firebase/signup.ts`, and `types/firestore/heist.ts`).

## Verification

1. `firebase deploy --only firestore:rules` (or `firebase firestore:rules:release` if using the CLI's rules-only deploy) against the project configured in `firebase.json` — note `.firebaserc` currently has no project alias set, so this will need `firebase use <project-id>` first or an explicit `--project` flag; confirm the target project with the user before deploying since this affects live infrastructure.
2. Exercise the app's existing flows manually against the deployed rules (or via the Firebase Emulator Suite if preferred, to avoid touching prod before it's ready): signup (creates `users/{uid}`), heist creation, listing heists (own/assigned/expired), claim → confirm, and claim → reject. All should succeed.
3. Optionally verify negative cases in the Firebase Console Rules Playground: another user trying to update someone else's heist, a user trying to self-assign, or a client trying to update `title` alongside `successClaimedAt` — all should be denied.
4. No existing automated test suite touches rules (`tests/lib/firebase/*.test.ts` mock the SDK), so nothing in `npm test` will catch a rules regression — manual/emulator verification is the only check available.
