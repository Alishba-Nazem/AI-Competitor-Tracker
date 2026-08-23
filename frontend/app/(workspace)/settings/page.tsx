"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { LoadingState, PageHeader, Panel } from "@/components/ui";
import { API_BASE_URL, api } from "@/lib/api";
import { clearAuthToken, clearOnboardingCache } from "@/lib/auth";
import type { AuthUser, BusinessProfile, Competitor } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const [account, setAccount] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);

  const loadCompetitors = useCallback(async () => {
    setLoadingCompetitors(true);
    try {
      setCompetitors(await api.getCompetitors());
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to load competitors.");
    } finally {
      setLoadingCompetitors(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void api.getCurrentUser().then(setAccount).catch(() => setAccount(null));
    void api.getBusinessProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    void loadCompetitors();
  }, [loadCompetitors]);

  async function setFrequency(competitorId: number, captureFrequency: "DAILY" | "WEEKLY") {
    setSavingId(competitorId);
    try {
      const updated = await api.updateCompetitor(competitorId, { captureFrequency });
      setCompetitors((current) =>
        current.map((item) =>
          item.id === competitorId
            ? { ...item, captureFrequency: updated.captureFrequency ?? captureFrequency }
            : item,
        ),
      );
      pushToast("success", `Capture schedule set to ${captureFrequency === "WEEKLY" ? "weekly" : "daily"}.`);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Unable to update capture schedule.");
    } finally {
      setSavingId(null);
    }
  }

  async function resetForDemo() {
    if (resetting) return;
    const confirmed = window.confirm(
      "This clears your business profile, competitors, products, snapshots, and reviews so you can re-run onboarding. Continue?",
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      await api.resetOnboarding();
      clearOnboardingCache();
      pushToast("success", "Demo data cleared. Starting onboarding…");
      router.replace("/onboarding");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Unable to reset onboarding.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Tracker configuration is managed by the connected backend."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Account">
          {account ? (
            <dl className="space-y-2 text-sm text-slate-600">
              <div>
                <dt className="text-stone-700">Name</dt>
                <dd className="font-medium text-slate-800">{account.name}</dd>
              </div>
              <div>
                <dt className="text-stone-700">Email</dt>
                <dd>{account.email}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm leading-6 text-slate-600">Signed in session not loaded.</p>
          )}
          <button
            type="button"
            className="button-secondary mt-4"
            onClick={() => {
              clearAuthToken();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </Panel>
        <Panel title="Business profile">
          {profile ? (
            <dl className="space-y-2 text-sm text-slate-600">
              <div>
                <dt className="text-stone-700">Business</dt>
                <dd className="font-medium text-slate-800">{profile.businessName}</dd>
              </div>
              <div>
                <dt className="text-stone-700">Category</dt>
                <dd>{profile.category}</dd>
              </div>
              <div>
                <dt className="text-stone-700">Market</dt>
                <dd>{profile.country}</dd>
              </div>
              {profile.storeUrl ? (
                <div>
                  <dt className="text-stone-700">Store</dt>
                  <dd className="break-all">{profile.storeUrl}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="text-sm leading-6 text-slate-600">No business profile saved yet.</p>
          )}
        </Panel>
        <Panel title="API connection">
          <p className="text-sm leading-6 text-slate-600">
            Connected to <span className="font-semibold text-slate-800">{API_BASE_URL}</span>.
          </p>
        </Panel>
        <Panel title="Price discovery">
          <p className="text-sm leading-6 text-slate-600">
            Prices are never entered manually. Capture records the current selling price, including
            discounts, not the original list price. Unsupported stores may fall back to structured
            data (JSON-LD) on product pages.
          </p>
        </Panel>
        <Panel title="Capture schedule" className="md:col-span-2">
          <p className="mb-4 text-sm leading-6 text-slate-600">
            Choose how often each competitor is re-captured by the midnight cron job.
          </p>
          {loadingCompetitors ? (
            <LoadingState text="Loading competitors…" />
          ) : competitors.length === 0 ? (
            <p className="text-sm text-slate-600">Add competitors to configure schedules.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {competitors.map((competitor) => {
                const frequency = competitor.captureFrequency === "WEEKLY" ? "WEEKLY" : "DAILY";
                return (
                  <li
                    key={competitor.id}
                    className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{competitor.name}</p>
                      <p className="truncate text-xs text-stone-600">{competitor.url}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={frequency === "DAILY" ? "button-primary !py-2 !text-xs" : "button-secondary !py-2 !text-xs"}
                        disabled={savingId === competitor.id}
                        onClick={() => void setFrequency(competitor.id, "DAILY")}
                      >
                        Daily
                      </button>
                      <button
                        type="button"
                        className={frequency === "WEEKLY" ? "button-primary !py-2 !text-xs" : "button-secondary !py-2 !text-xs"}
                        disabled={savingId === competitor.id}
                        onClick={() => void setFrequency(competitor.id, "WEEKLY")}
                      >
                        Weekly
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Demo / submit">
          <p className="text-sm leading-6 text-slate-600">
            Need to show the 3-step onboarding again? Reset clears local tracker data and opens
            onboarding from Step 1.
          </p>
          <button
            type="button"
            className="button-secondary mt-4"
            onClick={() => void resetForDemo()}
            disabled={resetting}
          >
            {resetting ? "Resetting…" : "Reset & re-run onboarding"}
          </button>
        </Panel>
      </div>
    </>
  );
}
