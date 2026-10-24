import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { i18n } from 'i18next';
import { I18nextProvider } from 'react-i18next';

/** Imperative editor roots must share the host's translation instance. */
export function createTranslatedRoot(container: HTMLElement, instance: i18n): Root {
  const root = createRoot(container);
  return {
    render(children) {
      root.render(<I18nextProvider i18n={instance}>{children}</I18nextProvider>);
    },
    unmount() { root.unmount(); },
  };
}
