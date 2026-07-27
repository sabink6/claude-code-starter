import HeistCard from "@/components/HeistCard"
import HeistCardSkeleton from "@/components/HeistCardSkeleton"
import type { Heist } from "@/types/firestore"
import styles from "./HeistCardGrid.module.css"

const SKELETON_COUNT = 3

type HeistCardGridProps = {
  title: string
  heists: Heist[] | null
}

export default function HeistCardGrid({ title, heists }: HeistCardGridProps) {
  return (
    <>
      <h2>{title}</h2>
      {heists === null ? (
        <div className="heist-card-grid">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <HeistCardSkeleton key={index} />
          ))}
        </div>
      ) : heists.length === 0 ? (
        <p className={styles.placeholder}>Nothing here yet.</p>
      ) : (
        <div className="heist-card-grid">
          {heists.map((heist) => (
            <HeistCard key={heist.id} heist={heist} />
          ))}
        </div>
      )}
    </>
  )
}
