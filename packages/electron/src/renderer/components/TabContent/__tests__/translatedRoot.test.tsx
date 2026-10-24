// @vitest-environment jsdom
import React from 'react';
import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createInstance } from 'i18next';
import { useTranslation } from 'react-i18next';
import { createTranslatedRoot } from '../translatedRoot';

describe('imperative tab translation context', () => {
  it('renders translated labels and follows language changes without remounting', async () => {
    const instance = createInstance();
    await instance.init({ lng: 'ja', resources: {
      ja: { editor: { preview: 'プレビュー' } },
      en: { editor: { preview: 'Preview' } },
    } });
    function Label() {
      const { t } = useTranslation('editor');
      return <button>{t('preview')}</button>;
    }
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createTranslatedRoot(container, instance);
    try {
      await act(async () => root.render(<Label />));
      expect(container.textContent).toBe('プレビュー');
      const button = container.querySelector('button');
      await act(async () => { await instance.changeLanguage('en'); });
      expect(container.textContent).toBe('Preview');
      expect(container.querySelector('button')).toBe(button);
      await act(async () => { await instance.changeLanguage('ja'); });
      expect(container.textContent).toBe('プレビュー');
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
