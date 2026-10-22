import React, { useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import type { LexicalEditor } from 'lexical';
import type { DecisionBlockSource, FeedbackAskType } from '@nimbalyst/collab-protocol';
import { INSERT_DECISION_COMMAND } from './DecisionCommands';
import { buildDecisionDraft } from './decisionDraft';
import './DecisionComponent.css';

const ASK_TYPES: FeedbackAskType[] = [
  'singleSelect', 'multiSelect', 'reorder', 'editText', 'confirm', 'rating',
];

export function DecisionAuthoring({ source, onSave, onCancel }: {
  source?: DecisionBlockSource;
  onSave: (content: string) => void;
  onCancel?: () => void;
}): React.JSX.Element {
  const { t } = useTranslation('editor');
  const [question, setQuestion] = useState(source?.ask ?? '');
  const [type, setType] = useState<FeedbackAskType>(source?.type ?? 'singleSelect');
  const [entries, setEntries] = useState(source?.entries.map((entry) => entry.label ?? entry.title ?? entry.id).join('\n') ?? '');
  const [seed, setSeed] = useState(source?.seed ?? '');
  const [error, setError] = useState('');
  return <form className="decision-authoring" onSubmit={(event) => {
    event.preventDefault();
    try { onSave(buildDecisionDraft({ question, type, entries, seed }, source)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('decision.errors.save_failed')); }
  }}>
    <label>{t('decision.authoring.question')}<input autoFocus value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
    <label>{t('decision.authoring.answer_format')}<select value={type} onChange={(event) => setType(event.target.value as FeedbackAskType)}>
      {ASK_TYPES.map((value) => <option key={value} value={value}>{t(`decision.ask_types.${value}`)}</option>)}
    </select></label>
    {['singleSelect', 'multiSelect', 'reorder'].includes(type) ? <label>{t('decision.authoring.options')}<textarea rows={4} value={entries} onChange={(event) => setEntries(event.target.value)} /></label> : null}
    {type === 'editText' ? <label>{t('decision.authoring.draft')}<textarea rows={5} value={seed} onChange={(event) => setSeed(event.target.value)} /></label> : null}
    <div className="decision-quiet">{t('decision.authoring.delivery_hint')}</div>
    {error ? <div role="alert" className="decision-seal-error">{error}</div> : null}
    <div className="decision-authoring-actions">
      {onCancel ? <button type="button" className="decision-linkish" onClick={onCancel}>{t('decision.actions.cancel')}</button> : null}
      <button type="submit" className="decision-btn decision-btn--primary">{t('decision.actions.save_question')}</button>
    </div>
  </form>;
}

export default function InsertDecisionDialog({ activeEditor, onClose }: { activeEditor: LexicalEditor; onClose: () => void }): React.JSX.Element {
  return <DecisionAuthoring onCancel={onClose} onSave={(content) => {
    activeEditor.dispatchCommand(INSERT_DECISION_COMMAND, { content });
    onClose();
  }} />;
}
