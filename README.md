<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/ilo-wink-dark.svg">
    <img src="assets/brand/ilo-wink.svg" alt="ilo" width="144">
  </picture>
</p>

<h1 align="center">ilo</h1>

<p align="center">
  Local X research and publishing for people and AI agents. Search public audiences, monitor replies and articles, draft from evidence, and publish after review.
</p>

<p align="center">
  <a href="#quick-start">Get started</a>
  ·
  <a href="https://ilo.so/docs">Documentation</a>
  ·
  <a href="https://ilo.so/docs/articles">Article monitoring</a>
  ·
  <a href="https://www.npmjs.com/package/iloso">npm</a>
  ·
  <a href="https://github.com/iannuttall/ilo/issues">Questions</a>
  ·
  <a href="PRIVACY.md">Privacy</a>
  ·
  <a href="SECURITY.md">Security</a>
  ·
  <a href="LICENSE">License</a>
  ·
  <a href="AGENTS.md">Agent notes</a>
</p>

<p align="center">
  <a href="https://github.com/iannuttall/ilo/actions/workflows/ci.yml"><img alt="Checks" src="https://img.shields.io/github/actions/workflow/status/iannuttall/ilo/ci.yml?branch=main&label=checks&style=flat-square"></a>
  <a href="https://www.npmjs.com/package/iloso"><img alt="npm version" src="https://img.shields.io/npm/v/iloso?style=flat-square"></a>
  <a href="https://www.npmjs.com/package/iloso"><img alt="npm downloads" src="https://img.shields.io/npm/dm/iloso?style=flat-square"></a>
  <img alt="Node 22.19 or newer" src="https://img.shields.io/badge/Node-22.19%2B-339933?style=flat-square">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-ready-3178c6?style=flat-square">
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square"></a>
</p>

ilo gives your agent public X evidence it can inspect before it tells you what
to publish. Search follower profiles, keep native X Articles in a local
full-text index, collect focused replies, and turn the useful findings into
drafts.

The CLI, local MCP server, agent skill, and TypeScript package call the same
core implementation. Drafts, monitor state, article text, schedules, and
publish attempts stay in your local SQLite database. Publishing always stops
for explicit confirmation.

## Who this is for

- People growing an X account who want research, reply triage, drafts, and
  publishing in one local workflow.
- Coding agents get inspectable public evidence through MCP instead of working
  from screenshots or generic social media advice.
- Consultants, social teams, and developers can research public accounts or
  embed the same typed functions in their own tools.

## Quick start

ilo requires Node 22.19 or newer.

```sh
npm i -g iloso
ilo start
```

`ilo start` explains the X developer app setup before asking for a Client ID.
Create a Native App with OAuth 2.0 read and write access, then register this
callback exactly:

```txt
http://127.0.0.1:8976/callback
```

Copy the OAuth 2.0 Client ID from the app's **Keys and tokens** page. Native
Apps use PKCE and do not need a client secret. ilo opens the browser sign-in
and saves the OAuth tokens in your operating system keychain.

Run `ilo --help` to see the main surface:

```txt
Local-first social publishing for people and AI agents

USAGE ilo start|x|post|drafts|scheduler|mcp|skill

COMMANDS
      start    Configure an X developer app and connect your account
          x    Research and manage X accounts
       post    Publish one post or reply to X
     drafts    Create, list, schedule, and publish local drafts
  scheduler    Run scheduled local drafts
        mcp    Run the local stdio MCP server
      skill    Inspect or install the packaged ilo agent skill
```

The connected account becomes the default local namespace for article and
inbox monitors. Public follower research can run without OAuth. Commands that
need a namespace also accept `--account <handle>`.

## What you can do

- Search imported follower names, handles, bios, and locations with SQLite
  FTS5, including evidence-backed current, former, and unclear employer
  counts.
- Native X Articles from selected writers become a local full-text library
  that the CLI or an agent can search later.
- Focused X searches feed a deduplicated reply inbox with public post, author,
  engagement, and relationship evidence.
- Draft top-level posts or replies with up to four JPEG, PNG, or WebP images
  and optional alt text.
- Schedules accept exact timestamps or phrases such as `tomorrow at 9am`.
- MCP and TypeScript callers use the same local data and confirmation rules as
  the terminal.

## Research public followers

Import a bounded sample, continue a full resumable sync, or let a large import
run as a detached local process:

```sh
ilo x followers sync adamwathan --pages 20
ilo x followers sync adamwathan --all
ilo x followers sync adamwathan --background
ilo x followers status adamwathan
```

Search the saved profiles once the index has data:

```sh
ilo x followers search adamwathan \
  --query "works at cursor|vercel|sentry"
```

Current matches are listed by default. Counts still show current, former, and
unclear classifications, and every listed profile includes the public bio
used as evidence. Add the noisier groups only when you need to inspect them:

```sh
ilo x followers search adamwathan \
  --query "works at cursor|vercel|sentry" \
  --include-former \
  --include-unclear
```

Search returns every selected match unless you pass `--limit`. Export the same
profiles and import coverage to CSV with `--csv ./matches.csv`. Check the
coverage first because an unfinished public import cannot support a complete
count.

The [CLI guide](https://ilo.so/docs/cli) covers background progress, complete
profile records, classification limits, terminal output, and CSV fields.

## Keep native X Articles searchable

Choose the writers worth keeping, refresh their public article timelines, and
search the saved full text:

```sh
ilo x articles add swyx
ilo x articles add karpathy
ilo x articles refresh
ilo x articles search --query "browser tools"
ilo x articles show <post-id-or-status-url>
```

ilo fetches the complete public body for each new native X Article and stores
the timeline cursor locally. If older history remains, the next refresh
continues from that cursor. Search has no hidden result limit and makes no
network request after the articles are saved.

This monitors native X Articles. It does not collect every external link or
normal post a handle shares. Search uses SQLite FTS5 rather than embeddings,
so concrete names and words work better than abstract semantic questions.

The [article monitoring guide](https://ilo.so/docs/articles) documents every
CLI command, MCP tool, TypeScript function, JSON field, history state, and
current limit.

## Build a local reply inbox

Save focused X searches and refresh them when you want new posts:

```sh
ilo x monitors add "ilo mentions" \
  --query '"ilo" OR "ilo.so" -is:retweet'
ilo x inbox refresh
ilo x inbox list --verified
```

Import follower and following profiles when relationship filters matter:

```sh
ilo x following sync --all
ilo x followers sync <your-handle> --all
ilo x inbox list --i-follow
ilo x inbox list --follows-me
```

Relationship values stay unknown until the relevant local import has enough
coverage to answer. ilo does not turn missing data into `false`.

Inspect a post before drafting a reply:

```sh
ilo x inbox show <post-id-or-status-url>
ilo x inbox draft <post-id-or-status-url> --text "Reply to review"
```

Drafting saves the reply target and marks the inbox item as read. Nothing is
published until the normal confirmation step.

## Draft, schedule, and publish

Publish one reviewed post directly:

```sh
ilo post --text "Hello from ilo"
ilo post \
  --reply-to https://x.com/example/status/123 \
  --text "A reply from ilo"
ilo post \
  --text "Weekly signups" \
  --image ./chart.png \
  --alt "Bar chart of weekly signups by source"
```

Save an idea when it is not ready yet:

```sh
ilo drafts create --text "Post this tomorrow"
ilo drafts list
ilo drafts schedule <draft-id> --at "tomorrow at 9am"
ilo drafts publish <draft-id>
```

Run due schedules once or keep a local watcher open:

```sh
ilo scheduler run
ilo scheduler watch --interval 60
```

Interactive publishing shows the exact text, top-level or reply destination,
and images before asking for confirmation. Use `--yes` only after another
caller has already confirmed that exact action.

## Use ilo with AI agents

Install the packaged skill so a coding agent knows the workflow and publishing
rules:

```sh
ilo skill install
```

Add the local stdio MCP server to Claude Code or Codex:

```sh
claude mcp add ilo -- iloso mcp serve
codex mcp add ilo -- iloso mcp serve
```

Config-based clients can use the same command:

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

The client starts the server as a child process when it needs a tool. The
server uses stdin and stdout, opens no network port, and reads the same local
database as the CLI.

Keep research and publication as separate agent steps:

```txt
Search my saved X articles for browser tools. Show the strongest evidence and
any missing history. Do not draft or publish anything.
```

```txt
Create a local reply draft for this inbox item. Show me the exact text and
reply target, then stop for review.
```

Publishing tools require `confirm: true` for the exact action. Creating a
draft, searching local data, or refreshing a public monitor never publishes.

The [local MCP guide](https://ilo.so/docs/mcp) lists the tools and setup for
Claude, Codex, Cursor, and other compatible clients.

## Use ilo as a TypeScript package

Install `iloso` in a Node 22.19 or newer project:

```sh
npm install iloso
```

Call the same core functions used by the CLI and MCP server:

```ts
import {
  createDraft,
  createXArticleMonitor,
  getXArticle,
  refreshXArticleMonitor,
  scheduleDraft,
  searchXArticles,
} from 'iloso'

const monitor = createXArticleMonitor({
  accountHandle: 'ilodotso',
  sourceHandle: 'swyx',
})

await refreshXArticleMonitor({ id: monitor.id, maxPages: 3 })

const matches = searchXArticles({
  accountHandle: 'ilodotso',
  query: 'browser tools',
})

if (matches[0]) {
  const article = getXArticle({
    accountHandle: 'ilodotso',
    identifier: matches[0].postId,
  })

  const draft = createDraft(`A useful idea from ${article.title}`)
  await scheduleDraft(draft.id, 'tomorrow at 9am')
}
```

The root package exports follower and following syncs, article monitoring,
reply inbox actions, local drafts, schedules, static image helpers, X OAuth,
provider helpers, configuration, and storage paths. The package is pre-1.0, so
pin the version when another application depends on exact function signatures.

The [TypeScript guide](https://ilo.so/docs/typescript) has complete examples
for research, drafting, publishing, and embedding the MCP server.

## Know where the data goes

ilo keeps non-secret configuration under `~/.config/ilo` and local working
data in `~/.config/ilo/ilo.sqlite`. OAuth tokens and the optional X client
secret use your operating system keychain.

There is no hosted ilo account or draft database. The CLI makes the network
requests required to connect X, publish approved posts, and retrieve the
public research data you request. Set `ILO_HOME` when a script or test needs an
isolated local directory.

Back up `ilo.sqlite` if your drafts, monitor history, or saved research matter.
Do not copy keychain exports or OAuth tokens into a repository, issue, or shell
script.

## Understand the current limits

- X is the only publishing provider today. Bluesky and LinkedIn publishing are
  planned.
- Article monitors only collect native X Articles and refresh on demand.
- Follower employer results classify claims in public bios. They do not verify
  someone's employment.
- The public report library explains useful performance analyses, but automated
  local account-history reports have not shipped yet.
- Images can be JPEG, PNG, or WebP. Animated GIF and video uploads are still
  planned.

Public endpoints can return incomplete, delayed, or unavailable data. ilo
keeps coverage and provider errors visible so an agent can describe what the
result supports.

## Common questions

### Do I need an X developer app?

You need your own X Native App to connect an account and publish. Public
follower research does not require OAuth. Article and inbox commands can use
`--account <handle>` as their local namespace, although connecting the account
once is the easier normal setup.

### Will ilo post without asking me?

No. Interactive commands ask for confirmation, and MCP publishing tools
require `confirm: true`. A scheduled draft also needs explicit authorization
before a scheduler can publish it.

### Is follower or article search semantic?

No. Both use local SQLite FTS5. That keeps search fast, inspectable, and free,
but concrete words, handles, companies, and phrases work better than questions
that depend on synonyms or inferred meaning.

### Does my data stay on my machine?

Drafts, schedules, monitor state, imported public data, and publish attempts
stay in local SQLite. Secrets stay in the keychain. ilo only sends the network
requests needed for the X and public-data actions you explicitly run.

### What does ilo cost?

The package is free and open source under MIT. Your own X API access, provider
limits, and normal network costs still apply.

## Documentation and support

- [Getting started](https://ilo.so/docs/start)
- [CLI commands](https://ilo.so/docs/cli)
- [Article monitoring](https://ilo.so/docs/articles)
- [Local MCP and agents](https://ilo.so/docs/mcp)
- [TypeScript package](https://ilo.so/docs/typescript)
- [X report library](https://ilo.so/reports)
- [Privacy policy](PRIVACY.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

Questions, bugs, and feature requests belong in
[GitHub Issues](https://github.com/iannuttall/ilo/issues). Security reports use
the private process in [SECURITY.md](SECURITY.md).

## Develop locally

Most users only need the npm package. Contributors can run the source checkout:

```sh
git clone https://github.com/iannuttall/ilo.git
cd ilo
pnpm install
pnpm build
node dist/cli.js --help
```

Run the full gate before opening a pull request:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pack --dry-run
```

Product, content, architecture, and agent rules live in
[AGENTS.md](AGENTS.md).

## License

The code is available under [MIT](LICENSE). If ilo saves you time, you can
[sponsor the project](https://github.com/sponsors/iannuttall).
