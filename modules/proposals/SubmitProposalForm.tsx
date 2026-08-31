"use client";

import { useState } from "react";
import { submitProposal } from "@/modules/proposals/actions";
import { Button } from "@/modules/ui/Button";

export function SubmitProposalForm({
  projectId,
  defaultRateType,
}: {
  projectId: string;
  defaultRateType: "fixed" | "milestone" | "hourly";
}) {
  const [rateType, setRateType] = useState(defaultRateType);
  const [pending, setPending] = useState(false);

  return (
    <form action={submitProposal} onSubmit={() => setPending(true)} className="space-y-6">
      <input type="hidden" name="projectId" value={projectId} />

      <div>
        <label className="mb-1 block text-sm font-medium">Introduction</label>
        <textarea
          name="introduction"
          required
          minLength={20}
          rows={6}
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
          placeholder="Introduce yourself and outline your approach to this project."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Rate type</label>
        <div className="flex gap-4 text-sm">
          {(["fixed", "milestone", "hourly"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input
                type="radio"
                name="proposedRateType"
                value={type}
                checked={rateType === type}
                onChange={() => setRateType(type)}
              />
              {type === "fixed" ? "Fixed price" : type === "milestone" ? "Milestone-based" : "Hourly"}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          {rateType === "hourly" ? "Proposed rate ($/hr)" : "Proposed amount ($)"}
        </label>
        <input
          name="proposedAmount"
          type="number"
          required
          min={0}
          step="0.01"
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Estimated timeline (days)</label>
        <input
          name="estimatedTimelineDays"
          type="number"
          min={1}
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-2"
        />
      </div>

      <Button type="submit" disabled={pending}>
        Submit Proposal
      </Button>
    </form>
  );
}
