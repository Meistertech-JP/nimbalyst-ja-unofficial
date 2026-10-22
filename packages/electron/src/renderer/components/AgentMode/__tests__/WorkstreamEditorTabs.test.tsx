import React, { createRef, type ReactNode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { I18nextProvider } from "react-i18next";
import { createI18nInstance } from "@nimbalyst/i18n/core";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import {
  WorkstreamEditorTabs,
  type WorkstreamEditorTabsRef,
} from "../WorkstreamEditorTabs";
import {
  initWorkstreamState,
  workstreamStateAtom,
  workstreamStatesLoadedAtom,
} from "../../../store/atoms/workstreamState";
import { revealEditorPosition } from "../../TabEditor/editorRevealCommand";
import { agentFilePlacementAtom } from "../../../store/atoms/agentFilePlacement";

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance("en"),
    createI18nInstance("ja"),
  ]);
});

const { actions, tabs, openDialog } = vi.hoisted(() => ({
  openDialog: vi.fn(),
  actions: {
    addTab: vi.fn(),
    switchTab: vi.fn(),
    findTabByPath: vi.fn(),
    removeTab: vi.fn(),
  },
  tabs: [] as Array<{ id: string; filePath: string; kind: "file" }>,
}));
vi.mock("../../../contexts/DialogContext", () => ({
  useDialog: () => ({ open: openDialog, close: vi.fn(), activeDialogs: [] }),
}));
vi.mock("../../../contexts/TabsContext", () => ({
  TabsProvider: ({ children }: { children: ReactNode }) => children,
  useTabs: () => ({ tabs, activeTabId: null }),
  useTabsActions: () => actions,
  useTabNavigationShortcuts: () => {},
}));
vi.mock("../../TabManager/TabManager", () => ({ TabManager: () => null }));
vi.mock("../../TabContent/TabContent", () => ({ TabContent: () => null }));
vi.mock("../FilePlacementControl", () => ({
  FilePlacementControl: () => null,
  FilePlacementNotice: () => null,
}));
vi.mock("../../TabEditor/editorRevealCommand", () => ({
  revealEditorPosition: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  tabs.splice(0);
});

it("opens file quick open in the worktree and routes the selection into this viewer", () => {
  initWorkstreamState("/project");
  const store = createStore();
  const id = "quick-open-editor";
  render(
    <Provider store={store}>
      <I18nextProvider i18n={englishI18n}>
        <WorkstreamEditorTabs
          workstreamId={id}
          workspacePath="/project"
          basePath="/project-worktree"
        />
      </I18nextProvider>
    </Provider>
  );
  fireEvent.click(screen.getByRole("button", { name: "Open file…" }));
  expect(openDialog).toHaveBeenCalledWith("unified-quick-open", expect.objectContaining({
    initialTab: "files",
    workspacePath: "/project-worktree",
    onFileSelect: expect.any(Function),
  }));
  expect(actions.addTab).not.toHaveBeenCalled();
  act(() => openDialog.mock.calls[0][1].onFileSelect("/project-worktree/source.ts"));
  expect(actions.addTab).toHaveBeenCalledWith("/project-worktree/source.ts");
  expect(store.get(workstreamStateAtom(id)).layoutMode).toBe("split");
});

it("does not mirror an empty hidden editor before hydration, forwards file locations, and acknowledges hidden tracker opens", () => {
  initWorkstreamState("/placement-test");
  const store = createStore();
  const id = "hidden-editor";
  const saved = [
    {
      resource: {
        kind: "file" as const,
        resourceId: "/saved.md",
        filePath: "/saved.md",
      },
    },
  ];
  store.set(workstreamStateAtom(id), { openResources: saved });
  const ref = createRef<WorkstreamEditorTabsRef>();
  render(
    <Provider store={store}>
      <I18nextProvider i18n={englishI18n}>
        <WorkstreamEditorTabs
          ref={ref}
          workstreamId={id}
          workspacePath="/placement-test"
          isActive={false}
        />
      </I18nextProvider>
    </Provider>
  );
  expect(store.get(workstreamStateAtom(id)).openResources).toEqual(saved);
  act(() => store.set(workstreamStatesLoadedAtom, true));
  expect(actions.addTab).toHaveBeenCalledWith("/saved.md");
  act(() => ref.current?.openFile("/source.ts", { line: 37, column: 4 }));
  expect(revealEditorPosition).toHaveBeenCalledWith("/source.ts", {
    line: 37,
    column: 4,
  });
  const event = new CustomEvent("nimbalyst:workstream-open-tracker", {
    detail: { workstreamId: id, trackerItemId: "tracker-1" },
    cancelable: true,
  });
  act(() => {
    window.dispatchEvent(event);
  });
  expect(event.defaultPrevented).toBe(true);
  expect(actions.addTab).toHaveBeenCalledWith("tracker://tracker-1");
  expect(store.get(workstreamStateAtom(id)).layoutMode).toBe("split");
});

it("localizes the workstream file viewer and its maximize control", () => {
  initWorkstreamState("/localized-viewer");
  const store = createStore();
  store.set(agentFilePlacementAtom, "right");
  tabs.push({ id: "tab-1", filePath: "/notes.md", kind: "file" });
  render(
    <Provider store={store}>
      <I18nextProvider i18n={japaneseI18n}>
        <WorkstreamEditorTabs
          workstreamId="localized-viewer"
          workspacePath="/localized-viewer"
        />
      </I18nextProvider>
    </Provider>,
  );

  expect(screen.getByText("ファイルビューア")).toBeDefined();
  const maximizeButton = screen.getByRole("button", {
    name: "ファイルビューアを最大化または元に戻す",
  });
  expect(maximizeButton.getAttribute("title")).toBe(
    "ファイルビューアを最大化または元に戻す",
  );
});

it("localizes the empty viewer prompt and open-file action", () => {
  initWorkstreamState("/localized-empty-viewer");
  const store = createStore();
  render(
    <Provider store={store}>
      <I18nextProvider i18n={japaneseI18n}>
        <WorkstreamEditorTabs
          workstreamId="localized-empty-viewer"
          workspacePath="/localized-empty-viewer"
        />
      </I18nextProvider>
    </Provider>,
  );

  expect(screen.getByText("表示するファイルを開いてください")).toBeDefined();
  expect(screen.getByRole("button", { name: "ファイルを開く…" })).toBeDefined();
});
