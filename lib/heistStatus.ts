import type { Heist } from "@/types/firestore"

export type HeistDisplayStatus = "open" | "pending" | "success" | "failure"
export type HeistViewerRole = "assignee" | "creator" | "other"

export function getHeistDisplayStatus(
  heist: Heist,
  now: Date = new Date(),
): HeistDisplayStatus {
  if (heist.finalStatus === "success") return "success"
  if (heist.deadline.getTime() <= now.getTime()) return "failure"
  return heist.successClaimedAt ? "pending" : "open"
}

export function getHeistViewerRole(
  heist: Heist,
  uid: string | undefined,
): HeistViewerRole {
  if (!uid) return "other"
  if (heist.assignedTo === uid) return "assignee"
  if (heist.createdBy === uid) return "creator"
  return "other"
}
