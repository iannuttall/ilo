---
name: ilo
description: Use ilo for local X follower research, drafting, account setup, scheduling, publishing, and agent workflows. Triggers when a user asks to search followers, draft, reply, attach images, queue, schedule, publish, or inspect social posts with the ilo CLI or local MCP server.
---

# ilo

ilo is a local-first social publishing CLI and stdio MCP server. Drafts and schedules stay in local SQLite. X OAuth credentials stay in the operating system keychain.

## Safety

- Never publish, run the due scheduler, or pass `--yes` without explicit user confirmation for the exact content or already-reviewed batch.
- Creating, listing, and scheduling drafts do not publish.
- Show the final text, top-level or reply destination, image paths, and alt text before asking for confirmation.
- If the connected account is unclear, check `ilo x status --json` first.
- Do not ask the user to paste OAuth access or refresh tokens. Use `ilo start`.

## Prefer MCP

Use the local MCP tools when available:

- `ilo_status`
- `ilo_sync_x_followers`
- `ilo_x_follower_sync_status`
- `ilo_search_x_followers`
- `ilo_get_x_follower_profile`
- `ilo_create_draft`
- `ilo_list_drafts`
- `ilo_schedule_draft`
- `ilo_publish_draft`
- `ilo_publish_post`
- `ilo_run_scheduler`

Publishing tools require `confirm: true`.

## CLI fallback

```sh
ilo x status --json
ilo x followers sync <handle> --pages 20 --json
ilo x followers sync <handle> --background --json
ilo x followers status <handle> --json
ilo x followers profile <handle> <follower-handle> --json
ilo x followers search <handle> --query "works at cursor|vercel|sentry" --json
ilo x followers search <handle> --query "works at cursor|vercel|sentry" --csv ./matches.csv
ilo drafts create --text "Draft text" --json
ilo drafts create --reply-to <post-id-or-url> --text "Reply text" --image ./chart.png --alt "Chart description" --json
ilo drafts list --json
ilo drafts schedule <draft-id> --at "tomorrow at 9am" --json
```

After explicit confirmation:

```sh
ilo drafts publish <draft-id> --yes --json
ilo post --text "Approved text" --yes --json
ilo post --reply-to <post-id-or-url> --text "Approved reply" --yes --json
```

Use `ilo scheduler run --json` to inspect the result of a due-post pass. Treat it as a publishing action and confirm first.

## Follower research

Follower imports use public FxTwitter data and resume from the last saved page. A full import can take many calls for a large account. Check the returned coverage before reporting a count.

Use the CLI `--background` mode for an unattended full import. Use `ilo_get_x_follower_profile` or the CLI `profile` command when the task needs all stored public fields for one match. The raw provider object may contain fields beyond ilo's structured columns; treat it as public source data, not verified identity or employment evidence.

Search uses the local SQLite FTS5 index. For employer questions, report `current` as the conservative count and keep `former` and `unclear` separate. Include the returned public bio evidence. Do not present a partial import or an ambiguous bio as a complete employment record.

Follower research does not require a connected X account. Publishing does.

## Replies and images

Pass `replyToPostId` to create or publish a reply. It accepts a numeric X post id or an X post URL. X can still reject a target under its API access or conversation rules.

Posts and drafts accept up to four local JPEG, PNG, or WebP files. Use alt text when it adds useful context. A scheduled draft stores the image paths, so those files must remain available until it publishes.

## Setup

If no X account is connected:

1. Tell the user to create an X developer app with OAuth 2.0 read and write access.
2. Recommend the Native App type so PKCE works without a client secret.
3. Tell them to register `http://127.0.0.1:8976/callback` exactly.
4. Run `ilo start` interactively. It repeats these details before asking for the Client ID.

Do not invent provider charges, limits, or approval status. X controls those.
