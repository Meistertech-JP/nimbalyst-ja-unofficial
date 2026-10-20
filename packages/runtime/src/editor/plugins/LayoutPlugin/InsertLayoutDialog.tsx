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

import Button from '../../ui/Button';
import DropDown, {DropDownItem} from '../../ui/DropDown';
import {INSERT_LAYOUT_COMMAND} from './LayoutPlugin';
import {useRuntimeTranslation} from '../../../ui/RuntimeTranslation';

export default function InsertLayoutDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  const {t} = useRuntimeTranslation();
  const layouts = [
    {label: t('editor:insert_dialog.equal_columns', '{{columns}} columns (equal width)', {columns: 2}), value: '1fr 1fr'},
    {label: t('editor:insert_dialog.two_columns_ratio', '2 columns (25% - 75%)'), value: '1fr 3fr'},
    {label: t('editor:insert_dialog.equal_columns', '{{columns}} columns (equal width)', {columns: 3}), value: '1fr 1fr 1fr'},
    {label: t('editor:insert_dialog.three_columns_ratio', '3 columns (25% - 50% - 25%)'), value: '1fr 2fr 1fr'},
    {label: t('editor:insert_dialog.equal_columns', '{{columns}} columns (equal width)', {columns: 4}), value: '1fr 1fr 1fr 1fr'},
  ];
  const [layout, setLayout] = useState(layouts[0].value);
  const buttonLabel = layouts.find((item) => item.value === layout)?.label;

  const onClick = () => {
    activeEditor.dispatchCommand(INSERT_LAYOUT_COMMAND, layout);
    onClose();
  };

  return (
    <>
      <DropDown
        buttonClassName="toolbar-item dialog-dropdown"
        buttonLabel={buttonLabel}>
        {layouts.map(({label, value}) => (
          <DropDownItem
            key={value}
            className="item"
            onClick={() => setLayout(value)}>
            <span className="text">{label}</span>
          </DropDownItem>
        ))}
      </DropDown>
      <Button onClick={onClick}>{t('editor:formatting.insert', 'Insert')}</Button>
    </>
  );
}
