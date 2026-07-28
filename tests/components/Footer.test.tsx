import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import Footer from "@/components/Footer"

describe("Footer", () => {
  it("renders the tagline and copyright inside a contentinfo landmark", () => {
    render(<Footer />)

    const footer = screen.getByRole("contentinfo")
    expect(footer).toHaveTextContent("Small heists. Big chaos.")
    expect(footer).toHaveTextContent(
      new RegExp(`© ${new Date().getFullYear()} Pocket Heist`),
    )
  })
})
