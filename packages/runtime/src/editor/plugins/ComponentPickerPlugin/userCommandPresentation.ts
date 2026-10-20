import type { RuntimeTranslate } from '../../../ui/RuntimeTranslation';
import type { UserCommand } from '../../types/PluginTypes';

export function getUserCommandTitle(
  userCommand: Pick<UserCommand, 'title' | 'titleTranslationKey'>,
  t: RuntimeTranslate,
): string {
  return userCommand.titleTranslationKey
    ? t(userCommand.titleTranslationKey, userCommand.title)
    : userCommand.title;
}
