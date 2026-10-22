// @vitest-environment jsdom

import React from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createI18nInstance } from "@nimbalyst/i18n/core";
import { UiLanguageProvider } from "@nimbalyst/i18n/react";
import type { EditorHost } from "@nimbalyst/runtime";

vi.mock("@nimbalyst/runtime/canvas/CanvasEditor", () => ({
  CanvasEditor: () => <div data-testid="canvas-editor" />,
}));

import { MockupProjectCompatibilityEditor } from "../MockupProjectCompatibilityEditor";

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance("ja");
});

function renderJapanese(host: EditorHost) {
  return render(
    <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
      <MockupProjectCompatibilityEditor host={host} />
    </UiLanguageProvider>,
  );
}

function makeHost(readResult: (path: string, index: number) => boolean): EditorHost {
  const fs = {
    read: async (paths: string[]) => paths.map((path, index) => ({
      path,
      exists: readResult(path, index),
      content: readResult(path, index)
        ? JSON.stringify({ version: 1, name: "Legacy", mockups: [], connections: [] })
        : null,
      sha256: readResult(path, index) ? "sha256" : null,
    })),
    write: vi.fn(),
    onChanged: () => () => {},
  };

  return {
    filePath: "/workspace/legacy.mockupproject",
    fileName: "legacy.mockupproject",
    workspaceId: undefined,
    fs,
    collaboration: undefined,
    loadContent: async () => JSON.stringify({
      version: 1,
      name: "Legacy",
      mockups: [],
      connections: [],
    }),
    onFileChanged: () => () => {},
  } as unknown as EditorHost;
}

describe("MockupProjectCompatibilityEditor Japanese localization", () => {
  it("localizes the compatibility notice, conversion control, and preview state", async () => {
    renderJapanese(makeHost(() => true));

    expect(await screen.findByText("旧形式のMockup Project")).toBeDefined();
    expect(screen.getByText(/このファイルは読み取り専用/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Canvasに変換" })).toBeDefined();
    expect(await screen.findByTestId("canvas-editor")).toBeDefined();
  });

  it("localizes conversion failures and interpolates the existing target path", async () => {
    renderJapanese(makeHost(() => true));

    fireEvent.click(await screen.findByRole("button", { name: "Canvasに変換" }));

    expect(await screen.findByText(
      "/workspace/legacy.canvasには既にCanvasファイルがあります。どちらのファイルも変更されていません。",
    )).toBeDefined();
  });
});
