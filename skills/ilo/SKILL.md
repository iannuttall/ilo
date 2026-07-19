---
name: ilo
description: Use ilo for local X article monitoring, reply inboxes, search monitors, follower and following research, drafting, account setup, scheduling, publishing, and agent workflows. Triggers when a user asks to monitor or search X articles, monitor X searches, find posts worth replying to, filter authors by relationship or verification, search followers or people an account follows, draft, reply, attach images, queue, schedule, publish, or inspect social posts with the ilo CLI or local MCP server.
---

# ilo

ilo is a local-first X research and publishing CLI with a stdio MCP server. Drafts and schedules stay in local SQLite. Typefully API keys and direct X OAuth credentials stay in the operating system keychain. Research reads use public FxTwitter data regardless of the publishing provider.

## Safety

- Never publish, run the due scheduler, or pass `--yes` without explicit user confirmation for the exact content or already-reviewed batch.
- Creating, listing, and scheduling drafts do not publish.
- Show the publishing account, provider, final text, top-level or reply destination, image paths, and alt text before asking for confirmation.
- If the publishing account is unclear, check `ilo_status` or `ilo accounts list --json` first.
- Do not ask the user to paste OAuth access or refresh tokens. Use `ilo start`. A Typefully v2 API key may be entered in ilo's hidden interactive prompt.
- A bound draft must stay on its saved publishing account. Never work around an account mismatch by changing local storage.

## Prefer MCP

Use the local MCP tools when available:

- `ilo_status`
- `ilo_list_publishing_accounts`
- `ilo_set_default_publishing_account`
- `ilo_sync_x_followers`
- `ilo_x_follower_sync_status`
- `ilo_search_x_followers`
- `ilo_get_x_follower_profile`
- `ilo_create_x_article_monitor`
- `ilo_list_x_article_monitors`
- `ilo_set_x_article_monitor_enabled`
- `ilo_delete_x_article_monitor`
- `ilo_refresh_x_articles`
- `ilo_search_x_articles`
- `ilo_get_x_article`
- `ilo_create_x_monitor`
- `ilo_list_x_monitors`
- `ilo_set_x_monitor_enabled`
- `ilo_delete_x_monitor`
- `ilo_refresh_x_inbox`
- `ilo_list_x_inbox`
- `ilo_get_x_inbox_item`
- `ilo_update_x_inbox_item`
- `ilo_record_x_inbox_feedback`
- `ilo_sync_x_following`
- `ilo_x_following_sync_status`
- `ilo_search_x_following`
- `ilo_get_x_following_profile`
- `ilo_create_draft`
- `ilo_list_drafts`
- `ilo_schedule_draft`
- `ilo_publish_draft`
- `ilo_publish_post`
- `ilo_run_scheduler`

Publishing tools require `confirm: true`.

## CLI fallback

```sh
ilo accounts list --json
ilo accounts use <alias-or-handle> --json
ilo x followers sync <handle> --pages 20 --json
ilo x followers sync <handle> --background --json
ilo x followers status <handle> --json
ilo x followers profile <handle> <follower-handle> --json
ilo x followers search <handle> --query "works at cursor|vercel|sentry" --json
ilo x followers search <handle> --query "works at cursor|vercel|sentry" --csv ./matches.csv
ilo x articles add <handle> --json
ilo x articles refresh <handle> --json
ilo x articles search --query "browser tools" --json
ilo x articles show <post-id-or-url> --json
ilo x monitors add "product mentions" --query '"product" OR "product.com" -is:retweet' --json
ilo x monitors list --json
ilo x inbox refresh --json
ilo x inbox list --unread --verified --json
ilo x inbox list --unread --language en --sort signal --explain --json
ilo x following sync [handle] --all --json
ilo x following status [handle] --json
ilo x following search [handle] --query "building browser tools" --json
ilo x following search [handle] --query "building browser tools" --csv ./following.csv
ilo x following profile <followed-handle> --account <source-handle> --json
ilo x inbox list --follows-me --json
ilo x inbox list --i-follow --json
ilo x inbox show <post-id-or-url> --json
ilo x inbox useful <post-id-or-url> --reason actionable --json
ilo x inbox dismiss <post-id-or-url> --reason promotional --json
ilo x inbox feedback-clear <post-id-or-url> --json
ilo x inbox draft <post-id-or-url> --text "Reply text" --json
ilo drafts create --account <alias-or-handle> --text "Draft text" --json
ilo drafts create --account <alias-or-handle> --reply-to <post-id-or-url> --text "Reply text" --image ./chart.png --alt "Chart description" --json
ilo drafts list --account <alias-or-handle> --json
ilo drafts schedule <draft-id> --account <alias-or-handle> --at "tomorrow at 9am" --json
```

After explicit confirmation:

```sh
ilo drafts publish <draft-id> --account <alias-or-handle> --yes --json
ilo post --account <alias-or-handle> --text "Approved text" --yes --json
ilo post --account <alias-or-handle> --reply-to <post-id-or-url> --text "Approved reply" --yes --json
```

Use `ilo scheduler run --json` to inspect the result of a due-post pass. Treat it as a publishing action and confirm first.

## Follower research

Follower imports use public FxTwitter data and resume from the last saved page. A full import can take many calls for a large account. Check the returned coverage before reporting a count.

The [audience research guide](https://ilo.so/docs/audience-research) documents the shared CLI, MCP, and TypeScript workflow, including snapshot freshness, classification flags, and result limits.

Use the CLI `--background` mode for an unattended full import. Use `ilo_get_x_follower_profile` or the CLI `profile` command when the task needs all stored public fields for one match. The raw provider object may contain fields beyond ilo's structured columns; treat it as public source data, not verified identity or employment evidence.

Search uses the local SQLite FTS5 index. For employer questions, report `current` as the conservative count and keep `former` and `unclear` separate. Include the returned public bio evidence. Do not present a partial import or an ambiguous bio as a complete employment record.

Follower research does not require a publishing account. Publishing does.

## Following research

Following research answers questions about the people an account has chosen to follow, such as “find everyone I follow who is building browser tools.” Syncing saves each available public profile, not only its ID and handle. The structured record includes the name, bio, location, website, account counts, join date, verification, profile images, and the raw provider object.

Run `ilo_sync_x_following` or `ilo x following sync [handle] --all` before searching. If the handle is omitted, ilo uses the default publishing account's X handle as the local namespace. The profiles still come from FxTwitter. An unfinished import resumes from its saved cursor. Running sync after a completed import starts a fresh snapshot so removed relationships do not stay current forever.

Use `ilo_x_following_sync_status` or the CLI `status` command before making a completeness claim. The result states how many complete profiles are searchable, whether the provider ended the list or repeated pages confirmed X's reported total, when the snapshot was updated, and whether it is more than 24 hours old. A partial index can prove that a returned profile was found, but it cannot prove that a missing profile is not followed.

Search uses local SQLite FTS5 across names, handles, bios, and locations. It is keyword search, not embedding-based semantic search, so use concrete words found in likely profiles. ilo returns every match unless the caller explicitly supplies `resultLimit` or `--limit`. Keep the returned coverage and freshness alongside the results. Use `ilo_get_x_following_profile` or the CLI `profile` command when the task needs the complete stored record for one account.

## Article monitoring

Article monitors save selected X handles. Refresh them on demand with `ilo_refresh_x_articles` or `ilo x articles refresh`. A refresh saves new articles and resumes older history from the local cursor. It does not run in the background or publish anything.

Use `ilo_search_x_articles` or the CLI `search` command to search saved titles, previews, and full article text with SQLite FTS5. Search results return a compact excerpt. Use `ilo_get_x_article` or `ilo x articles show` to inspect the complete stored body and raw provider record before quoting or summarizing it.

State the evidence limit when article history is incomplete. A monitor with `historyComplete: false` has more older pages available. Refresh it again before describing the local results as the complete article history for that handle.

## Reply inbox

Monitors are saved X advanced-search queries. Refresh them on demand with `ilo_refresh_x_inbox` or `ilo x inbox refresh`; ilo does not run an always-on monitor process yet. A refresh saves public post, author, engagement, monitor, and raw provider evidence locally. It does not publish.

Use inbox filters to narrow results before proposing replies. Pass `sort: "signal"` to `ilo_list_x_inbox`, or `--sort signal` in the CLI, when the user wants the strongest matches rather than the newest. Pass `explain: true` or `--explain` to return the score factors. `verified` is observed on the stored public author profile. `followsMe` and `iFollow` are tri-state: `true` is a known imported relationship, `false` is only reliable after the relevant full follower or following import, and `null` means unknown. Never turn `null` into false.

Use the account's follower import for `followsMe` and its following import for `iFollow`. A partial import can prove a relationship it contains, but it cannot prove an absent relationship.

Inspect the complete inbox item before drafting. Creating a reply draft and changing read, archive, or replied state are local actions and do not need publishing confirmation. Still show the exact reply target, text, images, and alt text before asking to publish the draft.

## Filter research for signal

The inbox returns a bounded evidence sample in recency order by default. Signal sorting applies ilo's local `signal-v1` model to content evidence, normalized public response, freshness, author fields, known relationships, duplicate wording, and saved usefulness feedback. Every ranked item includes a score from 0 to 100, a high, medium, or low confidence label, positive reasons, penalties, the model version, and any direct feedback.

Start with the user's question, preferred language, time window, and useful source types. Exclude exact duplicates, near-duplicate announcements, irrelevant matches, and replies or reposts when the question needs original posts. Cluster posts that repeat the same story so one launch cannot fill the digest.

Judge the post and its author separately:

- For the post, look for direct evidence, original reporting or work, concrete details, novelty, relevance, and useful discussion. Compare engagement with posts of a similar age and with the author's normal response when that history is available.
- For the author, use account age, profile completeness, subject fit, repeated useful posts, and known relationship evidence. Treat follower count and verification as weak signals. A large or verified account can still publish low-value promotional work.
- Lower confidence for repetitive templates, copied wording, unexplained links, engagement bait, implausible ratios, extreme posting volume, or a feed that has drifted into launch noise. Do not label an account as spam from one clue.
- Prefer primary sources when two posts cover the same story. Keep a strong independent explanation when it adds context the primary source does not.
- Reserve some room for smaller or unfamiliar accounts. Raw reach should not crowd out specific, useful work.

Use the signal score to order candidates, not as a probability or claim that the author is trustworthy. Do not invent another precise score from incomplete public data. For each selected item give a short reason, its confidence label, the source URL, and the evidence that could change the judgment. Mention how many candidates were reviewed and why obvious-looking items were left out.

Record feedback only when the user makes the choice or explicitly asks the agent to apply it. Use `useful` for items worth keeping and `not_useful` for items the user wants ranked lower. Add a reason when it is known. The choice stays in local SQLite and also gives the author a cautious source-history adjustment. Clear mistaken feedback instead of adding an opposing label.

## Present research as a digest

When the user asks for a digest or a report result, return a clean Markdown document by default. Create a self-contained HTML file only when they ask for an artifact or when the task explicitly requires one. Visual polish should make the decisions easier to scan, not hide thin evidence.

Use this order:

1. A specific title naming the account or subject and period.
2. A two or three sentence answer with the most useful finding and why it matters.
3. A compact coverage table with sources, dates, collection time, candidate count, selected count, and missing data.
4. Three to seven ranked findings. Each finding needs a plain title, why it matters, direct source links, visible metrics where relevant, confidence, and one counter-signal or limit.
5. A short section for items filtered out as duplicates, weak matches, likely promotion, or low-confidence noise. Describe the reason without making unsupported claims about the author.
6. No more than three next actions. Tie each action to a finding and state what to inspect or measure next.
7. Open questions and evidence limits.

Use tables only for real comparisons. Keep source links beside the claims they support. Separate observation from interpretation and recommendation. Missing views, bookmarks, relationships, history, or profile fields stay unknown rather than becoming zero or false. Do not pad the digest with generic social advice and do not publish anything from a research request.

## Replies and images

Pass `replyToPostId` to create or publish a reply. It accepts a numeric X post id or an X post URL. X can still reject a target under its API access or conversation rules.

Posts and drafts accept up to four local JPEG, PNG, or WebP files. Use alt text when it adds useful context. Direct X publishing supports image alt text. Typefully's documented v2 draft input does not, so ilo rejects a Typefully publish that contains alt text instead of silently dropping it. A scheduled draft stores the image paths, so those files must remain available until it publishes.

## Publishing accounts

ilo can publish through a personal Typefully v2 API key or a user-owned X developer app. `ilo start` guides either route. Typefully adds every accessible social set with an X profile. Direct X connects one profile per OAuth flow.

Use `ilo_list_publishing_accounts` or `ilo accounts list --json` before preparing work for several handles. Pass the returned alias, handle, or ID as `account` or `--account`. Use an alias when the same X handle is available through both providers.

A new draft snapshots its publishing account. Changing the default does not move existing drafts. If a draft is unassigned, scheduling or publishing binds the selected or default account. If it is already bound, a different selector must fail before any provider request.

Schedules stay in ilo's local SQLite database for both providers. When a Typefully draft becomes due, ilo asks Typefully to publish it immediately. Native Typefully analytics and remote Typefully scheduling are not part of the current workflow.

## Setup

If no publishing account is connected, run `ilo start` interactively and let the user choose:

1. Typefully asks for a v2 API key from **Settings → API**.
2. Direct X asks for a Native App with OAuth 2.0 read and write access.
3. Direct X must register `http://127.0.0.1:8976/callback` exactly.
4. Confirm the saved provider, handle, and alias with `ilo accounts list`.

Do not invent provider charges, limits, or approval status. Typefully and X control those. The [publishing accounts guide](https://ilo.so/docs/accounts) has the current setup and provider limits.
