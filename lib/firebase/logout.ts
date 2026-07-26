import { signOut } from "firebase/auth"

import { auth } from "@/lib/firebase/config"

export async function logOut(): Promise<void> {
  try {
    await signOut(auth)
  } catch (err) {
    console.error("Failed to sign out:", err)
  }
}
