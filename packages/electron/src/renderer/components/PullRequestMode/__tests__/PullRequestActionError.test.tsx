// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import {
  GH_WORKFLOW_SCOPE_REFRESH_COMMAND,
  PullRequestActionError,
} from '../PullRequestActionError';

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

afterEach(cleanup);

describe('PullRequestActionError', () => {
  it('shows and copies the workflow-scope recovery command', async () => {
    const i18n = await createI18nInstance('en');
    const error = `GitHub blocked this merge. Run: ${GH_WORKFLOW_SCOPE_REFRESH_COMMAND}`;
    const { getByRole, getByTestId } = render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <PullRequestActionError error={error} />
      </UiLanguageProvider>,
    );

    expect(getByRole('alert').textContent).toContain(GH_WORKFLOW_SCOPE_REFRESH_COMMAND);
    fireEvent.click(getByTestId('pr-copy-workflow-scope-command'));

    expect(writeText).toHaveBeenCalledWith(GH_WORKFLOW_SCOPE_REFRESH_COMMAND);
    await waitFor(() =>
      expect(getByTestId('pr-copy-workflow-scope-command').textContent).toBe('Copied'),
    );
  });

  it('localizes the recovery action in Japanese', async () => {
    const i18n = await createI18nInstance('ja');
    render(
      <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="en-US">
        <PullRequestActionError
          error={`GitHub blocked this merge. Run: ${GH_WORKFLOW_SCOPE_REFRESH_COMMAND}`}
        />
      </UiLanguageProvider>,
    );

    expect(screen.getByTestId('pr-copy-workflow-scope-command').textContent).toBe('コマンドをコピー');
    fireEvent.click(screen.getByTestId('pr-copy-workflow-scope-command'));
    await waitFor(() => expect(screen.getByTestId('pr-copy-workflow-scope-command').textContent).toBe('コピーしました'));
  });

  it('does not offer the recovery action for unrelated failures', async () => {
    const i18n = await createI18nInstance('en');
    const { queryByTestId } = render(
      <UiLanguageProvider i18n={i18n} preference="en" systemLocale="en-US">
        <PullRequestActionError error="Merge conflict" />
      </UiLanguageProvider>,
    );
    expect(queryByTestId('pr-copy-workflow-scope-command')).toBeNull();
  });
});
