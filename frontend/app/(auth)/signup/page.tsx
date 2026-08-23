import Link from "next/link";
import { AuthScreen } from "@/components/auth-screen";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <AuthScreen
      title="Create your workspace"
      subtitle="Start tracking competitor stores. After signup you’ll set up your market and first rivals."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-teal-800 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthScreen>
  );
}
