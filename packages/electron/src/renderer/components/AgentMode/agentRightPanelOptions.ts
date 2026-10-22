import type { AgentRightPanelMode } from "../../store/atoms/workstreamState";
import type { WindowTopBarPanelOption } from "../WindowTopBar/WindowTopBar";

const modes: Array<{ id: AgentRightPanelMode; icon: string }> = [
  { id: "edited-files", icon: "description" },
  { id: "review", icon: "rate_review" },
  { id: "session-chat", icon: "forum" },
  { id: "file-viewer", icon: "tab" },
];

export function agentRightPanelOptions(
  selected: AgentRightPanelMode,
  onSelect: (mode: AgentRightPanelMode) => void,
  labelFor: (mode: AgentRightPanelMode) => string,
): WindowTopBarPanelOption[] {
  return modes.map((mode) => ({
    id: mode.id,
    icon: mode.icon,
    label: labelFor(mode.id),
    selected: mode.id === selected,
    onSelect: () => onSelect(mode.id),
  }));
}
