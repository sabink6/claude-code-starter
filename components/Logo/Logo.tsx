import { Clock8 } from "lucide-react"
import styles from "./Logo.module.css"

type LogoProps = {
  size?: number
}

export default function Logo({ size }: LogoProps) {
  return (
    <>
      P
      <Clock8
        className={styles.icon}
        size={size}
        strokeWidth={2.75}
        aria-hidden="true"
      />
      cket Heist
    </>
  )
}
