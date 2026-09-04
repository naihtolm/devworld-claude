// Removes everything scripts/seed-hourly-rate-demo.ts inserted. Deletes by
// the same tags that script used (users.email LIKE '%@devworld.seed',
// projects.title LIKE '[Seed]%'), cascading through proposals/projectSkills
// via each table's onDelete: "cascade" — so deleting the demo users and
// projects is enough to clean up their proposals too.
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("../db");
  const { users, projects } = await import("../db/schema");
  const { like } = await import("drizzle-orm");

  const deletedProjects = await db.delete(projects).where(like(projects.title, "[Seed]%")).returning({ id: projects.id });
  const deletedUsers = await db.delete(users).where(like(users.email, "%@devworld.seed")).returning({ id: users.id });

  console.log(`Deleted ${deletedProjects.length} demo projects and ${deletedUsers.length} demo users (proposals/profiles cascaded).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
