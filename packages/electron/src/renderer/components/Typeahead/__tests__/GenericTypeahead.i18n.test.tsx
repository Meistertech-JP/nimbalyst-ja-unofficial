// @vitest-environment jsdom
import React from 'react';
import i18next from 'i18next';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GenericTypeahead } from '../GenericTypeahead';
import { buildSlashCommandOptions, type SlashCommandEntry } from '../slashCommandAutocomplete';

afterEach(async () => { cleanup(); await i18next.changeLanguage('en'); });

const commands: SlashCommandEntry[] = [
  { name: 'project-skill', source: 'project', kind: 'skill' },
  { name: 'plugin-skill', source: 'plugin', kind: 'skill' },
  { name: 'user-skill', source: 'user', kind: 'skill' },
  { name: 'compact', source: 'builtin' },
  { name: 'project-command', source: 'project', content: 'Preserved instructions' },
  { name: 'extension-command', source: 'plugin', description: 'User description' },
  { name: 'user-command', source: 'user', argumentHint: '<file>' },
];
const sectionOrder = ['Project Skills', 'Plugin Skills', 'User Skills', 'Built-in Commands', 'Project Commands', 'Extension Commands', 'User Commands'];

describe('localized slash command presentation', () => {
  it('translates seven section headings and default descriptions without altering ordering, selection or commands', async () => {
    const options = buildSlashCommandOptions(commands, '', 'commands');
    const original = JSON.stringify(options);
    const onSelect = vi.fn(), onSelectedOptionChange = vi.fn();
    await i18next.changeLanguage('ja');
    render(<GenericTypeahead anchorElement={null} options={options} selectedIndex={null} onSelectedIndexChange={vi.fn()}
      onSelectedOptionChange={onSelectedOptionChange} onSelect={onSelect} onClose={vi.fn()} cursorPosition={0} sectionOrder={sectionOrder} />);
    expect(Array.from(document.querySelectorAll('.generic-typeahead-section-header'), node => node.textContent)).toEqual([
      'プロジェクトのスキル', 'プラグインのスキル', 'ユーザーのスキル', '組み込みコマンド', 'プロジェクトのコマンド', '拡張機能のコマンド', 'ユーザーのコマンド',
    ]);
    expect(screen.getByText('compact コマンドを実行')).toBeTruthy();
    expect(screen.getByText('User description')).toBeTruthy();
    expect(screen.getByText('/user-command <file>')).toBeTruthy();
    const selectedNotifications = onSelectedOptionChange.mock.calls.length;
    await act(() => i18next.changeLanguage('en'));
    expect(screen.getByText('Built-in Commands')).toBeTruthy();
    expect(onSelectedOptionChange).toHaveBeenCalledTimes(selectedNotifications);
    fireEvent.mouseDown(screen.getByText('/project-command'));
    expect(onSelect).toHaveBeenCalledWith(options[4]);
    expect(onSelect.mock.calls[0][0].data).toBe(commands[4]);
    expect(JSON.stringify(options)).toBe(original);
  });

  it('localizes only the generated Other heading and preserves custom section text', async () => {
    await i18next.changeLanguage('ja');
    render(<GenericTypeahead anchorElement={null} options={[{ id: 'custom', label: 'User item', section: 'Custom section' }, { id: 'none', label: 'Ungrouped item' }]}
      selectedIndex={null} onSelectedIndexChange={vi.fn()} onSelect={vi.fn()} onClose={vi.fn()} cursorPosition={0} />);
    expect(screen.getByText('Custom section')).toBeTruthy();
    expect(screen.getByText('その他')).toBeTruthy();
  });

  it('keeps query filtering and skill-only scope unchanged', () => {
    const options = buildSlashCommandOptions(commands, 'compact', 'commands');
    expect(options.map(option => option.id)).toEqual(['compact']);
    expect(options[0].section).toBeUndefined();
    expect(options[0].sectionLabelKey).toBeUndefined();
    expect(buildSlashCommandOptions(commands, '', 'skills').some(option => option.id === 'compact')).toBe(false);
  });
});
