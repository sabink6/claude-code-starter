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

  it("renders a distinct label and accessible name for a pending claim", () => {
    render(<StatusBadge status="pending" />)

    expect(screen.getByText("pending confirmation")).toHaveAttribute(
      "aria-label",
      "Status: pending confirmation",
    )
  })
})
