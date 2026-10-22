import React, { useState } from 'react';
import { useTranslation } from '@nimbalyst/i18n/react';
import { $getNodeByKey } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { DecisionBlockSource } from '@nimbalyst/collab-protocol';
import { useDecisionConfiguration, useDecisionDeliveries } from '../../decisions/DecisionsContext';
import { $isDecisionNode } from './DecisionNode';
import { parseDecisionFence, serializeDecisionFence } from './decisionFence';

export function DecisionDeliveryPanel({ source, nodeKey }: { source: DecisionBlockSource; nodeKey: string }): React.JSX.Element | null {
  const { t } = useTranslation('editor');
  const config = useDecisionConfiguration();
  const [editor] = useLexicalComposerContext();
  const { deliveryStates: states, deliveryError, setDeliveryStates: setStates } = useDecisionDeliveries();
  const [recipientIds, setRecipientIds] = useState(() => source.asked.filter((id) => config?.getMembers?.().some((member) => member.id === id)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const state = states.find((candidate) => candidate.blockId === source.id);
  const members = config?.getMembers?.() ?? [];
  const canSend = (config?.isHydrated?.() ?? true) && (config?.canVote?.() ?? true);

  if (!config?.requestDecision || source.raw.draft === true || (source.sealed && !state)) return null;
  const requestDecision = config.requestDecision;
  const run = async (operation: 'send' | 'nudge'): Promise<void> => {
    setBusy(true);
    setError('');
    try {
      if (operation === 'send') {
        // Re-read inside the transaction: a remote seal or replacement while the
        // recipient picker was open must not be overwritten by this draft.
        let failure: string | undefined;
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if (!$isDecisionNode(node)) { failure = t('decision.errors.question_removed'); return; }
          const current = parseDecisionFence(node.getContent());
          if (!current || current.sealed || current.id !== source.id) { failure = t('decision.errors.question_changed'); return; }
          node.setContent(serializeDecisionFence({ ...current, asked: recipientIds }));
        }, { discrete: true });
        if (failure) throw new Error(failure);
      }
      const result = await requestDecision(operation === 'send'
        ? { operation, blockId: source.id, recipientIds }
        : { operation, blockId: source.id });
      if (!config.onDecisionState) setStates(result.decisions, result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('decision.errors.send_failed'));
    } finally { setBusy(false); }
  };

  return <div className="decision-delivery">
    {state ? <>
      <span className="decision-quiet">{state.sealed ? t('decision.delivery.settled') : t('decision.delivery.answered', { answered: state.answeredCount ?? state.answeredIds.length, total: state.recipientIds.length })}</span>
      {!state.sealed && state.sentBy === config.currentUser.id ? <button type="button" className="decision-linkish" disabled={busy || !canSend} onClick={() => void run('nudge')}>{t('decision.delivery.remind')}</button> : null}
    </> : <details>
      <summary>{t('decision.delivery.ask_teammates')}</summary>
      <div className="decision-recipients">
        {members.map((member) => <label key={member.id}><input type="checkbox" checked={recipientIds.includes(member.id)} disabled={busy || !canSend} onChange={() => setRecipientIds((ids) => ids.includes(member.id) ? ids.filter((id) => id !== member.id) : [...ids, member.id])} />{member.name}</label>)}
        {members.length === 0 ? <span className="decision-quiet">{t('decision.delivery.members_unavailable')}</span> : null}
      </div>
      <button type="button" className="decision-btn decision-btn--primary" disabled={busy || !canSend || recipientIds.length === 0} onClick={() => void run('send')}>{busy ? t('decision.delivery.sending') : t('decision.delivery.send_question')}</button>
    </details>}
    {error || deliveryError ? <div role="alert" className="decision-seal-error">{error || deliveryError}</div> : null}
  </div>;
}
