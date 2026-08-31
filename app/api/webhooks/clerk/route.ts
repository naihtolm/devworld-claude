import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { deleteUserByAuthProviderId, upsertUserFromClerk } from "@/modules/auth/user";

// Clerk sends user.created/updated/deleted events here. This is the only
// place `users` rows get created — see modules/auth/README.md build order.
export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("CLERK_WEBHOOK_SECRET is not set.");
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();

  let event: WebhookEvent;
  try {
    event = new Webhook(webhookSecret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "user.created": {
      const email = event.data.email_addresses[0]?.email_address;
      if (email) {
        await upsertUserFromClerk(event.data.id, email);
      }
      break;
    }
    case "user.deleted": {
      if (event.data.id) {
        await deleteUserByAuthProviderId(event.data.id);
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
