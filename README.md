# Mora

> The AI that knows you.

Mora is a personal AI web app where users chat with an AI that has deep, persistent knowledge about their life. It reads from and writes to a personal knowledge vault — a directory of interlinked markdown files (Obsidian-compatible) — that grows with every conversation.

---

## Setup

### Prerequisites

- Node.js 22+
- PostgreSQL database
- AWS S3 bucket (or Cloudflare R2)
- Anthropic API key
- Clerk account

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local` and fill in your real values:

```bash
# Clerk — https://clerk.com/
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/mora

# AWS S3 (or R2 with custom endpoint)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=mora-vaults

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Set up the database

```bash
npx prisma migrate dev --name init
```

### 4. Configure Clerk webhooks

In your Clerk dashboard, add a webhook endpoint:
- URL: `https://your-domain/api/webhooks/clerk`
- Events: `user.created`

Set `CLERK_WEBHOOK_SIGNING_SECRET` to the endpoint signing secret from Clerk.
Webhook requests are rejected unless their signature is valid.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Remote MCP connector

Mora exposes an OAuth-protected Streamable HTTP MCP server at `/mcp`. It lets
Claude recall a user's relevant Mora memory, mirror the Claude memory snapshot
the host makes available, save explicitly approved memories, and create, run,
or read Mora simulations. Claude remains the conversational model. Direct MCP
recall and individual memory saving are provider-free; snapshot synchronization
uses Mora's existing memory-ingest pipeline only when the snapshot hash changes.

Before testing the connector:

1. Use a Clerk development instance and enable **OAuth applications → Dynamic client registration**.
2. Set `NEXT_PUBLIC_APP_URL` to the public origin of the deployment (for example, `https://staging.example.com`).
3. Configure the normal Mora database and Clerk environment variables. Provider
   keys are not required for MCP recall or memory saving, though Mora's existing
   web chat, imports, and simulations still use them.
4. Deploy to a publicly reachable HTTPS URL; local-only MCP endpoints cannot be reached by Claude.ai.
5. In Claude, open **Customize → Connectors → + → Add custom connector** and enter `https://your-origin.example/mcp`.

The canonical production connector URL is `https://www.mymora.app/mcp`.

When the MCP App HTML or resource metadata changes, treat Claude's installed
connector cache as part of the release:

1. Run `npm run build:mcp-apps` and keep the generated single-file artifact
   within the enforced raw, gzip, and embedded-asset budgets.
2. Verify the Vercel deployment is Ready before it receives the production
   alias, and keep the last connector-verified deployment available for rollback.
3. In the test Claude account, open **Customize → Connectors → Mora → More →
   Refresh tools list**. Claude may otherwise keep a stale interactive resource
   even while `/mcp` requests continue returning successfully.
4. In fresh conversations, run status/recall and at least two simulations. Each
   simulation must mount the Mora iframe without “Unable to reach Mora” or a
   content-display error.
5. Correlate the tests with Vercel runtime logs. `/mcp` should return only the
   expected 200/202 sequence, with no 4xx/5xx responses.

OAuth discovery is served from:

- `/.well-known/oauth-protected-resource/mcp`
- `/.well-known/oauth-authorization-server`

Use separate staging and production Clerk applications and databases. The
public setup experience is available at `/connect/claude`.

The beta connector exposes `get_mora_status`, `enroll_from_claude_memory`,
`sync_claude_memory`, `recall_twin`, `save_memory`, `life_coach`,
`list_simulations`, `get_simulation`, `create_simulation`, `simulate_future`,
and `run_simulation`. `life_coach` returns authenticated, query-relevant
memories and completed simulation evidence for Claude to reason over directly;
it does not make a second model call. A user can simply say “Use Mora as my
life coach” or “Give me advice.” Mora automatically returns a bounded
cross-domain overview without requiring the user to name memories or
simulations first.

Claude does not currently expose a memory-change webhook or an API that Mora
can poll. Users can explicitly request a Mora snapshot sync or configure an
approved recurring Claude Cowork task to push one snapshot through the
authenticated connector each night. Remote scheduled runs also require the
`Sync Claude memory to Mora` connector tool to be set to **Always allow** in
Claude; existing connector installs may need to refresh their tools list first.
Scheduled tasks are a Claude beta feature on paid plans, so the setup page also
supports pasting the same task into a normal Mora-enabled chat for a manual
end-to-end test. Ordinary Claude memory requests do not write to Mora. Identical
snapshots and exact memories are skipped idempotently.

---

## Architecture

### Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Auth | Clerk |
| Database | PostgreSQL via Prisma 7 |
| Vault storage | S3-compatible |
| LLM | Anthropic Claude (Sonnet + Haiku) |
| Graph | D3.js force-directed |

### How it works

1. **Import** — User uploads their ChatGPT or Claude export. The pipeline extracts entities, deduplicates them, and writes a structured markdown vault to S3.

2. **Chat** — Before each response, Mora routes to the relevant vault files, injects them into the system prompt, and streams a response from Claude. Mora actually knows the user.

3. **Memory update** — After each conversation, the vault is updated asynchronously with new entities and changed facts.

4. **Knowledge graph** — The `/memory` tab renders the vault as a D3 force-directed graph. Nodes are entities; edges are wiki-links.

5. **Export** — Users can export their vault as a zip (Obsidian-compatible) or JSON at any time.

### Key directories

```
app/
  (app)/          — Authenticated app shell (chat, memory, onboarding, settings)
  (auth)/         — Clerk sign-in/sign-up pages
  api/            — API routes
components/
  chat/           — Chat interface, message bubbles, input
  memory/         — D3 knowledge graph, node detail panel
  onboarding/     — Import wizard, processing screen
  sidebar/        — App sidebar with navigation
lib/
  vault/          — S3 storage, markdown parser, vault writer
  pipelines/      — Import, context routing, post-chat ingest
  prompts/        — Prompt templates for each pipeline
prisma/
  schema.prisma   — Database schema (User, Conversation, UserSettings)
```

---

## Deployment

Deploy to Vercel. Set all environment variables in the Vercel project settings.

Make sure to run `prisma migrate deploy` as part of your build or as a separate step before deploying.
