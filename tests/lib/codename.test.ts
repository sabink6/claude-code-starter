import { describe, it, expect } from "vitest"

import { generateCodename, ADJECTIVES, COLORS, NOUNS } from "@/lib/codename"

describe("generateCodename", () => {
  it("picks the first word from each set when random always returns 0", () => {
    const codename = generateCodename(() => 0)

    expect(codename).toBe(`${ADJECTIVES[0]}${COLORS[0]}${NOUNS[0]}`)
  })

  it("varies across different random sources", () => {
    const first = generateCodename(() => 0)
    const second = generateCodename(() => 0.99)

    expect(first).not.toBe(second)
  })

  it("has no duplicate words within any set", () => {
    expect(new Set(ADJECTIVES).size).toBe(ADJECTIVES.length)
    expect(new Set(COLORS).size).toBe(COLORS.length)
    expect(new Set(NOUNS).size).toBe(NOUNS.length)
  })

  it("produces three PascalCase words jammed together", () => {
    const codename = generateCodename(() => 0.5)

    expect(codename).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+[A-Z][a-z]+$/)
  })
})
