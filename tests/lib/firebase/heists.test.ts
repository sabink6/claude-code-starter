import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { User } from "firebase/auth"

vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }))
vi.mock("@/lib/firebase/auth-context", () => ({ useUser: vi.fn() }))
vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(),
  collection: vi.fn((_db, path) => ({
    type: "collection",
    path,
    withConverter: vi.fn(function (this: unknown) {
      return this
    }),
  })),
  serverTimestamp: vi.fn(() => ({ type: "serverTimestamp" })),
  query: vi.fn((ref, ...clauses) => ({ type: "query", ref, clauses })),
  where: vi.fn((field, op, value) => ({ type: "where", field, op, value })),
  orderBy: vi.fn((field, direction) => ({ type: "orderBy", field, direction })),
  onSnapshot: vi.fn(),
}))

import { addDoc, onSnapshot, orderBy, query, where } from "firebase/firestore"

import { useUser } from "@/lib/firebase/auth-context"
import { FALLBACK_MESSAGE, createHeist, useHeists } from "@/lib/firebase/heists"

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
    expect(call[0]).toEqual(
      expect.objectContaining({ type: "collection", path: "heists" }),
    )
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

type SnapshotDoc = { data: () => Record<string, unknown> }
type SnapshotCallback = (snapshot: { docs: SnapshotDoc[] }) => void
type ErrorCallback = (error: Error) => void

function fakeDoc(fields: Record<string, unknown>): SnapshotDoc {
  return { data: () => fields }
}

describe("useHeists", () => {
  const currentUser = { uid: "uid-current" } as User
  let capturedNext: SnapshotCallback
  let capturedError: ErrorCallback
  const unsubscribeSpy = vi.fn()

  beforeEach(() => {
    vi.mocked(where).mockClear()
    vi.mocked(orderBy).mockClear()
    vi.mocked(query).mockClear()
    vi.mocked(useUser).mockReturnValue({ user: currentUser, loading: false })
    vi.mocked(onSnapshot)
      .mockReset()
      .mockImplementation((_query, onNext, onError) => {
        capturedNext = onNext as SnapshotCallback
        capturedError = onError as ErrorCallback
        return unsubscribeSpy
      })
    unsubscribeSpy.mockReset()
  })

  it("builds an 'active' query filtered to assignedTo, non-null-excluded, and an unexpired deadline", () => {
    renderHook(() => useHeists("active"))

    expect(where).toHaveBeenCalledWith("assignedTo", "==", "uid-current")
    expect(where).toHaveBeenCalledWith("finalStatus", "==", null)
    expect(where).toHaveBeenCalledWith("deadline", ">", expect.any(Date))
    expect(orderBy).toHaveBeenCalledWith("deadline", "asc")
  })

  it("builds an 'assigned' query filtered to createdBy instead of assignedTo", () => {
    renderHook(() => useHeists("assigned"))

    expect(where).toHaveBeenCalledWith("createdBy", "==", "uid-current")
    expect(where).toHaveBeenCalledWith("finalStatus", "==", null)
    expect(where).toHaveBeenCalledWith("deadline", ">", expect.any(Date))
  })

  it("builds an 'expired' query with no user-based filter", () => {
    renderHook(() => useHeists("expired"))

    expect(where).toHaveBeenCalledWith("finalStatus", "in", [
      "success",
      "failure",
    ])
    expect(where).toHaveBeenCalledWith("deadline", "<=", expect.any(Date))
    expect(orderBy).toHaveBeenCalledWith("deadline", "asc")
    expect(where).not.toHaveBeenCalledWith(
      "assignedTo",
      expect.anything(),
      expect.anything(),
    )
    expect(where).not.toHaveBeenCalledWith(
      "createdBy",
      expect.anything(),
      expect.anything(),
    )
  })

  it("returns null before the subscription's first snapshot fires", () => {
    const { result } = renderHook(() => useHeists("active"))

    expect(result.current).toBeNull()
  })

  it("returns the mapped heists once the snapshot fires, and updates on the next one", () => {
    const { result } = renderHook(() => useHeists("active"))

    act(() => {
      capturedNext({ docs: [fakeDoc({ id: "heist-1", title: "First" })] })
    })
    expect(result.current).toEqual([{ id: "heist-1", title: "First" }])

    act(() => {
      capturedNext({
        docs: [
          fakeDoc({ id: "heist-1", title: "First" }),
          fakeDoc({ id: "heist-2", title: "Second" }),
        ],
      })
    })
    expect(result.current).toEqual([
      { id: "heist-1", title: "First" },
      { id: "heist-2", title: "Second" },
    ])
  })

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useHeists("active"))

    unmount()

    expect(unsubscribeSpy).toHaveBeenCalled()
  })

  it("returns null and never subscribes when there is no signed-in user", () => {
    vi.mocked(useUser).mockReturnValue({ user: null, loading: false })

    const { result } = renderHook(() => useHeists("active"))

    expect(result.current).toBeNull()
    expect(onSnapshot).not.toHaveBeenCalled()
    expect(query).not.toHaveBeenCalled()
  })

  it("logs subscription errors to the console without throwing or changing the result", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { result } = renderHook(() => useHeists("active"))

    act(() => {
      capturedError(new Error("permission-denied"))
    })

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error))
    expect(result.current).toBeNull()

    consoleSpy.mockRestore()
  })
})
