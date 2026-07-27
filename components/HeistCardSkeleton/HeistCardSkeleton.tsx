import styles from "./HeistCardSkeleton.module.css"

export default function HeistCardSkeleton() {
  return (
    <div className={styles.card} role="status" aria-label="Loading heist">
      <div className={styles.header}>
        <div className={`${styles.bar} ${styles.titleBar}`} />
        <div className={styles.iconBar} />
      </div>
      <div className={`${styles.bar} ${styles.rowBar}`} />
      <div className={`${styles.bar} ${styles.rowBar}`} />
      <div className={`${styles.bar} ${styles.rowBarNarrow}`} />
    </div>
  )
}
