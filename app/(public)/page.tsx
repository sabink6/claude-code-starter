import Link from "next/link"
import Logo from "@/components/Logo"

export default function Home() {
  return (
    <div className="center-content">
      <div className="page-content splash-hero">
        <span className="splash-tag">Now Recruiting</span>
        <h1 className="splash-title">
          <Logo />
        </h1>
        <p className="splash-lede">Small heists. Big chaos.</p>
        <p>
          Pocket Heist is the Claude Code Masterclass starter app — every ticket
          is a job to pull off, every merged pull request is your getaway car.
          Sign up, grab your codename, and get to work.
        </p>
        <p className="splash-actions">
          <Link href="/signup" className="btn">
            Get Your Codename
          </Link>
        </p>
        <p className="splash-footnote">
          Already have a codename? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}
