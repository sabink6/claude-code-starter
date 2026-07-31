import type {
  DocumentData,
  FieldValue,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  WithFieldValue,
} from "firebase/firestore"

// The only outcome any code path ever writes — a missed deadline is a
// derived, display-only "failure" (see lib/heistStatus.ts), never persisted.
export type HeistStatus = "success"

// Document — what you read from Firestore (after conversion)
export interface Heist {
  id: string
  createdAt: Date
  title: string
  description: string
  createdBy: string
  createdByCodename: string
  assignedTo: string
  assignedToCodename: string
  // Fixed at creation time, 48 hours out — never recalculated afterward.
  deadline: Date
  // Set when the assignee claims the heist succeeded; cleared on rejection.
  successClaimedAt: Date | null
  finalStatus: HeistStatus | null
}

// Create Input — what you pass to addDoc
export interface CreateHeistInput {
  createdAt: FieldValue // serverTimestamp()
  title: string
  description: string
  createdBy: string
  createdByCodename: string
  assignedTo: string
  assignedToCodename: string
  deadline: Date // computed client-side as now + 48h
  successClaimedAt: null
  finalStatus: null
}

// Update Input — partial fields for updateDoc (no createdAt)
export interface UpdateHeistInput {
  title?: string
  description?: string
  createdBy?: string
  createdByCodename?: string
  assignedTo?: string
  assignedToCodename?: string
  deadline?: Date
  successClaimedAt?: FieldValue | Date | null
  finalStatus?: HeistStatus | null
}

export const heistConverter: FirestoreDataConverter<Heist> = {
  toFirestore: (data: WithFieldValue<Heist>): DocumentData => data,

  fromFirestore: (snapshot: QueryDocumentSnapshot): Heist =>
    ({
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate(),
      deadline: snapshot.data().deadline?.toDate(),
      successClaimedAt: snapshot.data().successClaimedAt?.toDate() ?? null,
    }) as Heist,
}
