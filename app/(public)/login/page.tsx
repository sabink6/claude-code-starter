import AuthForm from "@/components/AuthForm"

export default function LoginPage() {
  return (
    <div className="center-content">
      <AuthForm initialMode="login" />
    </div>
  )
}
