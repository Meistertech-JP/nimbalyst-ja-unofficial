/**
 * Regression test for GitHub issue #1418.
 *
 * The transcript is virtualized, so a widget scrolled out of view unmounts.
 * `EditTextRenderer` seeded its Lexical editor from `field.initialText` rather
 * than from the live draft, so a remount re-seeded the editor with the agent's
 * original text -- and OnChangePlugin then wrote that seed back over the draft
 * atom, destroying minutes of typing with no way to recover it.
 *
 * The editor must be seeded from the draft, which survives unmount.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { Provider as JotaiProvider } from 'jotai';
import { store } from '../../../../../store/store';
import { setInteractiveWidgetHost } from '../../../../../store/atoms/interactiveWidgetHost';
import {
  clearRequestUserInputDraft,
  requestUserInputDraftAtom,
} from '../../../../../store/atoms/requestUserInputDraft';
import { RequestUserInputWidget } from '../RequestUserInputWidget';
import { ReorderList } from '../shared/ReorderList';
import type { InteractiveWidgetHost } from '../InteractiveWidgetHost';

const SESSION_ID = 'session-1418';
const PROMPT_ID = 'tool-call-edittext-1418';
const SEED = 'Agent-supplied draft.';
const TYPED = 'Ten minutes of carefully written user input.';

function makeMessage(result: string | null = null) {
  return {
    toolCall: {
      providerToolCallId: PROMPT_ID,
      arguments: {
        title: 'Review the draft',
        fields: [
          { type: 'editText', id: 'body', label: 'Body', format: 'plain', initialText: SEED },
        ],
      },
      result,
    },
  } as any;
}

function renderWidget() {
  return render(
    <JotaiProvider store={store}>
      <RequestUserInputWidget
        message={makeMessage()}
        sessionId={SESSION_ID}
        isExpanded
        onToggle={() => {}}
      />
    </JotaiProvider>,
  );
}

function draftText(): string | undefined {
  const field = store.get(requestUserInputDraftAtom(PROMPT_ID)).fields.body;
  return field?.type === 'editText' ? field.state.text : undefined;
}

describe('RequestUserInputWidget editText draft survival', () => {
  beforeEach(() => {
    clearRequestUserInputDraft(PROMPT_ID);
    setInteractiveWidgetHost(SESSION_ID, {
      requestUserInputSubmit: vi.fn().mockResolvedValue(undefined),
      requestUserInputCancel: vi.fn().mockResolvedValue(undefined),
    } as unknown as InteractiveWidgetHost);
  });

  it('keeps the typed text across an unmount/remount cycle', async () => {
    const first = renderWidget();
    await act(async () => {});
    expect(draftText()).toBe(SEED);

    // Stand in for the user typing: OnChangePlugin writes exactly this.
    await act(async () => {
      store.set(requestUserInputDraftAtom(PROMPT_ID), (prev) => ({
        ...prev,
        fields: { ...prev.fields, body: { type: 'editText', state: { text: TYPED } } },
      }));
    });
    expect(draftText()).toBe(TYPED);

    // Scrolled out of view, then back.
    first.unmount();
    renderWidget();
    await act(async () => {});

    expect(draftText()).toBe(TYPED);
    expect(screen.getByTestId('request-user-input-edittext-content').textContent).toContain(TYPED);
  });
});

describe('RequestUserInputWidget closed states', () => {
  const renderClosed = (result: string | null, superseded?: boolean) => render(
    <JotaiProvider store={store}>
      <RequestUserInputWidget message={makeMessage(result)} sessionId={SESSION_ID} isExpanded onToggle={() => {}} superseded={superseded} />
    </JotaiProvider>,
  );

  it.each([
    ['a durable superseded result', '{"answers":{},"cancelled":true,"reason":"superseded"}', undefined],
    ['the transcript flag on an older transcript', null, true],
  ])('renders skipped and unanswerable for %s', (_label, result, superseded) => {
    renderClosed(result, superseded);
    screen.getByTestId('request-user-input-skipped');
    expect(screen.queryByTestId('request-user-input-cancelled')).toBeNull();
    expect(screen.queryByTestId('request-user-input-submit')).toBeNull();
    expect(screen.queryByTestId('request-user-input-cancel')).toBeNull();
  });

  it('keeps a plain cancel distinct from a skip', () => {
    renderClosed('{"answers":{},"cancelled":true}');
    screen.getByTestId('request-user-input-cancelled');
    expect(screen.queryByTestId('request-user-input-skipped')).toBeNull();
  });
});

it('localizes the shared reorder controls and removed-item summary', async () => {
  const i18n = await createI18nInstance('ja');
  const Wrapper = ({ children }: PropsWithChildren) => (
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
      {children}
    </UiLanguageProvider>
  );

  render(
    <ReorderList
      items={[
        { id: 'first', title: '最初', removable: true },
        { id: 'second', title: '次', removable: true },
      ]}
      state={{ orderedIds: ['first', 'second'], removedIds: ['third'] }}
      onChange={() => {}}
    />,
    { wrapper: Wrapper },
  );

  expect(screen.getAllByRole('button', { name: 'ドラッグして並べ替え' })).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: '項目を削除' })).toHaveLength(2);
  expect(screen.getByText('削除済み: 1件').textContent).toBe('削除済み: 1件');
});

it('updates the dynamic reorder voice hint when the language changes', async () => {
  const i18n = await createI18nInstance('ja');
  const message = {
    toolCall: {
      providerToolCallId: 'voice-hint-localization-test',
      arguments: {
        fields: [{
          type: 'reorder', id: 'order', label: 'Order',
          items: Array.from({ length: 7 }, (_, index) => ({ id: `item-${index}`, title: `Item ${index}` })),
        }],
      },
      result: null,
    },
  } as any;

  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja-JP">
      <JotaiProvider store={store}>
        <RequestUserInputWidget message={message} sessionId={SESSION_ID} isExpanded onToggle={() => {}} />
      </JotaiProvider>
    </UiLanguageProvider>,
  );

  expect(screen.getByText('音声では対応できません。並べ替える項目が多すぎます（7件）')).toBeTruthy();
  await act(async () => { await i18n.changeLanguage('en'); });
  expect(screen.getByText('Voice will defer — too many items to reorder verbally (7)')).toBeTruthy();
});
