// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { AdvancedPanel } from '../AdvancedPanel';

const { saveLanguage } = vi.hoisted(() => ({ saveLanguage: vi.fn() }));
vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));
vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({ MaterialSymbol: () => null }));
vi.mock('../../../../help', () => ({ HelpTooltip: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../../../../dialogs/requestConfirmation', () => ({ requestConfirmation: vi.fn() }));
vi.mock('../../../../store/atoms/settingAtomFamily', async () => {
  const { atom } = await import('jotai');
  const language = atom('ja');
  const writable = atom(get => get(language), (_get, set, value: string) => {
    saveLanguage(value);
    set(language, value);
  });
  return { settingAtom: () => writable };
});
vi.mock('../../../../store/atoms/appSettings', async () => {
  const { atom } = await import('jotai');
  return {
    advancedSettingsAtom: atom({ releaseChannel: 'stable', customPathDirs: '', maxHeapSizeMB: 4096, historyMaxAgeDays: 30, historyMaxSnapshots: 250 }),
    setAdvancedSettingsAtom: atom(null), resetWalkthroughsAtom: atom(null),
    developerFeatureSettingsAtom: atom({ developerMode: false, developerFeatures: {} }),
    setDeveloperFeatureSettingsAtom: atom(null), customPathDirsAtom: atom(''),
    externalEditorSettingsAtom: atom({ editorType: 'none' }), setExternalEditorSettingsAtom: atom(null),
    EXTERNAL_EDITOR_NAMES: {}, DEVELOPER_FEATURES: [],
    areAllDeveloperFeaturesEnabled: () => false, enableAllDeveloperFeatures: vi.fn(), disableAllDeveloperFeatures: vi.fn(),
  };
});
vi.mock('../../../../store/atoms/trackerAutomationAtoms', async () => {
  const { atom } = await import('jotai');
  return { trackerAutomationAtom: atom({ enabled: false }), setTrackerAutomationAtom: atom(null) };
});
vi.mock('../../../../store/atoms/openProjects', async () => {
  const { atom } = await import('jotai');
  return {
    multiProjectModeAtom: atom(false), openProjectsAtom: atom([]), activeWorkspacePathAtom: atom(''),
    restorePreviousProjectsAtom: atom(false), allowUnlimitedProjectsAtom: atom(false),
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AdvancedPanel display language', () => {
  it('renders one label and description in each language and keeps the preference selector functional', async () => {
    vi.stubGlobal('electronAPI', { terminal: { getAvailableShells: vi.fn().mockResolvedValue([]) } });
    const i18n = await createI18nInstance('ja');
    render(<I18nextProvider i18n={i18n}><AdvancedPanel /></I18nextProvider>);

    for (const language of ['ja', 'en', 'ja']) {
      await act(() => i18n.changeLanguage(language));
      const name = i18n.t('ui_language.label', { ns: 'settings' });
      const description = i18n.t('ui_language.description', { ns: 'settings' });
      expect(screen.getAllByText(name)).toHaveLength(1);
      expect(screen.getAllByText(description)).toHaveLength(1);
      const select = screen.getByRole('combobox', { name });
      expect(Array.from(select.querySelectorAll('option')).map(option => option.value)).toEqual(['system', 'en', 'ja']);
      fireEvent.change(select, { target: { value: language } });
      expect(saveLanguage).toHaveBeenLastCalledWith(language);
    }
  });
});
