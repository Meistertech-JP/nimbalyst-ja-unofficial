[日本語](Troubleshooting) | English

# Troubleshooting

## Windows warns about the file, or the app will not start

This edition is unsigned. Check the version, filename and SHA-256, and make sure the entire ZIP was extracted. This guide does not advise disabling warnings, antivirus or organizational protections. Stop if you cannot assess the file, and follow [Windows installation](Windows-Installation-English).

## An email link returns to 127.0.0.1 and fails

Keep the app open and use the link on the same Windows PC. A phone cannot return to the application on that PC. For an expired or used link, request a new email from the PC app. Do not rewrite the URL or expose a port externally. See [Account and Authentication](Account-and-Authentication-English).

## Some text is still English

Check [Display Language](Display-Language-English). Documents, AI replies and external service errors are not automatically translated. Some interface text and dynamic paths remain untranslated or unverified too.

## A long Markdown document causes high CPU use

This remains unresolved. Save your work first. Normal shutdown and restart are available, but are not a confirmed fix for the underlying problem. Disabling accessibility or security protections is not recommended.

If memory or other resource use grows after terminal use, save and quit normally. A general fix for terminal-resource retention has not been established. See [Compatibility and Limitations](Compatibility-and-Limitations-English).

## Startup stops with a profile warning, or data seems missing after an update

When a profile path was explicitly supplied, the app may stop if settings and database locations disagree. Do not disable the boundary protection or delete real settings or databases to retry. Check the launch method and distribution version.

Installed and ZIP copies use the same edition-specific profile by default. The ZIP's folder and the data location are different. Do not run versions simultaneously or assume downgrading is a recovery method. Follow the [update guide](Windows-Installation-English).

## Wiki or team features are unavailable

A compatible sync server and account access are required. CLI Wiki publishing is one-way team review, not a public website or two-way synchronization. This GitHub Wiki is also separate from the app's Local Wiki and Team Wiki. Live and older-server interoperability remain unverified.

## Reporting a problem

Use [Issues](https://github.com/Meistertech-JP/nimbalyst-ja-unofficial/issues) with the app version, Windows environment, steps, expected result and actual result. Do not attach sign-in links, codes, cookies, tokens, whole profiles or private documents. Redact sensitive information from screenshots.

[Testing and Verification](Testing-and-Verification-English) retains exact results and earlier-version history.
