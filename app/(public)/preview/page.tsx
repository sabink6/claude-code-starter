"use client"

// preview page for newly created UI components

import Link from "next/link"

import Avatar from "@/components/Avatar"
import Skeleton from "@/components/Skeleton"
import UserGreeting from "@/components/UserGreeting"
import { useUser } from "@/lib/firebase/auth-context"

export default function PreviewPage() {
  const { user } = useUser()

  return (
    <div className="page-content">
      <h2>Preview</h2>
      <h3>Skeleton</h3>
      <Skeleton />
      <h3>Avatar</h3>
      <Avatar name="bob" />
      <Avatar name="JohnDoe" />
      <h3>UserGreeting</h3>
      <UserGreeting codename="QuietVelvetOwl" />

      <h3>Route Links</h3>
      <p className="splash-actions">
        <Link
          href="/login"
          className="btn"
          aria-disabled={!!user}
          tabIndex={user ? -1 : undefined}
          onClick={(event) => {
            if (user) event.preventDefault()
          }}
        >
          Log In
        </Link>
        <Link
          href="/heists"
          className="btn"
          aria-disabled={!user}
          tabIndex={user ? undefined : -1}
          onClick={(event) => {
            if (!user) event.preventDefault()
          }}
        >
          View Heists
        </Link>
      </p>
    </div>
  )
}
