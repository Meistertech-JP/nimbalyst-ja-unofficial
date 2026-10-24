import type { TFunction } from 'i18next';

const builtinKeys: Readonly<Record<string, string>> = {
  'Animation': 'animation',
  'Browser Tab': 'browser_tab',
  'Calc Sheet': 'calc_sheet',
  'CSV Spreadsheet': 'csv_spreadsheet',
  'Data Model': 'data_model',
  'Excalidraw Diagram': 'excalidraw_diagram',
  'HTML page': 'html_page',
  'Image Generation Project': 'image_generation_project',
  'Mockup': 'mockup',
  'Mockup Project': 'mockup_project',
  'Project Canvas': 'project_canvas',
  'Swift File': 'swift_file',
};

/** Translate presentation copy only; extension identities and stored types stay intact. */
export function documentTypeDisplayName(name: string, t: TFunction): string {
  const key = Object.hasOwn(builtinKeys, name) ? builtinKeys[name] : undefined;
  return key ? t(`new_file_menu.extension_types.${key}`, { ns: 'files', keyPrefix: '', defaultValue: name }) : name;
}
