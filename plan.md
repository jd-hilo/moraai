# Claude-Native Mora MCP Refactor

## Summary

Refactor the MCP beta so Claude performs all reasoning using the user's Claude account while Mora acts only as the authenticated memory and data layer. The connector must work with both `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` absent.

## Key changes

- Replace provider-backed recall with deterministic, tenant-scoped vault retrieval. Return at most eight positively matched records and approximately 6,000 tokens without exposing filenames.
- Replace provider-backed memory saving with deterministic structured storage using `category`, `subject`, `memory`, and optional `context`. Bootstrap the index and log on the first write and make duplicate writes idempotent.
- Expose `get_mora_status`, `recall_twin`, `save_memory`, `list_simulations`, `get_simulation`, `create_simulation`, and `run_simulation` through MCP.
- Remove MCP credit checks and credit fields. Keep identity tied exclusively to the validated Clerk OAuth token and scope every query to the resolved Mora user.
- Update the connector page, MCP instructions, and README to describe Claude as the model and Mora as the memory layer.

## Verification

- Cover relevance ranking, result limits, no-match behavior, first-memory bootstrap, append behavior, duplicate writes, tool definitions, provider independence, OAuth failures, and parallel two-user isolation.
- Run Vitest, TypeScript, feature-scoped ESLint, the production build, and the dependency audit.

## Constraints

- Do not change provider-backed behavior for Mora's existing web chat, imports, or simulations.
- Do not add a database migration or new infrastructure.
- Do not deploy, link Vercel, retrieve secrets, commit, or push as part of this refactor.
- Use a dedicated test account and never run migrations when later testing against shared production-backed resources.
