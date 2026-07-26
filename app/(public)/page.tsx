import { Clock8 } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="center-content">
      <div className="page-content">
        <h1>
          P<Clock8 className="logo" strokeWidth={2.75} />
          cket Heist
        </h1>
        <div>Small heists. Big chaos.</div>
        <p>
          Plan the heist. Cause the chaos. Brag later. Pocket Heist is the
          Claude Code Masterclass starter app — this splash page decides where
          you land next. Along the way you will learn to wield Claude Code like
          a proper conspirator: writing components, wiring up routes, and
          shipping features without breaking a sweat. Treat every ticket as a
          heist waiting to be pulled off, and every merged pull request as your
          getaway car.
        </p>
        <p className="splash-actions">
          <Link href="/login" className="btn">
            Log In
          </Link>
          <Link href="/heists" className="btn">
            View Heists
          </Link>
        </p>
      </div>
    </div>
  )
}
