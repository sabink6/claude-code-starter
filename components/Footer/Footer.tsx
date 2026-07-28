import { Github } from "lucide-react"
import Logo from "@/components/Logo"
import { version } from "@/package.json"
import styles from "./Footer.module.css"

const GITHUB_URL = "https://github.com/sabink6/claude-code-starter"

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.logo}>
        <Logo size={14} />
      </span>
      <span>v{version}</span>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
      >
        <Github aria-hidden="true" size={16} />
        GitHub
      </a>
      <span>MIT License</span>
    </footer>
  )
}
