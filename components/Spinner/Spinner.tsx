import { Clock8 } from "lucide-react"

import styles from "./Spinner.module.css"

export default function Spinner() {
  return (
    <div
      className="center-content"
      role="status"
      aria-label="Loading authentication status"
    >
      <Clock8
        className={styles.spinner}
        size={48}
        strokeWidth={2.75}
        aria-hidden="true"
      />
    </div>
  )
}
