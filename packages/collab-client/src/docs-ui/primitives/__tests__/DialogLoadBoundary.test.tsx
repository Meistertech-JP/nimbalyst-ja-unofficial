// @vitest-environment jsdom
import React, { Suspense } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { DialogLoadBoundary } from '../DialogLoadBoundary';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it.each(['ja', 'en'] as const)('contains a rejected dialog import and allows closing in %s', async locale => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const close = vi.fn();
  const i18n = await createI18nInstance(locale);
  const Rejected = React.lazy(() => Promise.reject(new Error('fixture chunk unavailable')));
  render(<I18nextProvider i18n={i18n}><div>workspace</div><DialogLoadBoundary onClose={close}><Suspense fallback={null}><Rejected /></Suspense></DialogLoadBoundary></I18nextProvider>);
  expect((await screen.findByRole('alert')).textContent).toBe(i18n.t('error.unknown_error', { ns: 'dialogs' }));
  expect(screen.getByText('workspace').textContent).toBe('workspace');
  fireEvent.click(screen.getByRole('button', { name: i18n.t('close', { ns: 'common' }) }));
  expect(close).toHaveBeenCalledOnce();
});
