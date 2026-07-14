# ilo

Local-first social publishing for people and AI agents.

ilo gives you an X CLI, a local stdio MCP server, a SQLite draft store, and a local scheduler. There is no ilo account, subscription, hosted login, or remote MCP.

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

## Repository

- `packages/core`: local config, keychain, SQLite, scheduling, and provider logic
- `packages/cli`: the `ilo` and `iloso` commands
- `packages/mcp`: the local stdio MCP tools
- `apps/web`: the ilo.so Astro site and public Cloudflare tool API

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

X publishing and scheduling are first. Bluesky and LinkedIn are the next provider targets. The old ilo analytics ideas may return as local imports and reports rather than another hosted dashboard.

## License and support

MIT licensed. If ilo saves you time, [sponsor Ian](https://github.com/sponsors/iannuttall).
