// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { cleanup, fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { resources } from '@nimbalyst/i18n/resources';
import { WorkspaceWelcome } from '../WorkspaceWelcome';

vi.mock('../../tips/FilesEmptyTipDisplay', () => ({
  FilesEmptyTipDisplay: () => <div data-testid="files-empty-tip-display" />,
}));

const testI18n = createInstance();
const testI18nReady = testI18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources,
  ns: Object.keys(resources.en),
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

function render(ui: React.ReactElement) {
  return rtlRender(ui, {
    wrapper: ({ children }) => <I18nextProvider i18n={testI18n}>{children}</I18nextProvider>,
  });
}

describe('WorkspaceWelcome', () => {
  afterEach(cleanup);

  it('keeps the no-workspace state to the icon and title', async () => {
    await testI18nReady;
    render(<WorkspaceWelcome workspaceName="Open a workspace to get started" />);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Open a workspace to get started',
    );
    expect(screen.queryByText('Files are saved automatically as you work')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create a new file' })).toBeNull();
    expect(screen.queryByTestId('files-empty-tip-display')).toBeNull();
  });

  it('renders workspace actions and routes card and chip interactions', async () => {
    await testI18nReady;
    const onNewFile = vi.fn();
    const onFocusAgent = vi.fn();
    const onInsertAgentPrompt = vi.fn();

    render(
      <WorkspaceWelcome
        workspaceName="stravu-editor"
        hasWorkspace={true}
        workspacePath="/workspace"
        onNewFile={onNewFile}
        onFocusAgent={onFocusAgent}
        onInsertAgentPrompt={onInsertAgentPrompt}
      />,
    );

    screen.getByText('Files are saved automatically as you work');
    screen.getByTestId('files-empty-tip-display');

    fireEvent.click(screen.getByRole('button', { name: 'Create a new file' }));
    expect(onNewFile).toHaveBeenCalledWith();

    fireEvent.click(screen.getByRole('button', { name: 'Mockup' }));
    expect(onNewFile).toHaveBeenLastCalledWith('mockup');

    fireEvent.click(screen.getByRole('button', { name: 'Focus the agent chat' }));
    expect(onFocusAgent).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Summarize this project' }));
    expect(onInsertAgentPrompt).toHaveBeenCalledWith('Summarize this project');
    expect(onFocusAgent).toHaveBeenCalledTimes(1);
  });
});
