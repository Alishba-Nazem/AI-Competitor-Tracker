"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Field, Modal, ModalActions } from "@/components/ui";

type OnboardingPhase = "form" | "adding" | "discovering" | "success" | "discovery-error";

function validateCompetitorName(value: string) {
  if (!value.trim()) return "Enter a competitor or store name.";
  return null;
}

function validateStoreUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a store or seller URL.";
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "Enter a valid HTTP or HTTPS URL.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "URL must start with http:// or https://";
  }
  if (!parsed.hostname) {
    return "Enter a valid website URL.";
  }
  return null;
}

function discoveryErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("NO_PRODUCTS_FOUND")) {
    return "No products were found for this store.";
  }
  if (message.includes("UNSUPPORTED_PLATFORM")) {
    return "This store URL is not a detected Shopify or Daraz shop.";
  }
  if (message.includes("STORE_UNREACHABLE") || message.includes("Failed to fetch website")) {
    return "The store URL could not be fetched.";
  }
  return message || "Products could not be discovered from this URL.";
}

function productCountLabel(count: number) {
  return `${count} product${count === 1 ? "" : "s"} discovered`;
}

export function AddCompetitorModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: number) => void;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<OnboardingPhase>("form");
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const redirectTimer = useRef<number | null>(null);

  const busy = phase === "adding" || phase === "discovering" || phase === "success";

  useEffect(() => {
    return () => {
      if (redirectTimer.current !== null) {
        window.clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  if (!open) return null;

  function resetAndClose() {
    if (redirectTimer.current !== null) {
      window.clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
    }
    const savedId = createdId;
    setName("");
    setUrl("");
    setNameError(null);
    setUrlError(null);
    setFormError(null);
    setPhase("form");
    setCreatedId(null);
    setDiscoveredCount(0);
    onClose();
    if (savedId != null) onCreated?.(savedId);
  }

  function finishOnboarding(competitorId: number, count: number) {
    setDiscoveredCount(count);
    setPhase("success");
    pushToast("success", productCountLabel(count));
    redirectTimer.current = window.setTimeout(() => {
      setName("");
      setUrl("");
      setPhase("form");
      setCreatedId(null);
      onClose();
      onCreated?.(competitorId);
      router.push(`/competitors/${competitorId}`);
    }, 900) as unknown as number;
  }

  async function discoverFor(competitorId: number) {
    setPhase("discovering");
    setFormError(null);
    const discovery = await api.discoverCompetitor(competitorId);
    if (discovery.discovered <= 0) {
      throw new Error("NO_PRODUCTS_FOUND: no product URLs could be discovered from this store.");
    }
    finishOnboarding(competitorId, discovery.discovered);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || phase === "discovery-error") return;

    const nextNameError = validateCompetitorName(name);
    const nextUrlError = validateStoreUrl(url);
    setNameError(nextNameError);
    setUrlError(nextUrlError);
    setFormError(null);
    if (nextNameError || nextUrlError) return;

    setPhase("adding");
    try {
      const competitor = await api.createCompetitor({
        name: name.trim(),
        url: url.trim(),
      });
      setCreatedId(competitor.id);
      try {
        await discoverFor(competitor.id);
      } catch (error) {
        setPhase("discovery-error");
        setFormError(discoveryErrorMessage(error));
      }
    } catch (error) {
      setPhase("form");
      setCreatedId(null);
      const message = error instanceof Error ? error.message : "Unable to add competitor.";
      setFormError(message);
      pushToast("error", message);
    }
  }

  async function retryDiscovery() {
    if (createdId == null || busy) return;
    try {
      await discoverFor(createdId);
    } catch (error) {
      setPhase("discovery-error");
      setFormError(discoveryErrorMessage(error));
    }
  }

  function openWorkspace() {
    if (createdId == null) return;
    const competitorId = createdId;
    setName("");
    setUrl("");
    setPhase("form");
    setCreatedId(null);
    onClose();
    onCreated?.(competitorId);
    router.push(`/competitors/${competitorId}`);
  }

  const submitLabel =
    phase === "adding"
      ? "Adding competitor..."
      : phase === "discovering"
        ? "Discovering products..."
        : phase === "success"
          ? productCountLabel(discoveredCount)
          : "Add competitor";

  return (
    <Modal
      title="Add competitor"
      description="Enter a store or seller URL. Products are discovered automatically. You do not enter product URLs or prices."
      onClose={busy ? () => undefined : resetAndClose}
    >
      <form className="space-y-4" onSubmit={onSubmit} aria-busy={busy}>
        <Field label="Competitor / Store name" error={nameError ?? undefined}>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="Bonanza Satrangi"
            maxLength={255}
            required
            autoComplete="organization"
            disabled={busy || phase === "discovery-error"}
            aria-invalid={nameError ? true : undefined}
          />
        </Field>
        <Field
          label="Store / Seller URL"
          error={urlError ?? undefined}
          hint="Example Shopify: https://example-store.com. Example Daraz: https://www.daraz.pk/shop/bonanza-satrangi"
        >
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (urlError) setUrlError(null);
            }}
            placeholder="https://www.daraz.pk/shop/bonanza-satrangi"
            required
            autoComplete="url"
            spellCheck={false}
            disabled={busy || phase === "discovery-error"}
            aria-invalid={urlError ? true : undefined}
          />
        </Field>

        {(phase === "adding" || phase === "discovering" || phase === "success") && (
          <div
            className="border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
            role="status"
            aria-live="polite"
          >
            {phase === "adding" ? <p>Adding competitor...</p> : null}
            {phase === "discovering" ? (
              <div className="space-y-1">
                <p>Detecting store platform...</p>
                <p>Discovering products...</p>
              </div>
            ) : null}
            {phase === "success" ? <p>{productCountLabel(discoveredCount)}</p> : null}
          </div>
        )}

        {formError ? (
          <div className="border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800" role="alert">
            <p>{formError}</p>
            {phase === "discovery-error" ? (
              <p className="mt-1 text-slate-600">The competitor was saved. No products were added from this URL.</p>
            ) : null}
          </div>
        ) : null}

        {phase === "discovery-error" ? (
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" className="button-secondary" onClick={resetAndClose}>
              Close
            </button>
            <button type="button" className="button-secondary" onClick={openWorkspace}>
              Open workspace
            </button>
            <button type="button" className="button-primary" onClick={() => void retryDiscovery()}>
              Try discovery again
            </button>
          </div>
        ) : (
          <ModalActions
            onCancel={resetAndClose}
            submitLabel={submitLabel}
            disabled={busy}
            cancelDisabled={busy}
          />
        )}
      </form>
    </Modal>
  );
}

export function AddProductModal({
  open,
  competitorId,
  competitorName,
  onClose,
  onCreated,
}: {
  open: boolean;
  competitorId: number;
  competitorName?: string;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const { pushToast } = useToast();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.createProduct({
        competitorId,
        name: name.trim(),
        url: url.trim(),
        currentPrice: 0,
        currency: "USD",
      });
      pushToast("success", "Product added. Capture prices to discover its selling price.");
      setName("");
      setUrl("");
      onClose();
      await onCreated();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Unable to add product.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Add product"
      description={
        competitorName
          ? `Track a product URL for ${competitorName}. Price is discovered by the scraper.`
          : "Only name and URL are required. Price comes from capture."
      }
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Product name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Floating on Air"
            maxLength={255}
            required
          />
        </Field>
        <Field label="Product URL" hint="Do not enter a price. Capture will discover it automatically.">
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/products/item"
            required
          />
        </Field>
        <ModalActions
          onCancel={onClose}
          submitLabel={submitting ? "Adding…" : "Add product"}
          disabled={submitting}
        />
      </form>
    </Modal>
  );
}
