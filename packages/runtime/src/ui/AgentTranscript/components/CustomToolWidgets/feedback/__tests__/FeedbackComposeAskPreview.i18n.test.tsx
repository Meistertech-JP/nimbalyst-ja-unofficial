import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { FeedbackComposeAskPreview } from '../FeedbackComposeAskPreview';

afterEach(cleanup);

it('localizes fixed feedback ask preview labels and artifact accessibility text', async () => {
  const i18n = await createI18nInstance('ja');
  const ask = {
    type: 'singleSelect',
    allowOther: true,
    options: [{ id: 'a', label: 'Option A' }],
    artifacts: [{ entryId: 'a', kind: 'image', path: '/tmp/preview.png' }],
  } as any;

  render(
    <I18nextProvider i18n={i18n}>
      <FeedbackComposeAskPreview
        ask={ask}
        renderArtifact={() => <span>preview</span>}
        renderArtifactPopover={() => null}
      />
    </I18nextProvider>,
  );

  expect(screen.getByRole('button', { name: 'Option Aを開く' })).toBeTruthy();

  cleanup();
  render(
    <I18nextProvider i18n={i18n}>
      <FeedbackComposeAskPreview ask={{ type: 'confirm', defaultValue: null } as any} />
    </I18nextProvider>,
  );
  expect(screen.getByText('はい')).toBeTruthy();
  expect(screen.getByText('いいえ')).toBeTruthy();

  cleanup();
  render(
    <I18nextProvider i18n={i18n}>
      <FeedbackComposeAskPreview ask={{ type: 'singleSelect', allowOther: true, options: [] } as any} />
    </I18nextProvider>,
  );
  expect(screen.getByText('その他')).toBeTruthy();

  cleanup();
  render(
    <I18nextProvider i18n={i18n}>
      <FeedbackComposeAskPreview ask={{ type: 'editText' } as any} />
    </I18nextProvider>,
  );
  expect(screen.getByText('任意入力…')).toBeTruthy();

  cleanup();
  render(
    <I18nextProvider i18n={i18n}>
      <FeedbackComposeAskPreview ask={{ type: 'rating', min: 1, max: 5 } as any} />
    </I18nextProvider>,
  );
  expect(screen.getByText('1～5')).toBeTruthy();
});
