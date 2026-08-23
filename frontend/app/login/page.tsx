"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { Field } from "@/components/ui";
import { api } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.login({ email: email.trim(), password });
      setAuthSession(result.token, result.user);
      const status = await api.getOnboardingStatus();
      router.replace(status.completed ? "/" : "/onboarding");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to continue tracking competitor prices, catalogs, and reviews."
      submitLabel="Sign in"
      submitting={submitting}
      error={error}
      onSubmit={onSubmit}
      footer={
        <>
          New to ECT?{" "}
          <Link href="/signup" className="font-semibold text-teal-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Field label="Work email">
        <input
          type="email"
          autoComplete="email"
          placeholder="you@store.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </Field>
    </AuthScreen>
  );
}
