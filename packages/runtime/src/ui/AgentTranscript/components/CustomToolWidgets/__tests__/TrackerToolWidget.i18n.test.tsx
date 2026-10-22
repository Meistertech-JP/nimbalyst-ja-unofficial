// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { TrackerToolWidget } from '../TrackerToolWidget';
import type { CustomToolWidgetProps } from '../index';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => cleanup());

function renderArchiveChange(archived: boolean) {
  const message = {
    toolCall: {
      toolName: 'tracker_update',
      arguments: {},
      result: {
        summary: 'updated',
        structured: {
          action: 'updated',
          id: 'TASK-1',
          type: 'task',
          title: 'Localization task',
          changes: { archived: { from: !archived, to: archived } },
        },
      },
    },
  } as unknown as CustomToolWidgetProps['message'];

  return render(
    <I18nextProvider i18n={japaneseI18n}>
      <TrackerToolWidget
        message={message}
        isExpanded={false}
        onToggle={() => {}}
        sessionId="session-1"
      />
    </I18nextProvider>,
  );
}

describe('TrackerToolWidget localization', () => {
  it('renders tracker field labels in Japanese', () => {
    const message = {
      toolCall: {
        toolName: 'tracker_create',
        arguments: {},
        result: {
          summary: 'created',
          structured: {
            action: 'created',
            item: {
              id: 'TASK-2',
              type: 'task',
              title: 'Localization task',
              status: 'todo',
              priority: 'high',
              tags: ['i18n'],
            },
          },
        },
      },
    } as unknown as CustomToolWidgetProps['message'];

    render(
      <I18nextProvider i18n={japaneseI18n}>
        <TrackerToolWidget message={message} isExpanded={false} onToggle={() => {}} sessionId="session-1" />
      </I18nextProvider>,
    );

    expect(screen.getByText('タイプ')).toBeDefined();
    expect(screen.getByText('タイトル')).toBeDefined();
    expect(screen.getByText('ステータス')).toBeDefined();
    expect(screen.getByText('優先度')).toBeDefined();
    expect(screen.getByText('タグ')).toBeDefined();
  });

  it('renders the archived state in Japanese', () => {
    renderArchiveChange(true);

    expect(screen.getByText('アーカイブ')).toBeDefined();
    expect(screen.getByText('アーカイブ済み')).toBeDefined();
  });

  it('renders the unarchived state in Japanese', () => {
    renderArchiveChange(false);

    expect(screen.getByText('アーカイブ解除済み')).toBeDefined();
  });
});
