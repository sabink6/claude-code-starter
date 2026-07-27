import { addDoc, collection, serverTimestamp } from "firebase/firestore"

import { db } from "@/lib/firebase/config"
import { COLLECTIONS, type CreateHeistInput } from "@/types/firestore"

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
