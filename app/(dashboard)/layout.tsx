"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// components
import Navbar from "@/components/Navbar"
import Spinner from "@/components/Spinner"
import { useUser } from "@/lib/firebase/auth-context"

export default function HeistsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  if (loading || !user) {
    return <Spinner />
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}
