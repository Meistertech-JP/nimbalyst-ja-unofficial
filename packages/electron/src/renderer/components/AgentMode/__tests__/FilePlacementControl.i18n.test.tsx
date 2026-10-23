import React from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18nInstance } from "@nimbalyst/i18n/core";
import { FilePlacementControl, FilePlacementNotice } from "../FilePlacementControl";
import { agentFilePlacementAtom, agentFilePlacementNoticeAtom, setAgentFilePlacementAtom } from "../../../store/atoms/agentFilePlacement";
import { initWorkstreamState, workstreamRightPanelModeAtom, workstreamStateAtom } from "../../../store/atoms/workstreamState";

beforeEach(() => { initWorkstreamState("/file-placement-i18n-test"); });
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FilePlacementControl localization", () => {
  it("updates tooltip and accessible name on language changes without remounting or changing placement", async () => {
    const i18n = await createI18nInstance("en");
    const store = createStore();
    const { getByRole } = render(
      <I18nextProvider i18n={i18n}>
        <Provider store={store}><FilePlacementControl workstreamId="language-test" /></Provider>
      </I18nextProvider>,
    );
    const button = getByRole("button", { name: "Move files to the right" });
    expect(button.title).toBe("Move files to the right");
    await act(async () => { await i18n.changeLanguage("ja"); });
    expect(getByRole("button", { name: "ファイルを右側に移動" })).toBe(button);
    expect(button.title).toBe("ファイルを右側に移動");
    expect(store.get(agentFilePlacementAtom)).toBe("above");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(getByRole("button", { name: "Move files to the right" })).toBe(button);
  });

  it("moves the actual workstream in both directions and calls onBeforeMove before each change", async () => {
    const i18n = await createI18nInstance("ja");
    const store = createStore();
    store.set(workstreamStateAtom("placement-test"), { rightPanelMode: "review", filesSidebarVisible: false });
    const onBeforeMove = vi.fn(() => store.get(agentFilePlacementAtom));
    const { getByRole } = render(
      <I18nextProvider i18n={i18n}>
        <Provider store={store}><FilePlacementControl workstreamId="placement-test" onBeforeMove={onBeforeMove} /></Provider>
      </I18nextProvider>,
    );
    fireEvent.click(getByRole("button", { name: "ファイルを右側に移動" }));
    expect(onBeforeMove).toHaveNthReturnedWith(1, "above");
    expect(store.get(agentFilePlacementAtom)).toBe("right");
    expect(store.get(workstreamStateAtom("placement-test"))).toMatchObject({ rightPanelMode: "file-viewer", filesSidebarVisible: true, layoutMode: "split" });
    const button = getByRole("button", { name: "ファイルを会話履歴の上に移動" });
    expect(button.title).toBe("ファイルを会話履歴の上に移動");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(button.title).toBe("Move files above transcript");
    fireEvent.click(getByRole("button", { name: "Move files above transcript" }));
    expect(onBeforeMove).toHaveNthReturnedWith(2, "right");
    expect(store.get(agentFilePlacementAtom)).toBe("above");
    expect(store.get(workstreamRightPanelModeAtom("placement-test"))).toBe("review");
    expect(store.get(workstreamStateAtom("placement-test")).layoutMode).toBe("split");
  });

  it("translates both placement notices and preserves their expiration across language changes", async () => {
    const i18n = await createI18nInstance("ja");
    const store = createStore();
    vi.stubGlobal("electronAPI", { invoke: vi.fn().mockResolvedValue(undefined) });
    vi.useFakeTimers();
    const { getByRole, queryByRole } = render(
      <I18nextProvider i18n={i18n}>
        <Provider store={store}><FilePlacementNotice /></Provider>
      </I18nextProvider>,
    );
    await act(async () => { store.set(setAgentFilePlacementAtom, "right"); });
    expect(getByRole("status").textContent).toBe("エージェントモードではファイルが右側に開きます");
    act(() => { vi.advanceTimersByTime(2000); });
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(getByRole("status").textContent).toBe("Files open on the right in Agent mode");
    act(() => { vi.advanceTimersByTime(2500); });
    expect(queryByRole("status")).toBeNull();
    expect(store.get(agentFilePlacementNoticeAtom)).toBe("");
    await act(async () => { store.set(setAgentFilePlacementAtom, "above"); });
    expect(getByRole("status").textContent).toBe("Files open above the transcript in Agent mode");
    await act(async () => { await i18n.changeLanguage("ja"); });
    expect(getByRole("status").textContent).toBe("エージェントモードではファイルが会話履歴の上に開きます");
  });

  it("keeps the save-failure notice and placement when changing language after a failed persistence request", async () => {
    const i18n = await createI18nInstance("ja");
    const store = createStore();
    const invoke = vi.fn().mockRejectedValue(new Error("test persistence failure"));
    vi.stubGlobal("electronAPI", { invoke });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { getByRole } = render(
      <I18nextProvider i18n={i18n}>
        <Provider store={store}><FilePlacementNotice /></Provider>
      </I18nextProvider>,
    );
    await act(async () => { store.set(setAgentFilePlacementAtom, "right"); });
    expect(getByRole("status").textContent).toBe("ファイルの配置を保存できませんでした。アプリを再度開くとレイアウトが元に戻る場合があります。");
    expect(invoke).toHaveBeenCalledWith("app-settings:set", "agentFilePlacement", "right");
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(getByRole("status").textContent).toBe("Could not save file placement. Your layout may reset when you reopen the app.");
    expect(store.get(agentFilePlacementAtom)).toBe("right");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
