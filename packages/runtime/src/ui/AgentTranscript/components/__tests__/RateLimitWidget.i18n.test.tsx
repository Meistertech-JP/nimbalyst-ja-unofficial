import React from 'react';
import {I18nextProvider} from 'react-i18next';
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, expect, it} from 'vitest';
import {createI18nInstance} from '@nimbalyst/i18n/core';
import {RateLimitWidget} from '../RateLimitWidget';

afterEach(cleanup);

it('localizes rate-limit status and reset message while retaining the known window label', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <I18nextProvider i18n={i18n}>
      <RateLimitWidget
        content="<!-- [RATE_LIMIT_WARNING] limitType=5-hour session resetsAtUnix=4102444800 usage=91 -->"
      />
    </I18nextProvider>,
  );

  expect(screen.getByText('利用上限に近づいています')).toBeTruthy();
  expect(screen.getByText(/5時間ウィンドウの利用上限の91%に達しています/)).toBeTruthy();
  expect(screen.getByText(/後にリセットされます/)).toBeTruthy();
});
