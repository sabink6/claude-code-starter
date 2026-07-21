import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import AuthForm from "@/components/AuthForm"

describe("AuthForm", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders the login form with email, password, and Login button", () => {
    render(<AuthForm initialMode="login" />)

    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument()
  })

  it("renders the signup form with email, password, and Sign Up button", () => {
    render(<AuthForm initialMode="signup" />)

    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument()
  })

  it("toggles password visibility when the show/hide control is clicked", async () => {
    const user = userEvent.setup()
    render(<AuthForm initialMode="login" />)

    const password = screen.getByLabelText("Password")
    expect(password).toHaveAttribute("type", "password")

    await user.click(screen.getByRole("button", { name: "Show password" }))
    expect(password).toHaveAttribute("type", "text")

    await user.click(screen.getByRole("button", { name: "Hide password" }))
    expect(password).toHaveAttribute("type", "password")
  })

  it("logs the form data on submit with valid input", async () => {
    const user = userEvent.setup()
    const logSpy = vi.spyOn(console, "log")
    render(<AuthForm initialMode="login" />)

    await user.type(screen.getByLabelText("Email"), "thief@example.com")
    await user.type(screen.getByLabelText("Password"), "loot123")
    await user.click(screen.getByRole("button", { name: "Login" }))

    expect(logSpy).toHaveBeenCalledWith("auth form submitted", {
      form: "login",
      email: "thief@example.com",
      password: "loot123",
    })
  })

  it("does not log when a required field is empty", async () => {
    const user = userEvent.setup()
    const logSpy = vi.spyOn(console, "log")
    render(<AuthForm initialMode="login" />)

    await user.type(screen.getByLabelText("Email"), "thief@example.com")
    await user.click(screen.getByRole("button", { name: "Login" }))

    expect(logSpy).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("does not log when the email format is invalid", async () => {
    const user = userEvent.setup()
    const logSpy = vi.spyOn(console, "log")
    render(<AuthForm initialMode="login" />)

    await user.type(screen.getByLabelText("Email"), "not-an-email")
    await user.type(screen.getByLabelText("Password"), "loot123")
    await user.click(screen.getByRole("button", { name: "Login" }))

    expect(logSpy).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("switches to the other form and keeps the email but clears the password", async () => {
    const user = userEvent.setup()
    render(<AuthForm initialMode="login" />)

    await user.type(screen.getByLabelText("Email"), "thief@example.com")
    await user.type(screen.getByLabelText("Password"), "loot123")

    await user.click(screen.getByRole("button", { name: "Sign up" }))

    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveValue("thief@example.com")
    expect(screen.getByLabelText("Password")).toHaveValue("")
  })
})
