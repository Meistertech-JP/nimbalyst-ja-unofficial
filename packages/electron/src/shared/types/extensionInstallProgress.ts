export type InstallProgressStage =
  | 'checking-release'
  | 'downloading-release'
  | 'cloning'
  | 'installing'
  | 'done';

export interface InstallProgressEvent {
  stage: InstallProgressStage;
  /** Retained for older renderers and unknown future progress messages. */
  message: string;
  messageKey?: 'checking_release' | 'downloading_release' | 'cloning' | 'installing' | 'installed_release' | 'installed_source';
  messageParams?: Record<string, string>;
}
