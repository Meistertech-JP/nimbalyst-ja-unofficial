import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { MockupAnnotationIndicator } from '../MockupAnnotationIndicator';

describe('MockupAnnotationIndicator localization', () => {
  it('shows Japanese annotation copy and tooltip', async () => {
    const i18n = await createI18nInstance('ja');
    (window as any).__mockupFilePath = '/workspace/mockup.html';
    (window as any).__mockupDrawing = true;
    (window as any).__mockupAnnotationTimestamp = 1;

    try {
      render(
        <I18nextProvider i18n={i18n}>
          <MockupAnnotationIndicator currentFilePath="/workspace/mockup.html" lastUserMessageTimestamp={null} />
        </I18nextProvider>,
      );

      expect(screen.getByText('+ モックアップ注釈')).toBeTruthy();
      expect(document.querySelector('.mockup-annotation-indicator')?.getAttribute('data-tooltip'))
        .toBe('モックアップに描いた注釈はプロンプトに含まれます');
    } finally {
      delete (window as any).__mockupFilePath;
      delete (window as any).__mockupDrawing;
      delete (window as any).__mockupAnnotationTimestamp;
    }
  });
});
