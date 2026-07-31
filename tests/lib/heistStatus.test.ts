import { describe, it, expect } from "vitest"

import { getHeistDisplayStatus, getHeistViewerRole } from "@/lib/heistStatus"
import type { Heist } from "@/types/firestore"

const now = new Date("2026-01-02T00:00:00.000Z")
const future = new Date("2026-01-03T00:00:00.000Z")
const past = new Date("2026-01-01T00:00:00.000Z")

function fakeHeist(overrides: Partial<Heist> = {}): Heist {
  return {
    id: "heist-1",
    title: "Steal the crown jewels",
    description: "",
    createdAt: new Date(),
    createdBy: "uid-creator",
    createdByCodename: "SilentCrimsonFox",
    assignedTo: "uid-assignee",
    assignedToCodename: "QuietVelvetOwl",
    deadline: future,
    successClaimedAt: null,
    finalStatus: null,
    ...overrides,
  }
}

describe("getHeistDisplayStatus", () => {
  it("is 'open' when there is no claim and the deadline hasn't passed", () => {
    const heist = fakeHeist({ deadline: future, successClaimedAt: null })

    expect(getHeistDisplayStatus(heist, now)).toBe("open")
  })

  it("is 'pending' once the assignee has claimed success and the deadline hasn't passed", () => {
    const heist = fakeHeist({ deadline: future, successClaimedAt: past })

    expect(getHeistDisplayStatus(heist, now)).toBe("pending")
  })

  it("is 'success' once the creator has confirmed, regardless of deadline", () => {
    const heist = fakeHeist({ deadline: past, finalStatus: "success" })

    expect(getHeistDisplayStatus(heist, now)).toBe("success")
  })

  it("is 'failure' once the deadline passes with no confirmed success", () => {
    const heist = fakeHeist({ deadline: past, successClaimedAt: null })

    expect(getHeistDisplayStatus(heist, now)).toBe("failure")
  })

  it("is 'failure' once the deadline passes on a claimed-but-unconfirmed heist", () => {
    const heist = fakeHeist({ deadline: past, successClaimedAt: past })

    expect(getHeistDisplayStatus(heist, now)).toBe("failure")
  })
})

describe("getHeistViewerRole", () => {
  const heist = fakeHeist({
    assignedTo: "uid-assignee",
    createdBy: "uid-creator",
  })

  it("is 'assignee' for the heist's assignee", () => {
    expect(getHeistViewerRole(heist, "uid-assignee")).toBe("assignee")
  })

  it("is 'creator' for the heist's creator", () => {
    expect(getHeistViewerRole(heist, "uid-creator")).toBe("creator")
  })

  it("is 'other' for an unrelated user", () => {
    expect(getHeistViewerRole(heist, "uid-bystander")).toBe("other")
  })

  it("is 'other' when there is no signed-in user", () => {
    expect(getHeistViewerRole(heist, undefined)).toBe("other")
  })

  it("resolves to 'assignee' when the same user is somehow both assignee and creator", () => {
    const selfAssigned = fakeHeist({
      assignedTo: "uid-both",
      createdBy: "uid-both",
    })

    expect(getHeistViewerRole(selfAssigned, "uid-both")).toBe("assignee")
  })
})
