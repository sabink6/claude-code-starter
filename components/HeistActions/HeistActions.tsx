"use client"

import { useEffect, useRef, useState } from "react"

import { useUser } from "@/lib/firebase/auth-context"
import {
  FALLBACK_MESSAGE,
  claimHeistSuccess,
  confirmHeistSuccess,
  rejectHeistSuccess,
} from "@/lib/firebase/heists"
import { getHeistDisplayStatus, getHeistViewerRole } from "@/lib/heistStatus"
import type { Heist } from "@/types/firestore"
import styles from "./HeistActions.module.css"

type HeistActionsProps = {
  heist: Heist
}

type Action = "claim" | "confirm" | "reject"

const STATUS_MESSAGE: Record<Action, string> = {
  claim: "Marked as success, awaiting confirmation.",
  confirm: "Confirmed as a success.",
  reject: "Rejected — heist reopened.",
}

const STATUS_MESSAGE_TIMEOUT_MS = 5000

export default function HeistActions({ heist }: HeistActionsProps) {
  const { user } = useUser()
  const [actionInProgress, setActionInProgress] = useState<Action | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)

  const role = getHeistViewerRole(heist, user?.uid)
  const status = getHeistDisplayStatus(heist)
  const isSubmitting = actionInProgress !== null
  const showClaim = role === "assignee" && status === "open"
  const showConfirmReject = role === "creator" && status === "pending"

  useEffect(() => {
    if (statusMessage) statusRef.current?.focus()
  }, [statusMessage])

  useEffect(() => {
    if (!statusMessage) return
    const timeout = setTimeout(
      () => setStatusMessage(null),
      STATUS_MESSAGE_TIMEOUT_MS,
    )
    return () => clearTimeout(timeout)
  }, [statusMessage])

  async function runAction(action: Action, perform: () => Promise<void>) {
    setError(null)
    setStatusMessage(null)
    setActionInProgress(action)
    try {
      await perform()
      setStatusMessage(STATUS_MESSAGE[action])
    } catch (err) {
      setError(err instanceof Error ? err.message : FALLBACK_MESSAGE)
    } finally {
      setActionInProgress(null)
    }
  }

  if (!showClaim && !showConfirmReject && !error && !statusMessage) {
    return null
  }

  return (
    <div className={styles.actions}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {statusMessage && (
        <p ref={statusRef} className="sr-only" role="status" tabIndex={-1}>
          {statusMessage}
        </p>
      )}
      {showClaim && (
        <button
          className="btn"
          type="button"
          disabled={isSubmitting}
          aria-label={
            actionInProgress === "claim"
              ? `Marking "${heist.title}" as success…`
              : `Mark "${heist.title}" as success`
          }
          onClick={() => runAction("claim", () => claimHeistSuccess(heist.id))}
        >
          {actionInProgress === "claim" ? "Marking…" : "Mark as Success"}
        </button>
      )}
      {showConfirmReject && (
        <>
          <button
            className="btn"
            type="button"
            disabled={isSubmitting}
            aria-label={
              actionInProgress === "confirm"
                ? `Confirming "${heist.title}"…`
                : `Confirm "${heist.title}"`
            }
            onClick={() =>
              runAction("confirm", () => confirmHeistSuccess(heist.id))
            }
          >
            {actionInProgress === "confirm" ? "Confirming…" : "Confirm"}
          </button>
          <button
            className="btn-reject"
            type="button"
            disabled={isSubmitting}
            aria-label={
              actionInProgress === "reject"
                ? `Rejecting "${heist.title}"…`
                : `Reject "${heist.title}"`
            }
            onClick={() =>
              runAction("reject", () => rejectHeistSuccess(heist.id))
            }
          >
            {actionInProgress === "reject" ? "Rejecting…" : "Reject"}
          </button>
        </>
      )}
    </div>
  )
}
