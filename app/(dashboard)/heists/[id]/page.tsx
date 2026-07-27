"use client"

import { Calendar, User } from "lucide-react"
import { useParams } from "next/navigation"

import StatusBadge from "@/components/StatusBadge"
import { useHeist } from "@/lib/firebase/heists"
import { formatDeadline } from "@/lib/formatDeadline"

export default function HeistDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { heist, loading, error } = useHeist(id)

  return (
    <div className="page-content">
      {loading ? (
        <>
          <h2>Heist Details</h2>
          <p role="status" aria-label="Loading heist">
            Loading…
          </p>
        </>
      ) : error ? (
        <>
          <h2>Heist Details</h2>
          <p role="status">Something went wrong loading this heist.</p>
        </>
      ) : heist === null ? (
        <>
          <h2>Heist Details</h2>
          <p role="status">Heist not found.</p>
        </>
      ) : (
        <div className="heist-detail">
          <div className="heist-detail-header">
            <h2>{heist.title}</h2>
            {heist.finalStatus && <StatusBadge status={heist.finalStatus} />}
          </div>
          <p className="heist-detail-description">{heist.description}</p>
          <div className="heist-detail-meta">
            <span>
              <User aria-hidden="true" size={14} /> To: @
              {heist.assignedToCodename}
            </span>
            <span>
              <User aria-hidden="true" size={14} /> By: @
              {heist.createdByCodename}
            </span>
            <span>
              <Calendar aria-hidden="true" size={14} />{" "}
              {formatDeadline(heist.deadline)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
