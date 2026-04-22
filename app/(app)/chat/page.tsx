import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ChatPage() {
  const user = await getOrCreateUser();

  // New user who hasn't finished onboarding and signed in via OAuth (skipping
  // the sign-up flow) — send them back to the import wizard.
  if (user && !user.onboardingComplete) {
    const ageMs = Date.now() - new Date(user.createdAt).getTime();
    if (ageMs < 24 * 60 * 60 * 1000) {
      redirect("/onboarding");
    }
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full text-[#888]">Loading...</div>}>
      <ChatInterface />
    </Suspense>
  );
}
