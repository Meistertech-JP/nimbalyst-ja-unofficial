// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { InboxContextSlot } from '../InboxContextSlot';
import { InboxSkeleton } from '../InboxSkeleton';
import { InboxStatePicker } from '../InboxStatePicker';
import { OrgWelcomeCard } from '../../onboarding/OrgWelcomeCard';

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(() => cleanup());

describe('TeamMode accessibility labels', () => {
  it('localizes inbox loading and resize labels', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <>
          <InboxSkeleton rows={1} />
          <InboxContextSlot width={360} onWidthChange={() => undefined}>
            <div />
          </InboxContextSlot>
        </>
      </I18nextProvider>,
    );

    expect(screen.getByLabelText('受信トレイを読み込み中')).toBeDefined();
    expect(screen.getByRole('separator', { name: 'コンテキストペインの幅を変更' })).toBeDefined();
  });

  it('localizes the preview state label', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <InboxStatePicker status="ready" onChange={() => undefined} />
      </I18nextProvider>,
    );

    expect(screen.getByText('プレビュー状態')).toBeDefined();
  });

  it('localizes the welcome-card dismissal label', () => {
    render(
      <I18nextProvider i18n={japaneseI18n}>
        <OrgWelcomeCard
          card={{ organizationName: 'Acme', memberCount: 1, inviterName: null }}
          onDismiss={() => undefined}
        />
      </I18nextProvider>,
    );

    expect(screen.getByRole('button', { name: 'ウェルカムメッセージを閉じる' })).toBeDefined();
    expect(screen.getByText('Acmeへようこそ')).toBeDefined();
    expect(screen.getByText('メンバー1人')).toBeDefined();
    expect(screen.getByText('受信トレイには、自分宛てのメンション、返信、会話のアクティビティが表示されます。')).toBeDefined();
  });
});
