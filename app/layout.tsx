import type { Metadata } from "next"
import "@/app/globals.css"

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
        {children}
      </body>
    </html>
  )
}