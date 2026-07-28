const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const URGENT_THRESHOLD_MS = 2 * HOUR

export function formatTimeLeft(deadline: Date, now: Date = new Date()): string {
  const diffMs = deadline.getTime() - now.getTime()
  if (diffMs <= 0) return "Expired"

  const days = Math.floor(diffMs / DAY)
  const hours = Math.floor((diffMs % DAY) / HOUR)
  const minutes = Math.floor((diffMs % HOUR) / MINUTE)

  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

export function isTimeLeftUrgent(deadline: Date, now: Date = new Date()): boolean {
  const diffMs = deadline.getTime() - now.getTime()
  return diffMs > 0 && diffMs <= URGENT_THRESHOLD_MS
}
