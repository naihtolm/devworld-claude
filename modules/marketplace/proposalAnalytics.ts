import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { proposals } from "@/db/schema";

export type StatusCount = { status: string; count: number };

export type ProposalAnalytics = {
  total: number;
  // Fraction of *decided* proposals that were accepted — null (not 0) when
  // nothing has been decided yet, so the widget can say "no data" instead of
  // a misleading 0%. "Decided" excludes still-pending statuses (submitted,
  // shortlisted): those haven't produced an outcome yet.
  winRate: number | null;
  breakdown: StatusCount[];
};

// Order proposals actually move through in this app (see
// modules/proposals/actions.ts) — a fixed display order, not alphabetical.
// "viewed"/"withdrawn" are defined on the schema's status enum but no code
// path sets them yet, so they're included for when that changes but will
// read as 0 today.
export const PROPOSAL_STATUS_ORDER = [
  "submitted",
  "viewed",
  "shortlisted",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
];

const DECIDED_STATUSES = new Set(["accepted", "declined", "expired"]);

export async function getProposalAnalytics(developerProfileId: string): Promise<ProposalAnalytics> {
  const rows = await db
    .select({ status: proposals.status, count: sql<string>`count(*)` })
    .from(proposals)
    .where(eq(proposals.developerProfileId, developerProfileId))
    .groupBy(proposals.status);

  const breakdown = rows
    .map((r) => ({ status: r.status, count: Number(r.count) }))
    .sort((a, b) => PROPOSAL_STATUS_ORDER.indexOf(a.status) - PROPOSAL_STATUS_ORDER.indexOf(b.status));

  const total = breakdown.reduce((sum, r) => sum + r.count, 0);
  const accepted = breakdown.find((r) => r.status === "accepted")?.count ?? 0;
  const decided = breakdown.filter((r) => DECIDED_STATUSES.has(r.status)).reduce((sum, r) => sum + r.count, 0);

  return {
    total,
    winRate: decided > 0 ? accepted / decided : null,
    breakdown,
  };
}
