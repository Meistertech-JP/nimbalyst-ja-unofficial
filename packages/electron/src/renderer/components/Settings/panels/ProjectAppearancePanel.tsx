import React, { useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { projectAppearanceAtom, saveProjectAppearanceAtom } from '../../../store/atoms/projectAppearance';
import { generateWorkspaceAccentColor, initialsLength, projectIconForeground, projectInitials, type ProjectAppearanceUpdate } from '../../../../shared/projectAppearance';
import { ProjectIcon } from '../../ProjectIcon';
import { getFileName } from '../../../utils/pathUtils';
import './ProjectAppearancePanel.css';

async function importThumbnail(
  file: File,
  translate: (key: 'invalid_image_type' | 'image_too_large' | 'prepare_image_failed') => string,
): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error(translate('invalid_image_type'));
  if (file.size > 5 * 1024 * 1024) throw new Error(translate('image_too_large'));
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 128 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error(translate('prepare_image_failed'));
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally { bitmap.close(); }
}

export function ProjectAppearancePanel({ workspacePath }: { workspacePath: string }) {
  const { t } = useTranslation('settings', { keyPrefix: 'project_appearance' });
  const { snapshot, error: loadError } = useAtomValue(projectAppearanceAtom(workspacePath));
  const save = useSetAtom(saveProjectAppearanceAtom);
  const [patch, setPatch] = useState<ProjectAppearanceUpdate>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const name = getFileName(workspacePath) || t('project_fallback');
  const saved = snapshot?.appearance ?? {};
  const appearance = {
    initials: patch.initials === undefined ? saved.initials : patch.initials || undefined,
    color: patch.color === undefined ? saved.color : patch.color || undefined,
    imageUrl: patch.image === undefined ? saved.imageUrl : patch.image || undefined,
  };
  const change = (update: ProjectAppearanceUpdate) => {
    setPatch(current => ({ ...current, ...update })); setStatus(''); setError('');
  };
  const persist = async (update: ProjectAppearanceUpdate) => {
    setBusy(true); setError(''); setStatus('');
    try { await save(workspacePath, update); setPatch({}); setStatus(t('saved')); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const invalidInitials = initialsLength(appearance.initials?.trim() || '') > 3;
  return (
    <section className="project-appearance-panel" data-testid="project-appearance-panel" data-project-path={workspacePath}>
      <h2>{t('title')}</h2>
      <p>{t('description', { name })}</p>
      <div className="project-appearance-preview-row">
        <div className="project-appearance-preview" data-testid="project-appearance-preview"
          style={{ background: appearance.color || generateWorkspaceAccentColor(workspacePath), color: projectIconForeground(appearance.color) }}>
          <ProjectIcon name={name} appearance={appearance} />
        </div>
        <div><strong>{name}</strong><div className="project-appearance-path" title={workspacePath}>{workspacePath}</div></div>
      </div>
      <fieldset disabled={busy || !snapshot}>
        <label htmlFor="project-initials">{t('initials')}</label>
        <input id="project-initials" data-testid="project-appearance-initials" type="text" maxLength={64}
          value={appearance.initials || ''} placeholder={projectInitials(name)} aria-invalid={invalidInitials}
          aria-describedby="project-initials-help" onChange={e => change({ initials: e.target.value || null })} />
        <p id="project-initials-help">{t('initials_help', { initials: projectInitials(name) })}</p>
        <label htmlFor="project-color">{t('color')}</label>
        <div className="project-appearance-controls">
          <input id="project-color" data-testid="project-appearance-color" type="color" value={appearance.color || generateWorkspaceAccentColor(workspacePath, 'hex')}
            onChange={e => change({ color: e.target.value })} />
          <span>{appearance.color || t('automatic')}</span>
          <button type="button" disabled={!appearance.color} onClick={() => change({ color: null })}>{t('use_automatic_color')}</button>
        </div>
        <label htmlFor="project-image">{t('image')}</label>
        <input id="project-image" ref={fileInput} data-testid="project-appearance-file" type="file" accept="image/png,image/jpeg,image/webp"
          hidden onChange={async e => {
            const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
            setBusy(true); setError('');
            try { change({ image: await importThumbnail(file, t) }); }
            catch (err) { setError(err instanceof Error ? err.message : t('read_image_failed')); }
            finally { setBusy(false); }
          }} />
        <div className="project-appearance-controls">
          <button type="button" onClick={() => fileInput.current?.click()}>{t('choose_image')}</button>
          {appearance.imageUrl && <button type="button" onClick={() => change({ image: null })}>{t('remove_image')}</button>}
        </div>
        <p>{t('image_help')}</p>
        <div className="project-appearance-actions">
          <button type="button" className="project-appearance-save" data-testid="project-appearance-save"
            disabled={invalidInitials || !Object.keys(patch).length} onClick={() => persist(patch)}>{t('save_changes')}</button>
          <button type="button" onClick={() => persist({ initials: null, color: null, image: null })}>{t('reset_to_default')}</button>
          <span role="status">{busy ? t('saving') : status}</span>
        </div>
      </fieldset>
      {(error || loadError || invalidInitials) && <p className="project-appearance-error" role="alert">{invalidInitials ? t('initials_invalid') : error || loadError}</p>}
    </section>
  );
}
