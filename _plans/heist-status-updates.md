# Heist Status Updates — Implementation Plan

Spec: `_specs/heist-status-updates.md` (branch `claude/feature/heist-status-updates`)

## Context

`finalStatus` on a `Heist` can currently only ever be set by editing Firestore directly — no code path ever writes it. Two consequences: the "History" panel (which queries `finalStatus in ["success","failure"]`) never receives anything, and a heist whose deadline passes without ever being touched vanishes from every panel (it fails the `active`/`assigned` `deadline > now` check, but also fails History's `finalStatus` check since that's still `null`).

The spec resolves this with a two-step outcome flow — assignee claims success, creator confirms or rejects it — plus an explicit decision (from the spec's Open Questions) that a missed deadline should be treated as failure **for display only**, never written to Firestore, since there's no Cloud Functions setup in this repo (`firebase.json` has no `functions` block, no `firebase-functions`/`firebase-admin` dependency) and adding one is out of scope. Rejecting a claim reopens the heist rather than finalizing it as a failure, so the assignee can still act if time remains.

This plan was produced by an Explore → Plan agent pipeline that read the spec, the current data layer (`lib/firebase/heists.ts`, `types/firestore/heist.ts`), every heist-related component, and the test conventions in `tests/`. I've independently verified the cited files/line numbers below.

## Data model — `types/firestore/heist.ts`

Since `"failure"` will now never be written (only ever derived), narrow the persisted union and add a `successClaimedAt` field to track the pending claim:

- `HeistStatus` → `"success"` only (drop `"failure"` from the persisted union).
- `Heist`, `CreateHeistInput`, `UpdateHeistInput`: add `successClaimedAt: Date | null` (create input: always `null`; update input: `FieldValue | Date | null`).
- `heistConverter.fromFirestore`: add `successClaimedAt: snapshot.data().successClaimedAt?.toDate() ?? null`, matching the existing `createdAt`/`deadline` conversion pattern.

## Data layer — `lib/firebase/heists.ts`

- `createHeist`: add `successClaimedAt: null` to the write payload; add `"successClaimedAt"` to the `NewHeistInput` `Omit`.
- Three new mutation functions, following `createHeist`'s try/catch → `throw new Error(FALLBACK_MESSAGE)` convention, using `updateDoc` (new import) + the existing `doc`/`db`/`COLLECTIONS`:
  - `claimHeistSuccess(id)` → `updateDoc(ref, { successClaimedAt: serverTimestamp() })`
  - `confirmHeistSuccess(id)` → `updateDoc(ref, { finalStatus: "success" })`
  - `rejectHeistSuccess(id)` → `updateDoc(ref, { successClaimedAt: null, finalStatus: null })` — resets to the same shape as a never-claimed heist (reopens it, per the spec's resolved answer that rejection isn't final).
- **Query changes in `useHeists`**, all three filters simplified to a single `deadline` boundary (this is the core fix):
  - `active`: `assignedTo == user && deadline > now`, orderBy deadline asc — **drop** the `finalStatus == null` clause.
  - `assigned`: `createdBy == user && deadline > now`, orderBy deadline asc — **drop** the `finalStatus == null` clause.
  - `expired` (History): `deadline <= now`, orderBy deadline desc — **drop the `finalStatus in [...]` clause entirely.**

  Why dropping `finalStatus` everywhere is correct, not a regression: every heist has a `deadline`, so it's always in exactly one bucket (`> now` or `<= now`), and can never be stranded. A heist confirmed successful *before* its deadline stays visible in `active`/`assigned` (with a success badge, no buttons) until its deadline naturally passes, then moves to History — this matches the spec's own framing of History as "expired heists," and avoids reintroducing an invisibility gap that outcome-gating would cause. No composite-index change needed beyond what today's queries already required (in fact `active`/`assigned` now need one fewer equality field).

## New shared logic — `lib/heistStatus.ts` (new file)

Single source of truth for status/role derivation, pure and independently testable:

```ts
export type HeistDisplayStatus = "open" | "pending" | "success" | "failure"
export type HeistViewerRole = "assignee" | "creator" | "other"

getHeistDisplayStatus(heist, now = new Date()): HeistDisplayStatus
// finalStatus === "success" -> "success"
// deadline <= now           -> "failure"   (derived, never written)
// successClaimedAt set      -> "pending"
// else                      -> "open"

getHeistViewerRole(heist, uid): HeistViewerRole
// assignedTo === uid -> "assignee" (checked first)
// createdBy === uid  -> "creator"
// else               -> "other"
```

Checking `assignedTo` before `createdBy` means if a user were ever both (currently prevented — see below), they resolve to `"assignee"` only, so they never see Confirm/Reject on their own claim, satisfying "no self-confirmation" with no special-case branch.

## Self-assignment guard — no change needed

`components/HeistForm/HeistForm.tsx:48-50` already filters the current user out of the assignee dropdown (`eligibleUsers = users.filter(m => m.id !== user?.uid)`). Confirmed via direct exploration — this already satisfies the spec's open question. No work item here.

## Shared actions component — `components/HeistActions/` (new)

One-folder-per-component: `HeistActions.tsx`, `HeistActions.module.css`, `index.ts`.

- `type HeistActionsProps = { heist: Heist }` — calls `useUser()` internally (the only place viewer identity is needed for this flow, so `HeistCard`/`HeistCardGrid`/`HeistList`/the list page never need `useUser()` themselves).
- Computes `role = getHeistViewerRole(heist, user?.uid)`, `status = getHeistDisplayStatus(heist)`.
  - `role === "assignee" && status === "open"` → "Mark as Success" button (`className="btn"`) → `claimHeistSuccess`.
  - `role === "creator" && status === "pending"` → "Confirm" (`className="btn"`) and "Reject" (`className="btn-reject"`, new style) buttons → `confirmHeistSuccess` / `rejectHeistSuccess`.
  - Anything else (including `"other"`, or a participant viewing a resolved heist) → render `null`.
- Local `isSubmitting` boolean (mirrors `HeistForm.tsx`'s pattern) disables both buttons once clicked — covers rapid double-clicks. On failure, reset it and show a `role="alert"` message using `FALLBACK_MESSAGE`. On success, don't manually reset anything — the existing real-time `onSnapshot` subscription delivers the updated heist, `role`/`status` are re-derived, and the button naturally stops rendering. No optimistic updates or manual refetch needed anywhere.

## Call-site integration

- **`components/HeistCard/HeistCard.tsx`**: import `HeistActions`, `StatusBadge`, `getHeistDisplayStatus`. Render `<StatusBadge status={status} />` near the header when `status !== "open"`, and `<HeistActions heist={heist} />` after the existing time-left row. Prop signature unchanged (`{ heist: Heist }`).
- **`components/HeistList/HeistList.tsx`** (History panel, line 25): replace `heist.finalStatus && <StatusBadge status={heist.finalStatus} />` with `<StatusBadge status={getHeistDisplayStatus(heist)} />` (unconditional — every item here is guaranteed resolved by the query itself). No `HeistActions` here — nothing is actionable once expired.
- **`components/HeistCardGrid/HeistCardGrid.tsx`**, **`app/(dashboard)/heists/page.tsx`**: no changes (pure pass-through; query changes are transparent).
- **`app/(dashboard)/heists/[id]/page.tsx`**: replace the four `heist.finalStatus` truthy-checks with a single `status = getHeistDisplayStatus(heist, now)`, reusing the page's existing `now` state (already ticks every 60s — this satisfies the spec's "opportunistic check" answer, just needs to feed into the new helper). Add `<HeistActions heist={heist} />` in a new section near the timeline/header.

## `StatusBadge` — `components/StatusBadge/StatusBadge.tsx`

Change the prop type from `HeistStatus` to `Exclude<HeistDisplayStatus, "open">`, add a `"pending"` branch (variant class `status-badge-pending`, label "pending confirmation", `aria-label="Status: pending confirmation"` — distinct phrasing from "Outcome: ..." since it isn't a final outcome yet). Existing success/failure label/aria-label text stays unchanged, so existing test assertions for those two keep passing.

## CSS — `app/globals.css`

- New `--color-warning: #FDC700` token in the `@theme` block (~line 11, alongside `--color-success`/`--color-error`), and `.status-badge-pending { @apply bg-warning/15 text-warning; }` alongside the existing two variants (~line 157).
- New `.btn-reject` style alongside `.btn` (~line 234): outlined/transparent using `border-error`/`text-error`, `bg-error/10` on hover, same focus-visible and disabled treatment as `.btn`.
- `components/HeistActions/HeistActions.module.css`: small `.actions` (flex row, gap) and `.error` (small error text) classes, `@reference "../../app/globals.css"` per convention.

## Test plan

- **`tests/lib/firebase/heists.test.ts`**: add `updateDoc: vi.fn()` to the Firestore mock. Update `createHeist` assertions for `successClaimedAt: null`. Update the `active`/`assigned` `useHeists` tests to drop the `finalStatus` assertion and add `expect(where).not.toHaveBeenCalledWith("finalStatus", ...)`. Rewrite the `expired` test for the new `deadline <= now`-only query. Add new `describe` blocks for `claimHeistSuccess`/`confirmHeistSuccess`/`rejectHeistSuccess` (payload + `updateDoc` rejection → `FALLBACK_MESSAGE`).
- **`tests/lib/heistStatus.test.ts`** (new): pure unit tests for `getHeistDisplayStatus` (open/pending/success/derived-failure, including claimed-but-expired-unconfirmed → failure) and `getHeistViewerRole` (assignee/creator/other/no-uid/both-roles-resolves-assignee).
- **`tests/components/HeistActions.test.tsx`** (new): assignee+open shows "Mark as Success" and calls `claimHeistSuccess`; creator+open renders nothing; assignee+pending renders nothing; creator+pending shows Confirm/Reject and calls the right functions; non-participant renders nothing at any status; resolved heist (success/failure) renders nothing for either party; mutation rejection shows an error and re-enables the button.
- **`tests/components/StatusBadge.test.tsx`**: add a `"pending"` case.
- **`tests/components/HeistCard.test.tsx`** / **`tests/components/HeistList.test.tsx`** / **`tests/app/(dashboard)/heists/[id]/page.test.tsx`**: update the `fakeHeist()` fixtures to include `successClaimedAt: null`; the `[id]` page test's existing `finalStatus: "failure"` fixture must be rewritten as `finalStatus: null` + a past `deadline` (derived-failure path, since `"failure"` is never literally persisted). Add coverage for badge/button rendering per state, and for `HeistList` specifically, a case proving an expired-never-confirmed heist now correctly shows a `"failure"` badge — the direct regression test for the bug this feature fixes.

## Flagged judgment calls (not hard-derived from the spec — flag, don't block on)

1. A confirmed-success heist stays in `active`/`assigned` (not moved to History) until its deadline passes — see the query-change rationale above. This is the interpretation that avoids reintroducing an invisibility gap; worth a quick gut-check against product intent but not worth blocking implementation on.
2. No badge is shown for the `"open"` state (matches today's "no badge unless there's a status" convention). The spec's wording could be read as wanting all four states visibly badged — low-risk either way.
3. `--color-warning: #FDC700` is a new, invented token — reasonable and convention-consistent, open to a design tweak later.
4. No Firestore composite indexes are declared for `active`/`assigned` (the repo's `firestore.indexes.json` is currently empty) — pre-existing gap, not newly introduced, and now smaller (one fewer equality field per query) than before.
5. No server-side idempotency/locking on the three new mutations — consistent with the rest of the codebase's simplicity and the explicit out-of-scope status of Cloud Functions; a real but very low-probability race for a small crew app.

## Verification

- `npm run lint`, `npm test -- --run`, `npm run build` all pass.
- Manually run `npm run dev`, sign in as two different users (one heist's assignee and creator), and walk the flow end to end: create a heist, claim success as the assignee, confirm as the creator (badge flips to success, buttons disappear for both), then repeat and reject instead (heist reopens, "Mark as Success" reappears for the assignee). Also verify a heist left untouched past its 48h deadline shows up in History as "failure" for both parties, and that non-participants never see action buttons anywhere.
