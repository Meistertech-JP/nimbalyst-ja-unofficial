import commonEn from './en/common.json';
import settingsEn from './en/settings.json';
import menuEn from './en/menu.json';
import sessionsEn from './en/sessions.json';
import agentsEn from './en/agents.json';
import editorEn from './en/editor.json';
import filesEn from './en/files.json';
import trackerEn from './en/tracker.json';
import gitEn from './en/git.json';
import extensionsEn from './en/extensions.json';
import dialogsEn from './en/dialogs.json';
import notificationsEn from './en/notifications.json';
import errorsEn from './en/errors.json';
import onboardingEn from './en/onboarding.json';
import aichatEn from './en/aichat.json';
import terminalEn from './en/terminal.json';
import voiceEn from './en/voice.json';
import projectEn from './en/project.json';
import mcpEn from './en/mcp.json';
import collabSidebarEn from './en/collabSidebar.json';
import fileEditsSidebarEn from './en/file_edits_sidebar.json';
import orgSharingEn from './en/orgSharing.json';
import cloudflareSandboxesEn from './en/cloudflareSandboxes.json';
import extensionMarketplaceEn from './en/extensionMarketplace.json';
import feedbackEn from './en/feedback.json';
import sqliteBrowserEn from './en/sqliteBrowser.json';

import commonJa from './ja/common.json';
import settingsJa from './ja/settings.json';
import menuJa from './ja/menu.json';
import sessionsJa from './ja/sessions.json';
import agentsJa from './ja/agents.json';
import editorJa from './ja/editor.json';
import filesJa from './ja/files.json';
import trackerJa from './ja/tracker.json';
import gitJa from './ja/git.json';
import extensionsJa from './ja/extensions.json';
import dialogsJa from './ja/dialogs.json';
import notificationsJa from './ja/notifications.json';
import errorsJa from './ja/errors.json';
import onboardingJa from './ja/onboarding.json';
import aichatJa from './ja/aichat.json';
import terminalJa from './ja/terminal.json';
import voiceJa from './ja/voice.json';
import projectJa from './ja/project.json';
import mcpJa from './ja/mcp.json';
import collabSidebarJa from './ja/collabSidebar.json';
import fileEditsSidebarJa from './ja/file_edits_sidebar.json';
import orgSharingJa from './ja/orgSharing.json';
import cloudflareSandboxesJa from './ja/cloudflareSandboxes.json';
import extensionMarketplaceJa from './ja/extensionMarketplace.json';
import feedbackJa from './ja/feedback.json';
import sqliteBrowserJa from './ja/sqliteBrowser.json';

export const resources = {
  en: {
    common: commonEn,
    settings: settingsEn,
    menu: menuEn,
    sessions: sessionsEn,
    agents: agentsEn,
    editor: editorEn,
    files: filesEn,
    tracker: trackerEn,
    git: gitEn,
    extensions: extensionsEn,
    dialogs: dialogsEn,
    notifications: notificationsEn,
    errors: errorsEn,
    onboarding: onboardingEn,
    aichat: aichatEn,
    terminal: terminalEn,
    voice: voiceEn,
    project: projectEn,
    mcp: mcpEn,
    collabSidebar: collabSidebarEn,
    file_edits_sidebar: fileEditsSidebarEn,
    orgSharing: orgSharingEn,
    cloudflareSandboxes: cloudflareSandboxesEn,
    extensionMarketplace: extensionMarketplaceEn,
    feedback: feedbackEn,
    sqliteBrowser: sqliteBrowserEn,
  },
  ja: {
    common: commonJa,
    settings: settingsJa,
    menu: menuJa,
    sessions: sessionsJa,
    agents: agentsJa,
    editor: editorJa,
    files: filesJa,
    tracker: trackerJa,
    git: gitJa,
    extensions: extensionsJa,
    dialogs: dialogsJa,
    notifications: notificationsJa,
    errors: errorsJa,
    onboarding: onboardingJa,
    aichat: aichatJa,
    terminal: terminalJa,
    voice: voiceJa,
    project: projectJa,
    mcp: mcpJa,
    collabSidebar: collabSidebarJa,
    file_edits_sidebar: fileEditsSidebarJa,
    orgSharing: orgSharingJa,
    cloudflareSandboxes: cloudflareSandboxesJa,
    extensionMarketplace: extensionMarketplaceJa,
    feedback: feedbackJa,
    sqliteBrowser: sqliteBrowserJa,
  },
} as const;

export type TranslationNamespace = keyof typeof resources.en;
