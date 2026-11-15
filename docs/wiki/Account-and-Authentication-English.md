[日本語](Account-and-Authentication) | English

# Accounts and Sign-in

**Nimbalyst sign-in is separate from AI-provider authentication.** A Nimbalyst account uses the official Nimbalyst service; this fork does not provide a separate account service. Claude, Codex, Grok and other agents require their own configuration and authentication.

## Sign in to Nimbalyst by email

1. Open Settings → Account and start email sign-in.
2. **Open the email link on the same Windows PC running the app.** Keep the app open during sign-in.
3. After the browser completes the flow, check that the account display has updated.

For a used or expired link, request a new email from the PC app. Do not send anyone your email link, authentication code, cookies or tokens.

## Why a phone cannot finish this sign-in

The return address, 127.0.0.1, points to the device running the browser. A link opened on a phone returns to the phone, not to the application on your PC.

There is no need to rewrite the URL, expose a port externally, change another app's protocol registration or disable protections. Use a fresh link on the same PC.

## Storage and sign-out

On Windows, credentials are stored encrypted. If encrypted storage fails, the implementation reports an error rather than switching to plaintext. Use the ordinary Sign out action under Settings → Account.

Removing local sign-in information is not the same as revoking a server-side session or deleting an account. Those server-side effects have not been established.

## Coverage and help

Email sign-in, restoration after restart and sign-out were observed in a dedicated environment with the regular Windows product. New sign-in was not repeated for every distribution form; Google sign-in, special recovery and service-side revocation remain unverified. [Testing and Verification](Testing-and-Verification-English) records exact product scope, counts and earlier versions; [Compatibility and Limitations](Compatibility-and-Limitations-English) explains current caveats.

This edition keeps a separate profile and does not claim the default `nimbalyst://` handler, but running alongside the official app is unsupported. Do not attach whole profiles or sign-in links to diagnostic reports. See [Troubleshooting](Troubleshooting-English).
