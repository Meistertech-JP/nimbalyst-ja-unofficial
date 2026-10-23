/** Translate only progress messages authored by MCPConfigService, retaining diagnostics. */
export function localizeMcpTestProgress(
  message: string,
  translateSettings: (key: string) => string,
): string {
  switch (message) {
    case 'Starting server...':
      return translateSettings('mcp.starting_server');
    case 'Testing server connection...':
      return translateSettings('mcp.testing_server');
    case 'Downloading packages...':
      return translateSettings('mcp.downloading_packages');
    default:
      return message;
  }
}
