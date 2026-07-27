import { collection, getDocs } from "firebase/firestore"

import { db } from "@/lib/firebase/config"

export const FALLBACK_MESSAGE = "Something went wrong. Please try again."

export type AppUser = {
  id: string
  codename: string
}

export async function getUsers(): Promise<AppUser[]> {
  try {
    const snapshot = await getDocs(collection(db, "users"))
    return snapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      codename: docSnapshot.data().codename as string,
    }))
  } catch {
    throw new Error(FALLBACK_MESSAGE)
  }
}
