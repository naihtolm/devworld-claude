import { openReport } from "@/modules/admin/actions";

export function ReportForm({
  targetType,
  targetId,
  label,
}: {
  targetType: "user" | "project" | "review" | "message";
  targetId: string;
  label: string;
}) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-neutral-400 underline">{label}</summary>
      <form action={openReport} className="mt-3 flex gap-2 rounded-md border border-dashed p-3">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input
          name="reason"
          required
          maxLength={150}
          placeholder="Reason for reporting"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md border border-neutral-300 px-4 py-2 text-sm">
          Submit
        </button>
      </form>
    </details>
  );
}
