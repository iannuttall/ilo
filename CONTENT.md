# Content

This is the writing contract for ilo. Use it for website copy, documentation,
report pages, command help, onboarding, metadata, the README, and agent-facing
instructions.

The order of priority is:

1. Tell the truth.
2. Help the user understand what to do.
3. Make the page useful on its own.
4. Give the writing some personality.
5. Preserve search value without writing for a crawler.

Search never outranks clarity. Personality never outranks accuracy.

## Write for the user

Start with the question that brought someone to the page. Give them the answer,
the next action, or the command they need before explaining the machinery.

Users should not have to translate architecture into a benefit. They do not
need a tour of the CLI, MCP server, skill, SQLite database, Worker, and package
layout on every page. Tell them which part matters for the job in front of
them.

Useful copy answers these questions:

- What can I do here?
- What do I need before I start?
- What should I run, enter, or choose?
- What comes back?
- What can the result prove?
- What should I do next?

If a paragraph does not help answer one of those questions, it probably does
not belong on the page.

## Lead with the outcome

Features matter after the reader understands why they should care.

Weak:

> ilo is a CLI, local MCP server, and agent skill.

Better:

> Find the patterns behind your strongest posts, turn the next idea into a
> draft, and publish it after review.

Weak:

> The CLI and MCP server use the same SQLite database.

Better:

> Start a draft with your agent and finish it from the terminal. The same draft
> is waiting for you.

Name a surface when it helps the reader choose a path or complete an action.
Do not repeat the surface list as a substitute for explaining the product.

## Name things consistently

- **ilo** is the product.
- **`ilo`** is the command.
- **`iloso`** is the npm package and an equivalent executable where required.
- **CLI**, **MCP server**, **skill**, and **TypeScript package** are product
  surfaces.
- Speak of the skill in the singular.
- A **draft** is saved content that has not been published.
- A **scheduled draft** has a future publishing time.
- A **publishing account** is one X profile plus the route ilo uses to publish
  for it: Typefully or direct X OAuth.
- Use **direct X** for the user-owned X OAuth route. Do not describe FxTwitter
  research as part of the direct X connection.
- A research **handle** or **account handle** names the public X data and local
  namespace being searched. It does not choose a publishing credential.
- A **report** is a structured analysis result or a named report-library entry.
- A **guide** teaches someone how to carry out an analysis when the automated
  report does not exist yet.

Do not switch between report, guide, tool, command, and audit unless the
distinction helps the reader.

## Keep current and planned features separate

The public report library covers useful X analytics questions today. Full local
imports and automated account-history reports are still planned.

Safe current claims include:

- The report library explains what evidence to inspect for top posts, weak
  posts, topics, hooks, formats, timing, and audience response.
- Public tools can inspect supported public profiles, posts, and links.
- The CLI, MCP server, and TypeScript package can import public follower
  profiles through FxTwitter, inspect their stored public fields, and search
  the local index with SQLite FTS5.
- The CLI, MCP server, and TypeScript package can import the complete available
  public profiles an X account follows, search saved names, handles, bios,
  locations, and aliases with SQLite FTS5, inspect one stored profile, and
  return completion and freshness with the matches.
- Following search returns every local match unless the caller explicitly
  passes a result limit. The CLI can export every match and its snapshot
  coverage to CSV.
- Follower search returns the matched public bio evidence and labels employer
  matches as current, former, or unclear. Current matches are listed by
  default while all three counts remain visible. The CLI can include former
  and unclear profiles and export the selected public fields and import
  coverage to CSV.
- The CLI, MCP server, and TypeScript package can save X advanced-search
  monitors, refresh them on demand into a local reply inbox, filter saved
  posts, inspect public author and post evidence, and create local reply
  drafts.
- The CLI, MCP server, and TypeScript package can monitor selected X handles
  for articles, resume older history imports, search saved titles, previews,
  and full text with SQLite FTS5, and read one complete stored article.
- Inbox relationship fields are true, false, or unknown. Do not turn an
  incomplete or missing follower or following import into a false answer.
- The CLI and MCP server can create drafts, schedule them, and publish
  top-level posts or replies to X with up to four static images.
- Typefully is an optional publishing connection. Public audience research,
  following search, article monitoring, and reply inbox reads still use
  FxTwitter and local SQLite. Do not claim Typefully analytics are imported
  until that code ships.
- The agent skill teaches the ilo workflow and confirmation rules.

Do not claim that ilo automatically builds a complete historical performance
profile until that feature ships. Do not turn a report guide into a product
result. Update `PRODUCT.md` when the implementation changes, then update the
copy.

## Write analysis claims carefully

Social performance patterns need evidence and limits.

- Separate observed examples from interpretation.
- Name the posts, metrics, period, and sample size where possible.
- Say when public data is missing, partial, or unavailable.
- Do not turn missing data into zero.
- Do not call a correlation a cause.
- Compare similar formats, periods, and audience sizes.
- Explain what would verify or weaken a recommendation.
- Never promise audience growth, reach, engagement, or revenue.

Prefer:

> Three of the five most-replied-to posts in this sample opened with a direct
> question.

Avoid:

> Questions always increase engagement.

The first sentence describes the sample. The second invents a rule.

## Keep landing pages focused

The homepage should explain the work ilo helps someone do:

- understand what worked and what missed
- prepare a stronger next post
- save and schedule drafts
- review the exact text
- publish after confirmation

Product surfaces support that story. They are not the story by themselves.

Do not lead with removed SaaS features, internal architecture, migration
history, deployment shape, or a list of things ilo does not require. A reader
looking for help with X content does not need to know that an older version had
billing, workspaces, a dashboard, or remote MCP.

FAQs should answer real product and use-case questions. Good topics include:

- what ilo helps analyze
- using public data for client or competitor research
- what evidence an agent should return
- how drafting, scheduling, and publishing work
- what confirmation protects
- which networks are supported
- what is available now and what remains planned

Setup and architecture questions belong in docs unless they are common buying
or installation blockers.

## Write documentation as a real sequence

State the condition, the action, and what happens next. Do not assume the user
remembers an earlier page.

For setup pages, prefer this order:

1. Install with `npm i -g iloso`.
2. Run `ilo start`.
3. Let the CLI explain the X app requirement, app type, permissions, and exact
   callback URL before it asks for a client ID.
4. Create the first useful draft.
5. Add MCP or the skill if an agent is part of the workflow.
6. Use the TypeScript package when the workflow belongs inside another Node
   application.
7. Explain scheduling and confirmation before the first publish.

Introduce a command before its code block. Commands must be complete and
copyable. Explain the expected result and the common failure that would block
the next step.

## Make report pages useful on their own

Every report page should answer its own research question. Shared structure is
fine. Repeated filler is not.

A useful report page covers:

1. What question the report answers.
2. When to use it.
3. Which profile and post data it needs.
4. What evidence to inspect.
5. What a useful result contains.
6. How to read the important patterns.
7. What the evidence cannot prove.
8. Which nearby report to use next.

If the same paragraph could be pasted onto every report page unchanged, remove
it or make it specific to the report family.

## Use a clear, direct voice

Write in plain English. Prefer the word someone would use while explaining the
problem to a colleague.

- Say "use" instead of "leverage".
- Say "start" instead of "commence".
- Say "missing data" instead of "data unavailability".
- Say "the sample contains 40 posts" instead of "the dataset has a constrained
  observation count".

Keep one main idea in each sentence. Most paragraphs should be two to four
sentences. Vary sentence length. Be detailed when it removes doubt and brief
when the next step is obvious.

One or two human moments on a short page are enough. Use a real opinion or a
specific example. Do not bolt jokes or fake informality onto every section.

## Keep titles short and literal

An H1 names the page. The description underneath explains why it matters. Do
not force both jobs into the heading.

Use sentence case for headings. A reader who scans only the H2 and H3 headings
should still understand the page.

Good:

- Find the posts worth repeating
- Schedule a draft from the terminal
- Add ilo to Codex
- Compare links with posts that have no links

Avoid:

- Everything you need to know about X analytics
- Unlock better social performance
- Overview
- Command facts

Each page should have one clear search intent and one clear job. Keep the main
topic in the title, H1, opening paragraph, and URL where it fits naturally.
Do not pad titles with keyword variants.

## Link like the words belong together

Link the phrase that describes the destination.

Good:

> The [local MCP guide](/docs/mcp) includes setup commands for Codex and Claude.

Avoid:

> Click [here](/docs/mcp) to learn more.

Do not use bare internal paths as link text. External product claims should
link to primary sources when the claim can change.

## Patterns to remove

Cut these during every edit:

- Dash punctuation used as a dramatic pause.
- "It is important to note" and "It is worth noting".
- "The honest answer" and "The truth is".
- "In today's landscape" and similar scene-setting filler.
- "It is not about X, it is about Y" constructions.
- "Unlock", "leverage", "seamless", "robust", and "holistic" when a plain
  word works.
- Repeated explanations of product architecture.
- Explanations of old product decisions or migration history.
- Three sentences or bullets with the same shape.
- Vague outcomes such as "better content" without naming the evidence or
  action.
- Long titles that contain the heading, description, and sales pitch at once.

## Preserve search value without preserving stale claims

- Keep published URLs unless a permanent redirect is deliberate and tested.
- Preserve canonical URLs, sitemap coverage, useful headings, internal links,
  and structured data.
- Keep blog and tool pages focused on the question that earned the visit.
- Rewrite stale SaaS claims instead of keeping them for a keyword.
- Redirect a removed page to the closest useful destination.
- Do not add filler to match an old word count.
- Run `pnpm seo:parity` after changing indexed pages.

SEO value comes from useful pages that still answer the query. A false feature
claim is not worth preserving.

## Review every page before shipping

Read the page once as someone who has not seen ilo before.

- Does the opening explain what they can do?
- Is the next action obvious?
- Are setup requirements stated before the command?
- Does each section add information?
- Are benefits tied to real data or actions?
- Are current and planned features clearly separated?
- Can a reader scan the headings and follow the page?
- Are links descriptive?
- Are commands complete and copyable?
- Does the page avoid claims the implementation cannot support?
- Did you remove architecture tours and generated-sounding filler?

If the page is accurate but boring, add a concrete example or a useful opinion.
If it is lively but unclear, remove the personality until the instructions make
sense on the first read.
