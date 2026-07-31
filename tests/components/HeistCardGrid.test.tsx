import { render, screen } from "@testing-library/react"
import { beforeEach, describe, it, expect, vi } from "vitest"

vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))
vi.mock("@/lib/firebase/heists", () => ({
  claimHeistSuccess: vi.fn(),
  confirmHeistSuccess: vi.fn(),
  rejectHeistSuccess: vi.fn(),
  FALLBACK_MESSAGE: "Something went wrong. Please try again.",
}))

import HeistCardGrid from "@/components/HeistCardGrid"
import { useUser } from "@/lib/firebase/auth-context"
import type { Heist } from "@/types/firestore"

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
    deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
    successClaimedAt: null,
    finalStatus: null,
  }
}

describe("HeistCardGrid", () => {
  beforeEach(() => {
    vi.mocked(useUser).mockReturnValue({ user: null, loading: false })
  })

  it("renders the title as a heading", () => {
    render(<HeistCardGrid title="Your Active Heists" heists={[]} />)

    expect(
      screen.getByRole("heading", { name: "Your Active Heists" }),
    ).toBeInTheDocument()
  })

  it("shows exactly one row of skeleton placeholders while loading", () => {
    render(<HeistCardGrid title="Your Active Heists" heists={null} />)

    expect(screen.getAllByRole("status")).toHaveLength(3)
  })

  it("shows an empty-state message when there are no heists", () => {
    render(<HeistCardGrid title="Your Active Heists" heists={[]} />)

    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument()
  })

  it("renders one HeistCard per heist, in the given order, with no skeletons", () => {
    const heists = [
      fakeHeist("heist-1", "Steal the crown jewels"),
      fakeHeist("heist-2", "Swipe the getaway van keys"),
    ]
    render(<HeistCardGrid title="Your Active Heists" heists={heists} />)

    const cards = screen.getAllByRole("heading", { level: 3 })
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent("Steal the crown jewels")
    expect(cards[1]).toHaveTextContent("Swipe the getaway van keys")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
