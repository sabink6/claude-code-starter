# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Pocket Heist — "Small heists. Big chaos." Starter project for the Claude Code Masterclass.

| | |
|---|---|
| Framework | Next.js (App Router) |
| UI | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + CSS Modules |
| Testing | Vitest + Testing Library (jsdom) |

## Commands

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run full Vitest suite |
| `npx vitest run tests/components/Navbar.test.tsx` | Run a single test file |
| `npx vitest run -t "renders the main heading"` | Run tests matching a name |

## Route structure

Route groups split public vs. authenticated areas, each with its own root layout:

```
app/
├── (public)/          # no nav; layout is a bare wrapper
│   ├── page.tsx        # splash page — should redirect based on auth state
│   ├── login/           # renders <AuthForm initialMode="login" />
│   ├── signup/          # renders <AuthForm initialMode="signup" />
│   └── preview/         # scratch page for building/inspecting new UI in isolation
└── (dashboard)/        # layout wraps children with the shared Navbar
    └── heists/
        ├── page.tsx       # list
        ├── create/
        └── [id]/           # detail
```

- `app/(public)/page.tsx` is meant to redirect: logged in → `/heists`, logged out → `/login`. **Not implemented yet** — it currently renders static content only.
- `/login` and `/signup` share one `AuthForm` client component (`components/AuthForm/`). Switching between the two modes is a client-side state flip, not a route navigation, and submission currently only `console.log`s the entered data — there's no real auth backend yet.

## Conventions

- **Components**: one folder per component under `components/<Name>/`, containing:
  - `<Name>.tsx` — the component
  - `<Name>.module.css` — co-located CSS Module
  - `index.ts` — barrel re-export of the default

  Import via `@/components/<Name>`, not by reaching into the folder directly. A component folder may also contain internal-only subcomponents it doesn't export (e.g. `components/AuthForm/Field.tsx`) — these skip the `index.ts` barrel since they aren't meant to be imported from outside the folder.

- **Client components**: the codebase defaults to Server Components; add `"use client"` only where local state/interactivity is actually needed (see `components/AuthForm/`).

- **Path alias**: `@/*` → repo root (`tsconfig.json`), e.g. `@/app/globals.css`, `@/components/Navbar`.

- **Styling**:
  - Tailwind utility classes for general layout; CSS Modules for component-scoped styles.
  - Theme tokens (colors, font) are defined once in `app/globals.css` under the `@theme` block — add new design tokens there rather than hardcoding values.
  - A CSS Module that uses `@apply` with theme tokens must start with `@reference "../../app/globals.css";` (see `Navbar.module.css`).

- **Tests**: live under `tests/`, mirroring the source path (e.g. `components/Navbar/Navbar.tsx` → `tests/components/Navbar.test.tsx`).
  - Runs in `jsdom` with `@testing-library/react`.
  - Globals (`describe`/`it`/`expect`) are enabled — no explicit imports needed.
  - `jest-dom` matchers are loaded globally via `vitest.setup.ts`.

## CI and branch protection

- `main` is protected: direct pushes are rejected — all changes land via a pull request, and the `ci` status check (`.github/workflows/ci.yml`: install, lint, test, build) must pass before merging. Always work on a feature branch.
- See `_docs/github-setup.md` for the full GitHub configuration (branch ruleset, Dependabot, CodeQL, secret scanning).

## Planning workflow

- `_specs/` holds feature specs (one markdown file per feature, following `_specs/template.md`), created via the `/spec` command, which also creates the feature's branch.
- `_plans/` holds saved implementation plans for specs not yet built.
- `.claude/commands/` has repo-specific slash commands: `/spec` (spec + branch scaffolding), `/component` (TDD component creation, updating the preview page), `/commit-message` (drafts a commit message from staged changes — always confirm with the user before committing).

## Additional Coding Preferences

- **No semicolons** in JavaScript/TypeScript code.
- **Minimal Tailwind in templates**: don't apply Tailwind classes directly in component markup unless essential — one class at most. If an element needs more than a single Tailwind class, combine them into a custom class via `@apply` instead.
- **Minimal dependencies**: prefer the standard library / existing project tooling over adding a new package.
- **Branching**: use `git switch -c <branch>` to create and switch to a new branch, not `git checkout -b`.
