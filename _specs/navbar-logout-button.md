# Spec for navbar-logout-button

branch: feature/user-logout
figma_component (if used): N/A — local design reference image, see below

## Summary
Add a logout button to the shared `Navbar` component so a signed-in user can end their session. Clicking the button signs the user out of Firebase Authentication. The button is only visible while a user is logged in; logged-out visitors see the Navbar as it exists today. No post-logout redirect is in scope for this spec — the page simply reflects the signed-out state once the auth listener picks it up.

## Functional Requirements
- Add a logout button/control to `Navbar`, positioned and styled per the design reference (`public/LogoutButton.png`).
- The button is visible only when there is an authenticated user; it must not render (or must render in a way indistinguishable from absent) for logged-out visitors.
- Clicking the button signs the current user out of Firebase Authentication.
- After sign-out succeeds, the Navbar updates to no longer show the button, reflecting the app's existing real-time auth-state observation — no manual page reload should be required.
- No navigation/redirect occurs as a result of logging out; the user stays on whatever page they were on.
- The rest of the Navbar (logo, "Create New Heist" link, tagline) is unaffected by this change.

## Figma Design Reference (only if referenced)
- File: `public/LogoutButton.png` (not a Figma link — a static image asset the user added to the repo for this feature).
- Dimensions: 128×38px.
- Visual: a white foreground (icon and/or label) on a fully transparent background — designed to sit on the Navbar's existing dark background.
- Key visual constraints: exact wording/iconography in the asset should be treated as the source of truth for the button's copy and icon at implementation time; this spec intentionally avoids prescribing the exact label so the plan stage can inspect the asset directly.

## Possible Edge Cases
- Auth state is still loading (the shared `useUser`-style auth listener hasn't resolved yet on initial page load) — the button should not flash into view and then disappear, or vice versa.
- Sign-out call fails (e.g. network error) — decide whether/how this is surfaced to the user, since there's currently no error-display convention in the Navbar.
- Rapid double-click on the logout button — signing out twice in a row should not throw or produce a confusing state.
- Logout is triggered from a page under the authenticated `(dashboard)` route group (e.g. `/heists/create`) — since no redirect happens, confirm what the user should see immediately after (page may now be an authenticated-only page with no user).
- Multiple tabs/windows open with the same session — only the current tab's Firebase Auth instance is signed out directly; other tabs will reflect the change via their own auth-state listeners.

## Acceptance Criteria
- A logged-in user sees a logout button in the Navbar matching the design reference.
- A logged-out visitor does not see the logout button in the Navbar.
- Clicking the logout button signs the user out of Firebase Authentication (verifiable via the Firebase console session state or the app's own auth-state hook reflecting `null`).
- Once signed out, the logout button disappears from the Navbar without a manual page refresh.
- No redirect or navigation occurs as part of this feature.
- Existing Navbar content and behavior (logo link, "Create New Heist" button, tagline) remain unchanged for both logged-in and logged-out states.

## Open Questions
- What should happen on a failed sign-out attempt — silent retry, inline error, or console-only logging? A: console logging
- Should the button be disabled/show a pending state while the sign-out call is in flight, similar to the signup form's submit-button pattern? A: yes
- Does the exact icon/label in `public/LogoutButton.png` need to be reproduced pixel-for-pixel, or is it a rough visual guide (color, size, placement) for the plan stage to interpret? A: a visual guide, positioned left of the create new heist btn
- Should the logout control have distinct styling from the existing `.btn` class (which currently implies a primary/CTA action), or should it reuse it? A: distinct or use btn base styling and then action, logout sub styling, you decide

## Testing Guidelines
Create a test file(s) in the ./test folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- The logout button is rendered when there is an authenticated user.
- The logout button is not rendered when there is no authenticated user (and while auth state is still loading, if that state is distinguishable).
- Clicking the logout button triggers the Firebase sign-out call.
- No navigation/redirect call is made as part of the logout action.
