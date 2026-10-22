import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SettingsPanelProps } from '@nimbalyst/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NimbalystMemorySettings } from '../components/SettingsPanel';

const LOCAL_STATUS = {
  supported: true,
  enabled: false,
  downloaded: false,
  activeMode: 'openai',
  activeReason: 'semantic matching via the configured embedding provider',
  awaitingModelDownload: false,
  selectedModelId: 'bge-small',
  models: [
    {
      id: 'bge-small',
      repo: 'Xenova/bge-small-en-v1.5',
      dims: 384,
      languages: 'en',
      note: 'Small English retrieval model.',
      downloadBytes: 33_973_000,
      downloadSize: '32 MB',
      recommended: true,
    },
    {
      id: 'bge-m3',
      repo: 'Xenova/bge-m3',
      dims: 1024,
      languages: 'multi',
      note: 'Multilingual model.',
      downloadBytes: 586_761_000,
      downloadSize: '560 MB',
      recommended: false,
    },
  ],
} as const;

function renderSettings(callBackendTool: SettingsPanelProps['callBackendTool']) {
  return render(
    <NimbalystMemorySettings
      theme="dark"
      storage={{} as SettingsPanelProps['storage']}
      callBackendTool={callBackendTool}
    />
  );
}

describe('Memory embedding settings', () => {
  afterEach(() => {
    cleanup();
    document.documentElement.lang = 'en';
  });

  beforeEach(() => {
    document.documentElement.lang = 'en';
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
  });

  it('localizes the panel and updates when the host language changes', async () => {
    const callBackendTool = vi.fn(async (name: string) => {
      if (name === 'memory.status') {
        return { ready: true, chunks: 0, sourceFiles: 0, retrieval: { mode: 'keyword-only' } };
      }
      if (name === 'memory.local_embeddings_status') return LOCAL_STATUS;
      if (name === 'memory.list_facts') return { facts: [] };
      return {};
    });
    document.documentElement.lang = 'ja';
    renderSettings(callBackendTool);

    expect(await screen.findByRole('heading', { name: 'プロジェクトナレッジ' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'メモリー検索' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '意味による検索' })).toBeTruthy();

    document.documentElement.lang = 'en';
    expect(await screen.findByRole('heading', { name: 'Project knowledge' })).toBeTruthy();
  });

  it('shows the active provider and applies a deliberate local-model choice', async () => {
    const callBackendTool = vi.fn(async (name: string) => {
      if (name === 'memory.status') {
        return {
          ready: true,
          chunks: 10,
          denseChunks: 10,
          sourceFiles: 2,
          embedder: { id: 'openai', model: 'text-embedding-3-small', dims: 1536 },
          retrieval: { mode: 'hybrid', semantic: { available: true } },
        };
      }
      if (name === 'memory.local_embeddings_status') return LOCAL_STATUS;
      if (name === 'memory.list_facts') return { facts: [] };
      if (name === 'memory.set_local_embeddings') return { ok: true };
      return {};
    });
    renderSettings(callBackendTool);

    expect(await screen.findByText('OpenAI · text-embedding-3-small')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /On this device/i }));
    fireEvent.change(screen.getByLabelText('On-device model'), {
      target: { value: 'bge-m3' },
    });

    expect(
      callBackendTool.mock.calls.some(([name]) => name === 'memory.set_local_embeddings')
    ).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Download and use' }));

    await waitFor(() => {
      expect(callBackendTool).toHaveBeenCalledWith('memory.set_local_embeddings', {
        enabled: true,
        modelId: 'bge-m3',
      });
    });
  });

  it('switches back to OpenAI without sending a local model', async () => {
    const callBackendTool = vi.fn(async (name: string) => {
      if (name === 'memory.status') {
        return {
          ready: true,
          chunks: 10,
          denseChunks: 10,
          sourceFiles: 2,
          embedder: { id: 'local', model: 'Xenova/bge-small-en-v1.5', dims: 384 },
          retrieval: { mode: 'hybrid', semantic: { available: true } },
        };
      }
      if (name === 'memory.local_embeddings_status') {
        return {
          ...LOCAL_STATUS,
          enabled: true,
          downloaded: true,
          activeMode: 'local',
        };
      }
      if (name === 'memory.list_facts') return { facts: [] };
      if (name === 'memory.set_local_embeddings') return { ok: true };
      return {};
    });
    renderSettings(callBackendTool);

    expect(await screen.findByText('On this device · Xenova/bge-small-en-v1.5')).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /^OpenAI/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Use this option' }));

    await waitFor(() => {
      expect(callBackendTool).toHaveBeenCalledWith('memory.set_local_embeddings', {
        enabled: false,
      });
    });
  });
});
