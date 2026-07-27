import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }))
vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(),
  collection: vi.fn((_db, path) => ({ type: "collection", path })),
  serverTimestamp: vi.fn(() => ({ type: "serverTimestamp" })),
}))

import { addDoc } from "firebase/firestore"

import { FALLBACK_MESSAGE, createHeist } from "@/lib/firebase/heists"

const baseInput = {
  title: "Steal the crown jewels",
  description: "In and out, no alarms.",
  createdBy: "uid-creator",
  createdByCodename: "SilentCrimsonFox",
  assignedTo: "uid-assignee",
  assignedToCodename: "QuietVelvetOwl",
}

describe("createHeist", () => {
  beforeEach(() => {
    vi.mocked(addDoc)
      .mockReset()
      .mockResolvedValue({} as never)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("writes the heists collection with the caller-supplied fields unchanged", async () => {
    await createHeist(baseInput)

    const call = vi.mocked(addDoc).mock.calls[0]
    expect(call[0]).toEqual({ type: "collection", path: "heists" })
    const payload = call[1] as Record<string, unknown>
    expect(payload).toMatchObject(baseInput)
  })

  it("sets createdAt to the serverTimestamp() sentinel", async () => {
    await createHeist(baseInput)

    const payload = vi.mocked(addDoc).mock.calls[0][1] as Record<
      string,
      unknown
    >
    expect(payload.createdAt).toEqual({ type: "serverTimestamp" })
  })

  it("sets deadline to exactly 48 hours after creation", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z")
    vi.useFakeTimers()
    vi.setSystemTime(now)

    await createHeist(baseInput)

    const payload = vi.mocked(addDoc).mock.calls[0][1] as Record<
      string,
      unknown
    >
    expect(payload.deadline).toEqual(new Date("2026-01-03T00:00:00.000Z"))
  })

  it("always writes finalStatus as null", async () => {
    await createHeist(baseInput)

    const payload = vi.mocked(addDoc).mock.calls[0][1] as Record<
      string,
      unknown
    >
    expect(payload.finalStatus).toBeNull()
  })

  it("throws the fallback message when addDoc rejects", async () => {
    vi.mocked(addDoc).mockRejectedValueOnce(new Error("permission-denied"))

    await expect(createHeist(baseInput)).rejects.toThrow(FALLBACK_MESSAGE)
  })
})
