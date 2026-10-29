/**
 * Where the user launched the tutorial from. `unknown` only appears if a caller
 * reaches the `tutorial:start` channel without naming itself.
 */
export type TutorialEntryPoint =
  | 'onboarding'
  | 'welcome_pane'
  | 'project_manager_sidebar'
  | 'help_menu'
  | 'unknown';

export type TutorialTemplateFailureCode = 'directory_missing' | 'not_directory' | 'readme_missing';

export interface TutorialTemplateFailure {
  code: TutorialTemplateFailureCode;
  path: string;
}

export type TutorialStartResult =
  | {
      success: true;
      workspacePath: string;
      reused: boolean;
    }
  | {
      success: false;
      error: string;
      templateFailure?: TutorialTemplateFailure;
    };

export type TutorialStatusResult =
  | {
      success: true;
      exists: boolean;
      workspacePath?: string;
    }
  | {
      success: false;
      exists: false;
      error: string;
    };
