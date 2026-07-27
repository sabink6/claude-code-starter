import { useEffect, useState } from "react"
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore"

import { useUser } from "@/lib/firebase/auth-context"
import { db } from "@/lib/firebase/config"
import {
  COLLECTIONS,
  heistConverter,
  type CreateHeistInput,
  type Heist,
} from "@/types/firestore"

export const FALLBACK_MESSAGE = "Something went wrong. Please try again."

const DEADLINE_HOURS = 48

export type NewHeistInput = Omit<
  CreateHeistInput,
  "createdAt" | "deadline" | "finalStatus"
>

export async function createHeist(input: NewHeistInput): Promise<void> {
  const deadline = new Date(Date.now() + DEADLINE_HOURS * 60 * 60 * 1000)

  try {
    await addDoc(collection(db, COLLECTIONS.HEISTS), {
      ...input,
      createdAt: serverTimestamp(),
      deadline,
      finalStatus: null,
    })
  } catch {
    throw new Error(FALLBACK_MESSAGE)
  }
}

export type HeistFilter = "active" | "assigned" | "expired"

export function useHeists(filter: HeistFilter): Heist[] | null {
  const { user } = useUser()
  const subscriptionKey = `${filter}:${user?.uid ?? ""}`
  const [key, setKey] = useState(subscriptionKey)
  const [heists, setHeists] = useState<Heist[] | null>(null)

  if (subscriptionKey !== key) {
    setKey(subscriptionKey)
    setHeists(null)
  }

  useEffect(() => {
    if (!user?.uid) return

    const now = new Date()
    const ref = collection(db, COLLECTIONS.HEISTS).withConverter(heistConverter)
    const q =
      filter === "active"
        ? query(
            ref,
            where("assignedTo", "==", user.uid),
            where("finalStatus", "==", null),
            where("deadline", ">", now),
            orderBy("deadline", "asc"),
          )
        : filter === "assigned"
          ? query(
              ref,
              where("createdBy", "==", user.uid),
              where("finalStatus", "==", null),
              where("deadline", ">", now),
              orderBy("deadline", "asc"),
            )
          : query(
              ref,
              where("finalStatus", "in", ["success", "failure"]),
              where("deadline", "<=", now),
              orderBy("deadline", "desc"),
            )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => setHeists(snapshot.docs.map((doc) => doc.data())),
      (error) => console.error(error),
    )

    return unsubscribe
  }, [filter, user?.uid])

  return heists
}

export type UseHeistResult = {
  heist: Heist | null
  loading: boolean
  error: boolean
}

export function useHeist(id: string): UseHeistResult {
  const { user } = useUser()
  const subscriptionKey = `${id}:${user?.uid ?? ""}`
  const [key, setKey] = useState(subscriptionKey)
  const [heist, setHeist] = useState<Heist | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  if (subscriptionKey !== key) {
    setKey(subscriptionKey)
    setHeist(null)
    setLoading(true)
    setError(false)
  }

  useEffect(() => {
    if (!user?.uid) return

    const ref = doc(db, COLLECTIONS.HEISTS, id).withConverter(heistConverter)

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setHeist(snapshot.exists() ? snapshot.data() : null)
        setLoading(false)
      },
      (err) => {
        console.error(err)
        setError(true)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [id, user?.uid])

  return { heist, loading, error }
}
