import React, { createRef, useEffect, useState } from "react";
import { cleanup, fireEvent, render as testingLibraryRender, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { createI18nInstance } from "@nimbalyst/i18n/core";
import { UiLanguageProvider } from "@nimbalyst/i18n/react";
import { AgentWorkstreamLayout } from "../AgentWorkstreamLayout";

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  englishI18n = await createI18nInstance("en");
  japaneseI18n = await createI18nInstance("ja");
});

function render(tree: React.ReactElement, language: "en" | "ja" = "en") {
  const i18n = language === "ja" ? japaneseI18n : englishI18n;
  return testingLibraryRender(tree, {
    wrapper: ({ children }) => (
      <UiLanguageProvider i18n={i18n} preference={language} systemLocale="en-US">
        {children}
      </UiLanguageProvider>
    ),
  });
}

afterEach(cleanup);

it("keeps the editor DOM and local editing state through placement, hiding, and maximize/restore", () => {
  const mounted = vi.fn();
  const unmounted = vi.fn();
  function Editor() {
    const [text, setText] = useState("saved");
    useEffect(() => {
      mounted();
      return unmounted;
    }, []);
    return (
      <textarea
        aria-label="Editor"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    );
  }
  const props = {
    panelRef: createRef<HTMLDivElement>(),
    editorRef: createRef<HTMLDivElement>(),
    sessionRef: createRef<HTMLDivElement>(),
    rightPanelRef: createRef<HTMLDivElement>(),
    placement: "above" as const,
    layoutMode: "split" as const,
    editorVisible: true,
    sidebarVisible: true,
    viewerSelected: false,
    sidebarWidth: 300,
    splitRatio: 0.5,
    draggingVertical: false,
    draggingSidebar: false,
    onVerticalResize: vi.fn(),
    onSidebarResize: vi.fn(),
    header: <span>Header</span>,
    editor: <Editor />,
    transcript: <span>Transcript</span>,
    sidebar: <span>Review</span>,
  };
  const view = render(<AgentWorkstreamLayout {...props} />);
  const input = view.getByRole("textbox") as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: "unsaved edit" } });
  input.setSelectionRange(2, 7);
  for (const state of [
    { placement: "right" as const, viewerSelected: true },
    {
      placement: "right" as const,
      viewerSelected: false,
      editorVisible: false,
    },
    {
      placement: "right" as const,
      viewerSelected: true,
      editorVisible: false,
      sidebarVisible: false,
    },
    {
      placement: "right" as const,
      viewerSelected: true,
      layoutMode: "editor" as const,
      sidebarVisible: false,
    },
    { placement: "right" as const, viewerSelected: true },
    { placement: "above" as const },
  ]) {
    view.rerender(
      <AgentWorkstreamLayout {...props} {...state} editor={<Editor />} />
    );
    expect(view.container.querySelector("textarea")).toBe(input);
    expect(input.value).toBe("unsaved edit");
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 7]);
  }
  expect(mounted).toHaveBeenCalledTimes(1);
  expect(unmounted).not.toHaveBeenCalled();
});

it("localizes workstream resize accessibility labels", () => {
  const props = {
    panelRef: React.createRef<HTMLDivElement>(),
    editorRef: React.createRef<HTMLDivElement>(),
    sessionRef: React.createRef<HTMLDivElement>(),
    rightPanelRef: React.createRef<HTMLDivElement>(),
    placement: "above" as const,
    layoutMode: "split" as const,
    editorVisible: true,
    sidebarVisible: true,
    viewerSelected: false,
    sidebarWidth: 300,
    splitRatio: 0.5,
    draggingVertical: false,
    draggingSidebar: false,
    onVerticalResize: vi.fn(),
    onSidebarResize: vi.fn(),
    header: <span>Header</span>,
    editor: <span>Editor</span>,
    transcript: <span>Transcript</span>,
    sidebar: <span>Review</span>,
  };

  render(<AgentWorkstreamLayout {...props} />, "ja");

  screen.getByRole("separator", { name: "ワークストリームのエディタ領域のサイズを変更" });
  screen.getByRole("separator", { name: "エージェントの右パネルのサイズを変更" });
});
