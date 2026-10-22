/**
 * Hire a crew member from a starter template or by cloning someone already on
 * the crew. Designing a new member with an agent happens in an ordinary
 * session via `/crew:hire`, where the agent can ask questions and fix its own
 * validation errors.
 */
import { useMemo, useState } from 'react';
import type { CrewHireRequest, CrewMemberDraft, CrewMemberSnapshot, CrewTemplate } from '../shared/types';
import { CrewAvatar, CrewModal } from './CrewBits';
import { useCrew, useCrewAction, useCrewQuery } from './CrewContext';
import { formatScheduleTiming, formatTokens, freeSlug, slugifyCrewName, type CrewTranslate } from './crewFormat';
import { useTranslation } from '@nimbalyst/i18n/react';

type Source = 'template' | 'clone';
type Picked =
  | { source: 'template'; template: CrewTemplate }
  | { source: 'clone'; member: CrewMemberSnapshot }
  | null;

function rhythmOf(draft: Pick<CrewMemberDraft, 'schedule'>, translate?: CrewTranslate): string {
  const first = draft.schedule?.[0];
  if (!first) return translate ? translate('crew.hire.on_demand') : 'On demand';
  const more = draft.schedule.length - 1;
  const timing = formatScheduleTiming(first, translate);
  return more > 0 ? `${timing} ${translate ? translate('crew.hire.plus_more', { more }) : `+${more}`}` : timing;
}

export function CrewHireDialog({ onClose }: { onClose: () => void }) {
  const { client, roster, select } = useCrew();
  const { t } = useTranslation('extensions');
  const members = roster?.members ?? [];
  const templates = useCrewQuery(() => client.call('templates', {}), []);
  const { busy, error, run } = useCrewAction();
  const [source, setSource] = useState<Source>('template');
  const [picked, setPicked] = useState<Picked>(null);
  const [form, setForm] = useState({ name: '', role: '', personality: '' });

  const takenSlugs = useMemo(() => new Set(members.map((m) => m.definition.slug)), [members]);
  const slug = freeSlug(slugifyCrewName(form.name), takenSlugs);
  const valid = picked !== null && slug.length > 0 && form.name.trim().length > 0 && form.role.trim().length > 0;

  const choose = (next: Picked) => {
    setPicked(next);
    if (!next) return;
    const def = next.source === 'template' ? next.template.definition : next.member.definition;
    setForm({
      // A clone needs its own name; a template suggests one.
      name: next.source === 'clone' ? '' : next.template.name,
      role: def.role,
      personality: def.personality,
    });
  };

  const switchSource = (next: Source) => {
    setSource(next);
    setPicked(null);
    setForm({ name: '', role: '', personality: '' });
  };

  const buildRequest = (): CrewHireRequest | null => {
    const overrides = { name: form.name.trim(), role: form.role.trim(), personality: form.personality.trim() };
    if (picked?.source === 'template') return { source: 'template', templateId: picked.template.id, slug, overrides };
    if (picked?.source === 'clone') return { source: 'clone', sourceSlug: picked.member.definition.slug, slug, overrides };
    return null;
  };

  const hire = async () => {
    const request = buildRequest();
    if (!request || !valid) return;
    const created = await run('hire', () => client.call('hire', request));
    if (created) {
      select(created.definition.slug);
      onClose();
    }
  };

  const trimmedName = form.name.trim();
  const hireLabel = busy ? t('crew.hire.hiring') : trimmedName ? t('crew.hire.hire_name', { name: trimmedName }) : t('crew.hire.hire');

  return (
    <CrewModal
      className="crew-hire-dialog"
      title={t('crew.hire.title')}
      subtitle={t('crew.hire.subtitle')}
      closeLabel={t('crew.modal.close')}
      onClose={onClose}
      headerExtra={(
        <div className="crew-segmented" role="tablist">
          {([['template', 'crew.hire.templates'], ['clone', 'crew.hire.clone']] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={source === id}
              data-selected={source === id}
              disabled={id === 'clone' && members.length === 0}
              onClick={() => switchSource(id)}
            >
              {t(label)}
            </button>
          ))}
        </div>
      )}
      footer={(
        <>
          <button type="button" className="crew-btn crew-btn-secondary" onClick={onClose} disabled={busy !== null}>{t('crew.hire.cancel')}</button>
          <button type="button" className="crew-btn crew-btn-primary" onClick={() => void hire()} disabled={!valid || busy !== null}>
            {hireLabel}
          </button>
        </>
      )}
    >
      <div
        className="crew-hire-body"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && valid && !busy) {
            e.preventDefault();
            void hire();
          }
        }}
      >
        {source === 'template' && (
          templates.data === null ? (
            templates.error
              ? <div className="crew-empty-note" role="alert">{t('crew.hire.templates_failed')} <span className="crew-selectable crew-faint">{templates.error}</span></div>
              : <div className="crew-empty-note" role="status">{t('crew.hire.templates_loading')}</div>
          ) : templates.data.length === 0 ? (
            <div className="crew-empty-note">{t('crew.hire.templates_empty')}</div>
          ) : (
            <div className="crew-hire-gallery" role="listbox" aria-label={t('crew.hire.gallery_templates')}>
              {templates.data.map((template) => (
                <HireCard
                  key={template.id}
                  draft={{ ...template.definition, name: template.name, role: template.role, color: template.color }}
                  blurb={template.description}
                  personality={template.personality}
                  selected={picked?.source === 'template' && picked.template.id === template.id}
                  onSelect={() => choose({ source: 'template', template })}
                />
              ))}
            </div>
          )
        )}

        {source === 'clone' && (
          <div className="crew-hire-gallery" role="listbox" aria-label={t('crew.hire.gallery_members')}>
            {members.map((member) => (
              <HireCard
                key={member.definition.slug}
                draft={member.definition}
                blurb={t('crew.hire.clone_blurb', { name: member.definition.name })}
                personality={member.definition.personality}
                selected={picked?.source === 'clone' && picked.member.definition.slug === member.definition.slug}
                onSelect={() => choose({ source: 'clone', member })}
              />
            ))}
          </div>
        )}

        {picked !== null && (
          <div className="crew-hire-form">
            <div className="crew-hire-form-grid">
              <label className="crew-field">
                {t('crew.hire.name')}
                <input className="crew-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('crew.hire.name_placeholder')} autoFocus />
              </label>
              <label className="crew-field">
                {t('crew.hire.role')}
                <input className="crew-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder={t('crew.hire.role_placeholder')} />
              </label>
            </div>
            <label className="crew-field">
              {t('crew.hire.personality')}
              <textarea className="crew-input crew-textarea-small" value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })} placeholder={t('crew.hire.personality_placeholder')} />
            </label>
            <p className="crew-faint crew-small">
              {slug ? <>{t('crew.hire.saved_as')} <span className="crew-mono">nimbalyst-local/crew/{slug}.md</span>. </> : null}
              {t('crew.hire.saved_note')}
            </p>
          </div>
        )}

        {error && <div className="crew-error-box crew-selectable" role="alert">{error}</div>}

        <p className="crew-hire-command-hint crew-faint crew-small">
          {t('crew.hire.command_head')} <span className="crew-mono">/crew:hire</span> {t('crew.hire.command_tail')}
        </p>
      </div>
    </CrewModal>
  );
}

function HireCard({
  draft,
  blurb,
  personality,
  selected,
  onSelect,
}: {
  draft: Pick<CrewMemberDraft, 'name' | 'role' | 'color' | 'provider' | 'model' | 'schedule' | 'budget'>;
  blurb: string;
  personality: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation('extensions');
  return (
    <button type="button" role="option" aria-selected={selected} data-selected={selected} className="crew-hire-card" onClick={onSelect}>
      <span className="crew-row">
        <CrewAvatar definition={draft} />
        <span className="crew-hire-card-names">
          <span className="crew-truncate crew-strong">{draft.name}</span>
          <span className="crew-truncate crew-faint">{draft.role}</span>
        </span>
      </span>
      <span className="crew-hire-card-blurb">{blurb}</span>
      {personality && <span className="crew-hire-card-personality">{personality}</span>}
      <span className="crew-hire-card-meta">
        {draft.model && <span>{draft.model}</span>}
        <span>{rhythmOf(draft, t)}</span>
        {draft.budget?.tokensPerWeek > 0 && <span>{t('crew.hire.per_week', { tokens: formatTokens(draft.budget.tokensPerWeek) })}</span>}
      </span>
    </button>
  );
}
