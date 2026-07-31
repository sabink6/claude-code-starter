"use client"

import { useEffect, useState } from "react"
import { Calendar, Clock } from "lucide-react"
import { useParams } from "next/navigation"

import Avatar from "@/components/Avatar"
import HeistActions from "@/components/HeistActions"
import StatusBadge from "@/components/StatusBadge"
import { useHeist } from "@/lib/firebase/heists"
import { formatDeadline } from "@/lib/formatDeadline"
import { formatTimeLeft, isTimeLeftUrgent } from "@/lib/formatTimeLeft"
import { getHeistDisplayStatus } from "@/lib/heistStatus"

export default function HeistDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { heist, loading, error } = useHeist(id)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const status = heist ? getHeistDisplayStatus(heist, now) : null
  const isClosed = status === "success" || status === "failure"
  const isUrgent = !!heist && !isClosed && isTimeLeftUrgent(heist.deadline, now)
  const timeLeftClass =
    !heist || isClosed
      ? "heist-detail-time-left-closed"
      : isUrgent
        ? "heist-detail-time-left-urgent"
        : "heist-detail-time-left"

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
          <span className="case-tag">Case File</span>
          <div
            className={
              isClosed
                ? "heist-detail-card heist-detail-card-closed"
                : "heist-detail-card"
            }
          >
            <div className="heist-detail-header">
              <h2>{heist.title}</h2>
              {status && status !== "open" && <StatusBadge status={status} />}
            </div>

            <div className="heist-detail-people">
              <div className="heist-detail-person">
                <span aria-hidden="true">
                  <Avatar name={heist.assignedToCodename} />
                </span>
                <div className="heist-detail-person-info">
                  <span className="heist-detail-person-label">Assigned to</span>
                  <span className="heist-detail-person-name">
                    @{heist.assignedToCodename}
                  </span>
                </div>
              </div>
              <div className="heist-detail-person">
                <span aria-hidden="true">
                  <Avatar name={heist.createdByCodename} />
                </span>
                <div className="heist-detail-person-info">
                  <span className="heist-detail-person-label">Created by</span>
                  <span className="heist-detail-person-name">
                    @{heist.createdByCodename}
                  </span>
                </div>
              </div>
            </div>

            <div className="heist-detail-section">
              <h3 className="heist-detail-section-title">Briefing</h3>
              <p className="heist-detail-description">{heist.description}</p>
            </div>

            <div className="heist-detail-timeline">
              <span>
                <Calendar aria-hidden="true" size={16} />
                Deadline: {formatDeadline(heist.deadline)}
              </span>
              <span className={timeLeftClass}>
                <Clock aria-hidden="true" size={16} />
                {isClosed ? "Case closed" : formatTimeLeft(heist.deadline, now)}
                {isUrgent && <span className="sr-only"> — urgent</span>}
              </span>
            </div>

            <HeistActions heist={heist} />
          </div>
        </div>
      )}
    </div>
  )
}
