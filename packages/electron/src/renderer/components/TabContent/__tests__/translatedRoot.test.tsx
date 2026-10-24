// @vitest-environment jsdom
import React from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createInstance } from 'i18next';
import { I18nContext, I18nextProvider, useTranslation } from 'react-i18next';
import { createTranslatedRoot } from '../translatedRoot';

describe('imperative tab translation context', () => {
  it('keeps editor roots synchronized when created from a host translation hook', async () => {
    const instance = createInstance();
    await instance.init({ lng: 'ja', resources: { ja: { translation: { hint: '入力' } }, en: { translation: { hint: 'Type' } } } });
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: ReturnType<typeof createTranslatedRoot>;
    function Label() { const { t } = useTranslation(); return <span>{t('hint')}</span>; }
    function Host() {
      const { i18n } = React.useContext(I18nContext);
      React.useEffect(() => { root = createTranslatedRoot(container, i18n); root.render(<Label />); }, []);
      return null;
    }
    const host = render(<I18nextProvider i18n={instance}><Host /></I18nextProvider>);
    await act(async () => { await instance.changeLanguage('en'); });
    try { expect(container.textContent).toBe('Type'); }
    finally { await act(async () => root!.unmount()); host.unmount(); container.remove(); }
  });
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
