import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { developerProfiles } from "@/db/schema";
import { ensureCurrentUser } from "@/modules/auth/user";
import { connectStripeAccount } from "@/modules/payments/actions";
import { getUserRoles } from "@/modules/profiles/roles";
import { Card } from "@/modules/ui/Card";
import { Button } from "@/modules/ui/Button";

// DW-900 — design language G-5: Stripe Connect used to have nowhere to
// live except deep inside the agreement page. This is its real home now.
export default async function SettingsPage() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();
  if (!user) redirect("/sign-in");

  const clerkUser = await currentUser();
  const roles = await getUserRoles(user.id);

  const [developerProfile] = roles.isDeveloper
    ? await db.select().from(developerProfiles).where(eq(developerProfiles.userId, user.id))
    : [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-8 text-h1">Account Settings</h1>

      <h2 className="mb-3 text-h2">Account</h2>
      <Card className="mb-8">
        <p className="text-sm text-neutral-500">Email</p>
        <p className="text-sm font-medium">{clerkUser?.emailAddresses[0]?.emailAddress ?? user.email}</p>
      </Card>

      {roles.isDeveloper && (
        <>
          <h2 className="mb-3 text-h2">Payouts</h2>
          <Card className="mb-8">
            {developerProfile?.stripeOnboardingComplete ? (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-sm text-neutral-700">
                  Stripe connected — you can receive milestone and hourly payouts.
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <p className="text-sm text-neutral-700">
                    Not connected yet — you won&rsquo;t be able to receive a payout until this is done.
                  </p>
                </div>
                <form action={connectStripeAccount}>
                  <Button type="submit" size="sm">
                    Connect Stripe
                  </Button>
                </form>
              </div>
            )}
          </Card>
        </>
      )}
    </main>
  );
}
