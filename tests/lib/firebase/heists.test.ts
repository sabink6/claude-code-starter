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
  doc: vi.fn((_db, path, id) => ({
    type: "doc",
    path,
    id,
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

import {
  addDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore"

import { useUser } from "@/lib/firebase/auth-context"
import {
  FALLBACK_MESSAGE,
  createHeist,
  useHeist,
  useHeists,
} from "@/lib/firebase/heists"

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
    expect(orderBy).toHaveBeenCalledWith("deadline", "desc")
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

type DocSnapshot = {
  exists: () => boolean
  data: () => Record<string, unknown>
}
type DocSnapshotCallback = (snapshot: DocSnapshot) => void

function fakeDocSnapshot(fields: Record<string, unknown> | null): DocSnapshot {
  return {
    exists: () => fields !== null,
    data: () => fields as Record<string, unknown>,
  }
}

describe("useHeist", () => {
  const currentUser = { uid: "uid-current" } as User
  let capturedNext: DocSnapshotCallback
  let capturedError: ErrorCallback
  const unsubscribeSpy = vi.fn()

  beforeEach(() => {
    vi.mocked(doc).mockClear()
    vi.mocked(useUser).mockReturnValue({ user: currentUser, loading: false })
    vi.mocked(onSnapshot)
      .mockReset()
      .mockImplementation((_ref, onNext, onError) => {
        capturedNext = onNext as DocSnapshotCallback
        capturedError = onError as ErrorCallback
        return unsubscribeSpy
      })
    unsubscribeSpy.mockReset()
  })

  it("builds a doc ref for the given id", () => {
    renderHook(() => useHeist("heist-1"))

    expect(doc).toHaveBeenCalledWith(expect.anything(), "heists", "heist-1")
  })

  it("returns heist null and loading true before the first snapshot fires", () => {
    const { result } = renderHook(() => useHeist("heist-1"))

    expect(result.current).toEqual({ heist: null, loading: true, error: false })
  })

  it("returns the mapped heist and loading false once a snapshot fires for an existing document", () => {
    const { result } = renderHook(() => useHeist("heist-1"))

    act(() => {
      capturedNext(
        fakeDocSnapshot({ id: "heist-1", title: "Steal the crown jewels" }),
      )
    })

    expect(result.current).toEqual({
      heist: { id: "heist-1", title: "Steal the crown jewels" },
      loading: false,
      error: false,
    })
  })

  it("returns heist null and loading false once a snapshot fires for a missing document", () => {
    const { result } = renderHook(() => useHeist("does-not-exist"))

    act(() => {
      capturedNext(fakeDocSnapshot(null))
    })

    expect(result.current).toEqual({
      heist: null,
      loading: false,
      error: false,
    })
  })

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useHeist("heist-1"))

    unmount()

    expect(unsubscribeSpy).toHaveBeenCalled()
  })

  it("returns loading true and never subscribes when there is no signed-in user", () => {
    vi.mocked(useUser).mockReturnValue({ user: null, loading: false })

    const { result } = renderHook(() => useHeist("heist-1"))

    expect(result.current).toEqual({ heist: null, loading: true, error: false })
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it("logs subscription errors, stops loading, and sets error without throwing", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { result } = renderHook(() => useHeist("heist-1"))

    act(() => {
      capturedError(new Error("permission-denied"))
    })

    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error))
    expect(result.current).toEqual({ heist: null, loading: false, error: true })

    consoleSpy.mockRestore()
  })
})
