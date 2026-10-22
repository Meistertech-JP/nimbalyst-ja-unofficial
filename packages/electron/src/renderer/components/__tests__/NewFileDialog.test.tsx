// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { NewFileDialog } from '../NewFileDialog';

vi.mock('@nimbalyst/runtime/ui/icons/MaterialSymbol', () => ({
  MaterialSymbol: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

describe('NewFileDialog', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getFolderContents: vi.fn().mockResolvedValue([]),
      },
    });
  });

  afterEach(cleanup);

  it('renders an explicit dropdown affordance for the file type selector', async () => {
    const i18n = await createI18nInstance('en');
    await act(async () => {
      render(
        <I18nextProvider i18n={i18n}>
          <NewFileDialog
            isOpen={true}
            onClose={() => {}}
            currentDirectory="/workspace"
            workspacePath="/workspace"
            onCreateFile={() => {}}
          />
        </I18nextProvider>,
      );
      await Promise.resolve();
    });

    expect(screen.getByLabelText('Type').tagName).toBe('SELECT');
    screen.getByTestId('new-file-type-chevron');
    expect(document.querySelector('[data-icon="expand_more"]')).toBeTruthy();
  });
});
