import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureCurrentUser } from "@/modules/auth/user";
import { chooseDeveloper, chooseHiring } from "@/modules/profiles/actions";
import { Button } from "@/modules/ui/Button";

export default async function OnboardingPage() {
  const { userId: authProviderId } = await auth();
  if (!authProviderId) redirect("/sign-in");

  const user = await ensureCurrentUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-neutral-600">
          Setting up your account — refresh in a moment.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Welcome to Devworld
      </h1>
      <p className="text-neutral-600">
        Are you looking to hire, or looking for work? You can always add the
        other later.
      </p>
      <div className="flex gap-4">
        <form action={chooseHiring}>
          <Button type="submit">I&rsquo;m hiring</Button>
        </form>
        <form action={chooseDeveloper}>
          <Button type="submit" variant="secondary">
            I&rsquo;m looking for work
          </Button>
        </form>
      </div>
    </main>
  );
}
