import { clerkClient } from "@clerk/nextjs/server";

export type ClerkDisplay = { name: string | null; imageUrl: string | null };

// Shared lookup for showing a person's name + avatar from their Clerk id —
// was duplicated ad hoc across proposals/agreements/messages/profiles pages
// as name-only; centralized here now that avatars need the same call.
export async function getClerkDisplay(authProviderId: string | null | undefined): Promise<ClerkDisplay> {
  if (!authProviderId) return { name: null, imageUrl: null };
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(authProviderId);
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
    return { name, imageUrl: clerkUser.imageUrl || null };
  } catch {
    return { name: null, imageUrl: null };
  }
}
