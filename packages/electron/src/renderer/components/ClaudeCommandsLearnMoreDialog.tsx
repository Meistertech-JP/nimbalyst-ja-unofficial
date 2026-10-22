import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

interface ClaudeCommandsLearnMoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

interface CommandInfo {
  name: string;
  description: string;
}

interface CommandGroup {
  titleKey: 'core' | 'developer' | 'product_manager';
  subtitleKey: 'core' | 'developer' | 'product_manager';
  commands: CommandInfo[];
}

const COMMAND_GROUPS: CommandGroup[] = [
  {
    titleKey: 'core',
    subtitleKey: 'core',
    commands: [
      {
        name: '/track',
        description: 'track',
      },
      {
        name: '/mockup',
        description: 'mockup',
      },
    ],
  },
  {
    titleKey: 'developer',
    subtitleKey: 'developer',
    commands: [
      {
        name: '/analyze-code',
        description: 'analyze_code',
      },
      {
        name: '/write-tests',
        description: 'write_tests',
      },
    ],
  },
  {
    titleKey: 'product_manager',
    subtitleKey: 'product_manager',
    commands: [
      {
        name: '/roadmap',
        description: 'roadmap',
      },
      {
        name: '/user-research',
        description: 'user_research',
      },
    ],
  },
];

export function ClaudeCommandsLearnMoreDialog({
  isOpen,
  onClose,
  onOpenSettings,
}: ClaudeCommandsLearnMoreDialogProps): React.ReactElement | null {
  const { t } = useTranslation('dialogs');
  if (!isOpen) return null;

  return (
    <div
      className="claude-commands-learn-more-overlay nim-overlay z-[10001] backdrop-blur-[4px]"
      onClick={onClose}
    >
      <div
        className="claude-commands-learn-more-dialog nim-modal w-[90%] max-w-[640px] max-h-[85vh] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="claude-commands-learn-more-header flex items-center justify-between px-6 py-5 border-b border-[var(--nim-border)]">
          <h2 className="m-0 text-lg font-semibold text-[var(--nim-text)]">
            {t('claude_commands.title')}
          </h2>
          <button
            className="claude-commands-learn-more-close nim-btn-icon w-8 h-8 text-[28px] leading-none rounded transition-all duration-200"
            onClick={onClose}
            aria-label={t('claude_commands.close')}
          >
            &times;
          </button>
        </div>

        <div className="claude-commands-learn-more-content overflow-y-auto p-6 flex flex-col gap-6">
          {/* Introduction */}
          <section className="claude-commands-learn-more-section">
            <p className="claude-commands-learn-more-intro m-0 text-sm text-[var(--nim-text)]">
              {t('claude_commands.intro')}
            </p>
          </section>

          {/* nimbalyst-local folder */}
          <section className="claude-commands-learn-more-section">
            <h3 className="m-0 mb-1 text-sm font-semibold text-[var(--nim-text)]">
              {t('claude_commands.folder_title')}
            </h3>
            <p className="m-0 mb-3 text-[13px] leading-relaxed text-[var(--nim-text-muted)]">
              <Trans
                i18nKey="claude_commands.folder_description"
                ns="dialogs"
                components={{
                  code: <code className="bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] rounded px-1.5 py-0.5 font-mono text-xs text-[var(--nim-text)]" />,
                }}
              />
            </p>
            <div className="claude-commands-folder-structure bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] rounded-lg px-4 py-3 my-3">
              <pre className="m-0 font-mono text-xs leading-relaxed text-[var(--nim-text-muted)] whitespace-pre">
                {`nimbalyst-local/
├── plans/        # ${t('claude_commands.folder_entries.plans')} (.md)
├── tracker/      # ${t('claude_commands.folder_entries.tracker')} (.md)
├── mockups/      # ${t('claude_commands.folder_entries.mockups')} (.mockup.html)
└── existing-screens/  # ${t('claude_commands.folder_entries.references')}`}
              </pre>
            </div>
            <p className="claude-commands-learn-more-note m-0 text-xs italic text-[var(--nim-text-faint)]">
              <Trans
                i18nKey="claude_commands.folder_note"
                ns="dialogs"
                components={{
                  code: <code className="bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] rounded px-1.5 py-0.5 font-mono text-xs text-[var(--nim-text)]" />,
                }}
              />
            </p>
          </section>

          {/* Slash Commands by Group */}
          {COMMAND_GROUPS.map((group) => (
            <section
              key={group.titleKey}
              className="claude-commands-learn-more-section"
            >
              <h3 className="m-0 mb-1 text-sm font-semibold text-[var(--nim-text)]">
                {t(`claude_commands.groups.${group.titleKey}`)}
              </h3>
              <p className="claude-commands-group-subtitle m-0 mb-3 text-xs text-[var(--nim-text-faint)]">
                {t(`claude_commands.subtitles.${group.subtitleKey}`)}
              </p>
              <div className="claude-commands-list flex flex-col gap-3">
                {group.commands.map((cmd) => (
                  <div
                    key={cmd.name}
                    className="claude-commands-item bg-[var(--nim-bg-secondary)] border border-[var(--nim-border)] rounded-lg px-3.5 py-3"
                  >
                    <div className="claude-commands-item-header mb-1.5">
                      <code className="claude-commands-item-name text-[13px] font-semibold text-[var(--nim-primary)]">
                        {cmd.name}
                      </code>
                    </div>
                    <p className="claude-commands-item-description m-0 text-xs text-[var(--nim-text-muted)]">
                      {t(`claude_commands.commands.${cmd.description}`)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Additional info */}
          <section className="claude-commands-learn-more-section">
            <p className="claude-commands-learn-more-note m-0 text-xs italic text-[var(--nim-text-faint)]">
              {t('claude_commands.additional_prefix')}{' '}
              <button
                className="claude-commands-learn-more-link bg-transparent border-none p-0 text-inherit font-inherit italic text-[var(--nim-primary)] cursor-pointer underline transition-colors duration-200 hover:text-[var(--nim-primary-hover)]"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
              >
                {t('claude_commands.project_settings')}
              </button>
              {t('claude_commands.additional_suffix')}
            </p>
          </section>
        </div>

        <div className="claude-commands-learn-more-footer flex justify-end px-6 py-4 border-t border-[var(--nim-border)]">
          <button
            className="claude-commands-learn-more-btn nim-btn-primary px-5 py-2.5 rounded-md text-sm font-medium"
            onClick={onClose}
          >
            {t('claude_commands.got_it')}
          </button>
        </div>
      </div>
    </div>
  );
}
