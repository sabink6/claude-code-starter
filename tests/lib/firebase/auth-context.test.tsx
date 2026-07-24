import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { onAuthStateChanged, type User } from "firebase/auth"

import { UserProvider, useUser } from "@/lib/firebase/auth-context"

vi.mock("@/lib/firebase/config", () => ({ auth: {} }))
vi.mock("firebase/auth", () => ({ onAuthStateChanged: vi.fn() }))

const mockedOnAuthStateChanged = vi.mocked(onAuthStateChanged)

function wrapper({ children }: { children: React.ReactNode }) {
  return <UserProvider>{children}</UserProvider>
}

describe("useUser / UserProvider", () => {
  let callback: (user: User | null) => void

  beforeEach(() => {
    mockedOnAuthStateChanged.mockReset()
    mockedOnAuthStateChanged.mockImplementation((_auth, onNext) => {
      callback = onNext as (user: User | null) => void
      return () => {}
    })
  })

  it("starts in a loading state before the listener has fired", () => {
    const { result } = renderHook(() => useUser(), { wrapper })

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it("reflects a logged-out state once the listener fires with null", () => {
    const { result } = renderHook(() => useUser(), { wrapper })

    act(() => callback(null))

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it("reflects a logged-in state once the listener fires with a user", () => {
    const fakeUser = { uid: "abc123", email: "thief@example.com" } as User
    const { result } = renderHook(() => useUser(), { wrapper })

    act(() => callback(fakeUser))

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toEqual(fakeUser)
  })

  it("settles on the final state after rapid successive auth changes", () => {
    const fakeUser = { uid: "abc123" } as User
    const { result } = renderHook(() => useUser(), { wrapper })

    act(() => {
      callback(fakeUser)
      callback(null)
      callback(fakeUser)
    })

    expect(result.current.user).toEqual(fakeUser)
    expect(result.current.loading).toBe(false)
  })

  it("throws a helpful error when used outside a UserProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => renderHook(() => useUser())).toThrow(
      "useUser must be used within a UserProvider",
    )

    consoleSpy.mockRestore()
  })
})
