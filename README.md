# ilo

Local X research, reply triage, drafting, scheduling, and publishing.

Search public follower profiles, collect posts through focused monitors, find the people and conversations worth your time, then draft and publish after review.

## Install

```sh
npm i -g iloso
ilo start
```

`ilo start` explains the X app setup before asking for a Client ID. Create or open an app in the [X Developer Console](https://console.x.com), enable OAuth 2.0, choose **Native App**, and use read and write permissions. Register this callback exactly:

```txt
http://127.0.0.1:8976/callback
```

Copy the OAuth 2.0 Client ID from **Keys and tokens**. Native Apps use PKCE and do not need a client secret. ilo then opens the browser flow and stores OAuth tokens in your operating system keychain.

## Use the CLI

```sh
ilo post --text "Hello from ilo"
ilo post --reply-to https://x.com/example/status/123 --text "A reply from ilo"
ilo post --text "A chart" --image ./chart.png --alt "Weekly signups by source"
ilo drafts create --text "Post this tomorrow"
ilo drafts list
ilo drafts schedule <draft-id> --at "tomorrow at 9am"
ilo scheduler watch
```

Publishing asks for confirmation and shows the exact text, destination, and images. Scripts can pass `--yes` after getting approval elsewhere.

Import public follower profiles through FxTwitter and search the local index:

```sh
ilo x followers sync adamwathan --pages 20
ilo x followers sync adamwathan --all
ilo x followers sync adamwathan --background
ilo x followers profile adamwathan leerob --json
ilo x followers search adamwathan --query "works at cursor|vercel|sentry"
ilo x followers search adamwathan --query "works at cursor|vercel|sentry" --include-former --include-unclear
ilo x followers search adamwathan --query "works at cursor|vercel|sentry" --csv ./matches.csv
```

The background command continues the full resumable import after the terminal closes. Profile lookup returns the stored public fields and raw FxTwitter record. Search uses SQLite FTS5 and lists every current match with its public bio evidence unless you pass `--limit`. Counts for current, former, and unclear matches appear below the profiles. Add `--include-former` or `--include-unclear` to list and export those classifications too. The CSV also includes import coverage. Check whether the saved import is finished before treating a count as complete.

Save searches for posts worth replying to, then triage the matches locally:

```sh
ilo x monitors add "ilo mentions" --query '"ilo" OR "ilo.so" -is:retweet'
ilo x inbox refresh
ilo x inbox list --verified --follows-me
ilo x following sync --all
ilo x inbox list --i-follow
ilo x inbox draft <post-id-or-url> --text "Reply to review"
```

The inbox stores public post, author, engagement, and monitor evidence in the same local SQLite database. Refreshes run only when asked. Follower and following imports power the relationship filters; until ilo has enough data, those values stay unknown. `ilo x inbox draft` creates a local reply draft and never publishes it.

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
import { createDraft, scheduleDraft, searchXFollowers } from 'iloso'

const draft = createDraft('A reply to review', {
  replyToPostId: 'https://x.com/example/status/123',
  images: [{ path: './chart.png', altText: 'Weekly signups by source' }],
})
await scheduleDraft(draft.id, 'tomorrow at 9am')

const matches = searchXFollowers({
  handle: 'adamwathan',
  query: 'works at cursor|vercel|sentry',
})
```

## Repository

- `packages/core`: local config, keychain, SQLite, scheduling, and provider logic
- `packages/cli`: the `ilo` and `iloso` commands
- `packages/mcp`: the local stdio MCP tools

## Develop

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Roadmap

The local reply inbox, follower search, X publishing, replies, static images, and scheduling ship today. Local post-history reports, scheduled monitor refreshes, and spam heuristics come next, followed by Bluesky and LinkedIn publishing.

## License and support

MIT licensed. If ilo saves you time, [sponsor the project](https://github.com/sponsors/iannuttall).
