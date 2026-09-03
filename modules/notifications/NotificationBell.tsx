import Link from "next/link";
import { getUnreadCount, getRecentNotifications, markAllAsRead } from "@/modules/notifications/actions";
import { CountBadge } from "@/modules/ui/CountBadge";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// DW-800 — same no-JS <details> dropdown pattern as the header's "More"
// menu. Individual rows are plain links (unread shown as a dot, not a
// per-row mark-as-read control) plus one "Mark all read" action — keeps
// this from needing client-side state just to toggle read receipts.
export async function NotificationBell({ userId }: { userId: string }) {
  const [unreadCount, recent] = await Promise.all([getUnreadCount(userId), getRecentNotifications(userId, 8)]);

  return (
    <details className="group relative">
      <summary className="relative inline-flex cursor-pointer list-none items-center text-neutral-600 hover:text-neutral-900">
        <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
          <path d="M10 2a5 5 0 0 0-5 5v2.6c0 .5-.2 1-.5 1.4L3 13.5c-.6.8 0 1.9 1 1.9h12c1 0 1.6-1.1 1-1.9l-1.5-2.5a2.3 2.3 0 0 1-.5-1.4V7a5 5 0 0 0-5-5z" />
          <path d="M7.5 17a2.5 2.5 0 0 0 5 0h-5z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1">
            <CountBadge count={unreadCount} />
          </span>
        )}
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-80 rounded-card border border-neutral-200 bg-white shadow-popover">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
          <span className="text-sm font-medium">Notifications</span>
          {unreadCount > 0 && (
            <form action={markAllAsRead}>
              <button type="submit" className="text-xs text-brand-600 underline">
                Mark all read
              </button>
            </form>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-neutral-400">You&rsquo;re all caught up.</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto py-1">
            {recent.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href ?? "#"}
                  className={`flex gap-2 px-4 py-2.5 text-sm hover:bg-neutral-50 ${!n.readAt ? "bg-brand-50/50" : ""}`}
                >
                  {!n.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />}
                  <span className={n.readAt ? "ml-3.5" : ""}>
                    <span className="block text-neutral-900">{n.title}</span>
                    {n.body && <span className="block text-xs text-neutral-500">{n.body}</span>}
                    <span className="block text-xs text-neutral-400">{timeAgo(new Date(n.createdAt))}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/notifications"
          className="block border-t border-neutral-100 px-4 py-2 text-center text-xs text-brand-600 hover:bg-neutral-50"
        >
          View all
        </Link>
      </div>
    </details>
  );
}
