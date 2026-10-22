import React from 'react';
import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { FileEditsSidebar } from '../FileEditsSidebar';
import type { FileEditSummary } from '../../types';

const fileEdits: FileEditSummary[] = [
  {
    filePath: '/workspace/src/app.ts',
    linkType: 'edited',
    linesAdded: 3,
    linesRemoved: 1,
    operation: 'edit',
  } as FileEditSummary,
];
const originalNavigatorPlatform = navigator.platform;
let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

function renderSidebar(language: 'en' | 'ja' = 'en') {
  return render(
    <UiLanguageProvider
      i18n={language === 'en' ? englishI18n : japaneseI18n}
      preference={language}
      systemLocale="en-US"
    >
      <FileEditsSidebar
        fileEdits={fileEdits}
        workspacePath="/workspace"
        onCopyPath={vi.fn()}
        onRevealInFinder={vi.fn()}
      />
    </UiLanguageProvider>,
  );
}

afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, 'platform', {
    configurable: true,
    value: originalNavigatorPlatform,
  });
});

describe('FileEditsSidebar context menu positioning', () => {
  it('renders the context menu in a portal outside the sidebar so it escapes overflow containers', () => {
    const { container } = renderSidebar();

    fireEvent.contextMenu(screen.getByText('app.ts'), { clientX: 120, clientY: 200 });

    const menu = document.querySelector('.file-edits-sidebar__context-menu');
    expect(menu).not.toBeNull();
    // FloatingPortal renders to document.body, not inside the sidebar subtree.
    expect(container.contains(menu!)).toBe(false);
  });

  it('positions via floating-ui instead of hardcoding the cursor coordinates', () => {
    renderSidebar();

    // A cursor position far past the right/bottom edge would previously render the
    // menu at left: 5000px / top: 4000px and push it off screen.
    fireEvent.contextMenu(screen.getByText('app.ts'), { clientX: 5000, clientY: 4000 });

    const menu = document.querySelector('.file-edits-sidebar__context-menu') as HTMLElement;
    expect(menu).not.toBeNull();
    expect(menu.style.left).not.toBe('5000px');
    expect(menu.style.top).not.toBe('4000px');
    // floating-ui drives placement through its own positioning strategy.
    expect(menu.style.position).toBe('absolute');
  });
});

describe('FileEditsSidebar file browser label', () => {
  it.each([
    ['MacIntel', 'Show in Finder'],
    ['Win32', 'Show in Explorer'],
    ['Linux x86_64', 'Show in Folder'],
  ])('uses the platform-appropriate wording on %s', (platform, expectedLabel) => {
    Object.defineProperty(navigator, 'platform', { configurable: true, value: platform });
    renderSidebar();

    fireEvent.contextMenu(screen.getByText('app.ts'), { clientX: 120, clientY: 200 });

    screen.getByText(expectedLabel);
  });

  it('renders the context menu and platform label in Japanese', () => {
    Object.defineProperty(navigator, 'platform', { configurable: true, value: 'MacIntel' });
    renderSidebar('ja');

    fireEvent.contextMenu(screen.getByText('app.ts'), { clientX: 120, clientY: 200 });

    screen.getByRole('menu', { name: 'ファイル操作' });
    screen.getByText('パスをコピー');
    screen.getByText('Finderで表示');
  });
});
