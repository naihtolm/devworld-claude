import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { developerProfiles, developerSkills, skills, users } from "@/db/schema";
import { and, eq, exists, gte, lte, desc, sql } from "drizzle-orm";
import { ensureCurrentUser } from "@/modules/auth/user";
import { getClerkDisplay } from "@/modules/auth/clerkDisplay";
import { getTrustSignal } from "@/modules/reviews/trust";
import { isFavorited } from "@/modules/favorites/actions";
import { FavoriteButton } from "@/modules/favorites/FavoriteButton";
import { Avatar } from "@/modules/profiles/Avatar";
import { Card } from "@/modules/ui/Card";

// The symmetric counterpart to /projects — clients could only ever wait for
// proposals to come in, with no way to go find talent directly. Same
// URL-state filter pattern as /projects (design language §03: results stay
// server-rendered, bookmarkable, shareable — not client state).
export const dynamic = "force-dynamic";

export default async function DevelopersPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string; rateMin?: string; rateMax?: string; availability?: string }>;
}) {
  const { skill, rateMin, rateMax, availability } = await searchParams;

  const conditions = [];

  if (skill?.trim()) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(developerSkills)
          .innerJoin(skills, eq(developerSkills.skillId, skills.id))
          .where(and(eq(developerSkills.developerProfileId, developerProfiles.id), eq(skills.name, skill.trim().toLowerCase())))
      )
    );
  }
  const min = rateMin ? Number(rateMin) : undefined;
  if (min !== undefined && !Number.isNaN(min)) {
    conditions.push(gte(developerProfiles.hourlyRate, min.toString()));
  }
  const max = rateMax ? Number(rateMax) : undefined;
  if (max !== undefined && !Number.isNaN(max)) {
    conditions.push(lte(developerProfiles.hourlyRate, max.toString()));
  }
  if (availability) {
    conditions.push(eq(developerProfiles.availability, availability as "available" | "limited" | "unavailable"));
  }

  const rows = await db
    .select({ profile: developerProfiles, user: users })
    .from(developerProfiles)
    .innerJoin(users, eq(developerProfiles.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(developerProfiles.createdAt))
    .limit(20);

  const allSkills = await db.select({ name: skills.name }).from(skills).orderBy(skills.name);

  const { userId: authProviderId } = await auth();
  const currentUser = authProviderId ? await ensureCurrentUser() : null;

  const developers = await Promise.all(
    rows.map(async ({ profile, user }) => {
      const { name, imageUrl } = await getClerkDisplay(user.authProviderId);
      const trust = await getTrustSignal(user.id);
      const devSkills = await db
        .select({ name: skills.name })
        .from(developerSkills)
        .innerJoin(skills, eq(developerSkills.skillId, skills.id))
        .where(eq(developerSkills.developerProfileId, profile.id))
        .limit(5);
      const favorited =
        currentUser && currentUser.id !== profile.userId
          ? await isFavorited(currentUser.id, "developer_profile", profile.id)
          : false;
      return {
        profile,
        name: name ?? user.email,
        imageUrl,
        trust,
        skillNames: devSkills.map((s) => s.name),
        favorited,
        canFavorite: !!currentUser && currentUser.id !== profile.userId,
      };
    })
  );

  const hasFilters = skill || rateMin || rateMax || availability;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="mb-6 text-h1">Browse Developers</h1>

      <form className="mb-8 space-y-3 rounded-card border border-neutral-200 bg-white p-4 shadow-card" action="/developers">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <select name="skill" defaultValue={skill ?? ""} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">Any skill</option>
            {allSkills.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            name="availability"
            defaultValue={availability ?? ""}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Any availability</option>
            <option value="available">Available</option>
            <option value="limited">Limited</option>
            <option value="unavailable">Unavailable</option>
          </select>
          <input
            name="rateMin"
            type="number"
            min={0}
            defaultValue={rateMin ?? ""}
            placeholder="Min rate ($/hr)"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            name="rateMax"
            type="number"
            min={0}
            defaultValue={rateMax ?? ""}
            placeholder="Max rate ($/hr)"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-card bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Search
          </button>
          {hasFilters && (
            <Link href="/developers" className="text-sm text-neutral-500 underline">
              Clear filters
            </Link>
          )}
        </div>
      </form>

      {developers.length === 0 ? (
        <p className="text-neutral-500">
          {hasFilters ? "No developers match those filters." : "No developer profiles yet."}
        </p>
      ) : (
        <ul className="space-y-4">
          {developers.map(({ profile, name, imageUrl, trust, skillNames, favorited, canFavorite }) => (
            <li key={profile.id}>
              {/* FavoriteButton is a sibling of the Link, not nested inside
                  it — a <button> inside an <a> would fire both the toggle
                  and the navigation on click. */}
              <Card className="flex items-start gap-2 hover:border-brand-600 hover:shadow-popover">
                <Link href={`/developers/${profile.id}`} className="flex min-w-0 flex-1 items-start gap-4">
                  <Avatar name={name} imageUrl={imageUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-neutral-900">{name}</span>
                      {trust.badge === "rated" ? (
                        <span className="shrink-0 text-xs text-[#FCD34D]">
                          ★ {trust.average.toFixed(1)} ({trust.reviewCount})
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-neutral-400">New to Devworld</span>
                      )}
                    </div>
                    {profile.headline && <p className="text-sm text-neutral-600">{profile.headline}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      {profile.hourlyRate && <span>${profile.hourlyRate}/hr</span>}
                      <span className="capitalize">{profile.availability}</span>
                      {skillNames.map((s) => (
                        <span key={s} className="rounded-card border border-neutral-300 px-2 py-0.5 font-medium text-neutral-600">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
                {canFavorite && (
                  <FavoriteButton
                    targetType="developer_profile"
                    targetId={profile.id}
                    path="/developers"
                    initialFavorited={favorited}
                  />
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
