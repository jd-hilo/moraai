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

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
