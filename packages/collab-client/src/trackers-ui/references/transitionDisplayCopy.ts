import type { StateTransition } from './trackerReferenceLifecycle';

type Translate = (key: string, values?: Record<string, string>) => string;
interface QuestionContext {
  type: string;
  position?: string | null;
  owner?: string | null;
}

// Match only copy emitted by the lifecycle model. Never rewrite a custom
// transition, its semantic verb, prompt field, or the values submitted to it.
const meanings: Record<string, string> = {
  proposed: 'Open for discussion again', accepted: 'Settled. You are recorded as deciding.',
  superseded: 'Replaced by a later decision', open: 'Nobody is working on it yet',
  investigating: 'Someone is working it out', reopened: 'The answer no longer holds',
  blocked: 'Waiting on something else', abandoned: 'Stopped; kept for the record',
  draft: 'Still being written', 'in-review': 'Waiting on reviewers',
  'changes-requested': 'Back to the author', approved: 'Reviewers agreed',
  building: 'Being built', shipped: 'Done and released',
};
const prompts = {
  rejected: { field: 'whyNot', label: 'Why not? Shown on the page and under "What we decided not to do".', placeholder: 'What rules it out', confirmLabel: 'Reject', description: 'Asks why not' },
  deferred: { field: 'revisitWhen', label: 'When should we revisit it?', placeholder: 'After the beta, or a date', confirmLabel: 'Defer', description: 'Asks when to revisit' },
  superseded: { field: 'supersededBy', label: 'Replaced by which item? Enter its key.', placeholder: 'SEC-57', confirmLabel: 'Supersede', description: 'Asks for the replacement' },
} as const;

export function transitionDisplayCopy(transition: StateTransition, t: Translate, context: QuestionContext) {
  const copy = { label: transition.label, description: transition.description, prompt: transition.prompt && { ...transition.prompt } };
  const translate = (key: string, fallback: string, values?: Record<string, string>) => {
    const result = t(`state_menu.${key}`, values);
    return result && result !== `state_menu.${key}` ? result : fallback;
  };
  const status = transition.toStatus;
  if (status && transition.id === `status:${status}`) {
    if (transition.description && transition.description === meanings[status]) {
      copy.description = translate(`transition_descriptions.${status}`, transition.description!);
    }
    const fixed = prompts[status as keyof typeof prompts];
    if (fixed && transition.prompt?.field === fixed.field) {
      if (transition.description === fixed.description) copy.description = translate(`transition_descriptions.${status}_prompt`, fixed.description);
      if (copy.prompt) {
        if (copy.prompt.label === fixed.label) copy.prompt.label = translate(`transition_prompts.${status}.label`, fixed.label);
        // SEC-57 is a literal example of the required item-key syntax.
        if (status !== 'superseded' && copy.prompt.placeholder === fixed.placeholder) copy.prompt.placeholder = translate(`transition_prompts.${status}.placeholder`, fixed.placeholder);
        if (copy.prompt.confirmLabel === fixed.confirmLabel) copy.prompt.confirmLabel = translate(`transition_prompts.${status}.confirm`, fixed.confirmLabel);
      }
    }
  }
  if (context.type === 'question') {
    if (transition.id === 'write-position' && transition.opensItem && status === null) {
      if (copy.label === 'Write a position...') copy.label = translate('question.write_position', copy.label);
      if (copy.label === 'Write a different position...') copy.label = translate('question.write_different_position', copy.label);
      if (copy.description === 'Opens the question') copy.description = translate('question.opens_question', copy.description);
    }
    if (transition.id === 'accept-position' && status === 'answered' && context.position?.trim()) {
      const owner = context.owner ? `${context.owner}'s` : 'the proposed';
      if (copy.label === `Answered: accept ${owner} position`) copy.label = context.owner
        ? translate('question.accept_owner_position', copy.label, { owner: context.owner })
        : translate('question.accept_proposed_position', copy.label);
      if (copy.description === `"${context.position.trim()}" You are recorded as deciding.`) copy.description = translate('question.position_decision', copy.description, { position: context.position.trim() });
    }
  }
  return copy;
}
