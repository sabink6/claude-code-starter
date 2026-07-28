import { describe, it, expect } from "vitest"

import { formatTimeLeft, isTimeLeftUrgent } from "@/lib/formatTimeLeft"

describe("formatTimeLeft", () => {
  const now = new Date("2026-01-01T00:00:00.000Z")

  it("shows days and hours when more than a day remains", () => {
    expect(formatTimeLeft(new Date("2026-01-03T05:00:00.000Z"), now)).toBe(
      "2d 5h left",
    )
  })

  it("shows hours and minutes when less than a day remains", () => {
    expect(formatTimeLeft(new Date("2026-01-01T03:30:00.000Z"), now)).toBe(
      "3h 30m left",
    )
  })

  it("shows minutes when less than an hour remains", () => {
    expect(formatTimeLeft(new Date("2026-01-01T00:15:00.000Z"), now)).toBe(
      "15m left",
    )
  })

  it("shows Expired once the deadline has passed", () => {
    expect(formatTimeLeft(new Date("2025-12-31T00:00:00.000Z"), now)).toBe(
      "Expired",
    )
  })
})

describe("isTimeLeftUrgent", () => {
  const now = new Date("2026-01-01T00:00:00.000Z")

  it("is urgent when two hours or less remain", () => {
    expect(isTimeLeftUrgent(new Date("2026-01-01T01:30:00.000Z"), now)).toBe(
      true,
    )
  })

  it("is not urgent when more than two hours remain", () => {
    expect(isTimeLeftUrgent(new Date("2026-01-01T03:00:00.000Z"), now)).toBe(
      false,
    )
  })

  it("is not urgent once the deadline has passed", () => {
    expect(isTimeLeftUrgent(new Date("2025-12-31T00:00:00.000Z"), now)).toBe(
      false,
    )
  })
})
