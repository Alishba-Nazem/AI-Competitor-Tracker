"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Field, LoadingState, Panel } from "@/components/ui";
import { api } from "@/lib/api";

const NICHES = [
  "Bags",
  "Shoes",
  "Clothing",
  "Jewelry",
  "Beauty",
  "Electronics",
  "Other",
] as const;

type Niche = (typeof NICHES)[number];

type CompetitorRow = {
  name: string;
  url: string;
};

type Step = 1 | 2 | 3;

function validateHttpUrl(value: string, emptyMessage: string) {
  const trimmed = value.trim();
  if (!trimmed) return emptyMessage;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "URL must start with http:// or https://";
    }
    if (!parsed.hostname) return "Enter a valid website URL.";
    return null;
  } catch {
    return "Enter a valid HTTP or HTTPS URL.";
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [step, setStep] = useState<Step>(1);

  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [niche, setNiche] = useState<Niche | "">("");

  const [competitors, setCompetitors] = useState<CompetitorRow[]>([
    { name: "", url: "" },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<"form" | "saving" | "discovering" | "success">(
    "form",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const status = await api.getOnboardingStatus();
        if (status.completed) {
          router.replace("/");
          return;
        }
      } finally {
        setCheckingStatus(false);
      }
    })();
  }, [router]);

  function updateCompetitor(index: number, field: keyof CompetitorRow, value: string) {
    setCompetitors((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  }

  function addCompetitorRow() {
    setCompetitors((current) => [...current, { name: "", url: "" }]);
  }

  function removeCompetitorRow(index: number) {
    setCompetitors((current) =>
      current.length === 1 ? current : current.filter((_, i) => i !== index),
    );
  }

  function validateStep1() {
    const nextErrors: Record<string, string> = {};
    if (!storeName.trim()) nextErrors.storeName = "Enter your store name.";
    const storeUrlError = validateHttpUrl(storeUrl, "Enter your store URL.");
    if (storeUrlError) nextErrors.storeUrl = storeUrlError;
    if (!niche) nextErrors.niche = "Select your primary niche.";
    setErrors(nextErrors);
    setFormError(null);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep2() {
    const nextErrors: Record<string, string> = {};
    const cleaned = competitors.map((row) => ({
      name: row.name.trim(),
      url: row.url.trim(),
    }));

    if (cleaned.every((row) => !row.name && !row.url)) {
      nextErrors.competitors = "Add at least one competitor.";
    }

    cleaned.forEach((row, index) => {
      if (!row.name) nextErrors[`competitor-name-${index}`] = "Enter a competitor name.";
      const urlError = validateHttpUrl(row.url, "Enter a competitor URL.");
      if (urlError) nextErrors[`competitor-url-${index}`] = urlError;
    });

    setErrors(nextErrors);
    setFormError(null);
    return Object.keys(nextErrors).length === 0;
  }

  function goToStep2() {
    if (!validateStep1()) return;
    setStep(2);
  }

  function goToStep3() {
    if (!validateStep2()) return;
    setStep(3);
  }

  async function startTracking() {
    if (submitting) return;
    if (!validateStep1() || !validateStep2()) {
      setStep(!storeName.trim() || !storeUrl.trim() || !niche ? 1 : 2);
      return;
    }

    const cleanedCompetitors = competitors.map((row) => ({
      name: row.name.trim(),
      url: row.url.trim(),
    }));

    setSubmitting(true);
    setPhase("saving");
    setFormError(null);
    try {
      setPhase("discovering");
      const result = await api.completeOnboarding({
        businessName: storeName.trim(),
        category: niche,
        country: "Pakistan",
        storeUrl: storeUrl.trim(),
        competitors: cleanedCompetitors.map((row) => ({
          url: row.url,
          name: row.name,
        })),
      });
      setPhase("success");
      setSummary(
        `${result.totalDiscovered} product${result.totalDiscovered === 1 ? "" : "s"} discovered across ${result.competitors.filter((item) => item.created > 0).length} competitor${result.competitors.filter((item) => item.created > 0).length === 1 ? "" : "s"}.`,
      );
      try {
        sessionStorage.setItem("act_onboarding_completed", "1");
      } catch {
        // Ignore storage failures.
      }
      window.setTimeout(() => {
        router.replace("/");
      }, 900);
    } catch (error) {
      setPhase("form");
      setStep(2);
      setFormError(
        error instanceof Error ? error.message : "Unable to complete onboarding.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingStatus) {
    return <LoadingState text="Checking onboarding status…" />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Set up your tracker
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Three short steps. You choose the competitors — we discover their products and track
          what customers say.
        </p>
      </header>

      <ol className="mb-6 grid grid-cols-3 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {[
          { id: 1, label: "Your store" },
          { id: 2, label: "Competitors" },
          { id: 3, label: "Confirm" },
        ].map((item) => (
          <li
            key={item.id}
            className={`border px-3 py-2 ${
              step === item.id
                ? "border-slate-900 bg-slate-900 text-white"
                : step > item.id
                  ? "border-slate-300 bg-slate-100 text-slate-700"
                  : "border-slate-200 bg-white"
            }`}
          >
            Step {item.id}: {item.label}
          </li>
        ))}
      </ol>

      <Panel>
        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Your store</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tell us about your store so research findings stay in context.
              </p>
            </div>

            <Field label="Store name" error={errors.storeName}>
              <input
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                placeholder="My Store"
                maxLength={255}
                disabled={submitting}
              />
            </Field>

            <Field
              label="Store URL"
              hint="Your Shopify or Daraz shop URL."
              error={errors.storeUrl}
            >
              <input
                type="url"
                value={storeUrl}
                onChange={(event) => setStoreUrl(event.target.value)}
                placeholder="https://www.example-store.com"
                disabled={submitting}
              />
            </Field>

            <Field label="Primary niche" error={errors.niche}>
              <select
                value={niche}
                onChange={(event) => setNiche(event.target.value as Niche | "")}
                disabled={submitting}
              >
                <option value="">Select a niche</option>
                {NICHES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex justify-end">
              <button type="button" className="button-primary" onClick={goToStep2} disabled={submitting}>
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">Your niche: {niche}</p>
              <h2 className="mt-3 text-sm font-semibold text-slate-900">Add competitors</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add stores that sell products similar to yours.
              </p>
            </div>

            {errors.competitors ? (
              <p className="text-sm text-rose-700" role="alert">
                {errors.competitors}
              </p>
            ) : null}

            <div className="space-y-3">
              {competitors.map((row, index) => (
                <div key={index} className="border border-slate-200 bg-slate-50/60 p-3">
                  <Field
                    label={`Competitor name ${index + 1}`}
                    error={errors[`competitor-name-${index}`]}
                  >
                    <input
                      value={row.name}
                      onChange={(event) => updateCompetitor(index, "name", event.target.value)}
                      placeholder="Competitor name"
                      maxLength={255}
                      disabled={submitting}
                    />
                  </Field>
                  <Field
                    label="Competitor URL"
                    hint="Example: https://www.daraz.pk/shop/bonanza-satrangi"
                    error={errors[`competitor-url-${index}`]}
                  >
                    <input
                      type="url"
                      value={row.url}
                      onChange={(event) => updateCompetitor(index, "url", event.target.value)}
                      placeholder="https://www.daraz.pk/shop/seller-name"
                      disabled={submitting}
                    />
                  </Field>
                  {competitors.length > 1 ? (
                    <button
                      type="button"
                      className="button-secondary mt-2"
                      onClick={() => removeCompetitorRow(index)}
                      disabled={submitting}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="button-secondary"
              onClick={addCompetitorRow}
              disabled={submitting}
            >
              + Add another competitor
            </button>

            {formError ? (
              <div
                className="border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800"
                role="alert"
              >
                {formError}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                Back
              </button>
              <button type="button" className="button-primary" onClick={goToStep3} disabled={submitting}>
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Confirmation</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review your setup, then start tracking.
              </p>
            </div>

            <dl className="space-y-3 border border-slate-200 bg-slate-50/60 p-4 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Store name
                </dt>
                <dd className="mt-1 font-medium text-slate-900">{storeName.trim()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Store URL
                </dt>
                <dd className="mt-1 break-all text-slate-700">{storeUrl.trim()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Selected niche
                </dt>
                <dd className="mt-1 font-medium text-slate-900">{niche}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Competitors
                </dt>
                <dd className="mt-2 space-y-2">
                  {competitors.map((row, index) => (
                    <div key={index} className="border border-slate-200 bg-white px-3 py-2">
                      <p className="font-medium text-slate-900">{row.name.trim()}</p>
                      <p className="mt-0.5 break-all text-slate-600">{row.url.trim()}</p>
                    </div>
                  ))}
                </dd>
              </div>
            </dl>

            {(phase === "saving" || phase === "discovering" || phase === "success") && (
              <div
                className="border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                role="status"
              >
                {phase === "saving" ? <p>Saving your store profile…</p> : null}
                {phase === "discovering" ? (
                  <div className="space-y-1">
                    <p>Creating competitors…</p>
                    <p>Discovering products…</p>
                  </div>
                ) : null}
                {phase === "success" && summary ? <p>{summary}</p> : null}
              </div>
            )}

            {formError ? (
              <div
                className="border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800"
                role="alert"
              >
                {formError}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setPhase("form");
                  setStep(2);
                }}
                disabled={submitting}
              >
                Back
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={() => void startTracking()}
                disabled={submitting}
              >
                {submitting ? "Starting…" : "Start Tracking"}
              </button>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
