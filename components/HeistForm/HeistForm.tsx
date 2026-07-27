"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import styles from "./HeistForm.module.css"
import { useUser } from "@/lib/firebase/auth-context"
import { createHeist } from "@/lib/firebase/heists"
import { getUsers, type AppUser } from "@/lib/firebase/users"

type FormMessage = { type: "error"; text: string } | null

const MAX_TITLE_LENGTH = 80
const MAX_DESCRIPTION_LENGTH = 500
const FALLBACK_MESSAGE = "Something went wrong. Please try again."

export default function HeistForm() {
  const { user } = useUser()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [users, setUsers] = useState<AppUser[] | null>(null)
  const [message, setMessage] = useState<FormMessage>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    getUsers()
      .then((fetched) => {
        if (!cancelled) setUsers(fetched)
      })
      .catch(() => {
        if (cancelled) return
        setUsers([])
        setMessage({
          type: "error",
          text: "Couldn't load the crew list. Refresh and try again.",
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const eligibleUsers = (users ?? []).filter(
    (crewMember) => crewMember.id !== user?.uid,
  )
  const usersLoading = users === null
  const hasAssignees = eligibleUsers.length > 0

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (!trimmedTitle || !trimmedDescription || !assignedTo) {
      setMessage({
        type: "error",
        text: "Please fill in a title, description, and an assignee.",
      })
      return
    }
    if (!user?.displayName) {
      setMessage({ type: "error", text: FALLBACK_MESSAGE })
      return
    }

    const assignee = eligibleUsers.find(
      (crewMember) => crewMember.id === assignedTo,
    )
    if (!assignee) {
      setMessage({
        type: "error",
        text: "Please choose someone to assign this heist to.",
      })
      return
    }

    setMessage(null)
    setIsSubmitting(true)
    try {
      await createHeist({
        title: trimmedTitle,
        description: trimmedDescription,
        createdBy: user.uid,
        createdByCodename: user.displayName,
        assignedTo: assignee.id,
        assignedToCodename: assignee.codename,
      })
      router.push("/heists")
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : FALLBACK_MESSAGE,
      })
      setIsSubmitting(false)
    }
  }

  const assigneePlaceholder = usersLoading
    ? "Loading crew members…"
    : hasAssignees
      ? "Select an assignee…"
      : "No crew members available yet"

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="title">
          Title
        </label>
        <input
          className={styles.input}
          id="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MAX_TITLE_LENGTH}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="description">
          Description
        </label>
        <textarea
          className={styles.textarea}
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={MAX_DESCRIPTION_LENGTH}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="assignedTo">
          Assign to
        </label>
        <select
          className={styles.select}
          id="assignedTo"
          value={assignedTo}
          onChange={(event) => setAssignedTo(event.target.value)}
          disabled={usersLoading || !hasAssignees || isSubmitting}
        >
          <option value="" disabled>
            {assigneePlaceholder}
          </option>
          {eligibleUsers.map((crewMember) => (
            <option key={crewMember.id} value={crewMember.id}>
              {crewMember.codename}
            </option>
          ))}
        </select>
      </div>

      {message && (
        <p className={styles.error} role="alert">
          {message.text}
        </p>
      )}

      <button
        className="btn"
        type="submit"
        disabled={isSubmitting || usersLoading || !hasAssignees}
      >
        {isSubmitting ? "Creating…" : "Create Heist"}
      </button>
    </form>
  )
}
