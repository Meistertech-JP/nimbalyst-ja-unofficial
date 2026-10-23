// @vitest-environment jsdom
import React from "react";
import * as fs from "fs/promises";
import * as path from "path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import {
  projectRawMessagesToViewMessages,
  type RawMessage,
  type TranscriptViewMessage,
} from "@nimbalyst/runtime/ai/server/transcript";
import {
  AskUserQuestionWidget,
  CrossSessionToolWidget,
  EditorScreenshotWidget,
  TrackerToolWidget,
  VisualDisplayWidget,
  getCustomToolWidget,
} from "@nimbalyst/runtime/ui/AgentTranscript/components/CustomToolWidgets";

const RESOURCE_DIRECTORY = path.resolve(__dirname, '../../../../../../electron/resources');
const fixtureDirectory = (language: 'en' | 'ja') => path.join(RESOURCE_DIRECTORY,
  language === 'ja' ? 'tutorial-project-ja' : 'tutorial-project', 'sessions');
const TUTORIAL_ROOT = path.resolve("/tmp/Tutorial Fixture Projection");
const DRAFT_SESSION_ID = "11111111-1111-4111-8111-111111111111";
const TRIAGE_SESSION_ID = "22222222-2222-4222-8222-222222222222";
const EXAMPLE_BUG_ID = "tk_tutorial_example_bug";
const EXAMPLE_BUG_KEY = "NIM-6";

interface Fixture {
  session: { provider: string; title: string };
  messages: Array<{
    direction: RawMessage["direction"];
    source: string;
    content: string;
    hidden: boolean;
  }>;
}

async function loadAndProject(
  filename: string,
  sessionId: string,
  language: 'en' | 'ja' = 'en'
): Promise<TranscriptViewMessage[]> {
  const fixture = JSON.parse(
    await fs.readFile(path.join(fixtureDirectory(language), filename), "utf8")
  ) as Fixture;
  const rawMessages: RawMessage[] = fixture.messages.map((message, index) => ({
    id: index + 1,
    sessionId,
    source: message.source,
    direction: message.direction,
    content: JSON.stringify(materializeValues(JSON.parse(message.content))),
    createdAt: new Date(1_800_000_000_000 + index * 1_000),
    hidden: message.hidden,
  }));
  return projectRawMessagesToViewMessages(
    rawMessages,
    fixture.session.provider
  );
}

function materializeValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(materializeValues);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, materializeValues(entry)]));
  }
  return typeof value === 'string' ? value
    .replaceAll('{{TUTORIAL_ROOT}}', TUTORIAL_ROOT)
    .replaceAll('{{SESSION_ID:DRAFT_THE_PRODUCT_BRIEF}}', DRAFT_SESSION_ID)
    .replaceAll('{{SESSION_ID:TRIAGE_THE_LAUNCH_BUG}}', TRIAGE_SESSION_ID)
    .replaceAll('{{TRACKER_ID:EXAMPLE_BUG}}', EXAMPLE_BUG_ID)
    .replaceAll('{{TRACKER_ISSUE_KEY:EXAMPLE_BUG}}', EXAMPLE_BUG_KEY) : value;
}

afterEach(cleanup);

function toolMessages(messages: TranscriptViewMessage[]) {
  return messages.filter(
    (
      message
    ): message is TranscriptViewMessage & {
      toolCall: NonNullable<TranscriptViewMessage["toolCall"]>;
    } => Boolean(message.toolCall)
  );
}

describe("tutorial session fixtures", () => {
  it.each(['en', 'ja'] as const)("projects %s product-brief rich content through the production parser and widgets", async (language) => {
    const messages = toolMessages(
      await loadAndProject("01-draft-product-brief.json", DRAFT_SESSION_ID, language)
    );
    const byName = new Map(
      messages.map((message) => [message.toolCall.toolName, message])
    );

    expect([...byName.keys()]).toEqual([
      "Edit",
      "mcp__nimbalyst__display_to_user",
      "AskUserQuestion",
      "mcp__nimbalyst__capture_editor_screenshot",
    ]);
    expect(
      messages.every((message) => message.toolCall.status === "completed")
    ).toBe(true);
    expect(getCustomToolWidget("mcp__nimbalyst__display_to_user")).toBe(
      VisualDisplayWidget
    );
    expect(getCustomToolWidget("AskUserQuestion")).toBe(AskUserQuestionWidget);
    expect(
      getCustomToolWidget("mcp__nimbalyst__capture_editor_screenshot")
    ).toBe(EditorScreenshotWidget);
    expect(getCustomToolWidget("Edit")).toBeUndefined();
    expect(byName.get("Edit")?.toolCall.arguments).toMatchObject({
      old_string: language === 'ja' ? '初期版の対象は、製品のリリースを準備するチームです。'
        : "The first version is for a team preparing a product launch.",
    });
    expect(path.normalize(String(byName.get('Edit')?.toolCall.arguments.file_path)))
      .toBe(path.join(TUTORIAL_ROOT, 'product-brief.md'));
    expect(
      (
        byName.get("mcp__nimbalyst__display_to_user")?.toolCall.arguments
          .items as Array<{ chart: { data: unknown[] } }>
      )[0].chart.data
    ).toHaveLength(6);

    const question = byName.get("AskUserQuestion");
    expect(question?.toolCall.result).toContain(language === 'ja' ? '売上の勢い' : "Revenue momentum");
    const i18n = await createI18nInstance(language);
    render(
      <I18nextProvider i18n={i18n}>
      <AskUserQuestionWidget
        message={question!}
        isExpanded={false}
        onToggle={() => undefined}
        sessionId={DRAFT_SESSION_ID}
      />
      </I18nextProvider>
    );
    expect(screen.getByTestId("ask-user-question-widget").dataset.state).toBe(
      "completed"
    );
    expect(screen.getByTestId("ask-user-question-completed")).toBeDefined();
    expect(screen.queryByTestId("ask-user-question-pending")).toBeNull();
    expect(screen.getByTestId('ask-user-question-completed').textContent)
      .toBe(language === 'ja' ? '送信済み' : 'Submitted');
    expect(screen.getByTestId('ask-user-question-widget').textContent)
      .toContain(language === 'ja' ? '売上の勢い' : 'Revenue momentum');

    const screenshot = byName.get("mcp__nimbalyst__capture_editor_screenshot");
    const readFile = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
      <EditorScreenshotWidget
        message={screenshot!}
        isExpanded={false}
        onToggle={() => undefined}
        sessionId={DRAFT_SESSION_ID}
        workspacePath={TUTORIAL_ROOT}
        readFile={readFile}
      />
      </I18nextProvider>
    );
    const screenshotImage = await screen.findByAltText("dashboard.mockup.html");
    expect(screenshotImage.getAttribute("src")).toContain(
      "data:image/jpeg;base64,"
    );
    expect(readFile).not.toHaveBeenCalled();
  });

  it.each(['en', 'ja'] as const)("projects %s tracker and cross-session widgets with completed results", async (language) => {
    const messages = toolMessages(
      await loadAndProject("02-triage-launch-bug.json", TRIAGE_SESSION_ID, language)
    );

    expect(messages.map((message) => message.toolCall.toolName)).toEqual([
      "mcp__nimbalyst-trackers__tracker_create",
      "mcp__nimbalyst-trackers__tracker_link_session",
      "mcp__nimbalyst-host__spawn_session",
    ]);
    expect(
      messages.every((message) => message.toolCall.status === "completed")
    ).toBe(true);
    expect(getCustomToolWidget("mcp__nimbalyst-trackers__tracker_create")).toBe(
      TrackerToolWidget
    );
    expect(
      getCustomToolWidget("mcp__nimbalyst-trackers__tracker_link_session")
    ).toBe(TrackerToolWidget);
    expect(getCustomToolWidget("mcp__nimbalyst-host__spawn_session")).toBe(
      CrossSessionToolWidget
    );
    expect(messages.at(-1)?.toolCall.result).toContain(DRAFT_SESSION_ID);
    expect(messages[1]?.toolCall.arguments).toMatchObject({
      trackerId: EXAMPLE_BUG_ID,
    });
    expect(messages[0]?.toolCall.arguments.title).toBe(language === 'ja'
      ? '日付範囲を変更してもエクスポートが無効のままになる'
      : 'Export remains disabled after changing the date range');
  });

  it.each(['en', 'ja'] as const)("ends both %s sample sessions with the continuation note", async (language) => {
    const note =
      language === 'ja' ? '下の入力欄から、このセッションを続けることも、新しいセッションを始めることもできます。'
        : "Note to the user: You can type into the window below and continue this session or start a new one";
    for (const filename of [
      "01-draft-product-brief.json",
      "02-triage-launch-bug.json",
    ] as const) {
      const fixture = JSON.parse(
        await fs.readFile(path.join(fixtureDirectory(language), filename), "utf8")
      ) as Fixture;
      const finalPayload = JSON.parse(fixture.messages.at(-1)!.content) as {
        message: { content: Array<{ text?: string }> };
      };
      expect(finalPayload.message.content.at(-1)?.text).toBe(note);
    }
  });

  it.each(['en', 'ja'] as const)("references %s tutorial files that ship in the materialized project", async (language) => {
    const resourceRoot = path.dirname(fixtureDirectory(language));
    await expect(
      Promise.all(
        [
          "revenue.csv",
          "dashboard.mockup.html",
          "product-brief.md",
          "planning/plan-tutorial-walkthrough.md",
        ].map((relativePath) =>
          fs.access(path.join(resourceRoot, relativePath))
        )
      )
    ).resolves.toHaveLength(4);
  });
});
