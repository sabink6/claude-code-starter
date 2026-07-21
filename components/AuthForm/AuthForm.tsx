"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import Field from "./Field"
import styles from "./AuthForm.module.css"

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
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const text = copy[mode]

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email || !password) {
      setError("Please enter both an email and a password.")
      return
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError("Please enter a valid email address.")
      return
    }

    setError("")
    console.log("auth form submitted", { form: mode, email, password })
  }

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login")
    setPassword("")
    setShowPassword(false)
    setError("")
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

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button className="btn" type="submit">
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
