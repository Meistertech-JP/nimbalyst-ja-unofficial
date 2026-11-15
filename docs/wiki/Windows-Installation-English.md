[日本語](Windows-Installation) | English

# Windows Installation and Updates

Download **v0.84.0-ja.1 for Windows x64** from the [Release page](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/releases/tag/v0.84.0-ja.1). It is a separate, unofficial app with unsigned files. Upstream v0.84.0 is a prerelease; this edition's regular Release designation is not a stability guarantee.

## Choose a format

- **setup.exe:** a current-user installation with Windows app-list entries and shortcuts.
- **Portable ZIP:** extract every file into a new folder and run it there. Do not take only the EXE or run it inside the archive.

ZIP does not mean a profile stored beside the EXE. By default it shares this edition's profile with an installed copy, so do not run both at once. Running alongside the official app is also unsupported.

## Check the download

Compare the SHA-256 with the entry for the same filename in the same Release's SHA256SUMS.txt. In PowerShell:

~~~powershell
$artifact = Read-Host 'Full path of the downloaded file'
Get-FileHash -LiteralPath $artifact -Algorithm SHA256
~~~

Do not run or extract a mismatch. A matching hash is not a digital signature or safety guarantee. This guide does not instruct you to disable SmartScreen, antivirus or other protections. Stop if you cannot assess the file.

## Install for the first time

1. Save work and close both editions.
2. For the installer, check the product name Nimbalyst 日本語版（非公式） and use a location separate from the official app. Launch from its shortcut after completion.
3. For ZIP, extract the entire payload into a new writable folder and run Nimbalyst 日本語版（非公式）.exe.
4. Follow the welcome screen and open the tutorial or a working folder. Continue with [Getting Started](Getting-Started-English).

The installer is per-user and does not launch the app automatically. It adds a Markdown Open With entry but is not configured to replace the default app, UserChoice or the default `nimbalyst://` handler.

## Settings and documents

The default profile is `%APPDATA%\Nimbalyst 日本語版（非公式）`. Official data is not automatically moved or deleted. Keep documents outside the application folder and do not share your whole profile.

See [Display Language](Display-Language-English) and [Account and Authentication](Account-and-Authentication-English).

## Update from v0.82.8-ja.1

Updates are manual. Do not use an official-edition installer to update this fork.

1. Read the [release notes](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/main/RELEASE_NOTES_v0.84.0-ja.1.en.md) and [limitations](Compatibility-and-Limitations-English).
2. Save work, back up important documents and quit.
3. Update the same unofficial installation with setup.exe, or extract the entire ZIP into a new folder rather than over the old copy.
4. Check settings, documents and Tracker. Do not run different versions against the same profile simultaneously.

Dedicated upgrade checks retained settings, documents and displayed Tracker data, not every possible profile or database field. Do not force-quit during migration or assume downgrading is a recovery method. An older app may not understand newer session information.

## Uninstall

Choose this edition in Windows' app list for an installed copy. Its own registrations are removed and user data is configured to remain. For ZIP, quit and remove its extracted folder. These operations are separate from deleting documents or a profile elsewhere.

The [Windows guide](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/blob/main/docs/WINDOWS_JA_UNOFFICIAL.md#english) has more detailed instructions and safety information. [Testing and Verification](Testing-and-Verification-English) retains results for each version.
