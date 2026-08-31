import { createClient } from "@supabase/supabase-js";

// Server-only: the service role key bypasses RLS, so this must never be
// imported from client code. Reuses the same Supabase project as the
// database (Settings -> API in the Supabase dashboard) if you're on
// Supabase for Postgres; point it at a separate project otherwise.
const ATTACHMENTS_BUCKET = "project-attachments";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — see .env.example."
    );
  }
  return createClient(url, serviceRoleKey);
}

let bucketEnsured = false;

async function ensureBucket() {
  if (bucketEnsured) return;
  const supabase = getSupabaseAdmin();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === ATTACHMENTS_BUCKET)) {
    await supabase.storage.createBucket(ATTACHMENTS_BUCKET, { public: true });
  }
  bucketEnsured = true;
}

// Uploads one file and returns its public URL + original filename, ready to
// insert into `project_attachments`.
export async function uploadProjectAttachment(file: File, projectId: string) {
  await ensureBucket();
  const supabase = getSupabaseAdmin();

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${projectId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw new Error(`Attachment upload failed: ${error.message}`);

  const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path);
  return { fileUrl: data.publicUrl, filename: file.name };
}
