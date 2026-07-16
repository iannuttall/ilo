# Privacy

The ilo CLI is local-first.

- Drafts and schedules stay in the local SQLite database.
- Typefully API keys, X OAuth tokens, and client secrets stay in the operating
  system keychain.
- Approved Typefully posts and media go to Typefully for publishing. Approved
  direct X posts and media go straight to X.
- Public research commands request the FxTwitter data needed for that command.
- The CLI does not require an ilo.so account or send drafts to an ilo backend.

The hosted website has separate information at [ilo.so/privacy](https://ilo.so/privacy).
