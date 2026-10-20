// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { AlphaBadge } from '../common/AlphaBadge';
import { TeamAlphaNotice } from '../common/TeamAlphaNotice';

vi.mock('@nimbalyst/runtime', () => ({ MaterialSymbol: () => null }));

describe('alpha feature notices', () => {
  afterEach(async () => { cleanup(); await i18next.changeLanguage('en'); });

  it('updates the badge and full team disclosure when the language changes', async () => {
    render(<><AlphaBadge /><AlphaBadge size="dot" /><TeamAlphaNotice /></>);
    expect(screen.getByText('alpha')).toBeTruthy();
    await act(async () => { await i18next.changeLanguage('ja'); });
    expect(screen.getByText('アルファ')).toBeTruthy();
    expect(screen.getAllByLabelText('アルファ版の機能')).toHaveLength(2);
    expect(screen.getByText('α')).toBeTruthy();
    const notice = screen.getByTestId('team-alpha-notice').textContent;
    expect(notice).toContain('Nimbalyst Teamsはアルファ版です');
    expect(notice).toContain('重要なデータはご自身でもコピーを保管');
    expect(notice).toContain('有料サブスクリプションが必要');
    expect(notice).toContain('事前に通知');
  });
});
