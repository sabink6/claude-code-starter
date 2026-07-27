# Spec for heist-card-component

branch: feature/heist-card-component
figma_component (if used): none — visual reference is the local image `public/Card.png`, not a Figma link

## Summary
A reusable `HeistCard` component for displaying a single heist, shown in a 3-column grid on the `/heists` page for the Active and Assigned sections only. Card titles link to the (not-yet-built) heist detail page at `/heists/[id]`. While heist data is still loading, a matching `HeistCardSkeleton` placeholder renders in the same grid layout.

## Functional Requirements
- New `HeistCard` component displays, per the `public/Card.png` reference: heist title, an assigned-to codename row ("To: @codename"), a created-by codename row ("By: @codename"), and a deadline date/time row.
- Heist title is a link (to `/heists/[id]`) — the destination page's content is explicitly out of scope for this feature; it should keep existing.
- On the `/heists` page, the Active and Assigned sections render their heists as a 3-column grid of `HeistCard`, replacing today's plain title-list rendering for those two sections only.
- The Expired section is unaffected — it keeps its current list rendering, not cards.
- New `HeistCardSkeleton` component renders in the same 3-column grid position as a placeholder while `useHeists` has not yet returned data for the Active/Assigned sections.

## Figma Design Reference (only if referenced)
N/A — no Figma link was provided for this feature. See Functional Requirements above for what the `public/Card.png` reference depicts.

## Possible Edge Cases
- Long heist titles or codenames overflowing a fixed card width
- A section with zero heists — whether the existing "Nothing here yet." empty-state copy still applies inside a grid layout
- 3-column grid responsiveness on narrower viewports
- Deadline display/formatting for heists that are, by definition, not yet expired (Active/Assigned only)

## Acceptance Criteria
- The Active and Assigned sections on `/heists` render their heists as a 3-column grid of `HeistCard`
- Each card's title links to `/heists/[id]` for its heist
- While loading, the same grid positions show `HeistCardSkeleton` instead of `HeistCard`
- The Expired section continues to render exactly as it does today
- The card's visual content matches the `public/Card.png` reference: title, assigned-to, created-by, deadline

## Open Questions
- Should the "Nothing here yet." empty-state text still be used per-section when a grid has zero heists, or does an empty grid need different treatment? A: yes use text
- How many `HeistCardSkeleton` placeholders should render while loading — a fixed count, or is this not important since real content pops in live via the existing real-time listener? A: one row
- Should the existing generic `components/Skeleton/` (circle + line shimmer) be reused/adapted, or does `HeistCardSkeleton` need its own shape mirroring `HeistCard`'s actual rows (title, to/by, deadline)? A: do not use generic skeleton

## Testing Guidelines
Create test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- `HeistCard` renders the title, assigned-to codename, created-by codename, and deadline
- `HeistCard`'s title links to `/heists/[id]` using the heist's id
- `HeistCardSkeleton` renders as a placeholder with no heist data required
- The `/heists` page renders one `HeistCard` per heist for the Active and Assigned sections once data loads
- The `/heists` page renders `HeistCardSkeleton` placeholders for Active/Assigned while loading
- The Expired section still renders as a plain list, not cards, after this change
