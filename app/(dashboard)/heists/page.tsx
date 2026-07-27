"use client"

import HeistList from "@/components/HeistList"
import { useHeists } from "@/lib/firebase/heists"

export default function HeistsPage() {
  const activeHeists = useHeists("active")
  const assignedHeists = useHeists("assigned")
  const expiredHeists = useHeists("expired")

  return (
    <div className="page-content">
      <span className="case-tag">Case Log</span>
      <div className="heists-grid">
        <div className="active-heists heist-panel">
          <HeistList title="Your Active Heists" heists={activeHeists} />
        </div>
        <div className="assigned-heists heist-panel">
          <HeistList title="Heists You've Assigned" heists={assignedHeists} />
        </div>
      </div>
      <div className="expired-heists heist-panel">
        <HeistList title="All Expired Heists" heists={expiredHeists} />
      </div>
    </div>
  )
}
