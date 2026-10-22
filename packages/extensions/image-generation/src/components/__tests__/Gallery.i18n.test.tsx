// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { Gallery } from '../Gallery';
import { BottomBar } from '../BottomBar';
import { ImageGenerationSettings } from '../SettingsPanel';
import type { Generation, SessionMessage } from '../../types';

afterEach(cleanup);

let japaneseI18n: Awaited<ReturnType<typeof createI18nInstance>>;
beforeAll(async () => {
  japaneseI18n = await createI18nInstance('ja');
});

describe('image generation gallery localization', () => {
  it('localizes the empty conversation state', () => {
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <Gallery messages={[]} imagesBasePath="" onEditPrompt={() => {}} theme="light" />
      </UiLanguageProvider>,
    );

    screen.getByText('会話を始める');
    screen.getByText('下にプロンプトを入力して最初の画像を生成するか、画像作成について質問してください。');
  });

  it('localizes generation controls and preserves submitted values', () => {
    const onGenerate = vi.fn();
    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <BottomBar
          defaultStyle="sketch"
          defaultAspectRatio="1:1"
          defaultVariations={2}
          isGenerating={false}
          onGenerate={onGenerate}
          theme="light"
        />
      </UiLanguageProvider>,
    );

    const prompt = screen.getByPlaceholderText('生成したい画像を説明してください...');
    fireEvent.change(prompt, { target: { value: 'A small red house' } });
    fireEvent.click(screen.getByRole('button', { name: '生成' }));

    expect(onGenerate).toHaveBeenCalledWith('A small red house', 'sketch', '1:1', 2);
    screen.getByText('スタイル');
    screen.getByText('サイズ');
    screen.getByText('バリエーション数');
  });

  it('localizes settings while retaining model identifiers', async () => {
    const storage = {
      getSecret: vi.fn().mockResolvedValue(null),
      get: vi.fn().mockResolvedValue(null),
      setSecret: vi.fn(),
      deleteSecret: vi.fn(),
      set: vi.fn(),
    };

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <ImageGenerationSettings storage={storage as never} theme="light" />
      </UiLanguageProvider>,
    );

    expect(await screen.findByText('Google AI APIキー')).toBeDefined();
    screen.getByText('画像生成について');
    screen.getByPlaceholderText('Google AI APIキーを入力');
    screen.getByText('Gemini 2.5 Flash');
  });

  it('localizes the built-in custom style without changing the generation passed to editing', () => {
    const generation: Generation = {
      id: 'generation-custom',
      prompt: 'A handmade ceramic bowl',
      style: 'custom',
      aspectRatio: '1:1',
      parameters: { stylePrompt: 'matte glaze' },
      timestamp: '2026-10-20T10:00:00.000Z',
      results: [{ file: 'custom.png', seed: 7, width: 512, height: 512 }],
    };
    const messages: SessionMessage[] = [{
      id: 'assistant-custom',
      role: 'assistant',
      timestamp: generation.timestamp,
      generation,
    }];
    const onEditPrompt = vi.fn();

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <Gallery messages={messages} imagesBasePath="/images" onEditPrompt={onEditPrompt} theme="light" />
      </UiLanguageProvider>,
    );

    screen.getByText('カスタム');
    fireEvent.click(screen.getByRole('button', { name: '✎ 編集' }));
    expect(onEditPrompt).toHaveBeenCalledOnce();
    expect(onEditPrompt).toHaveBeenCalledWith(generation);
    expect(generation.style).toBe('custom');
  });

  it('keeps unknown user-defined styles intact and updates a custom-style lightbox on language change', async () => {
    const generation: Generation = {
      id: 'generation-unknown-style',
      prompt: 'A user-defined style example',
      style: 'studio-cyanotype' as Generation['style'],
      aspectRatio: '1:1',
      parameters: {},
      timestamp: '2026-10-20T10:00:00.000Z',
      results: [{ file: 'custom.png', seed: 9, width: 512, height: 512 }],
    };
    const customGeneration: Generation = { ...generation, id: 'generation-custom', style: 'custom' };
    const messages: SessionMessage[] = [
      { id: 'assistant-unknown', role: 'assistant', timestamp: generation.timestamp, generation },
      { id: 'assistant-custom', role: 'assistant', timestamp: customGeneration.timestamp, generation: customGeneration },
    ];

    render(
      <UiLanguageProvider i18n={japaneseI18n} preference="ja" systemLocale="ja-JP">
        <Gallery messages={messages} imagesBasePath="/images" onEditPrompt={() => {}} theme="light" />
      </UiLanguageProvider>,
    );

    screen.getByText('studio-cyanotype');
    screen.getByText('カスタム');
    fireEvent.click(screen.getAllByRole('img', { name: '生成画像 1' })[1]);
    expect(screen.getByText('512 x 512 · カスタム')).toBeDefined();

    await act(async () => {
      await japaneseI18n.changeLanguage('en');
    });
    expect(screen.getByText('512 x 512 · Custom')).toBeDefined();
    expect(screen.getByText('studio-cyanotype')).toBeDefined();

    await act(async () => {
      await japaneseI18n.changeLanguage('ja');
    });
    expect(screen.getByText('512 x 512 · カスタム')).toBeDefined();
  });
});
