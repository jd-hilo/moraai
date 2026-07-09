import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CopyEndpoint } from "@/components/connect/copy-endpoint";
import { ScrollReveal } from "@/components/connect/scroll-reveal";
import { ScrollToSetup } from "@/components/connect/scroll-to-setup";

const PRODUCTION_MCP_ENDPOINT = "https://www.mymora.app/mcp";

export const metadata: Metadata = {
  title: "Mora for Claude — Add the MCP connector",
  description:
    "Connect Mora to Claude in a few minutes and bring your private memory into the conversations you already use.",
};

export default function ConnectClaudePage() {
  const endpoint = PRODUCTION_MCP_ENDPOINT;
  const accountHref = "/sign-up?source=claude";

  return (
    <main className="min-h-[100dvh] overflow-x-clip bg-[#fafaf8] text-[#0d0d0d]">
      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-6 md:px-10">
        <Link href="/" className="inline-flex items-center" aria-label="Mora home">
          <Image
            src="/mora-logo.png"
            alt="Mora"
            width={110}
            height={36}
            className="h-8 w-auto"
            priority
          />
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-[#8f85df]/20 bg-white/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6f6bc9] sm:inline-flex">
            MCP connector
          </span>
          <Link
            href={accountHref}
            className="rounded-full bg-[#17171a] px-5 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#303036] active:scale-[0.98]"
          >
            Create account
          </Link>
        </div>
      </header>

      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-14rem] h-[42rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(239,182,239,0.38)_0%,rgba(198,166,240,0.25)_38%,rgba(250,250,248,0)_72%)] blur-2xl"
        />
        <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-14 px-5 pb-20 pt-12 md:px-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-20 lg:pb-28 lg:pt-20">
          <div className="max-w-2xl">
            <h1 className="font-[Recoleta] text-4xl font-normal leading-[0.98] tracking-[-0.045em] md:text-6xl">
              Bring your memory
              <br />
              into Claude.
            </h1>
            <p className="mt-8 max-w-[58ch] text-base leading-relaxed text-[#656477] md:text-lg">
              Add Mora as a custom MCP connector, then let Claude enroll the
              personal context you choose to carry forward—right in the
              conversation you are having.
            </p>
            <p className="mt-4 max-w-[58ch] text-sm leading-relaxed text-[#7b7a8b]">
              Claude remains the model doing the reasoning. Mora securely
              retrieves relevant context and saves only the memories you approve.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <ScrollToSetup />
              <span className="text-sm text-[#7b7a8b]">
                About two minutes to set up
              </span>
            </div>
          </div>

          <div
            className="relative min-h-[500px] lg:min-h-[600px]"
            aria-label="Claude connected to Mora memory"
          >
            <div className="absolute inset-0 rounded-[2.5rem] border border-white/80 bg-white/45 shadow-[0_30px_90px_-55px_rgba(91,76,150,0.38),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl" />
            <div className="absolute left-[8%] top-[12%] rounded-full border border-[#8f85df]/20 bg-white/80 px-4 py-2 text-xs font-semibold text-[#656477] shadow-[0_18px_42px_-28px_rgba(87,73,168,0.52)]">
              Values
            </div>
            <div className="absolute right-[7%] top-[24%] rounded-full border border-[#8f85df]/20 bg-white/80 px-4 py-2 text-xs font-semibold text-[#656477] shadow-[0_18px_42px_-28px_rgba(87,73,168,0.52)]">
              Decisions
            </div>
            <div className="absolute bottom-[16%] left-[10%] rounded-full border border-[#8f85df]/20 bg-white/80 px-4 py-2 text-xs font-semibold text-[#656477] shadow-[0_18px_42px_-28px_rgba(87,73,168,0.52)]">
              Patterns
            </div>
            <div className="absolute left-1/2 top-[43%] flex -translate-x-1/2 -translate-y-1/2 items-center">
              <div className="relative h-36 w-36 rounded-full bg-[radial-gradient(circle_at_38%_35%,#ffc6e1_0%,#efb6ef_25%,#c6a6f0_55%,#8f85df_82%,#6f6bc9_100%)] shadow-[0_28px_70px_-30px_rgba(103,83,185,0.7),inset_10px_10px_28px_rgba(255,230,242,0.42)] md:h-44 md:w-44">
                <div className="absolute -inset-6 rounded-full border border-[#8f85df]/15" />
                <div className="absolute -inset-12 rounded-full border border-[#8f85df]/10" />
              </div>
              <div className="mx-3 h-px w-12 bg-[linear-gradient(90deg,rgba(143,133,223,0.2),rgba(143,133,223,0.65))] md:w-20" />
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-[1.8rem] border border-[#da7756]/20 bg-white text-center shadow-[0_25px_55px_-30px_rgba(87,61,52,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] md:h-28 md:w-28">
                <Image
                  src="/claude-mark.png"
                  alt="Claude"
                  width={600}
                  height={600}
                  className="h-12 w-12 object-contain md:h-14 md:w-14"
                />
                <span className="mt-1 text-[0.65rem] font-semibold tracking-[-0.01em] text-[#514944]">
                  Claude
                </span>
              </div>
            </div>
            <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between border-t border-[#17171a]/10 pt-5 text-xs text-[#7b7a8b]">
              <span>Mora remembers</span>
              <span className="mx-4 h-px flex-1 bg-[#17171a]/10" />
              <span>Claude reasons</span>
            </div>
          </div>
        </div>
      </section>

      <section id="install" className="relative scroll-mt-0 bg-white">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-24 -translate-y-full bg-[linear-gradient(180deg,rgba(250,250,248,0),#ffffff)]"
        />
        <div className="mx-auto max-w-[1400px] px-5 py-20 md:px-10 lg:py-28">
          <ScrollReveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f6bc9]">
                Setup
              </p>
              <h2 className="mt-5 font-[Recoleta] text-3xl font-normal leading-[1.02] tracking-[-0.035em] md:text-5xl">
                Connect in three steps.
              </h2>
              <p className="mx-auto mt-5 max-w-[54ch] text-sm leading-relaxed text-[#7b7a8b] md:text-base">
                Add Mora once, approve the connection, and keep your context
                available whenever you talk with Claude.
              </p>
              <div className="mx-auto mt-8 inline-flex items-center gap-3 rounded-2xl border border-[#17171a]/10 bg-[#f8f8f7] p-2 pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#da7756]/15 bg-white">
                  <Image
                    src="/claude-mark.png"
                    alt=""
                    width={600}
                    height={600}
                    className="h-7 w-7 object-contain"
                  />
                </span>
                <span className="text-sm font-semibold text-[#242329]">
                  Claude connector
                </span>
              </div>
            </div>
          </ScrollReveal>

          <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-3 lg:gap-8">
            <ScrollReveal className="h-full" delay={0}>
              <article>
              <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-[2rem] border border-[#17171a]/8 bg-[#f7f7f6] p-6">
                <div className="w-full max-w-[340px] rounded-[1.4rem] border border-[#17171a]/10 bg-white p-5 shadow-[0_18px_45px_-35px_rgba(35,32,30,0.3)]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#242329]">
                      Connectors
                    </span>
                    <div className="flex items-center gap-3 text-[#8b8999]">
                      <span className="h-3 w-3 rounded-full border border-current" />
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f2f2f1] text-lg leading-none text-[#35343b]">
                        +
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-xs text-[#7b7a8b]">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 -translate-y-px rotate-45 border-b border-r border-current"
                    />
                    Web
                  </div>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-lg bg-[#f1f1f0]" />
                      <span className="h-2.5 w-28 rounded-full bg-[#f1f1f0]" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-lg bg-[#f1f1f0]" />
                      <span className="h-2.5 w-20 rounded-full bg-[#f1f1f0]" />
                    </div>
                  </div>
                  <div className="mt-6 border-t border-[#17171a]/10 pt-5 text-xs text-[#8b8999]">
                    Not connected
                  </div>
                </div>
                <div className="absolute right-8 top-[5.6rem] rounded-xl border border-[#17171a]/10 bg-white px-4 py-3 text-xs font-semibold text-[#35343b] shadow-[0_14px_30px_-20px_rgba(35,32,30,0.4)]">
                  +&nbsp;&nbsp; Add custom connector
                </div>
              </div>
              <div className="pt-7">
                <span className="font-mono text-xs text-[#9a98a5]">01</span>
                <h3 className="mt-4 font-[Recoleta] text-2xl font-normal tracking-[-0.03em]">
                  Open Claude.
                </h3>
                <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-[#7b7a8b]">
                  Go to Settings, choose Connectors, then select Add custom
                  connector.
                </p>
              </div>
              </article>
            </ScrollReveal>

            <ScrollReveal className="h-full" delay={100}>
              <article>
              <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-[#17171a]/8 bg-[#f7f7f6] p-6">
                <div className="w-full max-w-[390px] rounded-2xl border border-[#17171a]/10 bg-white p-3 shadow-[0_18px_45px_-35px_rgba(35,32,30,0.3)]">
                  <p className="px-2 pb-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#8b8999]">
                    Mora MCP URL
                  </p>
                  <div className="flex items-center gap-3 rounded-xl border border-[#17171a]/10 bg-[#fafafa] p-2 pl-3">
                    <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-[#514f59]">
                      {endpoint}
                    </code>
                    <CopyEndpoint endpoint={endpoint} compact />
                  </div>
                </div>
              </div>
              <div className="pt-7">
                <span className="font-mono text-xs text-[#9a98a5]">02</span>
                <h3 className="mt-4 font-[Recoleta] text-2xl font-normal tracking-[-0.03em]">
                  Add the Mora URL.
                </h3>
                <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-[#7b7a8b]">
                  Name the connector Mora, paste the URL, and choose Add.
                </p>
              </div>
              </article>
            </ScrollReveal>

            <ScrollReveal className="h-full" delay={200}>
              <article>
              <div className="flex min-h-[320px] items-center justify-center rounded-[2rem] border border-[#17171a]/8 bg-[#f7f7f6] p-6">
                <div className="w-full max-w-[310px] rounded-[1.4rem] border border-[#17171a]/10 bg-white p-6 text-center shadow-[0_20px_50px_-35px_rgba(35,32,30,0.35)]">
                  <div className="mx-auto flex w-fit items-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_38%_35%,#ffc6e1_0%,#c6a6f0_58%,#8f85df_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]" />
                    <span className="-ml-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white bg-white shadow-[0_10px_24px_-18px_rgba(87,61,52,0.5)]">
                      <Image
                        src="/claude-mark.png"
                        alt=""
                        width={600}
                        height={600}
                        className="h-8 w-8 object-contain"
                      />
                    </span>
                  </div>
                  <h4 className="mt-5 text-base font-semibold text-[#242329]">
                    Connect Mora to Claude
                  </h4>
                  <div className="mt-5 rounded-xl bg-[#17171a] px-4 py-3 text-sm font-semibold text-white">
                    Approve &amp; connect
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[#8b8999]">
                    Secure account authorization
                  </p>
                </div>
              </div>
              <div className="pt-7">
                <span className="font-mono text-xs text-[#9a98a5]">03</span>
                <h3 className="mt-4 font-[Recoleta] text-2xl font-normal tracking-[-0.03em]">
                  Sign in with Mora.
                </h3>
                <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-[#7b7a8b]">
                  Sign in, review the access request, and approve the connection.
                </p>
              </div>
              </article>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="bg-[#17171a] text-[#fafaf8]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-14 px-5 py-20 md:px-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20 lg:py-32">
          <ScrollReveal className="self-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b9afea]">
                After connecting
              </p>
              <h2 className="mt-5 max-w-lg font-[Recoleta] text-3xl font-normal leading-[1.05] tracking-[-0.035em] md:text-5xl">
                Mora becomes part of the conversation.
              </h2>
              <p className="mt-5 max-w-[46ch] text-sm leading-relaxed text-white/55">
                Claude keeps reasoning. Mora supplies the personal context at
                the moment it is useful.
              </p>
            </div>
          </ScrollReveal>
          <div className="divide-y divide-white/15 border-y border-white/15">
            {[
              [
                "01",
                "Recall what matters",
                "Claude retrieves only the memories relevant to the question—not an unrestricted copy of your vault.",
                "What do you remember about how I make big career decisions?",
              ],
              [
                "02",
                "Save with intent",
                "Add a new memory through an explicit tool action you approve. Your Claude transcript stays in Claude.",
                "Remember that I’m protecting Friday mornings for deep work.",
              ],
              [
                "03",
                "Run simulations",
                "Ask Claude to run a scenario and Mora returns the completed report right in the conversation.",
                "Simulate what happens if I take the remote role for three years.",
              ],
            ].map(([number, title, description, example], index) => (
              <ScrollReveal key={title} delay={index * 90}>
                <div className="py-8 md:py-10">
                  <div className="grid gap-3 md:grid-cols-[54px_0.7fr_1.3fr] md:gap-7">
                    <span className="font-mono text-xs text-[#b9afea]">
                      {number}
                    </span>
                    <h3 className="text-base font-semibold">{title}</h3>
                    <p className="text-sm leading-relaxed text-white/58">
                      {description}
                    </p>
                  </div>
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 font-mono text-xs leading-relaxed text-white/75 md:ml-[calc(54px+1.75rem)]">
                    “{example}”
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fafaf8]">
        <ScrollReveal>
          <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-5 py-20 md:px-10 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:py-28">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6f6bc9]">
              Start in Claude
              </p>
              <h2 className="mt-5 max-w-2xl font-[Recoleta] text-3xl font-normal leading-[1.05] tracking-[-0.035em] md:text-5xl">
                Create your Mora twin with one simple message.
              </h2>
              <p className="mt-5 max-w-[58ch] text-base leading-relaxed text-[#7b7a8b]">
                After you connect, ask Claude “How do I use Mora?” It will ask
                for permission to turn the context it can access into your
                Mora memory. You can also import history later.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/sign-up?source=claude"
                className="rounded-full bg-[#17171a] px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#303036] active:scale-[0.98]"
              >
                Create account
              </Link>
              <Link
                href="/onboarding?source=claude"
                className="rounded-full border border-[#17171a]/15 bg-white px-6 py-3 text-sm font-semibold text-[#242329] transition duration-300 hover:border-[#8f85df]/30 hover:text-[#6f6bc9] active:scale-[0.98]"
              >
                Import history instead
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <footer className="border-t border-[#17171a]/10 bg-[#fafaf8] px-5 py-8 text-sm text-[#8b8999] md:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Mora MCP connector</span>
          <Link
            href="/"
            className="font-semibold text-[#242329] transition-colors hover:text-[#6f6bc9]"
          >
            Back to Mora
          </Link>
        </div>
      </footer>
    </main>
  );
}
