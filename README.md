# ilo

Agent-first X performance monitoring, drafting, scheduling, and publishing.

Give your agent the public posts and performance data you care about, find the patterns worth repeating, then draft and publish through ilo's CLI, local MCP server, agent skill, or TypeScript package.

## Install

```sh
npm i -g iloso
ilo start
```

Create an X developer app with OAuth 2.0 read and write access, then register this callback:

```txt
http://127.0.0.1:8976/callback
```

`ilo start` opens the browser flow and stores OAuth tokens in your operating system keychain.

## Use the CLI

```sh
ilo post --text "Hello from ilo"
ilo drafts create --text "Post this tomorrow"
ilo drafts list
ilo drafts schedule <draft-id> --at "tomorrow at 9am"
ilo scheduler watch
```

Publishing asks for confirmation. Scripts can pass `--yes` after getting approval elsewhere.

## Add local MCP

```sh
claude mcp add ilo -- iloso mcp serve
codex mcp add ilo -- iloso mcp serve
```

Config-based clients can use:

```json
{
  "mcpServers": {
    "ilo": {
      "command": "iloso",
      "args": ["mcp", "serve"]
    }
  }
}
```

The MCP server uses the same local database and keychain credentials as the CLI. Publishing tools require `confirm: true`.

Install the packaged agent skill with `ilo skill install`.

## Use the TypeScript package

Install `iloso` in a Node 22 or newer project to call the same core functions directly:

```sh
npm install iloso
```

```ts
import { createDraft, scheduleDraft } from 'iloso'

const draft = createDraft('A post to review')
await scheduleDraft(draft.id, 'tomorrow at 9am')
```

## Repository

- `packages/core`: local config, keychain, SQLite, scheduling, and provider logic
- `packages/cli`: the `ilo` and `iloso` commands
- `packages/mcp`: the local stdio MCP tools
- `apps/web`: the statically generated ilo.so site and same-origin tool routes

## Develop

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The website can run locally with `pnpm -C apps/web dev`. See [apps/web/README.md](apps/web/README.md) for its optional environment variables and Cloudflare deployment.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/iannuttall/ilo/tree/main/apps/web)

## Roadmap

X publishing and scheduling are first. Bluesky and LinkedIn are the next provider targets. Local imports and automated performance reports come next.

## License and support

MIT licensed. If ilo saves you time, [sponsor Ian](https://github.com/sponsors/iannuttall).
