import type { TFunction } from 'i18next';

const builtinKeys: Readonly<Record<string, string>> = {
  'Calc Sheet': 'calc_sheet',
  'CSV Spreadsheet': 'csv_spreadsheet',
  'Data Model': 'data_model',
  'Excalidraw Diagram': 'excalidraw_diagram',
  'HTML page': 'html_page',
  'Mockup': 'mockup',
  'Project Canvas': 'project_canvas',
};

/** Translate presentation copy only; extension identities and stored types stay intact. */
export function documentTypeDisplayName(name: string, t: TFunction): string {
  const key = builtinKeys[name];
  return key ? t(`new_file_menu.extension_types.${key}`, { ns: 'files', defaultValue: name }) : name;
}
