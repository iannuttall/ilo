# Security

Please report security issues privately through GitHub's security advisory feature for this repository.

Do not open a public issue containing credentials, tokens, personal data, or a working exploit.

ilo stores social OAuth tokens and optional client secrets in the operating system keychain. Non-secret configuration and the local SQLite database live under `~/.config/ilo` by default.
