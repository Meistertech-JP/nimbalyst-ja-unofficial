import { getHelpContent, localizeHelpEntry } from '../help';

type HelpTranslator = (key: string, options?: { defaultValue?: string }) => string;

interface WalkthroughCopyStep {
  title: string;
  body: string;
  target: { testId?: string };
}

/**
 * Localize a walkthrough step when the callout renders.
 * Help-backed steps follow common.help. Navigation intros keep their longer copy.
 */
export function resolveWalkthroughStepCopy(
  definitionId: string,
  step: WalkthroughCopyStep,
  translate: HelpTranslator,
): { title: string; body: string } {
  const testId = step.target.testId;
  if (testId) {
    const source = getHelpContent(testId);
    if (
      source &&
      source.title === step.title &&
      source.body === step.body
    ) {
      const localized = localizeHelpEntry(testId, source, translate);
      return { title: localized.title, body: localized.body };
    }
  }

  if (definitionId === 'agent-mode-intro' || definitionId === 'files-mode-intro') {
    const key = definitionId === 'agent-mode-intro' ? 'agent_mode' : 'files_mode';
    return {
      title: translate(`walkthrough_content.${key}.title`, { defaultValue: step.title }),
      body: translate(`walkthrough_content.${key}.body`, { defaultValue: step.body }),
    };
  }

  return { title: step.title, body: step.body };
}
