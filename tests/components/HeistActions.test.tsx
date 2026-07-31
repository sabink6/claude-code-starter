import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { User } from "firebase/auth"

vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))
vi.mock("@/lib/firebase/heists", () => ({
  FALLBACK_MESSAGE: "Something went wrong. Please try again.",
  claimHeistSuccess: vi.fn(),
  confirmHeistSuccess: vi.fn(),
  rejectHeistSuccess: vi.fn(),
}))

import HeistActions from "@/components/HeistActions"
import { useUser } from "@/lib/firebase/auth-context"
import {
  claimHeistSuccess,
  confirmHeistSuccess,
  rejectHeistSuccess,
} from "@/lib/firebase/heists"
import type { Heist } from "@/types/firestore"

const future = new Date(Date.now() + 60 * 60 * 1000)
const past = new Date(Date.now() - 60 * 60 * 1000)

const HEIST_TITLE = "Steal the crown jewels"
const markAsSuccessName = `Mark "${HEIST_TITLE}" as success`
const confirmName = `Confirm "${HEIST_TITLE}"`
const rejectName = `Reject "${HEIST_TITLE}"`

function fakeHeist(overrides: Partial<Heist> = {}): Heist {
  return {
    id: "heist-1",
    title: HEIST_TITLE,
    description: "",
    createdAt: new Date(),
    createdBy: "uid-creator",
    createdByCodename: "SilentCrimsonFox",
    assignedTo: "uid-assignee",
    assignedToCodename: "QuietVelvetOwl",
    deadline: future,
    successClaimedAt: null,
    finalStatus: null,
    ...overrides,
  }
}

function mockUser(uid: string | null) {
  vi.mocked(useUser).mockReturnValue({
    user: uid ? ({ uid } as User) : null,
    loading: false,
  })
}

describe("HeistActions", () => {
  beforeEach(() => {
    vi.mocked(claimHeistSuccess).mockReset().mockResolvedValue(undefined)
    vi.mocked(confirmHeistSuccess).mockReset().mockResolvedValue(undefined)
    vi.mocked(rejectHeistSuccess).mockReset().mockResolvedValue(undefined)
  })

  it("shows 'Mark as Success' to the assignee on an open heist", async () => {
    mockUser("uid-assignee")
    const user = userEvent.setup()
    render(<HeistActions heist={fakeHeist()} />)

    const button = screen.getByRole("button", { name: markAsSuccessName })
    await user.click(button)

    expect(claimHeistSuccess).toHaveBeenCalledWith("heist-1")
  })

  it("shows nothing to the creator of an open heist", () => {
    mockUser("uid-creator")
    render(<HeistActions heist={fakeHeist()} />)

    expect(
      screen.queryByRole("button", { name: markAsSuccessName }),
    ).not.toBeInTheDocument()
  })

  it("shows nothing to the assignee once the heist is pending confirmation", () => {
    mockUser("uid-assignee")
    render(<HeistActions heist={fakeHeist({ successClaimedAt: new Date() })} />)

    expect(
      screen.queryByRole("button", { name: markAsSuccessName }),
    ).not.toBeInTheDocument()
  })

  it("shows 'Confirm' and 'Reject' to the creator once a heist is pending confirmation", () => {
    mockUser("uid-creator")
    render(<HeistActions heist={fakeHeist({ successClaimedAt: new Date() })} />)

    expect(
      screen.getByRole("button", { name: confirmName }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: rejectName })).toBeInTheDocument()
  })

  it("calls confirmHeistSuccess when the creator clicks Confirm", async () => {
    mockUser("uid-creator")
    const user = userEvent.setup()
    render(<HeistActions heist={fakeHeist({ successClaimedAt: new Date() })} />)

    await user.click(screen.getByRole("button", { name: confirmName }))
    expect(confirmHeistSuccess).toHaveBeenCalledWith("heist-1")
  })

  it("calls rejectHeistSuccess when the creator clicks Reject", async () => {
    mockUser("uid-creator")
    const user = userEvent.setup()
    render(<HeistActions heist={fakeHeist({ successClaimedAt: new Date() })} />)

    await user.click(screen.getByRole("button", { name: rejectName }))
    expect(rejectHeistSuccess).toHaveBeenCalledWith("heist-1")
  })

  it("shows nothing to a viewer who is neither the assignee nor the creator", () => {
    mockUser("uid-bystander")
    render(<HeistActions heist={fakeHeist({ successClaimedAt: new Date() })} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("shows nothing once the heist has a confirmed outcome", () => {
    mockUser("uid-assignee")
    render(<HeistActions heist={fakeHeist({ finalStatus: "success" })} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("shows nothing once the deadline has passed unconfirmed", () => {
    mockUser("uid-creator")
    render(<HeistActions heist={fakeHeist({ deadline: past })} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("shows an error and re-enables the button when the mutation fails", async () => {
    mockUser("uid-assignee")
    vi.mocked(claimHeistSuccess).mockRejectedValueOnce(
      new Error("Something went wrong. Please try again."),
    )
    const user = userEvent.setup()
    render(<HeistActions heist={fakeHeist()} />)

    const button = screen.getByRole("button", { name: markAsSuccessName })
    await user.click(button)

    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument()
    expect(button).toBeEnabled()
  })

  it("announces a status message and moves focus to it after a successful action", async () => {
    mockUser("uid-assignee")
    const user = userEvent.setup()
    render(<HeistActions heist={fakeHeist()} />)

    await user.click(screen.getByRole("button", { name: markAsSuccessName }))

    const status = await screen.findByRole("status")
    expect(status).toHaveTextContent(
      "Marked as success, awaiting confirmation.",
    )
    expect(status).toHaveFocus()
  })

  it("re-enables the button once a successful mutation resolves", async () => {
    mockUser("uid-assignee")
    const user = userEvent.setup()
    render(<HeistActions heist={fakeHeist()} />)

    const button = screen.getByRole("button", { name: markAsSuccessName })
    await user.click(button)

    await waitFor(() => expect(button).toBeEnabled())
  })
})
