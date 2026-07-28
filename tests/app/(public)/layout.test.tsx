import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { User } from "firebase/auth"

import RootLayout from "@/app/(public)/layout"
import { useUser } from "@/lib/firebase/auth-context"

const mockReplace = vi.fn()
const mockUsePathname = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockUsePathname(),
}))

vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))

const mockedUseUser = vi.mocked(useUser)

describe("(public) RootLayout", () => {
  beforeEach(() => {
    mockReplace.mockReset()
    mockUsePathname.mockReset().mockReturnValue("/")
    mockedUseUser.mockReset()
  })

  it("shows a loading indicator and does not redirect while auth state is loading", () => {
    mockedUseUser.mockReturnValue({ user: null, loading: true })

    render(
      <RootLayout>
        <p>child content</p>
      </RootLayout>,
    )

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByText("child content")).not.toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("renders children and does not redirect for a logged-out user", () => {
    mockedUseUser.mockReturnValue({ user: null, loading: false })

    render(
      <RootLayout>
        <p>child content</p>
      </RootLayout>,
    )

    expect(screen.getByText("child content")).toBeInTheDocument()
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it("redirects a logged-in user on / to /heists and does not render children", async () => {
    mockedUseUser.mockReturnValue({
      user: { uid: "abc123" } as User,
      loading: false,
    })

    render(
      <RootLayout>
        <p>child content</p>
      </RootLayout>,
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/heists")
    })
    expect(screen.queryByText("child content")).not.toBeInTheDocument()
  })

  it("renders /preview immediately for a logged-in user, without redirecting, even while loading", () => {
    mockUsePathname.mockReturnValue("/preview")
    mockedUseUser.mockReturnValue({
      user: { uid: "abc123" } as User,
      loading: true,
    })

    render(
      <RootLayout>
        <p>child content</p>
      </RootLayout>,
    )

    expect(screen.getByText("child content")).toBeInTheDocument()
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
