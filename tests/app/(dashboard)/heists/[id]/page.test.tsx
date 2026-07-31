import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest"
import type { User } from "firebase/auth"

import HeistDetailsPage from "@/app/(dashboard)/heists/[id]/page"
import { useUser } from "@/lib/firebase/auth-context"
import { useHeist } from "@/lib/firebase/heists"
import type { Heist } from "@/types/firestore"

vi.mock("next/navigation", () => ({ useParams: () => ({ id: "heist-1" }) }))
vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))
vi.mock("@/lib/firebase/heists", () => ({
  useHeist: vi.fn(),
  claimHeistSuccess: vi.fn(),
  confirmHeistSuccess: vi.fn(),
  rejectHeistSuccess: vi.fn(),
  FALLBACK_MESSAGE: "Something went wrong. Please try again.",
}))

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
    deadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
    successClaimedAt: null,
    finalStatus: null,
    ...overrides,
  }
}

describe("HeistDetailsPage", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.mocked(useUser).mockReturnValue({ user: null, loading: false })
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

  it("shows the status badge once a heist is confirmed successful", () => {
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

  it("shows a failure badge for a heist that expired without a confirmed success", () => {
    vi.mocked(useHeist).mockReturnValue({
      heist: fakeHeist({ deadline: new Date(Date.now() - 1000) }),
      loading: false,
      error: false,
    })

    render(<HeistDetailsPage />)

    expect(
      screen.getByText("failure", { selector: "[aria-label]" }),
    ).toHaveAttribute("aria-label", "Outcome: failure")
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

  it("shows the heist is closed instead of a countdown once its deadline has passed", () => {
    vi.mocked(useHeist).mockReturnValue({
      heist: fakeHeist({ deadline: new Date(Date.now() - 1000) }),
      loading: false,
      error: false,
    })

    render(<HeistDetailsPage />)

    expect(screen.getByText("Case closed")).toBeInTheDocument()
  })

  it("shows a 'Mark as Success' action to the heist's assignee", () => {
    vi.mocked(useUser).mockReturnValue({
      user: { uid: "uid-assignee" } as User,
      loading: false,
    })
    vi.mocked(useHeist).mockReturnValue({
      heist: fakeHeist(),
      loading: false,
      error: false,
    })

    render(<HeistDetailsPage />)

    expect(
      screen.getByRole("button", {
        name: 'Mark "Steal the crown jewels" as success',
      }),
    ).toBeInTheDocument()
  })

  it("shows 'Confirm' and 'Reject' actions to the creator once a heist is pending confirmation", () => {
    vi.mocked(useUser).mockReturnValue({
      user: { uid: "uid-creator" } as User,
      loading: false,
    })
    vi.mocked(useHeist).mockReturnValue({
      heist: fakeHeist({ successClaimedAt: new Date() }),
      loading: false,
      error: false,
    })

    render(<HeistDetailsPage />)

    expect(
      screen.getByRole("button", { name: 'Confirm "Steal the crown jewels"' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: 'Reject "Steal the crown jewels"' }),
    ).toBeInTheDocument()
  })
})
