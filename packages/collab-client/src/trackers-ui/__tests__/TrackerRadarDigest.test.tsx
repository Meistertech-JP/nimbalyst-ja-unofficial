// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInstance } from "i18next";
import { act, cleanup, render as rtlRender, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { resources } from "@nimbalyst/i18n/resources";
import { TrackerRadarDigest } from "../TrackerRadarDigest";
import { TrackerRadarView } from "../TrackerRadarView";
import type { TrackerRecord } from "@nimbalyst/runtime/core/TrackerRecord";

const testI18n = createInstance();
const testI18nReady = testI18n.init({
  lng: "en",
  fallbackLng: "en",
  resources,
  ns: Object.keys(resources.en),
  defaultNS: "common",
  interpolation: { escapeValue: false },
});

function renderDigest() {
  return rtlRender(
    <TrackerRadarDigest
      radar={{
        windowStart: 0,
        windowEnd: 0,
        windowHours: 24,
        windowSource: "default",
        lanes: [],
        ties: [],
        waitingOnYou: [],
        youHandedOff: [],
      }}
      needsYou={[]}
      moved={[]}
      sweeps={[]}
      stalled={[]}
      eventByAction={new Map()}
      laneByActorKey={new Map()}
      filterLabel="Aki"
      onClearFilter={() => undefined}
    />,
    { wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider> },
  );
}

function renderRadar(
  items: TrackerRecord[],
  lastSeenAt?: number,
  enrichmentByActorKey?: Record<string, { unpushedCommits?: number; divergence?: string }>,
) {
  return rtlRender(
    <TrackerRadarView
      items={items}
      lastSeenAt={lastSeenAt}
      enrichmentByActorKey={enrichmentByActorKey}
    />,
    { wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider> },
  );
}

beforeEach(async () => {
  await testI18nReady;
});

afterEach(() => cleanup());

describe("TrackerRadarDigest localization", () => {
  it("shows the filter context and empty state in English and Japanese", async () => {
    await testI18n.changeLanguage("en");
    const view = renderDigest();
    expect(screen.getByText(/Showing activity for/).textContent).toContain("Showing activity for");
    expect(screen.getByRole("button", { name: "Show everyone" }).textContent).toBe("Show everyone");
    expect(screen.getByText("You are caught up. No teammate comments or status changes are waiting on you.").textContent).toBe("You are caught up. No teammate comments or status changes are waiting on you.");

    await act(async () => {
      await testI18n.changeLanguage("ja");
    });
    expect(screen.getByText(/次のメンバーのアクティビティ：/).textContent).toContain("次のメンバーのアクティビティ：");
    expect(screen.getByRole("button", { name: "全員を表示" }).textContent).toBe("全員を表示");
    expect(screen.getByText("対応待ちのコメントやステータス変更はありません。").textContent).toBe("対応待ちのコメントやステータス変更はありません。");
    view.unmount();
  });

  it("localizes the empty state, window controls, and their accessible labels", async () => {
    await act(async () => {
      await testI18n.changeLanguage("ja");
    });
    const empty = renderRadar([]);
    expect(screen.getByText("この期間にアクティビティはありません。")).not.toBeNull();
    expect(screen.getByText("期間を広げると、チームの状況を確認できます。")).not.toBeNull();
    empty.unmount();

    const now = Date.now();
    const actor = {
      email: "member@example.com",
      displayName: "Member",
      gitName: null,
      gitEmail: null,
    };
    const item: TrackerRecord = {
      id: "item-1",
      issueKey: "NIM-1",
      primaryType: "task",
      typeTags: ["task"],
      source: "native",
      archived: false,
      syncStatus: "synced",
      system: {
        workspace: "/workspace",
        createdAt: new Date(now - 60 * 60_000).toISOString(),
        updatedAt: new Date(now - 60 * 60_000).toISOString(),
        activity: [{ id: "activity-1", authorIdentity: actor, timestamp: now - 60 * 60_000, action: "created" }],
      },
      fields: { title: "Example task", status: "open" },
    };
    const view = renderRadar(
      [item],
      now - 2 * 60 * 60_000,
      { "email:member@example.com": { unpushedCommits: 2 } },
    );
    expect(screen.getByText("レーダー")).not.toBeNull();
    expect(document.querySelector('[aria-label="レーダーの期間"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="メンバー"]')).not.toBeNull();
    expect(screen.getByRole("button", { name: "離席後" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "2時間" })).not.toBeNull();
    expect(screen.getByText(/の離席後 · 2時間/)).not.toBeNull();
    expect(screen.getByText("2件未プッシュ · ローカル")).not.toBeNull();
    expect(screen.getByText(/最終アクティビティ:/)).not.toBeNull();
    view.unmount();
  });
});
