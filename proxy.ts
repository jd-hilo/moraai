import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/chat(.*)",
  "/memory(.*)",
  "/settings(.*)",
  "/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Public connector discovery and setup routes authenticate independently
    // (or are intentionally public), so they must not trigger Clerk's browser
    // session handshake.
    "/((?!_next|connect/claude(?:/|$)|\\.well-known(?:/|$)|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
