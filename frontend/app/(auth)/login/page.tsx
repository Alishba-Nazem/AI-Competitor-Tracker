import Link from "next/link";
import { AuthScreen } from "@/components/auth-screen";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to continue tracking competitor prices, catalogs, and reviews."
      footer={
        <>
          New to ECT?{" "}
          <Link href="/signup" className="font-semibold text-teal-800 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthScreen>
  );
}
