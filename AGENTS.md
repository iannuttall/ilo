# Agent rules

`PRODUCT.md` defines what ilo is, who it helps, what it can do today, and what
is still planned. Read it before making product decisions or writing claims.

`CONTENT.md` is the writing contract for the website, documentation, command
help, onboarding, metadata, README, and agent-facing instructions. Reading it
is mandatory in the same task before editing user-facing copy.

`CLAUDE.md` must remain a symlink to this file. Do not maintain separate agent
instructions.

## Communication

- Keep it informal, direct, and simple.
- Do not use sycophantic language.
- Investigate and fix mistakes without ceremony.
- Challenge unnecessary complexity.

## Product shape

ilo is local-first open source software.

- Do not add accounts, auth, billing, subscriptions, credits, or a hosted draft database.
- Do not add a remote MCP server. MCP runs locally over stdio.
- The CLI, MCP server, and public TypeScript exports must call the same
  implementation in `packages/core`.
- Provider credentials and OAuth tokens belong in the operating system keychain.
- Non-secret settings may live under `~/.config/ilo`.
- Drafts, schedules, and publish attempts live in the local SQLite database.
- Publishing must require explicit user confirmation unless a caller passes an explicit non-interactive confirmation flag.
- Add X features first. Keep provider logic isolated so Bluesky and LinkedIn can follow.

## Website

`apps/web` preserves the existing public ilo.so URLs, design, blog posts, report guides, and tools.

- Keep pages static where possible.
- Use the Worker only for same-origin website tool routes, legacy redirects,
  and request handling that needs runtime logic.
- Do not add D1, KV, R2, queues, auth, or billing bindings without a clear new requirement.
- Keep canonical URLs, sitemap coverage, metadata, legacy redirects, and markdown negotiation working.
- Website tool routes live under `apps/web/src/api/routes/tools`. They are
  implementation details, not a documented public API. Keep the same-origin
  browser guard in place.
- Use `@/...` for cross-folder imports inside `apps/web/src`.
- Landing copy leads with the user's job and outcome. Do not turn the homepage
  into a list of product surfaces or internal architecture.
- Docs copy is task-focused and introduces a surface only when the user needs
  it for the next action.

## UI

Never nest cards inside cards.

- Use dividers for rows inside a card.
- Use a muted background without a border for code blocks.
- Use typography and spacing for hierarchy.
- Use sibling cards when two frames are needed.

## Commands

Run root checks from the repository root:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run workspace commands with workspace-relative paths:

```sh
pnpm -C apps/web dev
pnpm -C apps/web build
pnpm -C packages/core test
```

Use the workspace-local Wrangler:

```sh
pnpm -C apps/web exec wrangler whoami
pnpm -C apps/web exec wrangler deploy --dry-run
```

Deploy the website through git push after CI passes. Do not add manual production migrations because the site has no database.

## Shared logic

- Put cross-surface behavior in `packages/core`.
- Keep CLI and MCP adapters thin.
- Test shared behavior in core before adding more adapters.
- Split files by command, tool group, provider, or domain before they become dumping grounds.

## Migrations from old ilo

Old source may be used as a behavioral reference, but do not copy:

- secrets or provider credentials
- database contents or production identifiers
- auth, billing, workspace, credit, or remote MCP infrastructure
- third-party fixtures without permission

Recover features as clean local-first implementations with tests.
