import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import HeistList from "@/components/HeistList"
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
    deadline: new Date(),
    finalStatus: null,
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
})
