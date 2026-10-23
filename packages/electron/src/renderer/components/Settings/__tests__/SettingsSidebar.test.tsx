// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { SettingsSidebar } from '../SettingsSidebar';

afterEach(cleanup);

describe('SettingsSidebar full labels', () => {
  it('localizes the account group heading and all four registry routes through language changes', async () => {
    const i18n = await createI18nInstance('ja');
    const onSelectCategory = vi.fn();
    render(<I18nextProvider i18n={i18n}><SettingsSidebar scope="account" selectedCategory="account" onSelectCategory={onSelectCategory} showDirectChatProviders={false} /></I18nextProvider>);
    const group = screen.getByTestId('settings-group-account');
    // Inspect the group title itself, not the separate Account route button.
    const heading = group.querySelector('.settings-sidebar-group-title');
    expect(heading).not.toBeNull();
    expect(within(group).getAllByRole('button')).toHaveLength(4);
    const routes = [
      ['account', 'アカウント', 'Accounts'],
      ['account-mobile', 'モバイルアプリ', 'Mobile App'],
      ['account-devices', 'デバイス', 'Devices'],
      ['account-shared-links', '共有リンク', 'Shared Links'],
    ] as const;
    for (const [language, groupLabel, labelIndex] of [['ja', 'アカウント', 1], ['en', 'Account', 2], ['ja', 'アカウント', 1]] as const) {
      await act(async () => { await i18n.changeLanguage(language); });
      expect(heading?.textContent).toBe(groupLabel);
      for (const route of routes) {
        const button = within(group).getByTestId(`settings-route-${route[0]}`);
        expect(within(group).getByRole('button', { name: route[labelIndex] })).toBe(button);
        fireEvent.focus(button);
        expect(screen.getByRole('tooltip').textContent).toBe(route[labelIndex]);
        fireEvent.click(button);
        expect(onSelectCategory).toHaveBeenLastCalledWith(route[0]);
        fireEvent.blur(button);
        expect(screen.queryByRole('tooltip')).toBeNull();
      }
    }
  });

  it('keeps decorative icon tokens out of localized accessible names', async () => {
    const i18n = await createI18nInstance('ja');
    render(<I18nextProvider i18n={i18n}><SettingsSidebar selectedCategory="notifications" onSelectCategory={() => {}} showDirectChatProviders={false} /></I18nextProvider>);
    expect(screen.getByRole('button', { name: /^通知$/ })).toBe(screen.getByTestId('settings-route-notifications'));
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByRole('button', { name: /^Notifications$/ })).toBe(screen.getByTestId('settings-route-notifications'));
  });

  it('exposes the complete Japanese label on keyboard focus and preserves navigation', async () => {
    const i18n = await createI18nInstance('ja'), onSelectCategory = vi.fn();
    render(<I18nextProvider i18n={i18n}><SettingsSidebar selectedCategory="advanced" onSelectCategory={onSelectCategory} showDirectChatProviders={false} /></I18nextProvider>);
    const button = screen.getByTestId('settings-route-agent-features');
    fireEvent.focus(button);
    expect(screen.getByRole('tooltip').textContent).toBe('エージェント機能');
    expect(button.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id);
    fireEvent.click(button);
    expect(onSelectCategory).toHaveBeenCalledWith('agent-features');
    fireEvent.blur(button);
    expect(screen.queryByRole('tooltip')).toBeNull();
    await act(async () => { await i18n.changeLanguage('en'); });
    fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip').textContent).toBe('Agent Features');
    await act(async () => { await i18n.changeLanguage('ja'); });
    expect(screen.queryByRole('tooltip')).toBeNull();
    fireEvent.mouseEnter(button);
    expect(screen.getByRole('tooltip').textContent).toBe('エージェント機能');
    fireEvent.mouseLeave(button);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('preserves extension-provided labels instead of treating English user text as fixed UI', async () => {
    const i18n = await createI18nInstance('ja');
    render(<I18nextProvider i18n={i18n}><SettingsSidebar selectedCategory="advanced" onSelectCategory={() => {}} showDirectChatProviders={false} extensionRoutes={[{ source: 'extension', id: 'ext:example:custom', scope: 'application', group: 'Extensions', label: 'My Custom Settings', icon: 'extension', extensionId: 'example', componentName: 'Settings', order: 10 }]} /></I18nextProvider>);
    const button = screen.getByTestId('settings-route-ext:example:custom');
    fireEvent.focus(button);
    expect(screen.getByRole('tooltip').textContent).toBe('My Custom Settings');
  });
});
