"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import Field from "./Field"
import styles from "./AuthForm.module.css"
import { signIn } from "@/lib/firebase/login"
import { signUp } from "@/lib/firebase/signup"

type Mode = "login" | "signup"

type AuthFormProps = {
  initialMode?: Mode
}

type ModeCopy = {
  title: string
  submit: string
  prompt: string
  switch: string
}

type FormMessage = { type: "success" | "error"; text: string } | null

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const copy: Record<Mode, ModeCopy> = {
  login: {
    title: "Log in to Your Account",
    submit: "Login",
    prompt: "Don't have an account?",
    switch: "Sign up",
  },
  signup: {
    title: "Sign up for an Account",
    submit: "Sign Up",
    prompt: "Already have an account?",
    switch: "Log in",
  },
}

export default function AuthForm({ initialMode = "login" }: AuthFormProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<FormMessage>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const text = copy[mode]

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email || !password) {
      setMessage({
        type: "error",
        text: "Please enter both an email and a password.",
      })
      return
    }
    if (!EMAIL_PATTERN.test(email)) {
      setMessage({ type: "error", text: "Please enter a valid email address." })
      return
    }

    setMessage(null)
    setIsSubmitting(true)
    try {
      if (mode === "login") {
        await signIn(email, password)
        setPassword("")
        setMessage({ type: "success", text: "Login successful" })
      } else {
        await signUp(email, password)
        router.push("/heists")
      }
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login")
    setPassword("")
    setShowPassword(false)
    setMessage(null)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.title}>{text.title}</h2>

      <Field
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
      />

      <Field
        id="password"
        label="Password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={setPassword}
        autoComplete={mode === "login" ? "current-password" : "new-password"}
      >
        <button
          className={styles.toggle}
          type="button"
          onClick={() => setShowPassword((shown) => !shown)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </Field>

      {message && (
        <p
          className={message.type === "success" ? styles.success : styles.error}
          role={message.type === "success" ? "status" : "alert"}
        >
          {message.text}
        </p>
      )}

      <button className="btn" type="submit" disabled={isSubmitting}>
        {text.submit}
      </button>

      <p className={styles.switch}>
        {text.prompt}{" "}
        <button
          className={styles.switchButton}
          type="button"
          onClick={switchMode}
        >
          {text.switch}
        </button>
      </p>
    </form>
  )
}
