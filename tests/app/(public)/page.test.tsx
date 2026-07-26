import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import Home from "@/app/(public)/page"

describe("Home (splash page)", () => {
  it("renders the splash content", () => {
    render(<Home />)

    expect(screen.getByText("Small heists. Big chaos.")).toBeInTheDocument()
  })

  it("renders a link to /login", () => {
    render(<Home />)

    const loginLink = screen.getByRole("link", { name: "Log In" })
    expect(loginLink).toBeInTheDocument()
    expect(loginLink).toHaveAttribute("href", "/login")
  })

  it("renders a link to /heists", () => {
    render(<Home />)

    const heistsLink = screen.getByRole("link", { name: "View Heists" })
    expect(heistsLink).toBeInTheDocument()
    expect(heistsLink).toHaveAttribute("href", "/heists")
  })
})
