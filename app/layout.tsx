import type { Metadata } from "next"
import "@/app/globals.css"

import Footer from "@/components/Footer"
import { UserProvider } from "@/lib/firebase/auth-context"

export const metadata: Metadata = {
  title: "Pocket Heist",
  description: "Small heists. Big chaos.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <UserProvider>{children}</UserProvider>
        <Footer />
      </body>
    </html>
  )
}
