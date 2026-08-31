import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public by default (marketplace browsing is public per the blueprint —
// only messaging, proposals, and account actions require auth).
// Add protected routes here as those flows get built, e.g.:
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/messages(.*)",
  "/proposals(.*)",
  "/projects/new(.*)",
  "/projects/:id/proposals(.*)",
  "/agreements(.*)",
  "/profile(.*)",
  "/admin(.*)",
  "/invitations(.*)",
  "/companies/new(.*)",
  "/companies/:id/edit(.*)",
  "/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
