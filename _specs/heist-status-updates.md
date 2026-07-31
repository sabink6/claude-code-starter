# Spec for heist-status-updates

branch: claude/feature/heist-status-updates
figma_component (if used): none

## Summary

Heists currently reach a `finalStatus` of `"success"` or `"failure"` only if that field is set directly in the database — there is no UI or user flow that ever sets it. As a result, the "History" panel (which lists heists with a non-null `finalStatus` and a passed deadline) never actually receives any heists, and heists whose deadline passes without action simply disappear from every list (they no longer qualify as "active," but also don't qualify as "expired" since `finalStatus` is still `null`).

This feature introduces a real status workflow with a two-step outcome confirmation:

1. The assignee can claim a heist was completed successfully.
2. The creator then confirms or rejects that claim, which sets the heist's final outcome.
3. Any heist whose deadline passes without a confirmed success is automatically finalized as failed, so no heist is ever left in limbo.

The relevant action buttons appear directly on heist cards, scoped to the current viewer's relationship to the heist (assignee vs. creator) and the heist's current state.

## Functional Requirements

- **Assignee marks success:** While a heist is open (no outcome yet, deadline not passed) and the current viewer is the assignee, a "Mark as Success" button is available on the heist's card and detail view. Using it moves the heist into a "pending confirmation" state — it is not yet a final outcome.
- **Creator confirms or rejects:** While a heist is in "pending confirmation" state and the current viewer is the creator, "Confirm" and "Reject" buttons are available on the card and detail view.
  - Confirming sets the heist's final outcome to success.
  - Rejecting sets the heist's final outcome to failure.
- **No self-confirmation:** A user cannot confirm or reject their own success claim — the confirm/reject actions are only ever shown to the creator, never the assignee, even if one person happens to be both (edge case, see below).
- **Automatic expiry-to-failure:** Any heist whose deadline passes while it is still open (no success claimed) or still pending confirmation (claimed but not yet confirmed/rejected) is automatically finalized as failed. This must happen in the data layer, not just be inferred client-side, so the failed outcome is durable and consistent for every viewer.
- **History panel reflects both outcomes:** The existing "History" panel continues to show all heists with a final outcome (success or failure), ordered most-recently-expired first, and now reliably includes every heist that reaches its deadline — none should be silently dropped from all views.
- **Status-aware card buttons:** Heist cards (in the active/assigned/history grids and the detail page) render the correct action(s) — or none — based on: the heist's current state (open / pending confirmation / success / failure) and the current viewer's role relative to the heist (assignee / creator / neither).
- **Status visibility:** The heist's current state (including "pending confirmation," not just the two final outcomes) is visibly indicated on both the card and the detail page, so both parties can tell at a glance whether action is needed and from whom.

## Possible Edge Cases

- Assignee marks success, then the deadline passes before the creator confirms or rejects — covered by "Automatic expiry-to-failure" above, but worth explicit test coverage since it's the trickiest timing case.
- The same user is both creator and assignee (e.g. testing, or a future self-assigned heist) — needs an explicit rule so the flow doesn't silently break or allow self-confirmation.
- Creator rejects a success claim with time still left on the clock — does the assignee get another chance to claim success before the deadline, or is rejection final? (Also listed as an open question.)
- A heist is marked success and confirmed, or expires into failure, while a user has it open in another tab/device — the status change should be reflected live, consistent with how heist data already updates via real-time subscriptions.
- Rapid double-clicks or repeated submissions of the same action (e.g. clicking "Mark as Success" twice) should not cause errors or inconsistent state.

## Acceptance Criteria

- An assignee can mark an open, unexpired heist assigned to them as a success claim, and this is visible to the creator.
- A creator can confirm a success claim, resulting in the heist showing a final "success" outcome.
- A creator can reject a success claim, resulting in the heist showing a final "failure" outcome.
- A heist whose deadline passes without a confirmed success automatically ends up with a final "failure" outcome, without requiring anyone to take action.
- The History panel lists heists with either final outcome, and no heist that has passed its deadline is ever missing from every panel (active/assigned/history).
- Action buttons only ever appear for the viewer who is allowed to take that action, given the heist's current state.
- Users who are neither the assignee nor the creator of a heist never see any status-changing action buttons on it.

## Open Questions

- When a creator rejects a success claim, should the heist immediately become "failure" (final), or should it reopen so the assignee can try again before the deadline? This spec assumes rejection is final; confirm before implementation. A: it should not be final failure should be time elapsed and no confirmation of the success, so if there is a time left the heist should be still open and sers can act upon it
- What mechanism finalizes expired heists as failed — a scheduled/background job, a Cloud Function trigger, or a check performed opportunistically when heists are read? This has real architectural implications (a purely client-triggered check would only run when *someone* happens to view the data) and should be decided in planning. A: A scheduled Cloud Function is out of the scope for now so use a lightweight opportunistic check purely for display based on information that we have about time passed deadline and finalStatus (not confirmed success) 
- Should the creator (or assignee) receive any notification when action is needed from them (e.g. success claimed, or a heist about to expire), or is the existing panel-based visibility sufficient for now? A: t's sufficient for now but the confirm/reject btns should appear only if marked success 
- Does a heist that is both created by and assigned to the same user need a distinct rule (e.g. auto-confirmed, or disallowed at creation), or is this out of scope for now? A: Creator shouldn't be able to assign their own heists, UI is preventing that now on the heist creation (check) 

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- The assignee sees a "Mark as Success" action on an open heist assigned to them, and other viewers don't.
- Marking success transitions the heist into pending-confirmation state, and the creator sees "Confirm"/"Reject" actions while the assignee no longer sees "Mark as Success".
- Confirming a pending heist results in a final "success" outcome; rejecting results in a final "failure" outcome.
- A heist past its deadline with no confirmed success is treated as (or transitioned to) a final "failure" outcome.
- The History panel includes heists with both final outcomes and excludes heists that are still open or pending confirmation.
- No status-changing buttons render for a viewer who is neither the heist's assignee nor its creator.
