import { signInWithEmailAndPassword } from "firebase/auth"

import { auth } from "@/lib/firebase/config"

export const FALLBACK_MESSAGE = "Something went wrong. Please try again."

export function mapSignInError(code: string | undefined): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password."
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again."
    default:
      return FALLBACK_MESSAGE
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  try {
    await signInWithEmailAndPassword(auth, email, password)
  } catch (err) {
    const code =
      err instanceof Error && "code" in err ? String(err.code) : undefined
    throw new Error(mapSignInError(code))
  }
}
