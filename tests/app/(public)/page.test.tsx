import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import Home from "@/app/(public)/page"

describe("Home (splash page)", () => {
  it("renders the splash content", () => {
    render(<Home />)

    expect(screen.getByText("Small heists. Big chaos.")).toBeInTheDocument()
  })

  it("renders a registration link to /signup", () => {
    render(<Home />)

    const registerLink = screen.getByRole("link", { name: "Get Your Codename" })
    expect(registerLink).toBeInTheDocument()
    expect(registerLink).toHaveAttribute("href", "/signup")
  })

  it("renders a quiet link to /login for returning users", () => {
    render(<Home />)

    const loginLink = screen.getByRole("link", { name: "Log in" })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute("href", "/login")
  })

  it("does not render a link to /heists", () => {
    render(<Home />)

    expect(
      screen.queryByRole("link", { name: "View Heists" }),
    ).not.toBeInTheDocument()
  })
})
