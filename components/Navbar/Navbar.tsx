"use client"

import { useState } from "react"
import { LogOut, Plus } from "lucide-react"
import Link from "next/link"
import Logo from "@/components/Logo"
import styles from "./Navbar.module.css"
import { useUser } from "@/lib/firebase/auth-context"
import { logOut } from "@/lib/firebase/logout"

export default function Navbar() {
  const { user, loading } = useUser()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    await logOut()
    setIsLoggingOut(false)
  }

  return (
    <div className={styles.siteNav}>
      <nav>
        <header>
          <h1>
            <Link href="/heists">
              <Logo size={14} />
            </Link>
          </h1>
          <div>Small heists. Big chaos.</div>
        </header>
        <ul>
          {!loading && user && (
            <li>
              <button
                className={`btn ${styles.logoutBtn}`}
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut size={20} />
                Logout
              </button>
            </li>
          )}
          <li>
            <Link href="/heists/create" className="btn">
              <Plus size={20} />
              Create New Heist
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}
