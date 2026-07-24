import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import type { User } from "firebase/auth"

import Home from "@/app/(public)/page"
import { useUser } from "@/lib/firebase/auth-context"

vi.mock("@/lib/firebase/auth-context", () => ({
  useUser: vi.fn(),
}))

const mockedUseUser = vi.mocked(useUser)

describe("Home (splash page)", () => {
  it("renders nothing while auth state is loading", () => {
    mockedUseUser.mockReturnValue({ user: null, loading: true })

    const { container } = render(<Home />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders the splash content once resolved and logged out", () => {
    mockedUseUser.mockReturnValue({ user: null, loading: false })

    render(<Home />)

    expect(screen.getByText("Small heists. Big chaos.")).toBeInTheDocument()
  })

  it("renders the splash content once resolved and logged in", () => {
    mockedUseUser.mockReturnValue({
      user: { uid: "abc123" } as User,
      loading: false,
    })

    render(<Home />)

    expect(screen.getByText("Small heists. Big chaos.")).toBeInTheDocument()
  })
})
