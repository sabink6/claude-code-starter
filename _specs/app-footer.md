# Spec for app-footer

branch: feature/footer
figma_component (if used): none

## Summary
A site-wide app footer showing the project name and logo mark (consistent with the existing `Navbar` logo treatment), the app's current version, a link to the GitHub repository, and the MIT license.

## Functional Requirements
- Footer displays the project name ("Pocket Heist") alongside the same logo mark used in `components/Navbar/` (reusing that visual treatment, not a new logo).
- Footer displays the app's current version, sourced from `package.json`'s `version` field (currently `0.1.0`) — not hardcoded separately.
- Footer includes a link to the GitHub repository (`https://github.com/sabink6/claude-code-starter`), opening in a new tab.
- Footer states the license (MIT).

## Figma Design Reference (only if referenced)
N/A — no Figma link was provided for this feature.

## Possible Edge Cases
- Version display going stale if `package.json`'s `version` isn't bumped — out of scope for this feature to enforce, just needs to read the field rather than hardcode a copy of it.
- Footer appearing on both the public (unauthenticated) and dashboard (authenticated) areas, which currently have separate root layouts (`app/(public)/layout.tsx` is a bare wrapper; `app/(dashboard)/layout.tsx` wraps children with `Navbar`) — placement needs to work for both without duplicating markup.
- Long content (project name + version + link + license) wrapping sensibly on narrow viewports.

## Acceptance Criteria
- The footer is visible on every page of the app (both public and dashboard areas).
- It shows the project name + logo, the version from `package.json`, a working GitHub repo link, and "MIT License" text.
- It visually matches the app's existing dark "case-file" theme (reusing existing theme tokens, not introducing new ones).

## Open Questions
- Should the footer live in the root `app/layout.tsx` (shared by both route groups), or be added separately inside each of `(public)/layout.tsx` and `(dashboard)/layout.tsx`? A: in app/layout.tsx
- Should the license text link anywhere (e.g. to the `LICENSE` file on GitHub), or is plain "MIT License" text sufficient? A: plain text
- Should the GitHub link show as a plain text link, an icon, or both? A: both

## Testing Guidelines
Create test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:
- The footer renders the project name, the version from `package.json`, a link to the GitHub repository, and the license text
- The GitHub link has the correct `href` and opens in a new tab
- The footer appears on both a public-area page and a dashboard-area page
