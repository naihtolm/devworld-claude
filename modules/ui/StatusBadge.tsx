import { classify, STATUS_STYLES } from "@/modules/ui/statusClassify";

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const style = STATUS_STYLES[classify(status)];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style} ${className}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
