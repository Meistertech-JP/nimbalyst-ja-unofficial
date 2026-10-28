import { describe, expect, it } from 'vitest';
import { createI18nInstance, normalizeUiLanguage, resolveSystemLocale, resolveUiLocale } from '../core';
import { resources } from '../resources';

describe('UI language preference', () => {
  it('resolves shared-document local-source action labels in both languages', async () => {
    const i18n = await createI18nInstance('ja');
    const keys = ['open_local_source', 'reupload_from_local', 'relink_local_source', 'link_local_source', 'clear_local_source'];
    const japanese = keys.map(key => i18n.t(`ui.${key}`, { ns: 'collabSidebar' }));
    expect(japanese).toEqual(['ローカルのソースを開く', 'ローカルから再アップロード', 'ローカルソースを再リンク...', 'ローカルソースをリンク...', 'ローカルソースを解除']);
    await i18n.changeLanguage('en');
    for (const [index, key] of keys.entries()) {
      const translated = i18n.t(`ui.${key}`, { ns: 'collabSidebar' });
      expect(translated).not.toBe(`ui.${key}`);
      expect(translated).not.toBe(japanese[index]);
    }
  });

  it('normalizes unsupported persisted values to system', () => {
    expect(normalizeUiLanguage('ja')).toBe('ja');
    expect(normalizeUiLanguage('en')).toBe('en');
    expect(normalizeUiLanguage('system')).toBe('system');
    expect(normalizeUiLanguage('fr')).toBe('system');
    expect(normalizeUiLanguage(undefined)).toBe('system');
  });

  it('uses Japanese only for Japanese system locales and English as fallback', () => {
    expect(resolveSystemLocale('ja-JP')).toBe('ja');
    expect(resolveSystemLocale('JA')).toBe('ja');
    expect(resolveSystemLocale('en-US')).toBe('en');
    expect(resolveSystemLocale(undefined)).toBe('en');
  });

  it('resolves explicit preferences without depending on agent language', () => {
    expect(resolveUiLocale('ja', 'en-US')).toBe('ja');
    expect(resolveUiLocale('en', 'ja-JP')).toBe('en');
    expect(resolveUiLocale('system', 'ja-JP')).toBe('ja');
  });

  it('keeps English and Japanese resource namespaces and key shapes in lockstep', () => {
    expect(Object.keys(resources.en).sort()).toEqual(Object.keys(resources.ja).sort());

    const stringLeaves = (value: unknown, prefix = ''): string[] => {
      if (typeof value === 'string') return [prefix];
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
      return Object.entries(value).flatMap(([key, child]) =>
        stringLeaves(child, prefix ? `${prefix}.${key}` : key),
      );
    };

    let totalKeys = 0;
    for (const namespace of Object.keys(resources.en) as Array<keyof typeof resources.en>) {
      const englishKeys = stringLeaves(resources.en[namespace]).sort();
      const japaneseKeys = stringLeaves(resources.ja[namespace]).sort();
      expect(japaneseKeys).toEqual(englishKeys);
      totalKeys += englishKeys.length;

      const readValue = (root: unknown, path: string): unknown =>
        path.split('.').reduce<unknown>((value, segment) =>
          value && typeof value === 'object'
            ? (value as Record<string, unknown>)[segment]
            : undefined,
        root);

      const readPath = (root: unknown, path: string): unknown =>
        path.split('.').reduce<unknown>((value, segment) =>
          value && typeof value === 'object'
            ? (value as Record<string, unknown>)[segment]
            : undefined,
        root);
      for (const key of englishKeys) {
        const placeholders = (value: unknown) =>
          typeof value === 'string'
            ? [...value.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((match) => match[1]).sort()
            : [];
        expect(placeholders(readPath(resources.ja[namespace], key))).toEqual(
          placeholders(readPath(resources.en[namespace], key)),
        );
        const japaneseValue = readValue(resources.ja[namespace], key);
        const englishValue = readValue(resources.en[namespace], key);
        if (`${namespace}.${key}` === 'common.local_wiki.export.note_separator') {
          expect(englishValue).toBe(' ');
          expect(japaneseValue).toBe(' ');
          continue;
        }
        if (typeof japaneseValue === 'string') {
          expect(japaneseValue.trim().length).toBeGreaterThan(0);
          if (typeof englishValue === 'string' && japaneseValue === englishValue) {
            // Exact equivalents are intentional for brands, file formats,
            // commands, identifiers and user-provided input examples.
            expect(['common.app_name', 'common.usage_indicator.claude_name', 'common.usage_indicator.gemini_name',
              'common.wiki_export.wiki_title',
              'common.quick_open.file_type_typescript', 'common.quick_open.file_type_javascript',
              'common.quick_open.file_type_markdown', 'common.quick_open.file_type_json',
              'common.quick_open.file_type_html', 'common.quick_open.file_type_python',
              'common.quick_open.file_type_rust', 'common.quick_open.file_type_swift',
              'common.quick_open.file_type_go',
              'settings.agent_features.features.blitz.name',
              'settings.agent_features.features.meta-agent.name',
              'settings.claude_code_panel.cli_title',
              'settings.claude_code_panel.path_placeholder',
              'settings.claude_code_panel.variable_name',
              'settings.database.migration_progress_detail',
              'settings.database.ok',
              'settings.database.panel.disk_space_ok',
              'settings.provider.claude_agent.git_for_windows',
              'settings.provider.claude_agent.claude_code_for_windows',
              'settings.provider.claude_agent.name',
              'settings.provider.claude_agent.title',
              'common.account_ui.email_placeholder', 'settings.provider.claude.title',
              'settings.provider.openai.title', 'settings.provider.lm_studio.title',
              'settings.provider.headless.providers.cursor_agent.title',
              'settings.provider.headless.providers.grok_build.title',
              'settings.provider.opencode.cli_title',
              'settings.provider.opencode.title',
              'settings.provider.codex.title',
              'settings.provider.codex.api_key_placeholder',
              'settings.provider.copilot.title',
              'settings.provider.copilot.cli_title',
              'settings.sidebar.groups.github',
              'settings.sidebar.items.openai_codex',
              'settings.sidebar.items.opencode',
              'settings.sidebar.items.copilot_cli',
              'settings.sidebar.items.claude',
              'settings.sidebar.items.openai',
              'settings.sidebar.items.lmstudio',
              'settings.sidebar.item_openai_codex',
              'settings.sidebar.item_opencode',
              'settings.sidebar.item_copilot_cli',
              'settings.sidebar.item_grok_build',
              'settings.sidebar.item_antigravity_gemini_agent',
              'settings.sidebar.item_openai',
              'settings.sidebar.item_lmstudio',
              'settings.sidebar.item_project_github',
              'settings.ui_language.english',
              'settings.ui_language.japanese',
              'settings.sync.ios_app',
              'settings.sync.app_store',
              'settings.sync.delete_word',
              'settings.mcp.env_help.zapier_url_label',
              'settings.developer_dashboard.render_profiler.atom',
              'settings.themes.builtin_names.monokai',
              'settings.themes.builtin_names.solarized-dark',
              'settings.themes.builtin_names.solarized-light',
              'settings.provider.claude_agent.sdk_title',
              'settings.provider.claude_agent.sdk_title',
              'common.quick_open.file_type_go',
              'aichat.visual.chart_description',
              'dialogs.superloop.raw_json',
              'dialogs.keyboard_shortcuts.groups.wiki',
              'editor.insert_dialog.url',
              'editor.canvas.history.version',
              'editor.code_excerpt.reference_placeholder',
              'editor.spreadsheet_ui.boolean_style.true_false',
              'editor.spreadsheet_ui.negative_style.minus',
              'editor.spreadsheet_ui.negative_style.parens',
              'editor.spreadsheet_ui.link.url',
              'extensions.project_graph.ui.type_github_pr',
              'extensions.project_graph.views_list',
              'extensions.project_graph.atlas_label',
              'extensions.project_graph.atlas_title',
              'extensions.project_graph.pulse_label',
              'extensions.project_graph.pulse.title',
              'extensions.project_graph.source_github',
              'extensions.github_placeholder',
              'extensions.installed_panel.source_github',
              'extensions.crew.hire.plus_more',
              'extensions.knowledge_ui.cloudflare_workers_ai',
              'files.filter.git',
              'files.new_file.markdown',
              'files.welcome.markdown_label',
              'file_edits_sidebar.status.operation',
              'git.issues.upstream',
              'mcp.panel.header_name_placeholder',
              'mcp.panel.auth_oauth',
              'mcp.env_help.ZAPIER_MCP_URL.label',
              'menu.top_bar.nimbalyst',
              'menu.top_bar.git_activity_entry',
              'menu.top_bar.git_activity',
              'menu.github_discussions',
              'menu.youtube',
              'menu.linkedin',
              'menu.x_twitter',
              'menu.tiktok',
              'menu.instagram',
              'onboarding.email_placeholder',
              'onboarding.welcome_modal.plans.private_label',
              'onboarding.welcome_modal.plans.shared_label',
              'onboarding.welcome_modal.claude.claude_md_label',
              'onboarding.referral_options.youtube',
              'onboarding.referral_options.github',
              'onboarding.social_options.linkedin',
              'onboarding.social_options.twitter_x',
              'onboarding.social_options.reddit',
              'onboarding.social_options.tiktok',
              'onboarding.social_options.instagram',
              'onboarding.social_options.facebook',
              'project.providers.claude-code.name',
              'project.providers.claude.name',
              'project.providers.claude.subtitle',
              'project.providers.openai.name',
              'project.providers.lmstudio.name',
              'project.themes.builtin_crystal',
              'project.workspace_welcome.markdown',
              'tracker.item_tooltip',
              'tracker.inline.id',
              'tracker.placed_view_settings.layout_2x2',
              'extensions.id',
              'extensions.project_graph.atlas.area_accessible_label',
              'extensions.project_graph.atlas.connection_count',
              'dialogs.confirm.ok',
              'dialogs.database_recovery.ok',
              'dialogs.error.ok',
              'dialogs.extension_project.ok',
              'onboarding.referral_options.ai',
              'onboarding.social_options.youtube'].includes(`${namespace}.${key}`),
              `${namespace}.${key} is identical in English and Japanese`).toBe(true);
          }
        }
      }
    }
    expect(resources.ja.mcp.env_help.GITHUB_PERSONAL_ACCESS_TOKEN.label)
      .toBe('GitHub 個人アクセストークン');
    expect(resources.ja.mcp.env_help.FIGMA_API_KEY.label)
      .toBe('Figma 個人アクセストークン');
    expect(resources.ja.mcp.panel.value_placeholder).toBe('値');
    expect(resources.en.tracker.page_status).toEqual({ draft: 'Draft', current: 'Current', outdated: 'Outdated' });
    expect(resources.ja.tracker.page_status).toEqual({ draft: '下書き', current: '最新', outdated: '古い' });
    expect(resources.en.collabSidebar.list.unsupported_document).toBe('Unsupported document');
    expect(resources.ja.collabSidebar.list.unsupported_document).toBe('未対応のドキュメント');
    expect(resources.ja.aichat.feedback_compose.change).toBe('変更');
    expect(resources.ja.aichat.feedback_compose.rating_range).toBe('{{min}}～{{max}}');
    expect(resources.ja.aichat.git_commit.exclude_hunk).toBe('この差分を除外');
    expect(resources.ja.aichat.git_commit.show_hunks_for_file).toBe('{{fileName}}の差分を表示');
    expect(resources.ja.aichat.mobile_html_embed.loading).toBe('{{label}}を読み込み中…');
    expect(resources.ja.feedback.composer.message_placeholder)
      .toBe('{{surfaceLabel}}にメッセージを入力。@でメンションするユーザーまたはエージェントを指定できます。');
    expect(resources.ja.feedback.backlinks.document_title)
      .toBe('このドキュメントへのフィードバック（{{count}}件）');
    expect(resources.en.extensions.animation.scene_aria_label).toBe('Animated diagram with {{partCount}} parts and {{stepCount}} steps.');
    expect(resources.ja.extensions.animation.scene_aria_label).toBe('アニメーション図。要素{{partCount}}個、ステップ{{stepCount}}件。');
    expect(resources.en.extensions.animation.scene_steps).toBe(' Steps: {{captions}}');
    expect(resources.ja.extensions.animation.scene_steps).toBe('ステップ: {{captions}}');
    expect(resources.en.extensions.project_graph.pulse.unit.auto).toBe('Auto');
    expect(resources.ja.extensions.project_graph.pulse.unit.auto).toBe('自動');
    expect(resources.en.extensions.image_generation_ui.styles.custom.label).toBe('Custom');
    expect(resources.ja.extensions.image_generation_ui.styles.custom.label).toBe('カスタム');
    expect(resources.en.extensions.image_generation_ui.api_key_missing_banner).toContain('Settings > Extensions > Image Generation');
    expect(resources.ja.extensions.image_generation_ui.api_key_missing_banner).toContain('設定 > 拡張機能 > 画像生成');
    expect(resources.ja.extensions.image_generation_ui.api_key_missing_banner).not.toContain('Image Generation');
    expect(resources.en.settings.sidebar.item_grok_build).toBe('Grok Build');
    expect(resources.ja.settings.sidebar.item_grok_build).toBe('Grok Build');
    expect(resources.en.settings.sidebar.item_cursor_agent).toBe('Cursor Agent');
    expect(resources.ja.settings.sidebar.item_cursor_agent).toBe('Cursorエージェント');
    expect(resources.en.settings.sidebar.item_antigravity_gemini_agent).toBe('Gemini');
    expect(resources.ja.settings.sidebar.item_antigravity_gemini_agent).toBe('Gemini');
    expect(resources.en.menu.top_bar.new_shared_doc).toBe('New shared doc');
    expect(resources.ja.menu.top_bar.new_shared_doc).toBe('新しい共有ドキュメント');
    expect(resources.en.menu.top_bar.new_item).toBe('New item');
    expect(resources.ja.menu.top_bar.new_item).toBe('新しい項目');
    expect(resources.en.common.account_ui.secure_storage_failed)
      .toBe('Sign-in could not be completed because authentication information could not be stored securely.');
    expect(resources.ja.common.account_ui.secure_storage_failed)
      .toBe('認証情報を安全に保存できないため、サインインを完了できませんでした。');
    expect(resources.en.editor.typeahead_menu_label).toBe('Typeahead menu');
    expect(resources.ja.editor.typeahead_menu_label).toBe('入力候補');
    expect(resources.en.orgSharing.team_recovery.open).toBe('Recover this organization');
    expect(resources.ja.orgSharing.team_recovery.open).toBe('この組織を復旧');
    expect(resources.ja.orgSharing.team_recovery.blockers.missing_body).toContain('暗号化した復旧バンドル');
    expect(resources.ja.orgSharing.team_recovery.errors.sign_in).toBe('組織の復旧を続けるにはサインインしてください');
    expect(resources.ja.aichat.clipboard_image).toBe('クリップボードの画像');
    expect(resources.en.tracker.fields.set_tooltip).toBe('Set {{field}}');
    expect(resources.ja.tracker.fields.set_tooltip).toBe('{{field}}を設定');
    expect(resources.en.tracker.fields.read_only_tooltip).toBe('{{field}} is read-only');
    expect(resources.ja.tracker.fields.read_only_tooltip).toBe('{{field}}は読み取り専用です');
    expect(resources.en.tracker.publication).toEqual({
      published: 'Published', draft: 'Draft',
      published_description: 'Your team can see this item.',
      draft_description: 'Only you can see this. Publish it when it is ready.',
    });
    expect(resources.ja.tracker.publication).toEqual({
      published: '公開済み', draft: '下書き',
      published_description: 'この項目はチームに公開されています。',
      draft_description: 'この項目は自分だけに表示されます。準備ができたら公開してください。',
    });
    expect(resources.en.tracker.columns.collection).toBe('Collection');
    expect(resources.ja.tracker.columns.collection).toBe('コレクション');
    expect(resources.en.tracker.grid.open_details).toBe('Open details');
    expect(resources.ja.tracker.grid.open_details).toBe('詳細を開く');
    expect(resources.en.tracker.detail.sync_local).toBe('Local');
    expect(resources.ja.tracker.detail.sync_local).toBe('ローカル');
    expect(resources.en.tracker.detail.sync_pending).toBe('Pending');
    expect(resources.ja.tracker.detail.sync_pending).toBe('同期待ち');
    expect(resources.en.tracker.detail.sync_synced).toBe('Synced');
    expect(resources.ja.tracker.detail.sync_synced).toBe('同期済み');
    expect(resources.en.tracker.columns.publication).toBe('Publication');
    expect(resources.ja.tracker.columns.publication).toBe('公開状態');
    expect(resources.en.aichat.session_naming_failure).toBe('The response is complete, but session information could not be updated.');
    expect(resources.ja.aichat.session_naming_failure).toBe('応答は完了しましたが、セッション情報を更新できませんでした。');
    expect(resources.en.tracker.placed_view_marks.all_marks).toBe('All marks');
    expect(resources.ja.tracker.placed_view_marks.all_marks).toBe('すべてのマーク');
    expect(totalKeys).toBe(14831);
  });

  it('contains localized browser sign-in results and callback refusals', async () => {
    const en = await createI18nInstance('en');
    const ja = await createI18nInstance('ja');
    expect(en.t('auth_callback', { ns: 'dialogs', returnObjects: true })).toEqual({
      success_title: 'Nimbalyst sign-in', success_heading: "You're signed in", success_message: 'Return to Nimbalyst.',
      error_title: 'Nimbalyst sign-in error', error_heading: 'Sign-in could not be completed', error_message: 'Return to Nimbalyst and try again.',
      already_used: 'This sign-in callback has already been used.', invalid_body: 'Invalid callback body', payload_too_large: 'Callback payload too large',
    });
    expect(ja.t('auth_callback', { ns: 'dialogs', returnObjects: true })).toEqual({
      success_title: 'Nimbalystへのログイン', success_heading: 'ログインしました', success_message: 'Nimbalystに戻ってください。',
      error_title: 'Nimbalystへのログインエラー', error_heading: 'ログインを完了できませんでした', error_message: 'Nimbalystに戻って、もう一度お試しください。',
      already_used: 'このログイン用コールバックはすでに使用されています。', invalid_body: 'コールバックの本文が無効です', payload_too_large: 'コールバックのデータが大きすぎます',
    });
  });

  it('creates isolated translator instances with English fallback', async () => {
    const english = await createI18nInstance('en');
    const japanese = await createI18nInstance('ja');
    expect(japanese.t('ui_language.label', { ns: 'settings' })).toBe('表示言語');
    expect(english.t('ui_language.label', { ns: 'settings' })).toBe('Interface language');
    expect(japanese.t('missing_key', { ns: 'settings', defaultValue: 'Fallback text' })).toBe('Fallback text');
    expect(english.language).toBe('en');
    expect(japanese.language).toBe('ja');
  });
});
