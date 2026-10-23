// @vitest-environment jsdom
import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { SlashCommandSuggestions } from '../SlashCommandSuggestions';

vi.mock('posthog-js/react', () => ({ usePostHog: () => null }));

const cases = [
  ['animation', 'animate', 'アニメーション付きの解説図を作成します'],
  ['automations', 'automation', '自動化を作成・管理します'],
  ['crew', 'hire', '仕事内容を説明して新しいクルーメンバーを設計・採用します'],
  ['datamodellm', 'datamodel', 'Prismaベースのデータモデルを作成・変更します'],
  ['extension-dev-kit', 'new-extension', '雛形から新しいNimbalyst拡張機能プロジェクトを作成します'],
  ['feedback', 'bug-report', 'GitHubへの不具合報告を案内します'],
  ['feedback', 'feature-request', 'GitHubへの機能リクエストを案内します'],
  ['ios-dev', 'xcodegen', 'XcodeGenでXcodeプロジェクトを生成・管理します'],
  ['ios-dev', 'ios-simulator', 'iOSシミュレーターを起動・管理します'],
  ['ios-dev', 'ios-build', 'iOSアプリをビルド・デプロイします'],
  ['ios-dev', 'fastlane', 'iOSのビルド、コード署名、TestFlightへのデプロイを自動化します'],
  ['mockuplm', 'mockup', '視覚的なUXモックアップを作成します'],
  ['planning', 'design', '構造化された計画書を作成します'],
  ['planning', 'implement', '進捗を追跡しながら計画を実行します'],
  ['planning', 'track', '不具合、タスク、アイデアなどを追跡します'],
  ['planning', 'launch-new-session', '並行して作業を続けるための別のAIセッションを開始します'],
  ['planning', 'session-cleanup', 'セッションボードのフェーズを修正し、完了した作業やアーカイブ候補を整理します'],
  ['planning', 'nimbalyst-coach', 'プロジェクトと最近のセッションを確認し、拡張機能、機能、エージェント指示の変更を提案します'],
] as const;

const commands = cases.map(([directory, name]) => {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../../../extensions', directory, 'manifest.json'), 'utf8'));
  const command = manifest.contributions.claudePlugin.commands.find((entry: { name: string }) => entry.name === name);
  return {
    extensionId: manifest.id as string,
    extensionName: manifest.name as string,
    pluginName: manifest.contributions.claudePlugin.displayName as string,
    pluginNamespace: `unchanged-${directory}`,
    commandName: name as string,
    description: command.description as string,
  };
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function mount(entries = commands) {
  const i18n = await createI18nInstance('ja');
  const onCommandSelect = vi.fn();
  (window as any).electronAPI = { extensions: { getClaudePluginCommands: vi.fn().mockResolvedValue(entries) } };
  render(<I18nextProvider i18n={i18n}><SlashCommandSuggestions provider="claude-code" hasMessages={false} workspacePath="/fixture" onCommandSelect={onCommandSelect} /></I18nextProvider>);
  if (entries.length > 3) await screen.findByRole('button', { name: `+${entries.length - 3}` });
  else await screen.findByText(`${entries[0].pluginNamespace}:${entries[0].commandName}`);
  return { i18n, onCommandSelect };
}

describe('bundled slash command suggestion descriptions', () => {
  it('renders all 18 bundled descriptions in Japanese, switches to English, and preserves command payloads', async () => {
    const raw = JSON.stringify(commands);
    const { i18n, onCommandSelect } = await mount();
    fireEvent.click(screen.getByRole('button', { name: '+15' }));
    for (const [index, [, , japanese]] of cases.entries()) {
      expect(screen.getByText(japanese).getAttribute('role')).toBe('tooltip');
      fireEvent.click(screen.getByRole('button', { name: `/ ${commands[index].pluginNamespace}:${commands[index].commandName}` }));
      expect(onCommandSelect).toHaveBeenLastCalledWith(`/${commands[index].pluginNamespace}:${commands[index].commandName} `);
    }
    await act(async () => { await i18n.changeLanguage('en'); });
    await waitFor(() => { for (const command of commands) expect(screen.getByText(command.description).getAttribute('role')).toBe('tooltip'); });
    expect(JSON.stringify(commands)).toBe(raw);
  });

  it.each([
    ['unknown extension', { ...commands[3], extensionId: 'com.example.extension', pluginNamespace: 'unchanged-com.example.extension' }],
    ['unknown command', { ...commands[3], commandName: 'custom-command' }],
    ['changed description', { ...commands[3], description: 'Customized data model command' }],
  ])('preserves %s metadata', async (_, command) => {
    const { i18n } = await mount([command]);
    expect(screen.getByText(command.description).getAttribute('role')).toBe('tooltip');
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByText(command.description).getAttribute('role')).toBe('tooltip');
  });
});
