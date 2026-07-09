import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MoraAuthShell } from "@/components/auth/mora-auth-shell";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  const { userId } = await auth();
  if (userId) redirect(source === "claude" ? "/connect/claude?step=install" : "/chat");
  return <MoraAuthShell mode="sign-in" source={source} />;
}
