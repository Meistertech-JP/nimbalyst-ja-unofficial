// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { LazyTrackerRadarView } from '../LazyTrackerRadarView';

const state = vi.hoisted(() => ({ loads: 0 }));
vi.mock('../TrackerRadarView', () => {
  state.loads += 1;
  return { TrackerRadarView: ({ items, onItemSelect }: { items: unknown[]; onItemSelect?: (id: string) => void }) => (
    <button onClick={() => onItemSelect?.('chosen')} data-testid="loaded-radar">{items.length}</button>
  ) };
});
afterEach(cleanup);

it('does not load Radar until mounted and preserves the selected-view props and callback', async () => {
  expect(state.loads).toBe(0);
  const i18n = await createI18nInstance('ja');
  const select = vi.fn();
  render(<I18nextProvider i18n={i18n}><LazyTrackerRadarView items={[]} onItemSelect={select} /></I18nextProvider>);
  expect(screen.getByText(i18n.t('detail_extra.loading_item', { ns: 'tracker' }))).toBeDefined();
  const radar = await screen.findByTestId('loaded-radar');
  expect(state.loads).toBe(1);
  expect(radar.textContent).toBe('0');
  fireEvent.click(radar);
  expect(select).toHaveBeenCalledWith('chosen');
});
