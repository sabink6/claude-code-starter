import { render, screen, within } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

import HeistsPage from "@/app/(dashboard)/heists/page"
import { useHeists, type HeistFilter } from "@/lib/firebase/heists"
import type { Heist } from "@/types/firestore"

vi.mock("@/lib/firebase/heists", () => ({ useHeists: vi.fn() }))

function fakeHeist(id: string, title: string): Heist {
  return {
    id,
    title,
    description: "",
    createdAt: new Date(),
    createdBy: "uid-creator",
    createdByCodename: "SilentCrimsonFox",
    assignedTo: "uid-assignee",
    assignedToCodename: "QuietVelvetOwl",
    deadline: new Date(),
    finalStatus: null,
  }
}

const fixtures: Record<HeistFilter, Heist[]> = {
  active: [fakeHeist("active-1", "Steal the crown jewels")],
  assigned: [fakeHeist("assigned-1", "Rob the vault")],
  expired: [fakeHeist("expired-1", "The one that got away")],
}

describe("HeistsPage", () => {
  beforeEach(() => {
    vi.mocked(useHeists).mockImplementation(
      (filter: HeistFilter) => fixtures[filter],
    )
  })

  it("shows only the active heist titles in the active-heists section", () => {
    const { container } = render(<HeistsPage />)

    const section = container.querySelector(".active-heists") as HTMLElement
    expect(
      within(section).getByText("Steal the crown jewels"),
    ).toBeInTheDocument()
    expect(within(section).queryByText("Rob the vault")).not.toBeInTheDocument()
    expect(
      within(section).queryByText("The one that got away"),
    ).not.toBeInTheDocument()
  })

  it("shows only the assigned heist titles in the assigned-heists section", () => {
    const { container } = render(<HeistsPage />)

    const section = container.querySelector(".assigned-heists") as HTMLElement
    expect(within(section).getByText("Rob the vault")).toBeInTheDocument()
    expect(
      within(section).queryByText("Steal the crown jewels"),
    ).not.toBeInTheDocument()
  })

  it("shows only the expired heist titles in the expired-heists section", () => {
    const { container } = render(<HeistsPage />)

    const section = container.querySelector(".expired-heists") as HTMLElement
    expect(
      within(section).getByText("The one that got away"),
    ).toBeInTheDocument()
    expect(within(section).queryByText("Rob the vault")).not.toBeInTheDocument()
  })

  it("renders each section's heading", () => {
    render(<HeistsPage />)

    expect(
      screen.getByRole("heading", { name: "Your Active Heists" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Heists You've Assigned" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "All Expired Heists" }),
    ).toBeInTheDocument()
  })

  it("renders a HeistCard link to the detail page for each active/assigned heist", () => {
    const { container } = render(<HeistsPage />)

    const activeSection = container.querySelector(
      ".active-heists",
    ) as HTMLElement
    expect(
      within(activeSection).getByRole("link", {
        name: "Steal the crown jewels",
      }),
    ).toHaveAttribute("href", "/heists/active-1")

    const assignedSection = container.querySelector(
      ".assigned-heists",
    ) as HTMLElement
    expect(
      within(assignedSection).getByRole("link", { name: "Rob the vault" }),
    ).toHaveAttribute("href", "/heists/assigned-1")
  })

  it("shows a row of skeleton placeholders for active/assigned while loading", () => {
    vi.mocked(useHeists).mockImplementation((filter: HeistFilter) =>
      filter === "expired" ? fixtures.expired : null,
    )
    const { container } = render(<HeistsPage />)

    const activeSection = container.querySelector(
      ".active-heists",
    ) as HTMLElement
    const assignedSection = container.querySelector(
      ".assigned-heists",
    ) as HTMLElement
    expect(within(activeSection).getAllByRole("status")).toHaveLength(3)
    expect(within(assignedSection).getAllByRole("status")).toHaveLength(3)
  })

  it("still renders the expired section as a plain list, not cards", () => {
    const { container } = render(<HeistsPage />)

    const expiredSection = container.querySelector(
      ".expired-heists",
    ) as HTMLElement
    expect(within(expiredSection).getAllByRole("listitem")).toHaveLength(1)
    expect(within(expiredSection).queryByRole("status")).not.toBeInTheDocument()
    expect(
      within(expiredSection).queryByRole("heading", { level: 3 }),
    ).not.toBeInTheDocument()
  })
})
