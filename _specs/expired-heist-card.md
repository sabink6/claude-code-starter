# Spec for expired-heist-card

branch: feature/expired-heist-card
figma_component (if used): none

## Summary
A new expired-heist list item (e.g. `ExpiredHeistCard`) shown under a "History" section on `/heists`, displaying only the heist's name and success/failure status in a single-column list, sorted with the most-recently-expired heist first. Alongside this, every heist card/list item on `/heists` (Active, Assigned, and History) gets a working link to its `/heists/[id]` detail page, and that detail page — currently a static stub — gains basic real content.

## Functional Requirements
- New component for expired heists shows only: heist title and a success/failure status badge — no assignedTo, createdBy, or deadline details (unlike the active/assigned `HeistCard`).
- Rendered under a "History" section on `/heists`, as a single-column list (not the 3-column grid used for Active/Assigned).
- List order is most-recently-expired first (i.e. sorted by deadline, latest first) — the reverse of the ascending order `useHeists('expired')` currently returns.
- Every heist card/list item across `/heists` — Active, Assigned, and History — links to `/heists/[id]` for its own heist. Active/Assigned already link via the existing `HeistCard`; History currently doesn't link anywhere and needs it added.
- `/heists/[id]` (currently a static `<h2>Heist Details</h2>` stub) renders real details for that heist: title, description, createdBy/assignedTo codenames, deadline, and success/failure status if set.

## Figma Design Reference (only if referenced)
N/A — no Figma link was provided for this feature.

## Possible Edge Cases
- A very long history list with no pagination — does it just grow unbounded?
- Navigating to `/heists/[id]` for a heist that no longer exists (e.g. deleted, or a stale/shared link)
- Loading state for the detail page itself while its own heist document is being fetched
- A heist whose `finalStatus` is still `null` despite an expired deadline (shouldn't occur given the existing query filter, but the detail page should handle it gracefully if seen)

## Acceptance Criteria
- The History section renders expired heists as a single-column list, each item showing only the heist name and its success/failure status
- History list order is most-recently-expired first
- Every card/list item on `/heists` (Active, Assigned, History) links to its own `/heists/[id]`
- `/heists/[id]` renders the heist's title, description, createdBy/assignedTo codenames, deadline, and status instead of the static placeholder

## Open Questions
- Should the "History" section heading/label fully replace today's "All Expired Heists" heading, or is that wording still fine, just with the new card/list treatment underneath? A: History is better as it should incl. all expired heists
- Should `/heists/[id]` fetch its own heist data via a new single-document hook/query, or is that data-fetching approach left open for planning to decide? A: data should be passed from a parent view (expand details that come from db if needed)
- What should `/heists/[id]` show for a not-found/deleted heist, and what should it show while loading? A: Not found - pick wording

## Testing Guidelines
Create test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- The new expired-heist list item renders only the heist's name and status (no assignedTo/createdBy/deadline)
- The History list renders in most-recently-expired-first order
- Active, Assigned, and History cards/items each link to `/heists/[id]` using their own heist's id
- `/heists/[id]` renders the expected heist fields for a given heist
