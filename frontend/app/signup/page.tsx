"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { Field } from "@/components/ui";
import { api } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.signup({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setAuthSession(result.token, result.user);
      router.replace("/onboarding");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen
      title="Create your workspace"
      subtitle="Start tracking competitor stores. After signup you’ll set up your market and first rivals."
      submitLabel="Create account"
      submitting={submitting}
      error={error}
      onSubmit={onSubmit}
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-teal-700 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Field label="Full name">
        <input
          type="text"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </Field>
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
      <Field label="Password" hint="Use at least 8 characters.">
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
      </Field>
    </AuthScreen>
  );
}
