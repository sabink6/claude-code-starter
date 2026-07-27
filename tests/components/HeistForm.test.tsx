import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { User } from "firebase/auth"

import HeistForm from "@/components/HeistForm"
import { createHeist } from "@/lib/firebase/heists"
import { getUsers } from "@/lib/firebase/users"
import { useUser } from "@/lib/firebase/auth-context"

vi.mock("@/lib/firebase/heists", () => ({ createHeist: vi.fn() }))
vi.mock("@/lib/firebase/users", () => ({ getUsers: vi.fn() }))
vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))

const currentUser = {
  uid: "uid-current",
  displayName: "SilentCrimsonFox",
} as User

const otherUsers = [
  { id: "uid-current", codename: "SilentCrimsonFox" },
  { id: "uid-other", codename: "QuietVelvetOwl" },
]

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Title"), "Steal the crown jewels")
  await user.type(
    screen.getByLabelText("Description"),
    "In and out, no alarms.",
  )
  await user.selectOptions(screen.getByLabelText("Assign to"), "uid-other")
}

describe("HeistForm", () => {
  beforeEach(() => {
    vi.mocked(createHeist).mockReset()
    vi.mocked(getUsers).mockReset().mockResolvedValue(otherUsers)
    vi.mocked(useUser).mockReturnValue({ user: currentUser, loading: false })
    mockPush.mockReset()
  })

  it("renders assignee options fetched from getUsers, excluding the current user", async () => {
    render(<HeistForm />)

    expect(
      await screen.findByRole("option", { name: "QuietVelvetOwl" }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("option", { name: "SilentCrimsonFox" }),
    ).not.toBeInTheDocument()
  })

  it("shows an empty-state option and disables submit when no other users exist", async () => {
    vi.mocked(getUsers).mockResolvedValue([
      { id: "uid-current", codename: "SilentCrimsonFox" },
    ])
    render(<HeistForm />)

    expect(
      await screen.findByRole("option", {
        name: "No crew members available yet",
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Assign to")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Create Heist" })).toBeDisabled()
  })

  it("calls createHeist with the expected shape and redirects to /heists on success", async () => {
    const user = userEvent.setup()
    vi.mocked(createHeist).mockResolvedValueOnce(undefined)
    render(<HeistForm />)
    await screen.findByRole("option", { name: "QuietVelvetOwl" })

    await fillValidForm(user)
    await user.click(screen.getByRole("button", { name: "Create Heist" }))

    await waitFor(() => {
      expect(createHeist).toHaveBeenCalledWith({
        title: "Steal the crown jewels",
        description: "In and out, no alarms.",
        createdBy: "uid-current",
        createdByCodename: "SilentCrimsonFox",
        assignedTo: "uid-other",
        assignedToCodename: "QuietVelvetOwl",
      })
    })
    expect(mockPush).toHaveBeenCalledWith("/heists")
  })

  it("shows an error and does not redirect when createHeist fails", async () => {
    const user = userEvent.setup()
    vi.mocked(createHeist).mockRejectedValueOnce(
      new Error("Something went wrong. Please try again."),
    )
    render(<HeistForm />)
    await screen.findByRole("option", { name: "QuietVelvetOwl" })

    await fillValidForm(user)
    await user.click(screen.getByRole("button", { name: "Create Heist" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    )
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("does not call createHeist when a required field is empty", async () => {
    const user = userEvent.setup()
    render(<HeistForm />)
    await screen.findByRole("option", { name: "QuietVelvetOwl" })

    await user.type(screen.getByLabelText("Title"), "Steal the crown jewels")
    await user.click(screen.getByRole("button", { name: "Create Heist" }))

    expect(createHeist).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("caps title and description length via the native maxLength attribute", async () => {
    render(<HeistForm />)

    expect(screen.getByLabelText("Title")).toHaveAttribute("maxLength", "80")
    expect(screen.getByLabelText("Description")).toHaveAttribute(
      "maxLength",
      "500",
    )
  })
})
