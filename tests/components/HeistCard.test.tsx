import { render, screen } from "@testing-library/react"
import { afterEach, describe, it, expect, vi } from "vitest"

import HeistCard from "@/components/HeistCard"
import type { Heist } from "@/types/firestore"

function fakeHeist(overrides: Partial<Heist> = {}): Heist {
  return {
    id: "heist-1",
    title: "Steal the crown jewels",
    description: "",
    createdAt: new Date(),
    createdBy: "uid-creator",
    createdByCodename: "SilentCrimsonFox",
    assignedTo: "uid-assignee",
    assignedToCodename: "QuietVelvetOwl",
    deadline: new Date("2026-01-03T15:00:00.000Z"),
    finalStatus: null,
    ...overrides,
  }
}

describe("HeistCard", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the heist title, assigned-to codename, and created-by codename", () => {
    render(<HeistCard heist={fakeHeist()} />)

    expect(
      screen.getByRole("heading", { name: "Steal the crown jewels" }),
    ).toBeInTheDocument()
    expect(screen.getByText("@QuietVelvetOwl")).toBeInTheDocument()
    expect(screen.getByText("@SilentCrimsonFox")).toBeInTheDocument()
  })

  it("renders a formatted deadline time", () => {
    render(<HeistCard heist={fakeHeist()} />)

    expect(screen.getByText(/\d{1,2}:\d{2}\s?[AP]M/)).toBeInTheDocument()
  })

  it("links the title to the heist's detail page using its id, not a hardcoded value", () => {
    render(<HeistCard heist={fakeHeist({ id: "heist-42" })} />)

    expect(
      screen.getByRole("link", { name: "Steal the crown jewels" }),
    ).toHaveAttribute("href", "/heists/heist-42")
  })

  it("never shows an 'Overdue' tag, since active/assigned heists cannot be overdue", () => {
    render(<HeistCard heist={fakeHeist()} />)

    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument()
  })

  it("shows how long is left until the deadline", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

    render(
      <HeistCard
        heist={fakeHeist({ deadline: new Date("2026-01-03T05:00:00.000Z") })}
      />,
    )

    expect(screen.getByText("2d 5h left")).toBeInTheDocument()
  })

  it("applies an urgent style when two hours or less remain", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

    render(
      <HeistCard
        heist={fakeHeist({ deadline: new Date("2026-01-01T01:30:00.000Z") })}
      />,
    )

    expect(screen.getByText("1h 30m left").parentElement?.className).toMatch(
      /timeLeftUrgent/,
    )
  })
})
