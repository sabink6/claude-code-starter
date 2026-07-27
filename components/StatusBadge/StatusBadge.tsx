import type { HeistStatus } from "@/types/firestore"

type StatusBadgeProps = {
  status: HeistStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const variantClass =
    status === "success" ? "status-badge-success" : "status-badge-failure"

  return (
    <span
      className={`status-badge ${variantClass}`}
      aria-label={`Outcome: ${status}`}
    >
      {status}
    </span>
  )
}
