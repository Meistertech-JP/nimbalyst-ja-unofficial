// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

const startTutorial = vi.fn();
const getTutorialStatus = vi.fn();
const getRecentWorkspaces = vi.fn();
const getWorkspaceStats = vi.fn();

(window as unknown as { electronAPI: unknown }).electronAPI = {
  getResolvedThemeSync: () => "dark",
  onThemeChange: vi.fn(),
  workspaceManager: {
    getRecentWorkspaces,
    getWorkspaceStats,
  },
  tutorial: {
    getStatus: getTutorialStatus,
    start: startTutorial,
  },
};

const { WorkspaceManager } = await import("../WorkspaceManager");

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
});

function renderEnglish(tree: React.ReactElement) {
  return render(tree, {
    wrapper: ({ children }) => (
      <UiLanguageProvider i18n={englishI18n} preference="en" systemLocale="en-US">
        {children}
      </UiLanguageProvider>
    ),
  });
}

beforeEach(() => {
  getRecentWorkspaces.mockResolvedValue([]);
  getTutorialStatus.mockResolvedValue({ success: true, exists: false });
  getWorkspaceStats.mockResolvedValue({
    fileCount: 1,
    markdownCount: 1,
    totalSize: 10,
    recentFiles: [],
  });
  startTutorial.mockResolvedValue({
    success: true,
    reused: false,
    workspacePath: "/Documents/Nimbalyst Tutorial",
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("WorkspaceManager tutorial actions", () => {
  it.each([
    ['en', 'Try the interactive tutorial New'],
    ['ja', '操作チュートリアルを試す 新着'],
  ] as const)("excludes decorative icon ligatures from the %s welcome card's accessibility tree", async (locale, buttonName) => {
    const i18n = await createI18nInstance(locale);
    render(
      <UiLanguageProvider i18n={i18n} preference={locale} systemLocale={locale}>
        <WorkspaceManager />
      </UiLanguageProvider>,
    );
    const grid = await screen.findByTestId("workspace-manager-welcome-feature-grid");
    const icons = grid.querySelectorAll(".workspace-manager-welcome-feature-icon span");
    expect(icons).toHaveLength(4);
    for (const icon of icons) expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("button", { name: buttonName })).not.toBeNull();
  });

  it("starts the tutorial from the welcome card CTA", async () => {
    renderEnglish(<WorkspaceManager />);

    fireEvent.click(
      await screen.findByTestId("workspace-manager-welcome-tutorial-cta")
    );

    await waitFor(() => expect(startTutorial).toHaveBeenCalledOnce());
  });

  it("shows Open tutorial in both locations when a materialized tutorial exists", async () => {
    getTutorialStatus.mockResolvedValue({
      success: true,
      exists: true,
      workspacePath: "/Documents/Nimbalyst Tutorial",
    });
    startTutorial.mockResolvedValue({
      success: true,
      reused: true,
      workspacePath: "/Documents/Nimbalyst Tutorial",
    });

    renderEnglish(<WorkspaceManager />);

    // Both buttons render immediately in their "no tutorial yet" state and only
    // relabel once `tutorial.getStatus()` resolves. Waiting for the *element*
    // would resolve against that first paint — which it did, intermittently,
    // whenever React's scheduler macrotask lost the race to testing-library's
    // under a loaded full-suite run. Wait for the label instead.
    await waitFor(() =>
      expect(
        screen.getByTestId("workspace-manager-sidebar-tutorial-button")
          .textContent
      ).toContain("Open tutorial")
    );
    expect(
      screen.getByTestId("workspace-manager-welcome-tutorial-cta")
        .textContent
    ).toContain("Open tutorial");
    expect(
      within(
        screen.getByTestId("workspace-manager-welcome-tutorial-cta")
      ).queryByText("New")
    ).toBeNull();

    expect(startTutorial).not.toHaveBeenCalled();
  });

  it("renders the welcome card only while no workspace is selected", async () => {
    getRecentWorkspaces.mockResolvedValue([
      {
        path: "/projects/alpha",
        name: "alpha",
        lastOpened: 1700000000000,
        exists: true,
        markdownCount: 2,
      },
    ]);

    renderEnglish(<WorkspaceManager />);

    expect(
      await screen.findByTestId("workspace-manager-welcome-card")
    ).not.toBeNull();

    fireEvent.click(await screen.findByText("alpha"));

    await waitFor(() =>
      expect(
        screen.queryByTestId("workspace-manager-welcome-card")
      ).toBeNull()
    );
  });

  it("surfaces a tutorial start failure in the manager error toast", async () => {
    getTutorialStatus.mockResolvedValue({ success: true, exists: false });
    startTutorial.mockResolvedValue({
      success: false,
      error: "Tutorial template directory does not exist",
    });

    renderEnglish(<WorkspaceManager />);
    fireEvent.click(
      await screen.findByTestId("workspace-manager-sidebar-tutorial-button")
    );

    expect(
      await screen.findByText("Tutorial template directory does not exist")
    ).not.toBeNull();
  });
});
