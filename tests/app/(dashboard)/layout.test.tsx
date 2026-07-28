import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { User } from "firebase/auth"

import HeistsLayout from "@/app/(dashboard)/layout"
import { useUser } from "@/lib/firebase/auth-context"

const mockReplace = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))
vi.mock("@/lib/firebase/logout", () => ({ logOut: vi.fn() }))

const mockedUseUser = vi.mocked(useUser)

describe("(dashboard) HeistsLayout", () => {
  beforeEach(() => {
    mockReplace.mockReset()
    mockedUseUser.mockReset()
  })

  it("shows a loading indicator and does not redirect while auth state is loading", () => {
    mockedUseUser.mockReturnValue({ user: null, loading: true })

    render(
      <HeistsLayout>
        <p>child content</p>
      </HeistsLayout>,
    )

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("child content")).not.toBeInTheDocument()
    expect(screen.queryByText("Create New Heist")).not.toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("redirects a logged-out user to /login and does not render Navbar or children", async () => {
    mockedUseUser.mockReturnValue({ user: null, loading: false })

    render(
      <HeistsLayout>
        <p>child content</p>
      </HeistsLayout>,
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login")
    })
    expect(screen.queryByText("child content")).not.toBeInTheDocument()
    expect(screen.queryByText("Create New Heist")).not.toBeInTheDocument()
  })

  it("renders the Navbar and children for a logged-in user, without redirecting", () => {
    mockedUseUser.mockReturnValue({
      user: { uid: "abc123" } as User,
      loading: false,
    })

    render(
      <HeistsLayout>
        <p>child content</p>
      </HeistsLayout>,
    )

    expect(screen.getByText("child content")).toBeInTheDocument()
    expect(screen.getByText("Create New Heist")).toBeInTheDocument()
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
