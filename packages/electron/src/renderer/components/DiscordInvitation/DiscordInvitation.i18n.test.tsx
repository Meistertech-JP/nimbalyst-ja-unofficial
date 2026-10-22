// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DiscordInvitation } from './DiscordInvitation';

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  englishI18n = await createI18nInstance('en');
  japaneseI18n = await createI18nInstance('ja');
});

afterEach(cleanup);

function renderInvitation(i18n: typeof englishI18n) {
  return render(
    <I18nextProvider i18n={i18n}>
      <DiscordInvitation isOpen onClose={() => {}} onDismiss={() => {}} />
    </I18nextProvider>,
  );
}

describe('DiscordInvitation localization', () => {
  it('renders English and Japanese copy and accessible labels', () => {
    const { rerender } = renderInvitation(englishI18n);

    expect(screen.getByRole('heading', { name: 'Join the Community' })).toBeDefined();
    expect(screen.getByText('Get faster help, share feedback with the team, and stay up to date on new releases.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Join Discord' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Remind Me Later' })).toBeDefined();
    expect(screen.getByRole('button', { name: "Don't Show Again" })).toBeDefined();
    expect(screen.getByRole('button', { name: 'LinkedIn' })).toBeDefined();

    rerender(
      <I18nextProvider i18n={japaneseI18n}>
        <DiscordInvitation isOpen onClose={() => {}} onDismiss={() => {}} />
      </I18nextProvider>,
    );

    expect(screen.getByRole('heading', { name: 'コミュニティに参加' })).toBeDefined();
    expect(screen.getByText('すばやくサポートを受けたり、チームにフィードバックを共有したり、新しいリリースの情報を確認できます。')).toBeDefined();
    expect(screen.getByRole('button', { name: '閉じる' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Discordに参加' })).toBeDefined();
    expect(screen.getByRole('button', { name: '後で通知する' })).toBeDefined();
    expect(screen.getByRole('button', { name: '今後表示しない' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'LinkedIn' })).toBeDefined();
  });
});
