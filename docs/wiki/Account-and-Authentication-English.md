[日本語](Account-and-Authentication) | English

# Account and Authentication

## v0.82.4-ja.1

An earlier ordinary Windows product build with unchanged authentication/startup code was checked for production email sign-in, a same-PC localhost callback, encrypted storage, restart restoration, normal sign-out and a signed-out restart. A new email sign-in was not repeated on the final distribution itself. Regression tests cover nonce handling, fail-closed storage and prevention of state restoration from stale responses. Live callback modification/replay, Google sign-in, special recovery, server-side session revocation and effective NTFS access by another user remain unverified.

## v0.82.3-ja.2

Production authentication has not been repeated on this binary. Existing policies for nonce-protected localhost callbacks, encrypted storage and ordinary sign-out are retained, but source/contract-test checks differ from live sign-in in the ordinary product. Earlier authentication results remain historical results for those versions. Google sign-in, special recovery, server-side session revocation and cross-user NTFS effective access remain unverified.

## v0.82.3-ja.1

Authentication, NSIS installation, upgrade and removal were not repeated on the v0.82.3-ja.1 Windows build. The product changes did not alter authentication or installer inputs, but that is not a substitute for runtime checks. Authentication results from earlier products apply only to those versions. Google sign-in, special recovery, server-side session revocation and effective NTFS access by another user also remain unverified. The procedures and storage policies below describe the implementation.

## v0.82.1-ja.1

Production email sign-in was checked in the ordinary Windows product build, including a same-PC localhost callback, encrypted storage, authenticated restart, ordinary sign-out and a signed-out restart. Contract tests cover nonce mismatch and replay rejection; live account callbacks were not modified or replayed. Google sign-in, special recovery paths, server-side session revocation and effective NTFS access from other accounts remain unverified.

Nimbalyst accounts use the official Nimbalyst service. This fork does not provide a separate authentication server or account system. Signing in to Nimbalyst is separate from authenticating individual agents such as Claude, Codex, or Grok.

## Email authentication

1. Start email authentication from the application's account screen.
2. When the email arrives, open its link on the same Windows PC that is running the application.
3. After authentication in the browser, return through the current instance's localhost callback.
4. Confirm that the account display in the application has updated.

The callback is `http://127.0.0.1:<port>/auth/callback`. It has an instance-specific nonce, and acceptance is treated as single-use. Do not share actual callback URLs, nonces, authentication codes, or Magic Links.

`127.0.0.1` refers to the device running the browser itself. Opening the email link on a smartphone attempts to connect to the smartphone, so it cannot return the authentication result to the application on Windows. If the link has been used or expired, request a new email from the application on the PC. Do not rewrite the URL or expose the port externally.

## Storage, restoration, and logout

On Windows, credentials are stored encrypted, and the implementation reflects the signed-in state only after storage succeeds. If encrypted storage fails, it reports an error rather than falling back to plaintext storage. To avoid races between local credentials and logout state, stale asynchronous update responses are prevented from restoring the state.

The v0.82.4-ja.1 authentication scope is stated at the beginning of this article. Live authentication was also checked for v0.82.1-ja.1, but was not repeated for v0.82.3-ja.1 or v0.82.3-ja.2. Earlier versions retain their own verification scope in their release notes.

Removing local information during logout is different from invalidating service-side sessions, covering every token-refresh path, or deleting an account. Service-side invalidation is not guaranteed. Google authentication and some Stytch recovery paths are unverified.

Observed permissions on credential and SQLite-related files do not establish effective NTFS access for every user and group. See the [release notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1) and [Testing and Verification](Testing-and-Verification-English) for the scope.

## Relationship with the official edition

The Windows edition does not claim the default `nimbalyst://` handler and uses localhost for authentication. Other links using that protocol may open in the application already registered to handle them. Application identifiers and profiles are separate, but running alongside the official edition is not supported.

For problems, see [Troubleshooting](Troubleshooting-English). Do not attach entire profiles, cookies, tokens, or email links to diagnostic reports.
