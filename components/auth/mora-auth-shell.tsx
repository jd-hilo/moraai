import Image from "next/image";
import Link from "next/link";
import { SignIn, SignUp } from "@clerk/nextjs";

type AuthMode = "sign-in" | "sign-up";

const clerkAppearance = {
  variables: {
    colorPrimary: "#17171a",
    colorText: "#242329",
    colorTextSecondary: "#6e6c78",
    colorBackground: "#ffffff",
    borderRadius: "1rem",
    fontFamily: "DM Sans, ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    card: "w-full border border-[#17171a]/10 bg-white shadow-[0_24px_70px_-45px_rgba(43,37,67,0.35)]",
    headerTitle: "text-[#242329]",
    headerSubtitle: "text-[#6e6c78]",
    socialButtonsBlockButton: "border-[#17171a]/12 text-[#242329] hover:bg-[#f7f7f6]",
    formButtonPrimary: "bg-[#17171a] hover:bg-[#303036] shadow-none",
    footerActionLink: "text-[#6f6bc9] hover:text-[#4e4a9d]",
  },
};

export function MoraAuthShell({ mode, source }: { mode: AuthMode; source?: string }) {
  const fromClaude = source === "claude";
  const isSignIn = mode === "sign-in";
  const redirectUrl = fromClaude
    ? "/connect/claude?step=install"
    : isSignIn
      ? "/chat"
      : "/onboarding";
  const oppositeUrl = `${isSignIn ? "/sign-up" : "/sign-in"}${fromClaude ? "?source=claude" : ""}`;

  return (
    <main className="relative grid min-h-[100dvh] overflow-hidden bg-[#fafaf8] text-[#242329] lg:grid-cols-[minmax(0,0.95fr)_minmax(440px,0.8fr)]">
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-10rem] top-[-8rem] h-[34rem] w-[34rem] rounded-full bg-[#efb6ef]/30 blur-3xl"
      />
      <section className="relative flex flex-col px-6 pb-12 pt-7 sm:px-10 lg:px-16 lg:py-12">
        <Link href={fromClaude ? "/connect/claude" : "/"} className="inline-flex w-fit items-center" aria-label="Mora home">
          <Image src="/mora-logo.png" alt="Mora" width={122} height={40} className="h-8 w-auto" priority />
        </Link>

        <div className="my-auto max-w-xl py-16 lg:py-0">
          {fromClaude && (
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#8f85df]/20 bg-white/75 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6f6bc9]">
              <Image src="/claude-mark.png" alt="" width={20} height={20} className="h-4 w-4 object-contain" />
              Mora for Claude
            </div>
          )}
          <p className="text-sm font-medium text-[#6f6bc9]">{isSignIn ? "Welcome back" : "Your context, on your terms"}</p>
          <h1 className="mt-4 max-w-[12ch] font-[Recoleta] text-4xl leading-[0.98] tracking-[-0.045em] sm:text-5xl">
            {fromClaude
              ? isSignIn
                ? "Continue to Claude with your context."
                : "Give Claude context worth carrying forward."
              : isSignIn
                ? "Pick up where your thinking left off."
                : "Make your next conversation more personal."}
          </h1>
          <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-[#706e78]">
            {fromClaude
              ? "Create or access your Mora account, add the connector, then approve a single in-conversation enrollment from the Claude context you choose to share."
              : "Mora keeps the decisions, preferences, and patterns that make each conversation more useful—without turning your history into an opaque black box."}
          </p>

          <div className="mt-10 border-t border-[#17171a]/10 pt-6 text-sm text-[#706e78]">
            <p className="font-semibold text-[#242329]">{fromClaude ? "What happens next" : "Built for continuity"}</p>
            <p className="mt-2 leading-relaxed">
              {fromClaude
                ? "You’ll return to the connector instructions after authentication—no detour through the general app onboarding."
                : "Review and control what becomes part of your Mora memory."}
            </p>
          </div>
        </div>
      </section>

      <section className="relative flex items-center justify-center border-t border-[#17171a]/8 bg-white/70 px-5 py-10 backdrop-blur-sm sm:px-10 lg:border-l lg:border-t-0 lg:px-14">
        <div className="w-full max-w-[420px]">
          <p className="mb-5 text-sm text-[#706e78]">
            {isSignIn ? "New to Mora?" : "Already have an account?"}{" "}
            <Link href={oppositeUrl} className="font-semibold text-[#6f6bc9] hover:text-[#4e4a9d]">
              {isSignIn ? "Create one" : "Sign in"}
            </Link>
          </p>
          {isSignIn ? (
            <SignIn
              appearance={clerkAppearance}
              forceRedirectUrl={redirectUrl}
              signUpUrl={oppositeUrl}
            />
          ) : (
            <SignUp
              appearance={clerkAppearance}
              forceRedirectUrl={redirectUrl}
              signInUrl={oppositeUrl}
            />
          )}
        </div>
      </section>
    </main>
  );
}
