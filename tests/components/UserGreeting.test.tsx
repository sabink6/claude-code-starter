import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import UserGreeting from "@/components/UserGreeting"

describe("UserGreeting", () => {
  it("renders successfully", () => {
    render(<UserGreeting codename="QuietVelvetOwl" />)
    expect(screen.getByText("Hello, QuietVelvetOwl")).toBeInTheDocument()
  })

  it("greets the given codename", () => {
    render(<UserGreeting codename="SilentCrimsonFox" />)
    expect(screen.getByText(/SilentCrimsonFox/)).toBeInTheDocument()
  })
})
