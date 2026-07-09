import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CopyEndpoint } from "@/components/connect/copy-endpoint";
import { ScrollReveal } from "@/components/connect/scroll-reveal";

const MCP_ENDPOINT = "https://www.mymora.app/mcp";

export const metadata: Metadata = {
  title: "Mora for Claude",
  description:
    "Connect Mora to Claude and bring your private AI twin into every conversation.",
};

const PRINCIPLES = [
  [
    "Mora remembers",
    "Your people, preferences, goals, and patterns live in a private memory you can inspect.",
  ],
  [
    "Claude reasons",
    "Claude stays the place you think and write. Mora supplies the context when it matters.",
  ],
  [
    "You decide",
    "Connect once, approve access, and keep control of what becomes memory.",
  ],
];

function HeroVisual() {
  return (
    <div className="relative min-h-[420px] md:min-h-[540px]" aria-label="Mora memory connected to Claude">
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#17171a]/8 md:h-[32rem] md:w-[32rem]"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[16rem] w-[16rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#17171a]/8 md:h-[22rem] md:w-[22rem]"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-px w-[72%] -translate-x-1/2 bg-[linear-gradient(90deg,rgba(23,23,26,0),rgba(143,133,223,0.34),rgba(23,23,26,0))]"
      />

      <div className="absolute left-[13%] top-[45%] -translate-y-1/2 md:left-[18%]">
        <div className="relative h-36 w-36 rounded-full bg-[radial-gradient(circle_at_38%_35%,#ffc6e1_0%,#efb6ef_25%,#c6a6f0_55%,#8f85df_82%,#6f6bc9_100%)] shadow-[0_26px_80px_-38px_rgba(103,83,185,0.72),inset_12px_12px_30px_rgba(255,230,242,0.44)] md:h-48 md:w-48">
          <span className="absolute -right-3 top-6 h-5 w-5 rounded-full bg-[radial-gradient(circle_at_38%_35%,#f8fafc_0%,#e2e8f0_45%,#a1a1aa_100%)] shadow-[0_8px_20px_-12px_rgba(23,23,26,0.55)]" />
          <span className="absolute bottom-8 left-0 h-4 w-4 rounded-full bg-[radial-gradient(circle_at_38%_35%,#fff1f5_0%,#fbcfe8_42%,#db2777_100%)] shadow-[0_8px_20px_-12px_rgba(23,23,26,0.55)]" />
          <span className="absolute bottom-1 right-8 h-3.5 w-3.5 rounded-full bg-[radial-gradient(circle_at_38%_35%,#ecfdf5_0%,#a7f3d0_42%,#10b981_100%)] shadow-[0_8px_20px_-12px_rgba(23,23,26,0.55)]" />
        </div>
        <p className="mt-5 text-center text-sm font-semibold text-[#42414a]">
          Mora memory
        </p>
      </div>

      <div className="absolute right-[12%] top-[52%] -translate-y-1/2 md:right-[18%]">
        <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-[#17171a]/10 bg-white shadow-[0_24px_70px_-42px_rgba(87,61,52,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] md:h-36 md:w-36 md:rounded-[2.4rem]">
          <Image
            src="/claude-mark.png"
            alt="Claude"
            width={600}
            height={600}
            className="h-16 w-16 object-contain md:h-20 md:w-20"
          />
        </div>
        <p className="mt-5 text-center text-sm font-semibold text-[#42414a]">
          Claude
        </p>
      </div>

      <div className="absolute bottom-4 left-1/2 w-[min(28rem,calc(100vw-3rem))] -translate-x-1/2 rounded-full border border-[#17171a]/10 bg-white/72 px-5 py-3 text-center text-sm text-[#6f6d79] shadow-[0_20px_55px_-46px_rgba(23,23,26,0.38),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur">
        Your AI twin, available inside Claude.
      </div>
    </div>
  );
}

export default function ClaudeLandingPage() {
  return (
    <main className="min-h-[100dvh] overflow-x-clip bg-[#fafaf8] text-[#0d0d0d]">
      <style>{`
        html {
          scroll-behavior: smooth;
        }

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
        }
      `}</style>
      <header className="px-5 py-5 md:px-10">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
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
          <nav className="flex items-center gap-2">
            <Link
              href="/connect/claude"
              className="hidden rounded-full border border-[#17171a]/10 bg-white px-4 py-2 text-sm font-semibold text-[#35343b] transition duration-300 hover:border-[#8f85df]/30 hover:text-[#6f6bc9] active:scale-[0.98] sm:inline-flex"
            >
              Setup
            </Link>
            <Link
              href="/sign-up?source=claude"
              className="rounded-full bg-[#17171a] px-5 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#303036] active:scale-[0.98]"
            >
              Try Mora
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative px-5 pb-20 pt-14 md:px-10 md:pb-28 md:pt-18">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-20rem] h-[48rem] w-[78rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(239,182,239,0.32)_0%,rgba(198,166,240,0.2)_40%,rgba(250,250,248,0)_72%)] blur-2xl"
        />
        <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="max-w-2xl pt-2 md:pt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b73cf]">
              MCP connector for Claude
            </p>
            <h1 className="mt-7 font-[Recoleta] text-5xl font-normal leading-[0.98] tracking-[-0.04em] md:text-7xl">
              Give Claude
              <br />
              your AI twin.
            </h1>
            <p className="mt-7 max-w-[54ch] text-base leading-relaxed text-[#5f5d70] md:text-lg">
              Mora is a private memory of who you are. Connect it to Claude so
              every conversation can start with the context you already built.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#setup-copy"
                className="rounded-full bg-[#17171a] px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#303036] active:scale-[0.98]"
              >
                Add to Claude
              </a>
              <Link
                href="/sign-up?source=claude"
                className="rounded-full border border-[#17171a]/12 bg-white px-6 py-3 text-sm font-semibold text-[#242329] transition duration-300 hover:border-[#8f85df]/30 hover:text-[#6f6bc9] active:scale-[0.98]"
              >
                Build your memory
              </Link>
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      <section className="border-y border-[#17171a]/10 bg-white">
        <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-14 px-5 py-20 md:px-10 lg:grid-cols-[0.78fr_1.22fr] lg:py-24">
          <ScrollReveal>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7b73cf]">
                How it works
              </p>
              <h2 className="mt-5 max-w-xl font-[Recoleta] text-3xl font-normal leading-[1.04] tracking-[-0.035em] md:text-5xl">
                Mora remembers. Claude thinks with it.
              </h2>
            </div>
          </ScrollReveal>

          <div className="divide-y divide-[#17171a]/10 border-y border-[#17171a]/10">
            {PRINCIPLES.map(([title, body], index) => (
              <ScrollReveal key={title} delay={index * 80}>
                <article className="grid gap-3 py-8 md:grid-cols-[0.55fr_1fr] md:gap-8">
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#242329]">
                    {title}
                  </h3>
                  <p className="max-w-[58ch] text-sm leading-relaxed text-[#777485] md:text-base">
                    {body}
                  </p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="setup" className="relative scroll-mt-0 bg-white">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-24 -translate-y-full bg-[linear-gradient(180deg,rgba(255,255,255,0),#ffffff)]"
        />
        <div className="mx-auto max-w-[1400px] px-5 py-20 md:px-10 lg:py-28">
          <ScrollReveal>
            <div id="setup-copy" className="mx-auto max-w-2xl scroll-mt-10 text-center">
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
                        {MCP_ENDPOINT}
                      </code>
                      <CopyEndpoint endpoint={MCP_ENDPOINT} compact />
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
                    Sign in, review the access request, and approve the
                    connection.
                  </p>
                </div>
              </article>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#17171a]/10 bg-white px-5 py-8 text-sm text-[#8b8999] md:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Mora for Claude</span>
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
