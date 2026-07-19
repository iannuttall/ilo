# Product

ilo helps people and AI agents understand what works on X, turn that evidence
into drafts, schedule the ideas worth keeping, and publish after review.

## Primary users

- People use the guided CLI to connect one or more X publishing accounts,
  manage drafts, schedule posts, and publish from the terminal.
- Agents use the skill and MCP tools to research, draft, schedule, and prepare
  publishing actions with clear evidence and explicit confirmation.
- Consultants and social teams use public profiles and post data for client
  reviews, competitor research, and content planning.

Humans and agents should follow the same workflow and reach the same result.
The interface changes. The product does not.

## Product surfaces

ilo is one product with four primary surfaces:

- `ilo` is the CLI and npm package.
- The local stdio MCP server exposes ilo tools to compatible agents.
- The ilo skill teaches agents when to use those tools and how to handle
  publishing safely.
- The TypeScript export lets Node applications use the same core functions
  without going through a command or protocol adapter.

These are product surfaces, not separate brands and not the story on every
page. Public copy should lead with what someone can do. Name the surface when
it helps them choose or complete the next action.

## What ships today

- Connect one or more X publishing accounts through either a personal
  Typefully v2 API key or a user-owned X Native App with OAuth 2.0 PKCE.
- Import every X profile available to a Typefully API key as a separate local
  publishing account. List accounts, choose a default, and select an account
  explicitly for a draft or publish action.
- Keep Typefully API keys, X OAuth tokens, and optional X client secrets in the
  operating system keychain. Keep non-secret account metadata and aliases in
  local configuration.
- Create and list local drafts.
- Bind each draft to its publishing account so changing the default cannot
  send an older draft from the wrong X profile.
- Schedule drafts with ISO timestamps or plain-language times.
- Publish a top-level post or reply after confirmation.
- Attach up to four JPEG, PNG, or WebP images. Direct X publishing supports
  optional alt text. Typefully publishing rejects images with alt text because
  its documented v2 draft input does not expose that field.
- Run the scheduler once or as a local watcher.
- Import public X follower profiles into local SQLite, with
  resumable foreground and background full-list syncs.
- Retain each imported profile's public bio, location, website, join date,
  account counts, images, verification details, and complete public record.
- Search imported follower names, handles, bios, and locations with SQLite
  FTS5, including evidence-backed current, former, and unclear employer
  counts. List current matches by default, allow former and unclear matches to
  be included, and export the selected public profile fields to CSV.
- Save X advanced-search queries as local monitors and refresh them on demand
  into a deduplicated reply inbox.
- Filter saved inbox posts by monitor, local state, verified author, post or
  author text, whether the author follows the account, and whether the account
  follows the author.
- Rank saved inbox posts with an explainable local signal score based on
  content evidence, normalized response, freshness, public author fields,
  known relationships, duplicate wording, and the user's useful or dismissed
  feedback. Keep every factor and confidence label with the result.
- Import complete public profiles from an X following list into a resumable
  local snapshot. Search saved names, handles, bios, locations, and aliases
  with SQLite FTS5, inspect one complete profile, export every match to CSV,
  and report completion and 24-hour freshness alongside results.
- Use the same following snapshot for inbox relationship filters. Keep
  follower and following relationships unknown until the local imports can
  support a true or false answer.
- Save selected X handles as local article monitors. Refresh them on demand,
  resume unfinished history imports, fetch each new article's full text, and
  search the local title, preview, and body index with SQLite FTS5.
- Read one saved article with its full public text and complete public record.
- Inspect the stored public post, author, engagement, and complete public data;
  mark items read, archived, or replied; and create a local reply draft without
  publishing it.
- Use the same actions through local stdio MCP.
- Import the same research, draft, scheduling, publishing, and MCP functions
  from the `iloso` TypeScript package.
- Install the packaged ilo skill for coding agents.
- Use public X and Bluesky tools on ilo.so.
- Read the public X report library for research questions, evidence checks,
  limits, and follow-up analysis.

The report library is useful today, but automated local account-history reports
have not shipped yet. Do not write as if the CLI already imports a full post
history or produces every report automatically.

All current research reads use public X data, whether publishing is connected
through Typefully, direct X OAuth, or not connected at all. The
Typefully connection is a publishing transport in the current release. Native
Typefully analytics ingestion has not shipped yet.

## What comes next

- Restore the strongest legacy ilo analytics as local reports.
- Add optional Typefully post and follower analytics as another local evidence
  source without making it a requirement for research or publishing.
- Import public profile and post history for repeatable analysis.
- Add scheduled monitor refreshes and deeper source-history checks to the local
  reply inbox.
- Add animated GIF and video uploads, threads, schedule cancellation, retries,
  and stronger scheduler installation.
- Add Bluesky publishing, then LinkedIn.
- Keep the public site, tools, blog, and report library useful.

## Product principles

- Start with the user's question and return evidence they can inspect.
- Keep drafts, schedules, settings, and credentials under the user's control.
- Make the human path calm and the agent path explicit.
- Require confirmation for the exact content, reply destination, and media
  before publishing.
- Share one implementation across CLI, MCP, and TypeScript.
- Keep provider boundaries clear so more networks can follow X.
- Ship the core product as free, MIT-licensed software.

## Voice and vocabulary

- Product name: ilo.
- Command and package name: `ilo` and `iloso` where the actual executable or
  npm package needs to be named.
- Use "report" for a structured analysis result or a report-library entry.
- Use "guide" when a page teaches someone how to run an analysis manually.
- Use "draft", "schedule", and "publish" for their exact product actions.
- Speak of the skill in the singular.

ilo should sound practical, curious, and confident. It cares about the evidence
behind content advice and the final post that gets published. It does not need
to keep reminding readers what it removed or what architecture it uses.

## Do not claim

- Automated historical analytics that have not shipped in the local package.
- Guaranteed audience growth, reach, engagement, or revenue.
- Causation when the evidence only shows a pattern or correlation.
- Bluesky or LinkedIn publishing before those providers work end to end.
- Background scheduling when no scheduler process or task runner is active.
