import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import Footer from "@/components/Footer"
import { version } from "@/package.json"

describe("Footer", () => {
  it("renders the project name via the Logo", () => {
    const { container } = render(<Footer />)

    expect(container.textContent).toContain("Pcket Heist")
  })

  it("renders the current version from package.json", () => {
    render(<Footer />)

    expect(screen.getByText(`v${version}`)).toBeInTheDocument()
  })

  it("links to the GitHub repository, opening in a new tab", () => {
    render(<Footer />)

    const link = screen.getByRole("link", { name: /github/i })
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/sabink6/claude-code-starter",
    )
    expect(link).toHaveAttribute("target", "_blank")
    expect(link.getAttribute("rel")).toContain("noopener")
  })

  it("shows the MIT license", () => {
    render(<Footer />)

    expect(screen.getByText("MIT License")).toBeInTheDocument()
  })
})
