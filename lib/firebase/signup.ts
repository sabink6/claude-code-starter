import {
  createUserWithEmailAndPassword,
  deleteUser,
  updateProfile,
} from "firebase/auth"
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore"

import { generateCodename } from "@/lib/codename"
import { auth, db } from "@/lib/firebase/config"

const MAX_CODENAME_ATTEMPTS = 5

export const FALLBACK_MESSAGE = "Something went wrong. Please try again."

export function mapFirebaseAuthError(code: string | undefined): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already registered. Try logging in instead."
    case "auth/weak-password":
      return "Choose a password with at least 6 characters."
    case "auth/invalid-email":
      return "Please enter a valid email address."
    default:
      return FALLBACK_MESSAGE
  }
}

async function generateUniqueCodename(): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODENAME_ATTEMPTS; attempt++) {
    const candidate = generateCodename()
    const snapshot = await getDocs(
      query(collection(db, "users"), where("codename", "==", candidate)),
    )

    if (snapshot.empty) {
      return candidate
    }
  }

  throw new Error(FALLBACK_MESSAGE)
}

export async function signUp(email: string, password: string): Promise<void> {
  const codename = await generateUniqueCodename()

  let credential
  try {
    credential = await createUserWithEmailAndPassword(auth, email, password)
  } catch (err) {
    const code =
      err instanceof Error && "code" in err ? String(err.code) : undefined
    throw new Error(mapFirebaseAuthError(code))
  }

  try {
    await updateProfile(credential.user, { displayName: codename })
    await setDoc(doc(db, "users", credential.user.uid), {
      id: credential.user.uid,
      codename,
    })
  } catch {
    try {
      await deleteUser(credential.user)
    } catch {
      // best-effort rollback; original failure is what surfaces to the user
    }
    throw new Error(FALLBACK_MESSAGE)
  }
}
