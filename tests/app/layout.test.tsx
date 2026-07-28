import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"

import RootLayout from "@/app/layout"

vi.mock("@/lib/firebase/auth-context", () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe("RootLayout", () => {
  it("renders the footer as a contentinfo landmark alongside a public-area page", () => {
    render(
      <RootLayout>
        <main className="public">
          <p>splash content</p>
        </main>
      </RootLayout>,
    )

    expect(screen.getByText("splash content")).toBeInTheDocument()
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
  })

  it("renders the footer as a contentinfo landmark alongside a dashboard-area page", () => {
    render(
      <RootLayout>
        <>
          <header>Navbar</header>
          <main>
            <p>heists content</p>
          </main>
        </>
      </RootLayout>,
    )

    expect(screen.getByText("heists content")).toBeInTheDocument()
    expect(screen.getByRole("contentinfo")).toBeInTheDocument()
  })
})
