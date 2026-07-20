// this page should be used only as a splash page to decide where a user should be navigated to
// when logged in --> to /heists
// when not logged in --> to /login

import { Clock8 } from "lucide-react"

export default function Home() {
  return (
    <div className="center-content">
      <div className="page-content">
        <h1>
          P<Clock8 className="logo" strokeWidth={2.75} />cket Heist
        </h1>
        <div>Tiny missions. Big office mischief.</div>
        <p>
          Plan tiny heists, pull off big office mischief, and brag about it later.
          Pocket Heist is the Claude Code Masterclass starter app — this splash
          page decides where you land next.
        </p>
      </div>
    </div>
  )
}
