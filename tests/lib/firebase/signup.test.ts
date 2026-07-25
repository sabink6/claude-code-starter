import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }))
vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  deleteUser: vi.fn(),
}))
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, path) => ({ type: "collection", path })),
  doc: vi.fn((_db, path, id) => ({ type: "doc", path, id })),
  getDocs: vi.fn(),
  query: vi.fn((...args) => ({ type: "query", args })),
  setDoc: vi.fn(),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
}))
vi.mock("@/lib/codename", () => ({ generateCodename: vi.fn() }))

import {
  createUserWithEmailAndPassword,
  deleteUser,
  updateProfile,
} from "firebase/auth"
import { getDocs, setDoc } from "firebase/firestore"

import { generateCodename } from "@/lib/codename"
import { FALLBACK_MESSAGE, signUp } from "@/lib/firebase/signup"

const mockUser = { uid: "uid-123" }

describe("signUp", () => {
  beforeEach(() => {
    vi.mocked(generateCodename).mockReset().mockReturnValue("SilentCrimsonFox")
    vi.mocked(getDocs)
      .mockReset()
      .mockResolvedValue({ empty: true } as never)
    vi.mocked(createUserWithEmailAndPassword)
      .mockReset()
      .mockResolvedValue({ user: mockUser } as never)
    vi.mocked(updateProfile)
      .mockReset()
      .mockResolvedValue(undefined as never)
    vi.mocked(setDoc)
      .mockReset()
      .mockResolvedValue(undefined as never)
    vi.mocked(deleteUser)
      .mockReset()
      .mockResolvedValue(undefined as never)
  })

  it("calls createUserWithEmailAndPassword with the entered email and password", async () => {
    await signUp("thief@example.com", "loot123")

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "thief@example.com",
      "loot123",
    )
  })

  it("sets the displayName and writes a users doc with only id and codename", async () => {
    await signUp("thief@example.com", "loot123")

    expect(updateProfile).toHaveBeenCalledWith(mockUser, {
      displayName: "SilentCrimsonFox",
    })

    const payload = vi.mocked(setDoc).mock.calls[0][1]
    expect(payload).toEqual({ id: "uid-123", codename: "SilentCrimsonFox" })
    expect(payload).not.toHaveProperty("email")
  })

  it("regenerates the codename on collision and writes the second candidate", async () => {
    vi.mocked(generateCodename)
      .mockReturnValueOnce("FirstCandidate")
      .mockReturnValueOnce("SecondCandidate")
    vi.mocked(getDocs)
      .mockResolvedValueOnce({ empty: false } as never)
      .mockResolvedValueOnce({ empty: true } as never)

    await signUp("thief@example.com", "loot123")

    const payload = vi.mocked(setDoc).mock.calls[0][1]
    expect(payload).toEqual({ id: "uid-123", codename: "SecondCandidate" })
  })

  it("maps auth/email-already-in-use and never writes the account", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce(
      Object.assign(new Error("in use"), { code: "auth/email-already-in-use" }),
    )

    await expect(signUp("thief@example.com", "loot123")).rejects.toThrow(
      "That email is already registered. Try logging in instead.",
    )
    expect(updateProfile).not.toHaveBeenCalled()
    expect(setDoc).not.toHaveBeenCalled()
  })

  it("falls back to the generic message for an unmapped error code", async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce(
      Object.assign(new Error("mystery"), { code: "auth/something-weird" }),
    )

    await expect(signUp("thief@example.com", "loot123")).rejects.toThrow(
      FALLBACK_MESSAGE,
    )
  })

  it("rolls back the account when updateProfile or setDoc fails", async () => {
    vi.mocked(updateProfile).mockRejectedValueOnce(new Error("boom"))

    await expect(signUp("thief@example.com", "loot123")).rejects.toThrow(
      FALLBACK_MESSAGE,
    )
    expect(deleteUser).toHaveBeenCalledWith(mockUser)
  })
})
