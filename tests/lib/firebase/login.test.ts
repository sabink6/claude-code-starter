import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/firebase/config", () => ({ auth: {} }))
vi.mock("firebase/auth", () => ({ signInWithEmailAndPassword: vi.fn() }))

import { signInWithEmailAndPassword } from "firebase/auth"

import { FALLBACK_MESSAGE, signIn } from "@/lib/firebase/login"

describe("signIn", () => {
  beforeEach(() => {
    vi.mocked(signInWithEmailAndPassword)
      .mockReset()
      .mockResolvedValue(undefined as never)
  })

  it("calls signInWithEmailAndPassword with the entered email and password", async () => {
    await signIn("thief@example.com", "loot123")

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "thief@example.com",
      "loot123",
    )
  })

  it("maps auth/invalid-credential to a generic incorrect-credentials message", async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(
      Object.assign(new Error("bad"), { code: "auth/invalid-credential" }),
    )

    await expect(signIn("thief@example.com", "loot123")).rejects.toThrow(
      "Incorrect email or password.",
    )
  })

  it("maps legacy auth/wrong-password and auth/user-not-found to the same message", async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(
      Object.assign(new Error("bad"), { code: "auth/wrong-password" }),
    )
    await expect(signIn("thief@example.com", "loot123")).rejects.toThrow(
      "Incorrect email or password.",
    )

    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(
      Object.assign(new Error("bad"), { code: "auth/user-not-found" }),
    )
    await expect(signIn("thief@example.com", "loot123")).rejects.toThrow(
      "Incorrect email or password.",
    )
  })

  it("maps auth/too-many-requests to a rate-limit message", async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(
      Object.assign(new Error("slow down"), { code: "auth/too-many-requests" }),
    )

    await expect(signIn("thief@example.com", "loot123")).rejects.toThrow(
      "Too many attempts. Please wait a moment and try again.",
    )
  })

  it("falls back to the generic message for an unmapped error code", async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(
      Object.assign(new Error("mystery"), { code: "auth/something-weird" }),
    )

    await expect(signIn("thief@example.com", "loot123")).rejects.toThrow(
      FALLBACK_MESSAGE,
    )
  })
})
