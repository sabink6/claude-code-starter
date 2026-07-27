# Plan: `useHeists` Hook + Wiring into `/heists`

## Context

`_specs/use-heists-hook.md` calls for a `useHeists(filter)` hook subscribing to real-time Firestore data, where `filter` is `'active' | 'assigned' | 'expired'`, then wiring it into the static `app/(dashboard)/heists/page.tsx` stub so its three existing sections (Your Active Heists / Heists You've Assigned / All Expired Heists) each list the titles of their matching result set live.

Resolved decisions from the spec's Open Questions:
- Each result set sorts by soonest deadline first (ascending `deadline`).
- An empty section shows "Nothing here yet." placeholder text.
- `'active'`/`'assigned'` exclude a heist whose `finalStatus` is already non-null even before its deadline passes (not reachable with today's data — nothing sets `finalStatus` to anything but `null` yet — but the filter is built in now).
- The hook's return type is `Heist[] | null`, using `null` as the "still loading" sentinel — this reuses an existing precedent already in this codebase (`components/HeistForm/HeistForm.tsx`'s `users: AppUser[] | null`), rather than returning a separate loading/error object. Subscription errors are only `console.error`'d, never surfaced to the UI.

**Interpretation flagged for correction if wrong**: the spec's open-question answer "table view, placeholder, console log on error" is read here as "a rows/list-style display of titles, a loading placeholder, and console-only error logging" — not a literal HTML `<table>` with columns, since nothing else in the spec calls for tabular columns.

**Known scope boundary, not a bug**: `now` is captured once per subscription setup (inside the effect), not on a ticking interval. A heist won't automatically flip from "active" to "expired" in the UI purely because wall-clock time passes while the page stays mounted — only a fresh subscription (remount, or a change to `filter`/`user?.uid`) recomputes `now`. Only actual Firestore document writes trigger live re-evaluation against the already-fixed `now`. A polling/interval-based re-subscription would close this gap but wasn't asked for and isn't implemented here.

## Codebase facts confirmed by exploration

- `types/firestore/heist.ts`: `Heist` (id, createdAt: Date, title, description, createdBy, createdByCodename, assignedTo, assignedToCodename, deadline: Date, finalStatus: HeistStatus|null), `HeistStatus = 'success'|'failure'`, and `heistConverter` (`fromFirestore` already turns Firestore Timestamps into native `Date`s). `types/firestore/index.ts` exports `COLLECTIONS.HEISTS = "heists"`.
- `lib/firebase/config.ts` exports `auth`, `db`. `lib/firebase/auth-context.tsx` exports `useUser()` → `{ user, loading }`.
- `lib/firebase/heists.ts` currently has one export, `createHeist`. `useHeists` is added to this **same file** — heist Firestore operations are grouped by entity in this repo, not one-file-per-action.
- Zero `onSnapshot` usage exists anywhere in the repo — this is the first real-time Firestore listener. `tests/lib/firebase/auth-context.test.tsx` already establishes the exact test pattern for a subscription-based hook in this codebase (capture the listener callback via `mockImplementation`, drive it with `act()`, assert via `renderHook`'s `result.current`) — confirmed by reading it directly; mirror that shape.
- No `firestore.indexes.json`/`firebase.json` exists — only `firestore.rules` (temporary wide-open rule). No indexes-as-code setup to extend; composite indexes must be created via the Firebase console (see Verification).
- `components/Skeleton/` is a single-shape, prop-less "profile card" shimmer — not list/row-shaped, not a good fit here. Loading state uses plain "Loading…" text instead, matching this app's plain-copy style elsewhere, rather than forcing `Skeleton` to fit or modifying it for one consumer.
- `app/(dashboard)/layout.tsx` already gates all children on `useUser()` (redirects to `/login`, shows `Spinner` while resolving) — by the time `heists/page.tsx` renders, `user` is guaranteed non-null. `useHeists` still defensively no-ops when `user` is null, since it's a general-purpose hook, not one only ever called post-guard.
- `tests/lib/firebase/heists.test.ts` already exists for `createHeist` with this `firebase/firestore` mock:
  ```ts
  vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }))
  vi.mock("firebase/firestore", () => ({
    addDoc: vi.fn(),
    collection: vi.fn((_db, path) => ({ type: "collection", path })),
    serverTimestamp: vi.fn(() => ({ type: "serverTimestamp" })),
  }))
  ```
  This needs extending (see Tests) — including making the mocked `collection()` support `.withConverter()` chaining, which breaks one pre-existing exact-equality assertion that needs a one-line fix.

## Query shapes (validated against Firestore's composite-index rules)

Multiple equality/`in` filters combine freely; at most one range/inequality filter (`<`,`<=`,`>`,`>=`,`!=`) is allowed per query, and `orderBy`'s first field must be the field carrying that range filter. All three shapes below are valid Firestore queries:

| filter | filters | orderBy | composite index needed |
|---|---|---|---|
| `active` | `assignedTo == uid`, `finalStatus == null`, `deadline > now` | `deadline asc` | (assignedTo, finalStatus, deadline) |
| `assigned` | `createdBy == uid`, `finalStatus == null`, `deadline > now` | `deadline asc` | (createdBy, finalStatus, deadline) |
| `expired` | `finalStatus in ['success','failure']`, `deadline <= now` | `deadline asc` | (finalStatus, deadline) |

`expired` intentionally has no uid-based filter at all — this was explicit in the original feature request (every user's expired heists are shown, not just the current user's).

## Approach

**`lib/firebase/heists.ts` (modified)** — add `export type HeistFilter = "active" | "assigned" | "expired"` and:

```ts
export function useHeists(filter: HeistFilter): Heist[] | null {
  const { user } = useUser()
  const [heists, setHeists] = useState<Heist[] | null>(null)

  useEffect(() => {
    setHeists(null) // reset to "loading" whenever filter or uid changes

    if (!user?.uid) return

    const now = new Date()
    const ref = collection(db, COLLECTIONS.HEISTS).withConverter(heistConverter)
    const q =
      filter === "active"
        ? query(ref, where("assignedTo", "==", user.uid), where("finalStatus", "==", null), where("deadline", ">", now), orderBy("deadline", "asc"))
        : filter === "assigned"
          ? query(ref, where("createdBy", "==", user.uid), where("finalStatus", "==", null), where("deadline", ">", now), orderBy("deadline", "asc"))
          : query(ref, where("finalStatus", "in", ["success", "failure"]), where("deadline", "<=", now), orderBy("deadline", "asc"))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => setHeists(snapshot.docs.map((doc) => doc.data())),
      (error) => console.error(error),
    )

    return unsubscribe
  }, [filter, user?.uid])

  return heists
}
```

New imports needed: `useEffect`, `useState` from `react`; `onSnapshot`, `orderBy`, `query`, `where` from `firebase/firestore` (alongside existing `addDoc`, `collection`, `serverTimestamp`); `useUser` from `@/lib/firebase/auth-context`; `heistConverter` alongside the existing `CreateHeistInput`/`COLLECTIONS` import from `@/types/firestore`. No `"use client"` directive needed on this file — it's a plain module of functions/hooks, not a component; the directive matters at the component boundary, and both `createHeist` and `useHeists` are only ever called from already-`"use client"` consumers.

The effect depends on `[filter, user?.uid]`, not `[filter, user]` — the `user` object's identity changes across `onAuthStateChanged` re-emissions even when the uid is unchanged. Sorting is entirely delegated to `orderBy('deadline','asc')` — the hook does no client-side sorting.

**`components/HeistList/` (new)** — mirrors the `components/HeistForm/` folder shape.

- `HeistList.tsx` — no `"use client"` (no hooks, pure props → JSX):
  ```tsx
  type HeistListProps = { title: string; heists: Heist[] | null }

  export default function HeistList({ title, heists }: HeistListProps) {
    return (
      <>
        <h2>{title}</h2>
        {heists === null ? (
          <p>Loading…</p>
        ) : heists.length === 0 ? (
          <p>Nothing here yet.</p>
        ) : (
          <ul className={styles.list}>
            {heists.map((heist) => (
              <li key={heist.id}>{heist.title}</li>
            ))}
          </ul>
        )}
      </>
    )
  }
  ```
- `HeistList.module.css` — just `.list { @apply flex flex-col gap-2; }` with the `@reference "../../app/globals.css";` header (Tailwind's preflight, already active via `@import "tailwindcss";` in globals.css, already strips default `<ul>` bullets/margin — no need to redeclare `list-none`).
- `index.ts` — `export { default } from "./HeistList"`.
- No link to `/heists/[id]` is added — the spec only asks for titles; that's a natural follow-up, out of scope here.

**`app/(dashboard)/heists/page.tsx` (modified)** — becomes `"use client"`; existing wrapper divs/classnames are kept unchanged (minimal diff), each now wrapping a `<HeistList>`:

```tsx
"use client"

import HeistList from "@/components/HeistList"
import { useHeists } from "@/lib/firebase/heists"

export default function HeistsPage() {
  const activeHeists = useHeists("active")
  const assignedHeists = useHeists("assigned")
  const expiredHeists = useHeists("expired")

  return (
    <div className="page-content">
      <div className="active-heists">
        <HeistList title="Your Active Heists" heists={activeHeists} />
      </div>
      <div className="assigned-heists">
        <HeistList title="Heists You've Assigned" heists={assignedHeists} />
      </div>
      <div className="expired-heists">
        <HeistList title="All Expired Heists" heists={expiredHeists} />
      </div>
    </div>
  )
}
```

## Tests

**Extend `tests/lib/firebase/heists.test.ts`**: extend the shared `firebase/firestore` mock with `query`/`where`/`orderBy`/`onSnapshot`, and make mocked `collection()` return a `withConverter` stub that returns itself:
```ts
vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))
vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(),
  collection: vi.fn((_db, path) => ({
    type: "collection",
    path,
    withConverter: vi.fn(function (this: unknown) { return this }),
  })),
  serverTimestamp: vi.fn(() => ({ type: "serverTimestamp" })),
  query: vi.fn((ref, ...clauses) => ({ type: "query", ref, clauses })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  onSnapshot: vi.fn(),
}))
```
**Required one-line fix**: the existing `createHeist` test asserts `expect(call[0]).toEqual({ type: "collection", path: "heists" })` — adding `withConverter` to the mock's return value breaks this exact match. Change it to `expect(call[0]).toEqual(expect.objectContaining({ type: "collection", path: "heists" }))`.

New `describe("useHeists", ...)` block, mirroring `tests/lib/firebase/auth-context.test.tsx`'s capture-the-callback + `renderHook`/`act` pattern, with `useUser` mocked to `{ user: { uid: "uid-current" }, loading: false }` by default:
- `useHeists('active')` builds a query with `where('assignedTo','==','uid-current')`, `where('finalStatus','==',null)`, `where('deadline','>', <Date>)`, `orderBy('deadline','asc')`.
- `useHeists('assigned')` builds the same shape with `createdBy` instead of `assignedTo`.
- `useHeists('expired')` builds `where('finalStatus','in',['success','failure'])`, `where('deadline','<=', <Date>)`, `orderBy('deadline','asc')`, and never filters on `assignedTo`/`createdBy`.
- Returns `null` before the captured snapshot callback fires.
- Returns the mapped `Heist[]` once the captured callback fires with a fake snapshot, and updates again on a second callback invocation (live update).
- Unsubscribes on unmount.
- Returns `null` and never calls `onSnapshot`/`query` when `useUser()` returns `{ user: null, loading: false }`.
- Invoking the captured error callback only calls a spied `console.error` — doesn't throw, doesn't otherwise change the return value.

**New `tests/components/HeistList.test.tsx`**:
- Renders `title` as an `<h2>`.
- Shows "Loading…" when `heists` is `null`.
- Shows "Nothing here yet." when `heists` is `[]`.
- Renders one `<li>` per heist (by title text) in the order given, without re-sorting.

**New `tests/app/(dashboard)/heists/page.test.tsx`**: mock `@/lib/firebase/heists`'s `useHeists` directly (no Firestore/auth mocking needed), with `mockImplementation((filter) => ({ active: [...], assigned: [...], expired: [...] }[filter]))` using distinct fixture titles per filter; assert each wrapper div (`.active-heists`/`.assigned-heists`/`.expired-heists`) contains only its own fixture's titles.

## Verification

1. `npx vitest run tests/lib/firebase/heists.test.ts tests/components/HeistList.test.tsx "tests/app/(dashboard)/heists/page.test.tsx"`
2. `npm test`, `npm run lint`, `npm run build`
3. **Required manual step, not optional**: each of the 3 query shapes will throw `failed-precondition` the first time it runs against real data, with a direct Firebase console link to create the missing composite index. Before `npm run dev` can show real data in any section: sign in, load `/heists` once, open the browser console, and follow the auto-generated link for **each** of the 3 distinct shapes (see index table above) to create it, then wait for it to finish "Building" in the console. Until all 3 exist, all three sections stay stuck on "Loading…" forever with `failed-precondition` errors in the console only (never surfaced to the UI, per the error-handling decision above) — that's expected first-run behavior, not a code bug.
