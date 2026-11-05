/**
 * Named-swatch picker for colored text: the 7 palette colors for text and the
 * same 7 for background, each with a "none" swatch that removes that kind.
 * Writes TextColorNode wrappers through `textColorActions.ts`, so the result
 * is an Obsidian-compatible `<span style="...">` in markdown.
 *
 * Used by the fixed toolbar and the floating selection toolbar.
 */

import type { JSX } from 'react';
import type { LexicalEditor } from 'lexical';
import { useTranslation } from '@nimbalyst/i18n/react';

import DropDown, { DropDownItem } from '../../ui/DropDown';
import { $getSelectionTextColor, $setSelectionTextColor } from './textColorActions';
import {
  TEXT_COLOR_PALETTE,
  textColorCssVariable,
  type TextColorKind,
  type TextColorStyle,
} from '../../../core/textColorSyntax';
import './TextColorPicker.css';

const KINDS: Array<{ kind: TextColorKind; labelKey: string }> = [
  { kind: 'color', labelKey: 'text_color_picker.text' },
  { kind: 'background', labelKey: 'text_color_picker.background' },
];

export function TextColorPicker({
  editor,
  disabled = false,
  buttonClassName,
}: {
  editor: LexicalEditor;
  disabled?: boolean;
  buttonClassName: string;
}): JSX.Element {
  const { t } = useTranslation('editor');
  const apply = (kind: TextColorKind, value: string | null) => {
    editor.update(() => {
      $setSelectionTextColor(kind, value);
    });
  };

  return (
    <DropDown
      disabled={disabled}
      buttonClassName={`${buttonClassName} text-color-picker-button`}
      buttonIconClassName="icon font-color"
      buttonAriaLabel={t('formatting.text_color')}
      className="text-color-picker">
      <TextColorSwatches editor={editor} onPick={apply} />
    </DropDown>
  );
}

function TextColorSwatches({
  editor,
  onPick,
}: {
  editor: LexicalEditor;
  onPick: (kind: TextColorKind, value: string | null) => void;
}): JSX.Element {
  const { t } = useTranslation('editor');
  // Read once when the menu opens; the selection does not change while it is open.
  const current: TextColorStyle = editor.getEditorState().read(() => $getSelectionTextColor());
  const currentValue = (kind: TextColorKind) =>
    (kind === 'color' ? current.color : current.backgroundColor)?.toLowerCase() ?? null;

  return (
    <>
      {KINDS.map(({ kind, labelKey }) => (
        <div key={kind} className="text-color-picker-section" data-kind={kind}>
          <div className="text-color-picker-label">{t(labelKey)}</div>
          <div className="text-color-picker-row">
            <DropDownItem
              className={`text-color-swatch text-color-swatch--none${currentValue(kind) === null ? ' active' : ''}`}
              title={t(kind === 'color' ? 'text_color_picker.default' : 'text_color_picker.none')}
              onClick={() => onPick(kind, null)}>
              <span className="text-color-swatch-chip" aria-hidden="true">A</span>
            </DropDownItem>
            {TEXT_COLOR_PALETTE.map((swatch) => {
              const value = kind === 'color' ? swatch.color : swatch.background;
              const cssVar = `var(${textColorCssVariable(swatch.name, kind)}, ${value})`;
              return (
                <DropDownItem
                  key={swatch.name}
                  className={`text-color-swatch${currentValue(kind) === value ? ' active' : ''}`}
                  title={t(kind === 'color' ? 'text_color_picker.text_swatch' : 'text_color_picker.background_swatch', { color: t(`text_color_picker.colors.${swatch.name}`) })}
                  onClick={() => onPick(kind, value)}>
                  <span
                    className="text-color-swatch-chip"
                    aria-hidden="true"
                    style={kind === 'color' ? { color: cssVar } : { backgroundColor: cssVar }}>
                    A
                  </span>
                </DropDownItem>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
