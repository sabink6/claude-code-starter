import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import StatusBadge from "@/components/StatusBadge"

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="success" />)

    expect(screen.getByText("success")).toBeInTheDocument()
  })

  it("gives the badge a self-describing accessible name", () => {
    render(<StatusBadge status="failure" />)

    expect(screen.getByText("failure")).toHaveAttribute(
      "aria-label",
      "Outcome: failure",
    )
  })
})
