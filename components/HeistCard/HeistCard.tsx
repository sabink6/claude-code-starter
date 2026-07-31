import { Calendar, Clock, User } from "lucide-react"
import Link from "next/link"

import HeistActions from "@/components/HeistActions"
import StatusBadge from "@/components/StatusBadge"
import { formatDeadline } from "@/lib/formatDeadline"
import { formatTimeLeft, isTimeLeftUrgent } from "@/lib/formatTimeLeft"
import { getHeistDisplayStatus } from "@/lib/heistStatus"
import type { Heist } from "@/types/firestore"
import styles from "./HeistCard.module.css"

type HeistCardProps = {
  heist: Heist
}

export default function HeistCard({ heist }: HeistCardProps) {
  const timeLeftClass = isTimeLeftUrgent(heist.deadline)
    ? styles.timeLeftUrgent
    : styles.timeLeft
  const status = getHeistDisplayStatus(heist)

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Link href={`/heists/${heist.id}`}>{heist.title}</Link>
        </h3>
        {status === "open" ? (
          <Clock className={styles.clockIcon} size={16} aria-hidden="true" />
        ) : (
          <StatusBadge status={status} />
        )}
      </div>
      <div className={styles.row}>
        <User className={styles.rowIcon} size={14} aria-hidden="true" />
        <span className={styles.rowText}>
          To:{" "}
          <span className={styles.assignedTo}>@{heist.assignedToCodename}</span>
        </span>
      </div>
      <div className={styles.row}>
        <User className={styles.rowIcon} size={14} aria-hidden="true" />
        <span className={styles.rowText}>
          By:{" "}
          <span className={styles.createdBy}>@{heist.createdByCodename}</span>
        </span>
      </div>
      <div className={styles.row}>
        <Calendar className={styles.rowIcon} size={14} aria-hidden="true" />
        <span className={styles.rowText}>{formatDeadline(heist.deadline)}</span>
      </div>
      <div className={timeLeftClass}>
        <Clock size={14} aria-hidden="true" />
        <span className={styles.rowText}>{formatTimeLeft(heist.deadline)}</span>
      </div>
      <HeistActions heist={heist} />
    </div>
  )
}
