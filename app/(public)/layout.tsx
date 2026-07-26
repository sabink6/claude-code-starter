"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import Spinner from "@/components/Spinner"
import { useUser } from "@/lib/firebase/auth-context"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { user, loading } = useUser()
  const pathname = usePathname()
  const router = useRouter()
  const isPreview = pathname === "/preview"

  useEffect(() => {
    if (isPreview) return
    if (!loading && user) {
      router.replace("/heists")
    }
  }, [isPreview, loading, user, router])

  if (isPreview) {
    return <main className="public">{children}</main>
  }

  if (loading || user) {
    return <Spinner />
  }

  return <main className="public">{children}</main>
}
