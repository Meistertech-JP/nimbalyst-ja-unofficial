// Display-only overrides. Keep manifest metadata and command execution unchanged.
// Exact original-copy matching also preserves customized/third-party descriptions.
const descriptions: Record<string, readonly [string, string]> = {
  'com.nimbalyst.animation:animate': ['Create an animated explainer diagram', 'animation_animate'],
  'com.nimbalyst.automations:automation': ['Create or manage an automation', 'automations_automation'],
  'com.nimbalyst.crew:hire': ['Design and hire a new crew member by describing the job', 'crew_hire'],
  'com.nimbalyst.datamodellm:datamodel': ['Create or modify Prisma-based data models', 'datamodellm_datamodel'],
  'com.nimbalyst.extension-dev-kit:new-extension': ['Create a new Nimbalyst extension project from a starter scaffold', 'extension_dev_kit_new_extension'],
  'com.nimbalyst.feedback:bug-report': ['Guide the user through filing a bug report on GitHub', 'feedback_bug_report'],
  'com.nimbalyst.feedback:feature-request': ['Guide the user through filing a feature request on GitHub', 'feedback_feature_request'],
  'com.nimbalyst.ios-dev:xcodegen': ['Generate and manage Xcode projects with XcodeGen', 'ios_dev_xcodegen'],
  'com.nimbalyst.ios-dev:ios-simulator': ['Launch and manage iOS simulators', 'ios_dev_ios_simulator'],
  'com.nimbalyst.ios-dev:ios-build': ['Build and deploy iOS apps', 'ios_dev_ios_build'],
  'com.nimbalyst.ios-dev:fastlane': ['Automate iOS builds, code signing, and TestFlight deployments', 'ios_dev_fastlane'],
  'com.nimbalyst.mockuplm:mockup': ['Create visual UX mockups', 'mockuplm_mockup'],
  'com.nimbalyst.planning:design': ['Create a structured plan document', 'planning_design'],
  'com.nimbalyst.planning:implement': ['Execute a plan with progress tracking', 'planning_implement'],
  'com.nimbalyst.planning:track': ['Track bugs, tasks, ideas, and other items', 'planning_track'],
  'com.nimbalyst.planning:launch-new-session': ['Spin off a sibling AI session to keep working in parallel', 'planning_launch_new_session'],
  'com.nimbalyst.planning:session-cleanup': ['Tidy your Sessions board -- fix phases, mark work complete, flag old sessions to archive', 'planning_session_cleanup'],
  'com.nimbalyst.planning:nimbalyst-coach': ['Review this project and your recent sessions, then suggest extensions, features, and agent-instruction changes', 'planning_nimbalyst_coach'],
};

export function getLocalizedBundledCommandDescription(
  extensionId: string,
  commandName: string,
  originalDescription: string,
  t: (key: string) => string,
): string {
  const entry = descriptions[`${extensionId}:${commandName}`];
  return entry && entry[0] === originalDescription
    ? t(`bundled_command_descriptions.${entry[1]}`)
    : originalDescription;
}
