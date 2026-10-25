# Compatibility and limitations

[日本語](Compatibility-and-Limitations.md) · [Home](Home-English.md)

- v0.82.3-ja.1 is an unpublished candidate. The current stable release remains v0.82.1-ja.1. Final candidate qualification is incomplete.
- Distribution targets unsigned Windows x64 only. No other operating-system binaries are provided. iOS simulator tests are not comprehensive Windows or physical-iOS-device guarantees.
- Running alongside official Nimbalyst is unsupported. Do not concurrently use multiple placements sharing this edition's default profile.
- Legacy-encryption team recovery requires the updated sync server and compatible clients. The complete production-organization and independent-client recovery flow remains unverified.
- Synthetic database migration tests do not establish compatibility with every existing profile. Back up documents before updating. Downgrade compatibility is not guaranteed.
- Google sign-in, special authentication recovery, service-side session revocation, and effective NTFS access involving other users remain unverified. Local logout and server-side revocation are separate operations.
- Windows symlink-fixture EPERM failures remain recorded. Sandbox rejection is unverified where fixture creation stops the test. Unverified behavior is not an established vulnerability.
- The latest iOS CI stopped at a history-size performance test. The fix restricting query scope has not completed iOS regression verification.
- Complete dynamic-translation coverage, all screens and DPI settings, external screen readers, and all native WSL paths remain unverified. Equal key counts do not establish complete UI translation.
- Upstream v0.82.3 is a prerelease. This edition uses a fixed commit and does not automatically include later upstream fixes.

There is no automatic updater. Do not bypass unsigned-file warnings or organizational security restrictions. Check download provenance, version, and checksums.
