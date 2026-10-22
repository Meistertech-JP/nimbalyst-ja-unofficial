import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';

import { SettingsAlphaBadge } from '../common/AlphaBadge';
import { TeamBetaBadge, TeamBetaNotice } from '../common/TeamBetaNotice';

describe('TeamBetaNotice localization', () => {
  it('renders the existing Japanese disclosure text', async () => {
    const i18n = await createI18nInstance('ja');
    render(
      <I18nextProvider i18n={i18n}>
        <>
          <TeamBetaNotice />
          <TeamBetaBadge />
          <SettingsAlphaBadge />
        </>
      </I18nextProvider>,
    );

    expect(screen.getByText('Nimbalyst Teamsはベータ版です')).toBeTruthy();
    expect(screen.getAllByTestId('alpha-badge').map((badge) => badge.getAttribute('data-stage'))).toEqual(['beta', 'alpha']);
    expect(screen.getByLabelText('ベータ版の機能')).toBeTruthy();
    expect(screen.getByLabelText('アルファ版の機能')).toBeTruthy();
    expect(screen.getByTestId('team-beta-notice').textContent).toContain('正式リリース後');
  });
});
