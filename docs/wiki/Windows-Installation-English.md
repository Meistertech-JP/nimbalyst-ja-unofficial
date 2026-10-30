[日本語](Windows-Installation) | English

# Windows Installation and Updates

## v0.82.4-ja.1

Download `nimbalyst-0.82.4-ja.1-windows-x64-setup.exe`, `nimbalyst-0.82.4-ja.1-windows-x64-portable.zip`, `nimbalyst-0.82.4-ja.1-source.zip` and `SHA256SUMS.txt` from the [release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.4-ja.1). This is an unsigned Windows x64 regular stable release based on upstream v0.82.4. Automatic updates are disabled; follow the manual-update procedure below.

The ordinary product was checked for Japanese/English switching, persistence of explicit Japanese and English settings after restart, Japanese resolved from System, and file, search and image display. An earlier build with matching relevant product code was used for production email sign-in, sign-out and clean installation. The final distribution payload was checked for upgrade installation, retained settings/documents/Tracker items, ordinary uninstall and retained data. This does not establish every data-upgrade or authentication path. See [Testing and Verification](Testing-and-Verification-English) for the scope.

## v0.82.3-ja.2

Download `nimbalyst-0.82.3-ja.2-windows-x64-setup.exe`, `nimbalyst-0.82.3-ja.2-windows-x64-portable.zip`, the matching source ZIP and `SHA256SUMS.txt` from the [release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.2). This is an unsigned regular stable release. Its new packages include corrected bundled guides; they are not renamed older binaries. See [Testing and Verification](Testing-and-Verification-English) for native observations and unverified areas. Earlier results below remain historical.

## v0.82.3-ja.1

v0.82.3-ja.1 is an unsigned Windows x64 edition. The NSIS and portable ZIP packages were rebuilt from the product fix and their payloads checked. Installation, upgrade and removal have not been performed on this version; earlier product observations do not qualify these operations. Refer to the [release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.3-ja.1) for distribution files. The procedures below describe general Windows installation and update operations.

## v0.82.1-ja.1

Obtain the Windows x64 NSIS installer, portable ZIP, source ZIP and SHA256SUMS.txt from the [stable release](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.1-ja.1). Use the filenames listed in its assets. The application and installer are unsigned. The verification, installation, storage, manual-update and removal procedures below also apply.

Upgrade from v0.81.7-ja.3 retained the English setting, project, test document and SQLite backend. The document SHA-256 was unchanged. Ordinary uninstall retained test data after both fresh and upgraded installations; the 12 sampled association entries returned to their prior state. This was not a whole-registry comparison or a test of downgrade compatibility.

This distribution targets Windows x64. v0.82.1-ja.1 is an unsigned stable release. Running it alongside the official Nimbalyst application is not supported.

## Downloading and verifying files

Obtain the NSIS installer, Windows portable ZIP, matching source ZIP and SHA256SUMS.txt from the [release assets](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.82.4-ja.1).

Compare filenames and hashes against the asset list and SHA256SUMS.txt from the same release.

In PowerShell, specify the full path of the downloaded file.

```powershell
$artifact = Read-Host 'Full path of the file to verify'
Get-FileHash -LiteralPath $artifact -Algorithm SHA256
```

Compare the displayed 64-digit hash with the value for the same filename in `SHA256SUMS.txt` from the same release. Letter case does not affect the value. If they differ, do not run or extract the file.

The application and installer have no Authenticode signature. SmartScreen or other security products may display warnings. Instructions for disabling protection are not provided. SHA-256 confirms byte-for-byte correspondence with the distribution file; it is not a code signature that authenticates the publisher or proof of safety.

## Installer edition

1. Save your edits and close both this edition and the official application.
2. Run the verified setup.exe and confirm that the product name is “Nimbalyst 日本語版（非公式）”.
3. Use an installation path separate from the official edition. This is a per-user configuration; an administrator installation is not provided.
4. After installation, launch this edition from its shortcut. The installer is configured not to launch it automatically on completion.

The default installation path is `%LOCALAPPDATA%\Programs\nimbalyst-ja-unofficial`, and user data is stored at `%APPDATA%\Nimbalyst 日本語版（非公式）`. Official-edition data is not automatically moved or deleted. This edition adds its own entry to Markdown's Open with options, but is configured not to change the default application, Explorer's UserChoice, or the default `nimbalyst://` registration.

## ZIP edition

Extract the entire ZIP into a new writable directory and run `Nimbalyst 日本語版（非公式）.exe`. Do not extract only the EXE or run it directly from inside the ZIP. Keep the bundled DLLs, `resources`, and other contents together.

“Portable” means a distribution that does not use an installer. It does not mean that settings are saved next to the EXE. By default, it uses the same edition-specific profile as the installer edition. Moving or deleting the ZIP's extracted directory is separate from moving or deleting that profile.

## Quitting, updating, and removing

Use Quit in the File menu and wait for shutdown to finish. Before updating, save documents, shut down this edition normally, and back up project documents. Automatic official updates and manual official-update checks are disabled. Read the changes and limitations for the target version in this fork's Releases, verify the new distribution, and update manually.

For the ZIP edition, extract the full contents into a new directory rather than overwriting the old directory. Do not run different versions against the same profile simultaneously. Profile compatibility when reverting to an older version is not guaranteed.

To remove the installer edition, select this edition in Windows's app list. The uninstaller is configured to remove registrations and shortcuts owned by the current installation while preserving user data. For the ZIP edition, its extracted directory can be deleted after normal shutdown. Distinguish application removal from deletion of documents, credentials, and settings.

For v0.82.1-ja.1, production authentication, language switching and upgrade were checked in an ordinary build with matching product code. The rebuilt NSIS also passed clean installation, verification of every payload hash and ordinary uninstall. [Testing and Verification](Testing-and-Verification-English) describes the scope.

Continue to [Display Language](Display-Language-English) and [Account and Authentication](Account-and-Authentication-English). For problems, see [Troubleshooting](Troubleshooting-English) and [Compatibility and Limitations](Compatibility-and-Limitations-English).
