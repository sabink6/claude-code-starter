import Link from "next/link"

import StatusBadge from "@/components/StatusBadge"
import type { Heist } from "@/types/firestore"
import styles from "./HeistList.module.css"

type HeistListProps = {
  title: string
  heists: Heist[] | null
}

export default function HeistList({ title, heists }: HeistListProps) {
  return (
    <>
      <h2>{title}</h2>
      {heists === null ? (
        <p className={styles.placeholder}>Loading…</p>
      ) : heists.length === 0 ? (
        <p className={styles.placeholder}>Nothing here yet.</p>
      ) : (
        <ul className={styles.list}>
          {heists.map((heist) => (
            <li key={heist.id} className={styles.item}>
              <Link href={`/heists/${heist.id}`}>{heist.title}</Link>
              {heist.finalStatus && <StatusBadge status={heist.finalStatus} />}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
