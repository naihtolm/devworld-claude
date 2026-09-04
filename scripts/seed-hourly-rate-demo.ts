// Demo data for the /trends page (modules/marketplace/rateTrends.ts), which
// averages proposals.proposedAmount for hourly proposals by category and
// month. Unlike scripts/seed-skills.ts (reference/lookup data), everything
// this script inserts is fabricated — every row it touches is tagged so it's
// easy to find and delete later (see scripts/delete-hourly-rate-demo.ts):
//   - users.email ends in "@devworld.seed"
//   - projects.title is prefixed "[Seed]"
// Idempotent-ish: users/profiles use onConflictDoNothing on their unique
// keys; proposals are skipped (not overwritten) if a matching one already
// exists for that developer/project pair, same as the real submitProposal
// action does when it hits the unique index.
import { config } from "dotenv";
config({ path: ".env.local" });

const CATEGORIES: { name: string; baseRate: number; spread: number; monthlyDrift: number }[] = [
  { name: "AI / ML", baseRate: 85, spread: 15, monthlyDrift: 1.5 },
  { name: "Web Development", baseRate: 55, spread: 10, monthlyDrift: 0.5 },
  { name: "Design", baseRate: 50, spread: 10, monthlyDrift: 0.3 },
  { name: "Cloud / DevOps", baseRate: 75, spread: 12, monthlyDrift: 1 },
];

const MONTHS_BACK = 6;
const PROPOSALS_PER_CATEGORY_PER_MONTH = 3;

function monthStarts(monthsBack: number): Date[] {
  const now = new Date();
  const months: Date[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    months.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)));
  }
  return months;
}

function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

async function main() {
  // Deferred import — see scripts/seed-skills.ts for why (avoids db/index.ts
  // reading DATABASE_URL before dotenv's config() above has run).
  const { db } = await import("../db");
  const { users, developerProfiles, projects, proposals } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");

  await db.insert(users).values({ email: "demo.client.trends@devworld.seed" }).onConflictDoNothing();
  const [clientUser] = await db.select().from(users).where(eq(users.email, "demo.client.trends@devworld.seed"));

  const developerProfileIds: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const email = `demo.dev.trends.${i}@devworld.seed`;
    await db.insert(users).values({ email }).onConflictDoNothing();
    const [devUser] = await db.select().from(users).where(eq(users.email, email));
    await db
      .insert(developerProfiles)
      .values({ userId: devUser.id, headline: "Demo developer (trends seed data)", availability: "available" })
      .onConflictDoNothing();
    const [profile] = await db.select().from(developerProfiles).where(eq(developerProfiles.userId, devUser.id));
    developerProfileIds.push(profile.id);
  }

  const months = monthStarts(MONTHS_BACK);
  let projectsCreated = 0;
  let proposalsCreated = 0;

  for (const category of CATEGORIES) {
    for (let mi = 0; mi < months.length; mi++) {
      const monthStart = months[mi];

      const [project] = await db
        .insert(projects)
        .values({
          clientUserId: clientUser.id,
          title: `[Seed] ${category.name} hourly work — ${monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}`,
          description: "Fabricated demo project — see scripts/seed-hourly-rate-demo.ts. Powers the /trends chart with sample data.",
          category: category.name,
          budgetType: "hourly",
          status: "published",
          visibility: "public",
        })
        .returning();
      projectsCreated++;

      for (let p = 0; p < PROPOSALS_PER_CATEGORY_PER_MONTH; p++) {
        const developerProfileId = developerProfileIds[(mi + p) % developerProfileIds.length];
        const drift = category.monthlyDrift * mi;
        const rate = Math.round(category.baseRate + drift + randomInt(-category.spread, category.spread));
        const createdAt = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), randomInt(2, 27)));

        try {
          await db.insert(proposals).values({
            projectId: project.id,
            developerProfileId,
            introduction: "Demo proposal (trends seed data).",
            proposedAmount: rate.toString(),
            proposedRateType: "hourly",
            estimatedTimelineDays: randomInt(14, 60),
            status: "submitted",
            createdAt,
            updatedAt: createdAt,
          });
          proposalsCreated++;
        } catch {
          // Unique (projectId, developerProfileId) — this exact pairing
          // already has a proposal from a previous run; skip it.
        }
      }
    }
  }

  console.log(`Seeded ${projectsCreated} demo projects and ${proposalsCreated} demo hourly proposals.`);
  console.log("All tagged: users.email LIKE '%@devworld.seed', projects.title LIKE '[Seed]%' — run `npm run db:unseed-trends` to remove.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
