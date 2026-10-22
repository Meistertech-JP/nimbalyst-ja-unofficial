import { describe, expect, it, vi } from 'vitest';
import type { SettingKey } from '../../../shared/settings/keys';
import {
  createMainI18nController,
  translateMainDialogLabel,
  translateMainMenuLabel,
  translateMainNotification,
} from '../mainI18n';

type Listener = (key: SettingKey, value: unknown) => void;

function createSettings(initialLanguage: unknown) {
  let listener: Listener | undefined;
  const settings = {
    get: vi.fn(() => initialLanguage),
    subscribe: vi.fn((next: Listener) => {
      listener = next;
      return () => {
        listener = undefined;
      };
    }),
  };

  return {
    settings,
    emit: (key: SettingKey, value: unknown) => listener?.(key, value),
  };
}

describe('Main i18n controller', () => {
  it('resolves the initial system preference and switches locale when uiLanguage changes', async () => {
    const { settings, emit } = createSettings('system');
    const onLanguageChanged = vi.fn();
    const controller = await createMainI18nController(settings, 'ja-JP', onLanguageChanged);

    expect(settings.get).toHaveBeenCalledWith('app.uiLanguage');
    expect(controller.i18n.language).toBe('ja');
    expect(controller.i18n.t('file_menu', { ns: 'menu' })).toBe('ファイル');
    expect(translateMainMenuLabel('new_file', 'New File...')).toBe('新しいファイル...');
    expect(translateMainMenuLabel('no_suggestions', 'No suggestions')).toBe('候補がありません');
    expect(translateMainMenuLabel('add_to_dictionary', 'Add to Dictionary')).toBe('辞書に追加');
    expect(translateMainNotification('agent.response_ready', 'Response Ready')).toBe('応答が完了しました');
    expect(translateMainNotification('notifications_enabled', 'Notifications Enabled')).toBe('通知を有効にしました');
    expect(translateMainNotification('project_open_failed_title', '{{label}} -- could not be opened', { label: 'Session' }))
      .toBe('Sessionを開けませんでした');
    expect(translateMainNotification('session_resumed', 'Session resumed')).toBe('セッションを再開しました');
    expect(translateMainNotification('agent.rate_limited_retry', 'Rate limited (retry after {{seconds}}s).', { seconds: 12 }))
      .toBe('Anthropicによるレート制限中です（12秒後に再試行）。');
    expect(translateMainDialogLabel('unresponsive.reload', 'Reload')).toBe('再読み込み');
    expect(translateMainDialogLabel('unresponsive.named_window_not_responding', '{{name}} is not responding', { name: 'ワークスペース' }))
      .toBe('ワークスペースが応答していません');
    expect(translateMainDialogLabel('extension_project.intro_title', 'Build With Extensions'))
      .toBe('拡張機能で開発');
    expect(translateMainDialogLabel('extension_project.folder_not_empty_detail', 'The selected folder already contains files:\n{{path}}', { path: 'C:\\projects\\sample' }))
      .toBe('選択したフォルダーにはすでにファイルがあります:\nC:\\projects\\sample');
    expect(translateMainDialogLabel('main_process.attach_folder_confirm', 'Attach "{{folder}}" to "{{workspace}}"?', {
      folder: '資料',
      workspace: 'プロジェクト',
    })).toBe('「資料」を「プロジェクト」に追加しますか？');
    expect(translateMainDialogLabel('main_process.restart_failed_message', 'Restart stopped.\n\n{{error}}', {
      error: 'EACCES',
    })).toContain('EACCES');
    expect(translateMainDialogLabel('main_process.windows_protocol_association_title', 'Check URL protocol association'))
      .toBe('URLプロトコルの関連付けを確認してください');
    expect(translateMainDialogLabel(
      'main_process.windows_protocol_association_detail',
      'Current handler: {{handler}}',
      { handler: 'Official Nimbalyst' },
    )).toContain('現在の登録先: Official Nimbalyst');
    expect(translateMainNotification('team_inbox.new_activity', 'New activity')).toBe('新しいアクティビティ');

    emit('app.uiLanguage', 'en');
    await vi.waitFor(() => {
      expect(controller.i18n.language).toBe('en');
      expect(controller.i18n.t('file_menu', { ns: 'menu' })).toBe('File');
      expect(translateMainMenuLabel('new_file', 'New File...')).toBe('New File...');
      expect(translateMainNotification('agent.response_ready', 'Response Ready')).toBe('Response Ready');
      expect(translateMainNotification('notifications_enabled', 'Notifications Enabled')).toBe('Notifications Enabled');
      expect(translateMainDialogLabel('main_process.attach_folder_button', 'Attach Folder')).toBe('Attach Folder');
      expect(translateMainDialogLabel('main_process.windows_protocol_association_title', 'Check URL protocol association'))
        .toBe('Check URL protocol association');
      expect(translateMainDialogLabel(
        'main_process.windows_protocol_association_detail',
        'Current handler: {{handler}}',
        { handler: 'Official Nimbalyst' },
      )).toContain('Current handler: Official Nimbalyst');
      expect(translateMainNotification('team_inbox.new_activity', 'New activity')).toBe('New activity');
      expect(onLanguageChanged).toHaveBeenCalledWith('en');
    });

    emit('app.uiLanguage', 'ja');
    await vi.waitFor(() => {
      expect(controller.i18n.language).toBe('ja');
      expect(controller.i18n.t('file_menu', { ns: 'menu' })).toBe('ファイル');
      expect(translateMainMenuLabel('new_file', 'New File...')).toBe('新しいファイル...');
      expect(translateMainNotification('agent.response_ready', 'Response Ready')).toBe('応答が完了しました');
      expect(translateMainNotification('notifications_enabled', 'Notifications Enabled')).toBe('通知を有効にしました');
      expect(onLanguageChanged).toHaveBeenLastCalledWith('ja');
    });

    controller.dispose();
  });

  it('ignores unrelated changes and stops reacting after disposal', async () => {
    const { emit, settings } = createSettings('en');
    const onLanguageChanged = vi.fn();
    const controller = await createMainI18nController(settings, 'en-US', onLanguageChanged);

    emit('projects.allowUnlimited', true);
    await Promise.resolve();
    expect(onLanguageChanged).not.toHaveBeenCalled();

    controller.dispose();
    emit('app.uiLanguage', 'ja');
    await Promise.resolve();
    expect(controller.i18n.language).toBe('en');
    expect(onLanguageChanged).not.toHaveBeenCalled();
  });
});
