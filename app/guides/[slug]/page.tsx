import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuideBySlug } from "@/modules/guides/content";

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/guides" className="mb-6 inline-block font-mono text-sm text-brand-600 underline">
        ← guides
      </Link>
      <h1 className="mb-2 text-h1">{guide.title}</h1>
      <p className="mb-8 text-neutral-500">{guide.summary}</p>
      <div className="space-y-4 text-neutral-700">
        {guide.body.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </main>
  );
}
