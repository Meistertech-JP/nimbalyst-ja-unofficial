import { getCommand, type CanvasCommandId } from './canvasCommands';

export const CANVAS_HELP_CONTENT: Record<
  string,
  { titleKey: string; bodyKey: string; shortcut?: string }
> = {
  'canvas-nav-overview': {
    titleKey: 'canvas.help.navigation.overview.title',
    bodyKey: 'canvas.help.navigation.overview.body',
  },
  'canvas-nav-up': {
    titleKey: 'canvas.help.navigation.up.title',
    bodyKey: 'canvas.help.navigation.up.body',
  },
  'canvas-nav-previous': {
    titleKey: 'canvas.help.navigation.previous.title',
    bodyKey: 'canvas.help.navigation.previous.body',
  },
  'canvas-nav-next': {
    titleKey: 'canvas.help.navigation.next.title',
    bodyKey: 'canvas.help.navigation.next.body',
  },
  'canvas-tool-arrow-selector-tool': {
    titleKey: 'canvas.help.tools.select.title',
    bodyKey: 'canvas.help.tools.select.body',
    shortcut: 'V',
  },
  'canvas-tool-pan-tool': {
    titleKey: 'canvas.help.tools.pan.title',
    bodyKey: 'canvas.help.tools.pan.body',
    shortcut: 'H',
  },
  'canvas-tool-sticky-note-2': {
    titleKey: 'canvas.help.tools.sticky.title',
    bodyKey: 'canvas.help.tools.sticky.body',
    shortcut: 'N',
  },
  'canvas-tool-title': {
    titleKey: 'canvas.help.tools.text.title',
    bodyKey: 'canvas.help.tools.text.body',
    shortcut: 'T',
  },
  'canvas-tool-image': {
    titleKey: 'canvas.help.tools.image.title',
    bodyKey: 'canvas.help.tools.image.body',
  },
  'canvas-tool-crop-square': {
    titleKey: 'canvas.help.tools.frame.title',
    bodyKey: 'canvas.help.tools.frame.body',
    shortcut: 'F',
  },
  'canvas-tool-description': {
    titleKey: 'canvas.help.tools.document.title',
    bodyKey: 'canvas.help.tools.document.body',
  },
  'canvas-tool-add-comment': {
    titleKey: 'canvas.help.tools.comment_pin.title',
    bodyKey: 'canvas.help.tools.comment_pin.body',
    shortcut: 'M',
  },
  'canvas-tool-bookmark-add': {
    titleKey: 'canvas.help.tools.save_view.title',
    bodyKey: 'canvas.help.tools.save_view.body',
  },
  'canvas-zoom-map': {
    titleKey: 'canvas.help.zoom.minimap.title',
    bodyKey: 'canvas.help.zoom.minimap.body',
  },
  'canvas-zoom-remove': {
    titleKey: 'canvas.zoom.zoom_out',
    bodyKey: 'canvas.help.zoom.zoom_out.body',
    shortcut: getCommand('zoom-out').shortcut,
  },
  'canvas-zoom-add': {
    titleKey: 'canvas.zoom.zoom_in',
    bodyKey: 'canvas.help.zoom.zoom_in.body',
    shortcut: getCommand('zoom-in').shortcut,
  },
  'canvas-zoom-fit-screen': {
    titleKey: 'canvas.zoom.fit_board',
    bodyKey: 'canvas.help.zoom.fit_board.body',
    shortcut: 'Shift+1',
  },
  'canvas-zoom-options': {
    titleKey: 'canvas.help.zoom.options.title',
    bodyKey: 'canvas.help.zoom.options.body',
  },
  'canvas-selection-align': {
    titleKey: 'canvas.help.selection.align.title',
    bodyKey: 'canvas.help.selection.align.body',
  },
  'canvas-selection-distribute': {
    titleKey: 'canvas.help.selection.distribute.title',
    bodyKey: 'canvas.help.selection.distribute.body',
  },
  'canvas-selection-color': {
    titleKey: 'canvas.help.selection.color.title',
    bodyKey: 'canvas.help.selection.color.body',
  },
  'canvas-selection-comment': {
    titleKey: 'canvas.help.selection.comment.title',
    bodyKey: 'canvas.help.selection.comment.body',
  },
  'canvas-selection-history': {
    titleKey: 'canvas.help.selection.history.title',
    bodyKey: 'canvas.help.selection.history.body',
  },
};

const commandBodies: Partial<Record<CanvasCommandId, string>> = {
  tidy: 'tidy',
  group: 'group',
  ungroup: 'ungroup',
  lock: 'lock',
  unlock: 'unlock',
  duplicate: 'duplicate',
  'bring-front': 'bring_front',
  'send-back': 'send_back',
  delete: 'delete',
};
for (const [id, body] of Object.entries(commandBodies)) {
  const command = getCommand(id as CanvasCommandId);
  CANVAS_HELP_CONTENT[`canvas-command-${id}`] = {
    titleKey: `canvas.selection.commands.${body.replace('_', '_')}`,
    bodyKey: `canvas.help.selection.commands.${body}.body`,
    ...(command.shortcut
      ? { shortcut: command.shortcut.replace('Mod', 'Cmd') }
      : {}),
  };
}
