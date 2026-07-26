import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import AuthForm from "@/components/AuthForm"
import { signIn } from "@/lib/firebase/login"
import { signUp } from "@/lib/firebase/signup"

vi.mock("@/lib/firebase/login", () => ({ signIn: vi.fn() }))
vi.mock("@/lib/firebase/signup", () => ({ signUp: vi.fn() }))

const mockPush = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))

describe("AuthForm", () => {
  beforeEach(() => {
    vi.mocked(signIn).mockReset()
    vi.mocked(signUp).mockReset()
    mockPush.mockReset()
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

  it("signs the user in and shows a success message on valid login", async () => {
    const user = userEvent.setup()
    vi.mocked(signIn).mockResolvedValueOnce(undefined)
    render(<AuthForm initialMode="login" />)

    await user.type(screen.getByLabelText("Email"), "thief@example.com")
    await user.type(screen.getByLabelText("Password"), "loot123")
    await user.click(screen.getByRole("button", { name: "Login" }))

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("thief@example.com", "loot123")
    })
    expect(screen.getByText("Login successful")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toHaveValue("")
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("shows an error message and does not show success on failed login", async () => {
    const user = userEvent.setup()
    vi.mocked(signIn).mockRejectedValueOnce(
      new Error("Incorrect email or password."),
    )
    render(<AuthForm initialMode="login" />)

    await user.type(screen.getByLabelText("Email"), "thief@example.com")
    await user.type(screen.getByLabelText("Password"), "loot123")
    await user.click(screen.getByRole("button", { name: "Login" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Incorrect email or password.",
    )
    expect(screen.queryByText("Login successful")).not.toBeInTheDocument()
  })

  it("disables the submit button while signIn is pending", async () => {
    const user = userEvent.setup()
    let resolveSignIn: () => void = () => {}
    vi.mocked(signIn).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSignIn = () => resolve(undefined)
      }),
    )
    render(<AuthForm initialMode="login" />)

    await user.type(screen.getByLabelText("Email"), "thief@example.com")
    await user.type(screen.getByLabelText("Password"), "loot123")
    await user.click(screen.getByRole("button", { name: "Login" }))

    expect(screen.getByRole("button", { name: "Login" })).toBeDisabled()

    resolveSignIn()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Login" })).not.toBeDisabled()
    })
  })

  it("does not call signIn when a required field is empty", async () => {
    const user = userEvent.setup()
    render(<AuthForm initialMode="login" />)

    await user.type(screen.getByLabelText("Email"), "thief@example.com")
    await user.click(screen.getByRole("button", { name: "Login" }))

    expect(signIn).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("does not call signIn when the email format is invalid", async () => {
    const user = userEvent.setup()
    render(<AuthForm initialMode="login" />)

    await user.type(screen.getByLabelText("Email"), "not-an-email")
    await user.type(screen.getByLabelText("Password"), "loot123")
    await user.click(screen.getByRole("button", { name: "Login" }))

    expect(signIn).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("does not call signUp when a required field is empty in signup mode", async () => {
    const user = userEvent.setup()
    render(<AuthForm initialMode="signup" />)

    await user.type(screen.getByLabelText("Email"), "thief@example.com")
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    expect(signUp).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("does not call signUp when the email format is invalid in signup mode", async () => {
    const user = userEvent.setup()
    render(<AuthForm initialMode="signup" />)

    await user.type(screen.getByLabelText("Email"), "not-an-email")
    await user.type(screen.getByLabelText("Password"), "loot123")
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    expect(signUp).not.toHaveBeenCalled()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("calls signUp and redirects to /heists on successful signup", async () => {
    const user = userEvent.setup()
    vi.mocked(signUp).mockResolvedValueOnce(undefined)
    render(<AuthForm initialMode="signup" />)

    await user.type(screen.getByLabelText("Email"), "thief@example.com")
    await user.type(screen.getByLabelText("Password"), "loot123")
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith("thief@example.com", "loot123")
    })
    expect(mockPush).toHaveBeenCalledWith("/heists")
    expect(signIn).not.toHaveBeenCalled()
  })

  it("shows the signUp error message and does not redirect on failure", async () => {
    const user = userEvent.setup()
    vi.mocked(signUp).mockRejectedValueOnce(
      new Error("That email is already registered."),
    )
    render(<AuthForm initialMode="signup" />)

    await user.type(screen.getByLabelText("Email"), "thief@example.com")
    await user.type(screen.getByLabelText("Password"), "loot123")
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That email is already registered.",
    )
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("disables the submit button while signUp is pending", async () => {
    const user = userEvent.setup()
    let resolveSignUp: () => void = () => {}
    vi.mocked(signUp).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSignUp = () => resolve(undefined)
      }),
    )
    render(<AuthForm initialMode="signup" />)

    await user.type(screen.getByLabelText("Email"), "thief@example.com")
    await user.type(screen.getByLabelText("Password"), "loot123")
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    expect(screen.getByRole("button", { name: "Sign Up" })).toBeDisabled()

    resolveSignUp()
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign Up" })).not.toBeDisabled()
    })
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
