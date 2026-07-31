import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import HeistList from "@/components/HeistList"
import type { Heist } from "@/types/firestore"

function fakeHeist(
  id: string,
  title: string,
  overrides: Partial<Heist> = {},
): Heist {
  return {
    id,
    title,
    description: "",
    createdAt: new Date(),
    createdBy: "uid-creator",
    createdByCodename: "SilentCrimsonFox",
    assignedTo: "uid-assignee",
    assignedToCodename: "QuietVelvetOwl",
    deadline: new Date(Date.now() - 1000),
    successClaimedAt: null,
    finalStatus: null,
    ...overrides,
  }
}

describe("HeistList", () => {
  it("renders the title as a heading", () => {
    render(<HeistList title="Your Active Heists" heists={[]} />)

    expect(
      screen.getByRole("heading", { name: "Your Active Heists" }),
    ).toBeInTheDocument()
  })

  it("shows a loading message when heists is null", () => {
    render(<HeistList title="Your Active Heists" heists={null} />)

    expect(screen.getByText("Loading…")).toBeInTheDocument()
  })

  it("shows an empty-state message when there are no heists", () => {
    render(<HeistList title="Your Active Heists" heists={[]} />)

    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument()
  })

  it("renders one item per heist, in the given order", () => {
    const heists = [
      fakeHeist("heist-1", "Steal the crown jewels"),
      fakeHeist("heist-2", "Swipe the getaway van keys"),
    ]
    render(<HeistList title="Your Active Heists" heists={heists} />)

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent("Steal the crown jewels")
    expect(items[1]).toHaveTextContent("Swipe the getaway van keys")
  })

  it("links each item's title to its own heist detail page", () => {
    const heists = [fakeHeist("heist-42", "Steal the crown jewels")]
    render(<HeistList title="History" heists={heists} />)

    expect(
      screen.getByRole("link", { name: "Steal the crown jewels" }),
    ).toHaveAttribute("href", "/heists/heist-42")
  })

  it("shows a failure badge for an expired heist that was never confirmed", () => {
    const heists = [
      fakeHeist("heist-1", "The one that got away", { finalStatus: null }),
    ]
    render(<HeistList title="History" heists={heists} />)

    expect(
      screen.getByText("failure", { selector: "[aria-label]" }),
    ).toBeInTheDocument()
  })

  it("shows a success badge for an expired heist that was confirmed", () => {
    const heists = [
      fakeHeist("heist-1", "Clean getaway", { finalStatus: "success" }),
    ]
    render(<HeistList title="History" heists={heists} />)

    expect(
      screen.getByText("success", { selector: "[aria-label]" }),
    ).toBeInTheDocument()
  })
})
