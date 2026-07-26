import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import type { User } from "firebase/auth"

import PreviewPage from "@/app/(public)/preview/page"
import { useUser } from "@/lib/firebase/auth-context"

vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))

const mockedUseUser = vi.mocked(useUser)

describe("PreviewPage", () => {
  it("only the login link is enabled when logged out", () => {
    mockedUseUser.mockReturnValue({ user: null, loading: false })

    render(<PreviewPage />)

    expect(screen.getByRole("link", { name: "Log In" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    )
    expect(screen.getByRole("link", { name: "View Heists" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
  })

  it("only the heists link is enabled when logged in", () => {
    mockedUseUser.mockReturnValue({
      user: { uid: "abc123" } as User,
      loading: false,
    })

    render(<PreviewPage />)

    expect(
      screen.getByRole("link", { name: "View Heists" }),
    ).not.toHaveAttribute("aria-disabled", "true")
    expect(screen.getByRole("link", { name: "Log In" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
  })
})
