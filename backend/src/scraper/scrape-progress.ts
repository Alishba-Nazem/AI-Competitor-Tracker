export type ScrapeProgress = {
  competitorId: number;
  total: number;
  done: number;
  active: boolean;
  updatedAt: number;
};

const progressByCompetitor = new Map<number, ScrapeProgress>();

export function startScrapeProgress(competitorId: number, total: number) {
  const entry: ScrapeProgress = {
    competitorId,
    total,
    done: 0,
    active: true,
    updatedAt: Date.now(),
  };
  progressByCompetitor.set(competitorId, entry);
  return entry;
}

export function bumpScrapeProgress(competitorId: number, doneDelta = 1) {
  const current = progressByCompetitor.get(competitorId);
  if (!current) return undefined;
  current.done = Math.min(current.total, current.done + doneDelta);
  current.updatedAt = Date.now();
  progressByCompetitor.set(competitorId, current);
  return current;
}

export function finishScrapeProgress(competitorId: number) {
  const current = progressByCompetitor.get(competitorId);
  if (!current) {
    return {
      competitorId,
      total: 0,
      done: 0,
      active: false,
      updatedAt: Date.now(),
    } satisfies ScrapeProgress;
  }
  current.active = false;
  current.done = current.total;
  current.updatedAt = Date.now();
  progressByCompetitor.set(competitorId, current);
  return current;
}

export function getScrapeProgress(competitorId: number): ScrapeProgress {
  return (
    progressByCompetitor.get(competitorId) ?? {
      competitorId,
      total: 0,
      done: 0,
      active: false,
      updatedAt: 0,
    }
  );
}
