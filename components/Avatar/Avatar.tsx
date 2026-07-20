import styles from "./Avatar.module.css"

function getInitials(name: string) {
  const uppercaseLetters = name.match(/[A-Z]/g) || []
  if (uppercaseLetters.length >= 2) {
    return uppercaseLetters.slice(0, 2).join("")
  }
  return name.charAt(0).toUpperCase()
}

export default function Avatar({ name }: { name: string }) {
  return (
    <div className={styles.avatar}>
      {getInitials(name)}
    </div>
  )
}
