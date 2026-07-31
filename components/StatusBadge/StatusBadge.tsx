import type { HeistDisplayStatus } from "@/lib/heistStatus"

type StatusBadgeProps = {
  status: Exclude<HeistDisplayStatus, "open">
}

const VARIANT_CLASS: Record<StatusBadgeProps["status"], string> = {
  pending: "status-badge-pending",
  success: "status-badge-success",
  failure: "status-badge-failure",
}

const LABEL: Record<StatusBadgeProps["status"], string> = {
  pending: "pending confirmation",
  success: "success",
  failure: "failure",
}

const ARIA_LABEL: Record<StatusBadgeProps["status"], string> = {
  pending: "Status: pending confirmation",
  success: "Outcome: success",
  failure: "Outcome: failure",
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`status-badge ${VARIANT_CLASS[status]}`}
      aria-label={ARIA_LABEL[status]}
    >
      {LABEL[status]}
    </span>
  )
}
