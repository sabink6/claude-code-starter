import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }))
vi.mock("firebase/firestore", () => ({
  collection: vi.fn((_db, path) => ({ type: "collection", path })),
  getDocs: vi.fn(),
}))

import { collection, getDocs } from "firebase/firestore"

import { FALLBACK_MESSAGE, getUsers } from "@/lib/firebase/users"

function fakeDoc(id: string, codename: string) {
  return { id, data: () => ({ codename }) }
}

describe("getUsers", () => {
  beforeEach(() => {
    vi.mocked(getDocs).mockReset()
  })

  it("queries the users collection", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({ docs: [] } as never)

    await getUsers()

    expect(collection).toHaveBeenCalledWith(expect.anything(), "users")
  })

  it("maps Firestore docs into id/codename pairs", async () => {
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [
        fakeDoc("uid-1", "SilentCrimsonFox"),
        fakeDoc("uid-2", "QuietVelvetOwl"),
      ],
    } as never)

    const result = await getUsers()

    expect(result).toEqual([
      { id: "uid-1", codename: "SilentCrimsonFox" },
      { id: "uid-2", codename: "QuietVelvetOwl" },
    ])
  })

  it("throws the fallback message when getDocs rejects", async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error("network error"))

    await expect(getUsers()).rejects.toThrow(FALLBACK_MESSAGE)
  })
})
