# Spec for responsive-design-pass

branch: claude/feature/responsive-design-pass
figma_component (if used): none

## Summary

Pocket Heist is desktop-only in practice. Only four responsive rules exist in the entire codebase (all of them in `app/globals.css`), no component stylesheet contains a single media query, and no component file uses a breakpoint prefix. Two structural constraints actively break the app on phones and small tablets:

- `.page-content` — the wrapper used by every page — imposes a hard minimum width of roughly 672px, forcing horizontal scrolling on any viewport narrower than that. That includes every common phone.
- The `Navbar` lays its brand, tagline, user greeting, logout, and "Create New Heist" action in a single non-wrapping horizontal row with no small-screen treatment, so its contents overflow or clip on narrow screens.

Everything else either already adapts (the heist card grid, the heist-detail people section, the footer) or is naturally narrow-safe (the heist form is a single column capped at a small width). So this is a targeted fix plus a durable convention, not a redesign.

The work splits in two: **(a)** a written responsive-design guide that establishes the conventions this codebase follows going forward, and **(b)** a full responsive pass applying those conventions. The intended outcome is that someone on a phone can land on the splash page, sign in, browse their heists, open one, take an action on it, and navigate anywhere in the app — without pinching, zooming, or scrolling sideways.

## Functional Requirements

**The guide**

- A responsive-design guide is added to the project's documentation, capturing the conventions the codebase follows: which breakpoints are used and what each is for, whether layout is authored mobile-first or desktop-first, when to reach for a utility breakpoint prefix in markup versus a media query in a CSS Module, and how to size containers so they never impose a minimum width.
- The guide records the minimum viewport width the app commits to supporting, and the reference widths used to verify a change.
- The guide is discoverable from where contributors already look — referenced from the project's existing conventions documentation rather than left as an orphan file.
- The guide is written to apply to future components, not just the ones fixed in this pass.

**The pass**

- No page produces horizontal scrolling at the minimum supported width: splash, login, signup, heists list, heist detail, and create-heist.
- The shared page wrapper adapts to the viewport instead of imposing a fixed floor, while preserving the current comfortable maximum width on large screens.
- Site navigation stays fully usable at phone widths: every destination and action currently in the navigation bar remains reachable, without overlap, clipping, or overflow.
- If navigation collapses behind a control at small sizes, that control is operable by keyboard, has an accessible name, and exposes its expanded/collapsed state to assistive technology.
- Interactive targets — navigation items, buttons, form controls — remain comfortably tappable at small sizes, not merely visible.
- Content that cannot shrink (long heist titles, codenames, dates, countdown text) wraps, truncates, or scrolls within its own container instead of widening the page.
- Existing responsive behavior that already works — heist card grid columns, the heist-detail people grid, splash headline scaling — is preserved rather than rewritten.
- Changes are visual only: no change to routing, data fetching, Firestore queries, or component APIs.

## Possible Edge Cases

- Very long heist titles or codenames on a narrow card, where a single unbroken string can force its container wider than the viewport.
- The heist detail page's action buttons ("Mark as Success", "Confirm", "Reject") sharing one row — several controls plus surrounding text may not fit side by side on a phone.
- Landscape phones and small tablets, which fall between the usual breakpoints and are easy to miss when only checking portrait phone and desktop.
- Browser zoom and larger user font sizes, which effectively narrow the viewport and can reintroduce overflow even on a desktop screen.
- The navigation bar in its signed-out versus signed-in state — these hold different numbers of items, so a layout that fits one may overflow the other.
- Very wide screens, where removing a fixed width could let content stretch uncomfortably if no maximum is retained.
- Loading and skeleton states, which occupy different space than loaded content and are easily skipped during a visual pass.

## Acceptance Criteria

- At the minimum supported width, every page renders without a horizontal scrollbar and with no content clipped off-screen.
- Every navigation destination and action available on desktop is reachable at phone width.
- If navigation collapses into a toggle on small screens, that toggle is reachable by keyboard, has an accessible name, and communicates whether the menu is open or closed.
- The heist list, heist detail, and create-heist pages are readable and operable end to end at phone width, including taking a status action on a heist.
- Desktop appearance at large viewport sizes is materially unchanged.
- The responsive-design guide exists in the repo, states the breakpoints and approach in force, and is linked from the project's existing conventions documentation.
- Lint, the existing test suite, and the production build all pass.

## Open Questions

- What minimum viewport width does the app commit to supporting — a common 375px phone, or narrower (e.g. 320px) for older and small devices? A: a common 375px
- Should small-screen navigation collapse behind a menu control, or simply wrap onto multiple rows? Wrapping is simpler and needs no new interaction; a collapsing menu is more conventional but introduces open/close state and its own accessibility requirements.
- Is this pass strictly corrective (make nothing break), or should it also intentionally design the mobile experience — reordering, hiding secondary content such as the tagline, adjusting the type scale? A: Hybrid - Make the interface fully responsive and improve mobile layout, navigation, spacing, and type scale. Do not remove or reprioritize content without approval.
- Should the guide live alongside existing project documentation in `_docs/`, or become a section of `CLAUDE.md` so it stays in context for future AI-assisted work? A: save it in _docs folder for now, do not update CLAUDE.md yet
- Are the framework's default breakpoints sufficient, or does this design need a custom set defined alongside the existing theme tokens? A: Use the framework’s default breakpoints unless the actual content breaks between them. Add a custom breakpoint only for a clear layout need, and define it centrally in the theme.

## Testing Guidelines

Create a test file(s) in the ./tests folder for the new feature, and create meaningful tests for the following cases, without going too heavy:

- If navigation gains a small-screen toggle: it renders with an accessible name, is operable by keyboard, and reports its expanded/collapsed state correctly as it is toggled.
- If navigation gains a small-screen toggle: every navigation destination available on desktop is still present and reachable once the menu is opened.
- Navigation renders its full set of items in both signed-out and signed-in states, so neither state silently loses an action during the layout change.
- Existing component tests continue to pass unchanged, confirming the pass altered no behavior or component APIs.

Note that pure layout behavior — whether a page overflows at a given width — is not meaningfully assertable in this project's jsdom-based test setup. Verify it manually in a browser at the reference widths recorded in the guide rather than approximating it with brittle tests.
