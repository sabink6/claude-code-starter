import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import Avatar from "@/components/Avatar"

describe("Avatar", () => {
  it("renders successfully", () => {
    render(<Avatar name="Alice" />)
    expect(screen.getByText("A")).toBeInTheDocument()
  })

  it("shows the first letter for a plain lowercase name", () => {
    render(<Avatar name="bob" />)
    expect(screen.getByText("B")).toBeInTheDocument()
  })

  it("shows the first two uppercase letters for a PascalCase name", () => {
    render(<Avatar name="JohnDoe" />)
    expect(screen.getByText("JD")).toBeInTheDocument()
  })
})
