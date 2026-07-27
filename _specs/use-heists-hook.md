# Spec for use-heists-hook

branch: feature/fetch-heists
figma_component (if used): N/A

## Summary

Add a `useHeists` hook that subscribes to real-time heist data from
Firestore and returns an array of heist objects for one of three named
result sets: heists currently assigned to the signed-in user, heists the
signed-in user has assigned to someone else, or heists that have expired.
Wire it into `app/(dashboard)/heists/page.tsx` so each of its three existing
sections (Your Active Heists / Heists You've Assigned / All Expired Heists)
lists the titles of its matching result set.

## Functional Requirements

- `useHeists` takes one argument identifying which result set to fetch:
  `'active'`, `'assigned'`, or `'expired'`.
- The subscription is real-time — the returned array updates live as
  matching Firestore documents change, without a manual refresh.
- `'active'` — heists where `assignedTo` is the signed-in user's uid and
  `deadline` has not yet passed.
- `'assigned'` — heists where `createdBy` is the signed-in user's uid and
  `deadline` has not yet passed.
- `'expired'` — heists where `deadline` has passed and `finalStatus` is not
  `null` (i.e. it's `'success'` or `'failure'`), regardless of who created
  or was assigned the heist.
- `app/(dashboard)/heists/page.tsx` calls the hook three times (once per
  value) and renders just the `title` of each heist in the matching
  section.

## Possible Edge Cases

- `'expired'` deliberately ignores `createdBy`/`assignedTo` — any signed-in
  user sees the titles of every expired heist site-wide, not just their
  own. Confirming this is intentional, since it's a real (if minor) privacy
  choice.
- A section with zero matching heists — what should render there?
- The hook is called before the signed-in user's uid is available (auth
  state still resolving).
- A heist whose `finalStatus` gets set before its `deadline` passes (once a
  future "resolve a heist" feature exists) — should it still count as
  `'active'`/`'assigned'`, or should a non-null `finalStatus` also pull it
  out of those two sets early? Not reachable with today's data (nothing yet
  sets `finalStatus` to anything but `null` at creation), but worth a
  decision before it becomes reachable.
- Very large numbers of expired heists site-wide, with no pagination.

## Acceptance Criteria

- Calling `useHeists('active')` returns only heists assigned to the current
  user with a future deadline, and updates live when matching data changes.
- Calling `useHeists('assigned')` returns only heists created by the current
  user with a future deadline, and updates live when matching data changes.
- Calling `useHeists('expired')` returns only heists with a past deadline
  and a non-null `finalStatus`, across all users, and updates live.
- `/heists` renders the titles of each of the three result sets in their
  corresponding existing section.

## Open Questions

- Should heists within a section be sorted (e.g. soonest deadline first),
  or is insertion/document order acceptable? A: soonest first
- Should a section with no results show placeholder copy (e.g. "Nothing
  here yet"), or stay empty? A: show info nothing here yet
- Should `useHeists` expose anything beyond the plain array (e.g. a loading
  or error state), or is a bare array sufficient for now? A: table view, placeho;der, console log on error
- Should `'active'`/`'assigned'` also exclude a heist whose `finalStatus`
  is already non-null, ahead of its deadline passing? A: yes

## Testing Guidelines

Create test file(s) in the ./tests folder for the new feature, and create
meaningful tests for the following cases, without going too heavy:

- `useHeists('active')` subscribes with a query matching the current user's
  `assignedTo` and an unexpired deadline, and reflects live updates from the
  subscription.
- `useHeists('assigned')` subscribes with a query matching the current
  user's `createdBy` and an unexpired deadline.
- `useHeists('expired')` subscribes with a query matching a passed deadline
  and a non-null `finalStatus`, with no user-based filter.
- The subscription is torn down (unsubscribed) on unmount.
- `/heists` renders the titles returned by each of the three hook calls in
  their respective sections.
