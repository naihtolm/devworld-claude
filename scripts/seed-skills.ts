// One-time reference-data seed, run by hand (`npm run db:seed-skills`) —
// not wired into the Vercel build. The `skills` table (db/schema.ts) is
// normally populated organically, one row at a time, whenever a developer
// adds a skill to their profile or a client tags a project (see
// modules/marketplace/actions.ts's resolveSkillIds). That leaves it
// empty for the very first users, so search/autocomplete has nothing to
// suggest. This is the same onConflictDoNothing() upsert pattern as that
// organic path — idempotent, safe to re-run, and it's reference/lookup
// data (the same category as modules/marketplace/categories.ts's
// CATEGORIES list), not fabricated user data.
import { config } from "dotenv";
config({ path: ".env.local" });

const SKILLS: { name: string; category: string }[] = [
  // language
  ...[
    "JavaScript", "TypeScript", "Python", "Go", "Rust", "Java", "C#", "C++",
    "Ruby", "PHP", "Swift", "Kotlin", "SQL",
  ].map((name) => ({ name: name.toLowerCase(), category: "language" })),

  // framework
  ...[
    "React", "Next.js", "Vue", "Nuxt", "Angular", "Svelte", "Django", "Flask",
    "Ruby on Rails", "Spring Boot", "Express", "NestJS", "Laravel",
    "Flutter", "React Native", ".NET",
  ].map((name) => ({ name: name.toLowerCase(), category: "framework" })),

  // tool
  ...[
    "Docker", "Kubernetes", "Terraform", "AWS", "Google Cloud", "Azure",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Figma", "Git", "GraphQL",
    "REST APIs", "CI/CD", "Stripe API",
  ].map((name) => ({ name: name.toLowerCase(), category: "tool" })),

  // specialization
  ...[
    "Machine Learning", "Data Engineering", "DevOps", "UI/UX Design",
    "QA / Testing", "Mobile Development", "Cloud Architecture",
    "Cybersecurity", "Blockchain", "Technical Writing", "SEO",
    "Product Management", "Site Reliability Engineering", "Accessibility",
  ].map((name) => ({ name: name.toLowerCase(), category: "specialization" })),
];

async function main() {
  // Deferred, not a static top-level import — static imports are hoisted
  // above this file's config() call (ESM/CJS both hoist imports to the
  // top regardless of source order), which meant db/index.ts's
  // DATABASE_URL check ran before .env.local had been loaded. Requiring
  // it here, after config() has already run, avoids that.
  const { db } = await import("../db");
  const { skills } = await import("../db/schema");

  await db.insert(skills).values(SKILLS).onConflictDoNothing();
  console.log(`Seeded up to ${SKILLS.length} skills (existing names were skipped).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
