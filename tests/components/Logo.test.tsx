import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import Logo from "@/components/Logo"

describe("Logo", () => {
  it("renders the wordmark text around the icon", () => {
    const { container } = render(<Logo />)

    expect(container.textContent).toBe("Pcket Heist")
  })

  it("hides the icon from assistive tech", () => {
    const { container } = render(<Logo />)

    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    )
  })

  it("passes the size prop through to the icon", () => {
    const { container } = render(<Logo size={14} />)

    const icon = container.querySelector("svg")
    expect(icon).toHaveAttribute("width", "14")
    expect(icon).toHaveAttribute("height", "14")
  })
})
