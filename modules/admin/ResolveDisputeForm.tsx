"use client";

import { useState } from "react";
import { resolveDispute } from "@/modules/admin/actions";
import { Button } from "@/modules/ui/Button";
import { ConfirmDialog } from "@/modules/ui/ConfirmDialog";

type Outcome = "no_action" | "release_to_developer" | "refund_to_client";

const OUTCOME_LABELS: Record<Outcome, string> = {
  no_action: "No money movement — just log the decision",
  release_to_developer: "Release escrowed funds to the developer",
  refund_to_client: "Refund escrowed funds to the client",
};

// Confirm-gated because release/refund moves real money — same rule as
// funding/approving a milestone (design language §04).
export function ResolveDisputeForm({
  disputeId,
  canMoveMoney,
}: {
  disputeId: string;
  canMoveMoney: boolean;
}) {
  const [outcome, setOutcome] = useState<Outcome>("no_action");
  const [resolution, setResolution] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (outcome !== "no_action") {
      e.preventDefault();
      setConfirming(true);
    } else {
      setPending(true);
    }
  }

  function confirmAndSubmit() {
    setConfirming(false);
    setPending(true);
    const form = document.getElementById("resolve-dispute-form") as HTMLFormElement;
    form.requestSubmit();
  }

  return (
    <>
      <form
        id="resolve-dispute-form"
        action={resolveDispute}
        onSubmit={handleSubmit}
        className="space-y-3 rounded-md border border-dashed p-4"
      >
        <input type="hidden" name="disputeId" value={disputeId} />
        <input type="hidden" name="outcome" value={outcome} />

        {canMoveMoney && (
          <div>
            <label className="mb-1 block text-sm font-medium">Outcome</label>
            <div className="space-y-1">
              {(Object.keys(OUTCOME_LABELS) as Outcome[]).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={outcome === key}
                    onChange={() => setOutcome(key)}
                  />
                  {OUTCOME_LABELS[key]}
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Resolution</label>
          <textarea
            name="resolution"
            required
            rows={4}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="What was decided and why"
          />
        </div>

        <Button type="submit" disabled={pending} className="font-mono">
          resolve_dispute
        </Button>
      </form>

      <ConfirmDialog
        open={confirming}
        title={outcome === "release_to_developer" ? "Release funds to developer?" : "Refund funds to client?"}
        body="This moves real money and can't be undone from here. Double-check the resolution note before confirming."
        confirmLabel="Yes, move the money"
        danger
        onConfirm={confirmAndSubmit}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
