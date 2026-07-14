# Contributing

Issues and pull requests are welcome.

## Setup

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Keep provider behavior in `packages/core` and make CLI or MCP changes thin adapters around it. Publishing actions need explicit confirmation.

Do not include real OAuth tokens, client secrets, production data, or third-party fixtures in a contribution.
