// @vitest-environment jsdom
import React from 'react';
import { Provider, createStore } from 'jotai';
import { I18nextProvider } from 'react-i18next';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import type { Tab } from '../TabManager';
import { TabBar } from '../TabBar';
import { FEEDBACK_REQUEST_TAB_TITLE } from '../../FeedbackRequest/feedbackRequestTab';

const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
});

it('localizes the feedback request tab label without changing its stored name or URI', async () => {
  const i18n = await createI18nInstance('ja');
  const tab: Tab = {
    id: 'feedback-tab',
    filePath: 'virtual://feedback-request/org-1/request-1',
    fileName: FEEDBACK_REQUEST_TAB_TITLE,
    content: '',
    isDirty: false,
    isPinned: false,
    isVirtual: true,
    kind: 'file',
  };

  render(
    <I18nextProvider i18n={i18n}>
      <Provider store={createStore()}>
        <TabBar
          tabs={[tab]}
          activeTabId={tab.id}
          onTabSelect={() => {}}
          onTabClose={() => {}}
          onNewTab={() => {}}
          onTogglePin={() => {}}
          onTabReorder={() => {}}
        />
      </Provider>
    </I18nextProvider>,
  );

  expect(screen.getByText('フィードバック依頼')).toBeTruthy();
  const tabElement = document.querySelector('[data-tab-id="feedback-tab"]');
  expect(tabElement?.getAttribute('data-filename')).toBe('Feedback request');
  expect(tabElement?.getAttribute('title')).toBe(tab.filePath);

  await act(async () => {
    await i18n.changeLanguage('en');
  });
  expect(screen.getByText('Feedback request')).toBeTruthy();
  expect(tabElement?.getAttribute('data-filename')).toBe('Feedback request');
});

it('localizes an untitled personal page tab without storing a fallback as its name', async () => {
  const i18n = await createI18nInstance('ja');
  const tab: Tab = {
    id: 'personal-page-tab',
    filePath: 'personal://document-1',
    fileName: '',
    content: '',
    isDirty: false,
    isPinned: false,
    isVirtual: false,
    kind: 'personal-page',
  };

  render(
    <I18nextProvider i18n={i18n}>
      <Provider store={createStore()}>
        <TabBar
          tabs={[tab]}
          activeTabId={tab.id}
          onTabSelect={() => {}}
          onTabClose={() => {}}
          onNewTab={() => {}}
          onTogglePin={() => {}}
          onTabReorder={() => {}}
        />
      </Provider>
    </I18nextProvider>,
  );

  expect(screen.getByText('無題')).toBeDefined();
  const tabElement = document.querySelector('[data-tab-id="personal-page-tab"]');
  expect(tabElement?.getAttribute('data-filename')).toBe('');

  await act(async () => {
    await i18n.changeLanguage('en');
  });
  expect(screen.getByText('Untitled')).toBeDefined();
  expect(tabElement?.getAttribute('data-filename')).toBe('');
});
