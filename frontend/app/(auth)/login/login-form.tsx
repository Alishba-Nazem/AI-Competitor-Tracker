"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { api } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";

export function LoginForm() {
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
    <form className="mt-8 space-y-4" onSubmit={onSubmit} aria-describedby={error ? "auth-error" : undefined}>
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
      {error ? (
        <p
          id="auth-error"
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="button-primary w-full justify-center"
        disabled={submitting}
        aria-busy={submitting}
      >
        {submitting ? "Please wait…" : "Sign in"}
      </button>
    </form>
  );
}
