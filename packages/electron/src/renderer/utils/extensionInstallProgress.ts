import type { TFunction } from 'i18next';
import type { InstallProgressEvent } from '../../shared/types/extensionInstallProgress';

export function formatExtensionInstallProgress(event: InstallProgressEvent, t: TFunction): string {
  return event.messageKey
    ? t(`extensions:install_progress.${event.messageKey}`, {
      ...event.messageParams,
      defaultValue: event.message,
    })
    : event.message;
}
