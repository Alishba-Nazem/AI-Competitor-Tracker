"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/field";
import { api } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";

export function SignupForm() {
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
    <form className="mt-8 space-y-4" onSubmit={onSubmit} aria-describedby={error ? "auth-error" : undefined}>
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
        {submitting ? "Please wait…" : "Create account"}
      </button>
    </form>
  );
}
