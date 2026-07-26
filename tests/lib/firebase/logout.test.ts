import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/firebase/config", () => ({ auth: {} }))
vi.mock("firebase/auth", () => ({ signOut: vi.fn() }))

import { signOut } from "firebase/auth"

import { logOut } from "@/lib/firebase/logout"

describe("logOut", () => {
  beforeEach(() => {
    vi.mocked(signOut).mockReset().mockResolvedValue(undefined)
  })

  it("calls signOut with the shared auth instance", async () => {
    await logOut()

    expect(signOut).toHaveBeenCalledWith(expect.anything())
  })

  it("logs the error and does not throw when signOut rejects", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {})
    vi.mocked(signOut).mockRejectedValueOnce(new Error("network error"))

    await expect(logOut()).resolves.toBeUndefined()
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
