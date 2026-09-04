import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureCurrentUser } from "@/modules/auth/user";
import { getRecentNotifications, markAllAsRead } from "@/modules/notifications/actions";
import { Card } from "@/modules/ui/Card";
import { Button } from "@/modules/ui/Button";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Full history — the header bell only ever shows the 8 most recent. Also
// the real destination for the mobile bottom tab bar's "Alerts" tab, since
// there's no dropdown to open on a phone screen the way there is on desktop.
export default async function NotificationsPage() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) redirect("/sign-in");

  const notifications = await getRecentNotifications(user.id, 50);
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-mono text-h1">
          <span className="text-brand-600">$</span> notifications
        </h1>
        {hasUnread && (
          <form action={markAllAsRead}>
            <Button type="submit" variant="secondary" size="sm" className="font-mono">
              mark_all_read
            </Button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-neutral-500">You&rsquo;re all caught up.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id}>
              <Link href={n.href ?? "#"}>
                <Card className={`hover:border-brand-600 hover:shadow-popover ${!n.readAt ? "border-brand-200 bg-brand-50" : ""}`}>
                  <div className="flex items-start gap-2">
                    {!n.readAt && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />}
                    <div className={n.readAt ? "ml-3.5" : ""}>
                      <p className="text-sm text-neutral-900">{n.title}</p>
                      {n.body && <p className="text-xs text-neutral-500">{n.body}</p>}
                      <p className="mt-0.5 text-xs text-neutral-400">{timeAgo(new Date(n.createdAt))}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
