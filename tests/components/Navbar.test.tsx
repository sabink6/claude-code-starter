import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import type { User } from "firebase/auth"

// component imports
import Navbar from "@/components/Navbar"
import { useUser } from "@/lib/firebase/auth-context"
import { logOut } from "@/lib/firebase/logout"

vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))
vi.mock("@/lib/firebase/logout", () => ({ logOut: vi.fn() }))

const mockedUseUser = vi.mocked(useUser)
const mockedLogOut = vi.mocked(logOut)

describe("Navbar", () => {
  beforeEach(() => {
    mockedUseUser.mockReset()
    mockedLogOut.mockReset().mockResolvedValue(undefined)
  })

  it("renders the main heading", () => {
    mockedUseUser.mockReturnValue({ user: null, loading: false })
    render(<Navbar />)

    const heading = screen.getByRole("heading", { level: 1 })
    expect(heading).toBeInTheDocument()
  })

  it("renders the Create New Heist link", () => {
    mockedUseUser.mockReturnValue({ user: null, loading: false })
    render(<Navbar />)

    const createLink = screen.getByRole("link", { name: /create new heist/i })
    expect(createLink).toBeInTheDocument()
    expect(createLink).toHaveAttribute("href", "/heists/create")
  })

  it("shows the logout button when a user is logged in", () => {
    mockedUseUser.mockReturnValue({
      user: { uid: "abc123" } as User,
      loading: false,
    })
    render(<Navbar />)

    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument()
  })

  it("greets the logged-in user by codename", () => {
    mockedUseUser.mockReturnValue({
      user: { uid: "abc123", displayName: "QuietVelvetOwl" } as User,
      loading: false,
    })
    render(<Navbar />)

    expect(screen.getByText("Hello, QuietVelvetOwl")).toBeInTheDocument()
  })

  it("hides the greeting when logged out", () => {
    mockedUseUser.mockReturnValue({ user: null, loading: false })
    render(<Navbar />)

    expect(screen.queryByText(/^Hello,/)).not.toBeInTheDocument()
  })

  it("hides the greeting while auth state is still loading", () => {
    mockedUseUser.mockReturnValue({
      user: { uid: "abc123", displayName: "QuietVelvetOwl" } as User,
      loading: true,
    })
    render(<Navbar />)

    expect(screen.queryByText(/^Hello,/)).not.toBeInTheDocument()
  })

  it("hides the logout button when logged out", () => {
    mockedUseUser.mockReturnValue({ user: null, loading: false })
    render(<Navbar />)

    expect(
      screen.queryByRole("button", { name: /logout/i }),
    ).not.toBeInTheDocument()
  })

  it("hides the logout button while auth state is still loading", () => {
    mockedUseUser.mockReturnValue({
      user: { uid: "abc123" } as User,
      loading: true,
    })
    render(<Navbar />)

    expect(
      screen.queryByRole("button", { name: /logout/i }),
    ).not.toBeInTheDocument()
  })

  it("calls logOut when the logout button is clicked", async () => {
    mockedUseUser.mockReturnValue({
      user: { uid: "abc123" } as User,
      loading: false,
    })
    render(<Navbar />)

    fireEvent.click(screen.getByRole("button", { name: /logout/i }))

    await waitFor(() => expect(mockedLogOut).toHaveBeenCalledTimes(1))
  })

  it("disables the logout button while sign-out is in flight", async () => {
    let resolveLogOut: () => void = () => {}
    mockedLogOut.mockReturnValue(
      new Promise((resolve) => {
        resolveLogOut = () => resolve(undefined)
      }),
    )
    mockedUseUser.mockReturnValue({
      user: { uid: "abc123" } as User,
      loading: false,
    })
    render(<Navbar />)

    const button = screen.getByRole("button", { name: /logout/i })
    fireEvent.click(button)
    expect(button).toBeDisabled()

    resolveLogOut()
    await waitFor(() => expect(button).not.toBeDisabled())
  })

  describe("item inventory", () => {
    it("renders the brand, tagline, and Create New Heist link when signed out", () => {
      mockedUseUser.mockReturnValue({ user: null, loading: false })
      render(<Navbar />)

      expect(
        screen.getByRole("heading", { level: 1, name: /pcket heist/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: /pcket heist/i }),
      ).toHaveAttribute("href", "/heists")
      expect(screen.getByText("Small heists. Big chaos.")).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: /create new heist/i }),
      ).toHaveAttribute("href", "/heists/create")
      expect(screen.queryByText(/^Hello,/)).not.toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: /logout/i }),
      ).not.toBeInTheDocument()
    })

    it("renders every item, including the greeting and logout, when signed in", () => {
      mockedUseUser.mockReturnValue({
        user: { uid: "abc123", displayName: "QuietVelvetOwl" } as User,
        loading: false,
      })
      render(<Navbar />)

      expect(
        screen.getByRole("heading", { level: 1, name: /pcket heist/i }),
      ).toBeInTheDocument()
      expect(screen.getByText("Small heists. Big chaos.")).toBeInTheDocument()
      expect(screen.getByText("Hello, QuietVelvetOwl")).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: /logout/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: /create new heist/i }),
      ).toHaveAttribute("href", "/heists/create")
    })
  })
})
