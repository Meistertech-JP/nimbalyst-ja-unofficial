/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {LexicalEditor} from 'lexical';
import {useState} from 'react';
import {useTranslation} from '@nimbalyst/i18n/react';

import Button from '../../ui/Button';
import DropDown, {DropDownItem} from '../../ui/DropDown';
import {INSERT_LAYOUT_COMMAND} from './LayoutPlugin';

const LAYOUTS = [
  {labelKey: 'formatting.layout_two_columns_equal', value: '1fr 1fr'},
  {labelKey: 'formatting.layout_two_columns_25_75', value: '1fr 3fr'},
  {labelKey: 'formatting.layout_three_columns_equal', value: '1fr 1fr 1fr'},
  {labelKey: 'formatting.layout_three_columns_25_50_25', value: '1fr 2fr 1fr'},
  {labelKey: 'formatting.layout_four_columns_equal', value: '1fr 1fr 1fr 1fr'},
] as const;

export default function InsertLayoutDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  const {t} = useTranslation('editor');
  const [layout, setLayout] = useState<string>(LAYOUTS[0].value);
  const selectedLayout = LAYOUTS.find((item) => item.value === layout);

  const onClick = () => {
    activeEditor.dispatchCommand(INSERT_LAYOUT_COMMAND, layout);
    onClose();
  };

  return (
    <>
      <DropDown
        buttonClassName="toolbar-item dialog-dropdown"
        buttonLabel={selectedLayout ? t(selectedLayout.labelKey) : undefined}>
        {LAYOUTS.map(({labelKey, value}) => (
          <DropDownItem
            key={value}
            className="item"
            onClick={() => setLayout(value)}>
            <span className="text">{t(labelKey)}</span>
          </DropDownItem>
        ))}
      </DropDown>
      <Button onClick={onClick}>{t('formatting.insert')}</Button>
    </>
  );
}
