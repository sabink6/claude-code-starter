"use client"

import HeistCardGrid from "@/components/HeistCardGrid"
import HeistList from "@/components/HeistList"
import { useHeists } from "@/lib/firebase/heists"

export default function HeistsPage() {
  const activeHeists = useHeists("active")
  const assignedHeists = useHeists("assigned")
  const expiredHeists = useHeists("expired")

  return (
    <div className="page-content">
      <span className="case-tag">Case Log</span>
      <div className="active-heists heist-panel">
        <HeistCardGrid title="Your Active Heists" heists={activeHeists} />
      </div>
      <div className="assigned-heists heist-panel">
        <HeistCardGrid title="Heists You've Assigned" heists={assignedHeists} />
      </div>
      <div className="expired-heists heist-panel">
        <HeistList title="History" heists={expiredHeists} />
      </div>
    </div>
  )
}
