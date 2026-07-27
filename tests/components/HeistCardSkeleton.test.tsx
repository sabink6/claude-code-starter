import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import HeistCardSkeleton from "@/components/HeistCardSkeleton"

describe("HeistCardSkeleton", () => {
  it("renders as an accessible loading status with no props required", () => {
    render(<HeistCardSkeleton />)

    expect(
      screen.getByRole("status", { name: "Loading heist" }),
    ).toBeInTheDocument()
  })

  it("renders no real heist content", () => {
    render(<HeistCardSkeleton />)

    expect(screen.queryByRole("heading")).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
