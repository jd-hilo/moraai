import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { ImportWizard } from "@/components/onboarding/import-wizard";

export default async function OnboardingPage() {
  const { userId } = await auth();

  // Not signed in → go sign up
  if (!userId) {
    redirect("/sign-up");
  }

  const user = await getOrCreateUser();

  // Already completed onboarding → chat
  if (user?.onboardingComplete) {
    redirect("/chat");
  }

  // Account older than 10 minutes and still not complete → they abandoned it,
  // just send them to chat rather than forcing them back through onboarding.
  if (user?.createdAt) {
    const ageMs = Date.now() - new Date(user.createdAt).getTime();
    if (ageMs > 10 * 60 * 1000) {
      redirect("/chat");
    }
  }

  return <ImportWizard />;
}
