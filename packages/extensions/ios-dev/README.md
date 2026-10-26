# iOS Development Tools Extension

Tools for iOS development including XcodeGen project generation, simulator management, and app building/deployment.

## Features

### AI Tools

The extension provides the following tools that Claude can use:

| Tool | `action` values | Purpose |
| --- | --- | --- |
| `ios-dev.xcodegen` | `check-install`, `validate`, `generate`, `get-template` | XcodeGen command guidance and project template |
| `ios-dev.simulator` | `list`, `boot`, `shutdown` | Simulator management command guidance; `deviceId` selects a device |
| `ios-dev.build` | `schemes`, `build`, `clean` | xcodebuild command guidance; `scheme` is required for `build` |
| `ios-dev.app` | `install`, `launch`, `logs` | Simulator app command guidance; install uses `deviceId`/`appPath`, launch uses `deviceId`/`bundleId` |

These tools return instructions for the agent to execute; calling them does not itself run Xcode or simulator commands. The `validate` action currently returns `xcodegen generate --spec project.yml`, which can write project output and is not a read-only validation command. The `logs` action streams logs rather than accepting a line-count parameter.

### Claude Commands

**`/xcodegen`** - Generate and manage Xcode projects with XcodeGen
- Create new project.yml configurations
- Modify existing project specifications
- Validate and generate Xcode projects

**`/ios-simulator`** - Launch and manage iOS simulators
- List available simulators
- Launch specific devices
- View simulator logs

**`/ios-build`** - Build and deploy iOS apps
- Build for simulator or device
- Install on simulators
- Launch and debug apps

### File Type Support

Custom icons for iOS file types:
- `.swift` - Swift source files
- `.xcodeproj` - Xcode projects
- `.xcworkspace` - Xcode workspaces
- `.storyboard` - Interface Builder storyboards
- `.xib` - Interface Builder XIB files
- `.xcassets` - Asset catalogs
- `project.yml` - XcodeGen configuration

### New File Menu

Quick creation of Swift files with basic template.

## Prerequisites

**Required:**
- Xcode Command Line Tools: `xcode-select --install`
- macOS (iOS development requires Mac)

**Optional:**
- XcodeGen: `brew install xcodegen` (for project generation features)

## Installation

1. Build the extension:
```bash
cd packages/extensions/ios-dev
pnpm install
pnpm run build
```

2. The extension will be automatically loaded by Nimbalyst.

## Development

Watch mode for development:
```bash
pnpm run dev
```

## Usage Examples

### Creating a New iOS Project with XcodeGen

1. Run `/xcodegen` command
2. Claude will guide you through creating a project.yml
3. The Xcode project will be generated automatically

### Building and Running on Simulator

1. Run `/ios-build` command
2. Claude will help you:
  - Select a simulator
  - Build the app
  - Install and launch it

### Debugging with Simulator Logs

1. Run `/ios-simulator` command
2. Ask to view logs for a specific simulator
3. Claude will retrieve recent console output

## Architecture

The extension uses:
- **AI Tools** for direct Xcode/simulator interaction
- **Claude Commands** for guided workflows
- **File Icons** for better visual organization

The tool handlers in `src/index.tsx` return shell-command instructions or template text. The agent executes approved commands through its shell tool on macOS. This extension does not provide Xcode or an iOS simulator on Windows.

## License

MIT
