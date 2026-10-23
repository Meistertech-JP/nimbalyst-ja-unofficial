// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';

import { OpenCodeModelsSection } from '../OpenCodeModelsSection';
import type { OpenCodeModelCatalogSnapshot } from '../../../../../shared/openCodeModelCatalog';

function installCatalogApi(catalog: OpenCodeModelCatalogSnapshot) {
  const openCodeModelCatalogGet = vi.fn(async () => ({ success: true as const, catalog }));
  const openCodeModelCatalogRefresh = vi.fn(async () => ({ success: true as const, catalog }));
  (window as any).electronAPI = { openCodeModelCatalogGet, openCodeModelCatalogRefresh };
  return { openCodeModelCatalogGet, openCodeModelCatalogRefresh };
}

const readyCatalog: OpenCodeModelCatalogSnapshot = {
  cacheStatus: 'ready',
  refreshedAt: 1_755_000_000_000,
  models: [
    { id: 'opencode:anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'opencode', contextWindow: 200_000 },
    { id: 'opencode:openrouter/acme/novel', name: 'Novel', provider: 'opencode' },
  ],
};

let englishI18n: Awaited<ReturnType<typeof createI18nInstance>>;
let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;

beforeAll(async () => {
  [englishI18n, japaneseI18n] = await Promise.all([
    createI18nInstance('en'),
    createI18nInstance('ja'),
  ]);
});

function renderSection(
  props: Partial<React.ComponentProps<typeof OpenCodeModelsSection>> = {},
  i18n = englishI18n,
  preference: 'en' | 'ja' = 'en',
) {
  const handlers = {
    onSelectModel: vi.fn(),
    onVisibilityToggle: vi.fn(),
    onSetVisibilityForModels: vi.fn(),
  };
  render(
    <UiLanguageProvider i18n={i18n} preference={preference} systemLocale={`${preference}-US`}>
      <OpenCodeModelsSection
        workspacePath="/tmp/project"
        hiddenModels={[]}
        selectedModelId=""
        {...handlers}
        {...props}
      />
    </UiLanguageProvider>
  );
  return handlers;
}

describe('OpenCodeModelsSection', () => {
  afterEach(() => {
    cleanup();
    delete (window as any).electronAPI;
    vi.clearAllMocks();
  });

  it('reads the catalog on mount and only discovers on the explicit control', async () => {
    const api = installCatalogApi(readyCatalog);
    renderSection();

    // The read is workspace-scoped: passing no workspace is what made every
    // install's catalog fall back to hardcoded presets (#1382).
    await waitFor(() =>
      expect(api.openCodeModelCatalogGet).toHaveBeenCalledWith({ workspacePath: '/tmp/project' })
    );
    // The read path must never start `opencode serve`; only the button may.
    expect(api.openCodeModelCatalogRefresh).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('opencode-models-refresh'));
    await waitFor(() =>
      expect(api.openCodeModelCatalogRefresh).toHaveBeenCalledWith({ workspacePath: '/tmp/project' })
    );
  });

  it('neither reads nor discovers without a workspace to do it for', async () => {
    const api = installCatalogApi(readyCatalog);
    renderSection({ workspacePath: undefined });

    fireEvent.click(await screen.findByTestId('opencode-models-refresh'));
    expect(api.openCodeModelCatalogGet).not.toHaveBeenCalled();
    expect(api.openCodeModelCatalogRefresh).not.toHaveBeenCalled();
  });

  it('writes the denylist per row, and in bulk over the filtered subset only', async () => {
    installCatalogApi(readyCatalog);
    const handlers = renderSection({ hiddenModels: ['opencode:openrouter/acme/novel'] });

    const sonnet = await screen.findByRole('checkbox', { name: /Claude Sonnet 4\.5/ });
    fireEvent.click(sonnet);
    expect(handlers.onVisibilityToggle).toHaveBeenCalledWith('opencode:anthropic/claude-sonnet-4-5', false);

    fireEvent.change(screen.getByTestId('opencode-models-filter'), { target: { value: 'openrouter' } });
    fireEvent.click(screen.getByTestId('opencode-models-hide-all'));
    expect(handlers.onSetVisibilityForModels).toHaveBeenCalledWith(['opencode:openrouter/acme/novel'], false);
  });

  it('keeps a configured model selectable when discovery does not know it', async () => {
    installCatalogApi(readyCatalog);
    renderSection({ selectedModelId: 'google/gemini-2.5-pro' });

    const select = (await screen.findByTestId('opencode-model-select')) as HTMLSelectElement;
    expect(select.value).toBe('google/gemini-2.5-pro');
    expect(Array.from(select.options).map((option) => option.value)).toContain('google/gemini-2.5-pro');
  });

  it('shows a localized discovery failure without exposing the provider diagnostic', async () => {
    (window as any).electronAPI = {
      openCodeModelCatalogGet: vi.fn(async () => ({
        success: false,
        error: 'OAuth authorization failed: English provider diagnostic',
      })),
      openCodeModelCatalogRefresh: vi.fn(),
    };
    renderSection({}, japaneseI18n, 'ja');

    expect(await screen.findByText('検出に失敗しました')).toBeDefined();
    expect(screen.queryByText(/English provider diagnostic/)).toBeNull();
  });
});
