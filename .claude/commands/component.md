---
description: Create a UI component using TDD (test-driven development)
allowed-tools: Read, Write, Edit, Glob, Bash(npm test:*), Bash(npx vitest:*)
argument-hint: "[Brief description] OR [path/to/image.png] [optional description]"
---

## User Input:
The user has provided information about the component to make: **$ARGUMENTS**

## Do thus first:

**Check for an image reference first.** If `$ARGUMENTS` contains a path ending in `.png`, `.jpg`, `.jpeg`, `.webp`, or `.svg` (typically under `public/`):
- Use the Read tool on that image path to view it — Read renders images visually, so look at it directly rather than guessing from the filename.
- Treat the image as the primary design reference for layout, spacing, colors, and typography. Any remaining text in `$ARGUMENTS` after the path is a naming hint / extra requirements, not a substitute for what's visible in the image.
- Before writing markup, reconcile what you see against this project's existing design system: check `app/globals.css`'s `@theme` token block (`--color-*`, `--font-*`, `--radius-*`) and existing utility classes (`.btn`, `.case-tag`, `.heist-panel`, `.splash-*`, etc.) for matches — reuse an existing token/class instead of hardcoding a value that's already a token. Only introduce a new token if nothing existing is close.
- If no text description accompanies the image, infer a sensible PascalCase name from what the image depicts (e.g. a card showing a user's stats → `UserStatsCard`).

**Otherwise**, from the component information above, determine a PascalCase component name (e.g., "a card showing user stats" → `UserStatsCard`).

### 1. Write Tests First
Create `tests/components/[ComponentName].test.tsx` with 2-3 simple tests:

- Test that the component renders
- Test key elements are present (roles, text)

Pattern:
```tsx
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import ComponentName from "@/components/ComponentName"

describe("ComponentName", () => {
  it("renders successfully", () => {
    render(<ComponentName />)
    // assertions
  })
})
```

### 2. Run Tests (expect failure)
```bash
npm test tests/components/[ComponentName].test.tsx
```

### 3. Create Component
- `components/[ComponentName]/[ComponentName].tsx`
- `components/[ComponentName]/[ComponentName].module.css`
- `components/[ComponentName]/index.ts` → `export { default } from './[ComponentName]'`

Conventions: no semicolons, CSS Modules, theme colors from globals.css when needed.

### 4. Run Tests (expect pass)
```bash
npm test tests/components/[ComponentName].test.tsx
```
Iterate on component development until all tests pass.

### 5. Add to Preview Page
Update `app/(public)/preview/page.tsx` with a labeled section showing the component.

## Rules:
- Keep tests minimal
- Only proceed when current step passes


