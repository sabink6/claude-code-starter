import { render, screen } from "@testing-library/react"
import { afterEach, describe, it, expect, vi } from "vitest"

import HeistDetailsPage from "@/app/(dashboard)/heists/[id]/page"
import { useHeist } from "@/lib/firebase/heists"
import type { Heist } from "@/types/firestore"

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "heist-1" }) }))
vi.mock("@/lib/firebase/heists", () => ({ useHeist: vi.fn() }))

function fakeHeist(overrides: Partial<Heist> = {}): Heist {
  return {
    id: "heist-1",
    title: "Steal the crown jewels",
    description: "In and out, no alarms.",
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

describe("HeistDetailsPage", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("shows a loading status while the heist is being fetched", () => {
    vi.mocked(useHeist).mockReturnValue({
      heist: null,
      loading: true,
      error: false,
    })

    render(<HeistDetailsPage />)

    expect(
      screen.getByRole("status", { name: "Loading heist" }),
    ).toBeInTheDocument()
  })

  it("shows a not-found message when no heist matches the id", () => {
    vi.mocked(useHeist).mockReturnValue({
      heist: null,
      loading: false,
      error: false,
    })

    render(<HeistDetailsPage />)

    expect(screen.getByRole("status")).toHaveTextContent("Heist not found.")
  })

  it("shows an error message when the subscription fails", () => {
    vi.mocked(useHeist).mockReturnValue({
      heist: null,
      loading: false,
      error: true,
    })

    render(<HeistDetailsPage />)

    expect(screen.getByRole("status")).toHaveTextContent(
      "Something went wrong loading this heist.",
    )
  })

  it("renders a heading even while loading or not found", () => {
    vi.mocked(useHeist).mockReturnValue({
      heist: null,
      loading: true,
      error: false,
    })

    render(<HeistDetailsPage />)

    expect(
      screen.getByRole("heading", { name: "Heist Details" }),
    ).toBeInTheDocument()
  })

  it("renders the heist's title, description, codenames, and deadline", () => {
    vi.mocked(useHeist).mockReturnValue({
      heist: fakeHeist(),
      loading: false,
      error: false,
    })

    render(<HeistDetailsPage />)

    expect(
      screen.getByRole("heading", { name: "Steal the crown jewels" }),
    ).toBeInTheDocument()
    expect(screen.getByText("In and out, no alarms.")).toBeInTheDocument()
    expect(screen.getByText(/@QuietVelvetOwl/)).toBeInTheDocument()
    expect(screen.getByText(/@SilentCrimsonFox/)).toBeInTheDocument()
    expect(screen.getByText(/\d{1,2}:\d{2}\s?[AP]M/)).toBeInTheDocument()
  })

  it("shows no status badge for a heist with no finalStatus yet", () => {
    vi.mocked(useHeist).mockReturnValue({
      heist: fakeHeist({ finalStatus: null }),
      loading: false,
      error: false,
    })

    render(<HeistDetailsPage />)

    expect(screen.queryByText("success")).not.toBeInTheDocument()
    expect(screen.queryByText("failure")).not.toBeInTheDocument()
  })

  it("shows the status badge for an expired heist", () => {
    vi.mocked(useHeist).mockReturnValue({
      heist: fakeHeist({ finalStatus: "success" }),
      loading: false,
      error: false,
    })

    render(<HeistDetailsPage />)

    expect(
      screen.getByText("success", { selector: "[aria-label]" }),
    ).toHaveAttribute("aria-label", "Outcome: success")
  })

  it("shows how long is left until the deadline for an open heist", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"))

    vi.mocked(useHeist).mockReturnValue({
      heist: fakeHeist({
        finalStatus: null,
        deadline: new Date("2026-01-03T05:00:00.000Z"),
      }),
      loading: false,
      error: false,
    })

    render(<HeistDetailsPage />)

    expect(screen.getByText("2d 5h left")).toBeInTheDocument()
  })

  it("shows the heist is closed instead of a countdown once it has a final status", () => {
    vi.mocked(useHeist).mockReturnValue({
      heist: fakeHeist({ finalStatus: "failure" }),
      loading: false,
      error: false,
    })

    render(<HeistDetailsPage />)

    expect(screen.getByText("Case closed")).toBeInTheDocument()
  })
})
