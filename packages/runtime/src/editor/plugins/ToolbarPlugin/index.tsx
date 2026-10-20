/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {
  $createCodeNode,
  $isCodeNode,
} from '@lexical/code';
// Code language support - now using custom implementation
const CODE_LANGUAGE_OPTIONS: [string, string][] = [
  ['javascript', 'JavaScript'],
  ['typescript', 'TypeScript'],
  ['jsx', 'JSX'],
  ['tsx', 'TSX'],
  ['python', 'Python'],
  ['java', 'Java'],
  ['cpp', 'C++'],
  ['csharp', 'C#'],
  ['go', 'Go'],
  ['rust', 'Rust'],
  ['html', 'HTML'],
  ['css', 'CSS'],
  ['json', 'JSON'],
  ['sql', 'SQL'],
  ['yaml', 'YAML'],
  ['markdown', 'Markdown'],
  ['bash', 'Bash'],
  ['xml', 'XML'],
];

function getCodeLanguageOptionsShiki() {
  return CODE_LANGUAGE_OPTIONS;
}

function normalizeCodeLanguageShiki(language: string) {
  const aliases: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'yml': 'yaml',
    'sh': 'bash',
  };
  return aliases[language] || language;
}
import {$isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import { useRuntimeSettings } from '../../context/RuntimeSettingsContext';
import {$isListNode, ListNode} from '@lexical/list';
import type { Transformer } from '@lexical/markdown';
import {
  $convertFromEnhancedMarkdownString,
  $convertToEnhancedMarkdownString,
} from '../../markdown';
import {INSERT_HORIZONTAL_RULE_COMMAND} from '@lexical/extension';
import {$isHeadingNode} from '@lexical/rich-text';
import {
  $getSelectionStyleValueForProperty,
  $isParentElementRTL,
  $patchStyleText,
} from '@lexical/selection';
import {$isTableNode, $isTableSelection} from '@lexical/table';
import {
  $findMatchingParent,
  $getNearestNodeOfType,
  $isEditorIsNestedEditor,
  IS_APPLE,
  mergeRegister,
} from '@lexical/utils';
import {
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootOrShadowRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  ElementFormatType,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  HISTORIC_TAG,
  INDENT_CONTENT_COMMAND,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from 'lexical';
import {Dispatch, useCallback, useEffect, useMemo, useState} from 'react';

import {
  blockTypeToBlockName,
  useToolbarState,
} from '../../context/ToolbarContext';
import useModal from '../../hooks/useModal';
import DropDown, {DropDownItem} from '../../ui/DropDown';
import DropdownColorPicker from '../../ui/DropdownColorPicker';
import ThemeToggle from '../../ui/ThemeToggle';
import {getSelectedNode} from '../../utils/getSelectedNode';
import {sanitizeUrl} from '../../utils/url';
import {INSERT_COLLAPSIBLE_COMMAND} from '../CollapsiblePlugin';
import {InsertImageDialog} from '../ImagesPlugin';
import InsertLayoutDialog from '../LayoutPlugin/InsertLayoutDialog';
import {INSERT_PAGE_BREAK} from '../PageBreakPlugin';
import {SHORTCUTS} from '../ShortcutsPlugin/shortcuts';
import { getEditorTransformers } from '../../markdown';
import {InsertTableDialog} from '../TablePlugin/TablePlugin';
import TableOfContentsDropdownPlugin from '../TableOfContentsPlugin';
import {useRuntimeTranslation} from '../../../ui/RuntimeTranslation';
import FontSize from './fontSize';
import {
  clearFormatting,
  formatBulletList,
  formatCheckList,
  formatCode,
  formatHeading,
  formatNumberedList,
  formatParagraph,
  formatQuote,
} from './utils';

const rootTypeToRootName = {
  root: 'Root',
  table: 'Table',
};


const CODE_LANGUAGE_OPTIONS_SHIKI: [string, string][] = CODE_LANGUAGE_OPTIONS;

const FONT_FAMILY_OPTIONS: [string, string][] = [
  ['Arial', 'Arial'],
  ['Courier New', 'Courier New'],
  ['Georgia', 'Georgia'],
  ['Times New Roman', 'Times New Roman'],
  ['Trebuchet MS', 'Trebuchet MS'],
  ['Verdana', 'Verdana'],
];

const FONT_SIZE_OPTIONS: [string, string][] = [
  ['10px', '10px'],
  ['11px', '11px'],
  ['12px', '12px'],
  ['13px', '13px'],
  ['14px', '14px'],
  ['15px', '15px'],
  ['16px', '16px'],
  ['17px', '17px'],
  ['18px', '18px'],
  ['19px', '19px'],
  ['20px', '20px'],
];

const ELEMENT_FORMAT_OPTIONS: {
  [key in Exclude<ElementFormatType, ''>]: {
    icon: string;
    iconRTL: string;
    name: string;
  };
} = {
  center: {
    icon: 'center-align',
    iconRTL: 'center-align',
    name: 'Center Align',
  },
  end: {
    icon: 'right-align',
    iconRTL: 'left-align',
    name: 'End Align',
  },
  justify: {
    icon: 'justify-align',
    iconRTL: 'justify-align',
    name: 'Justify Align',
  },
  left: {
    icon: 'left-align',
    iconRTL: 'left-align',
    name: 'Left Align',
  },
  right: {
    icon: 'right-align',
    iconRTL: 'right-align',
    name: 'Right Align',
  },
  start: {
    icon: 'left-align',
    iconRTL: 'right-align',
    name: 'Start Align',
  },
};

function dropDownActiveClass(active: boolean) {
  if (active) {
    return 'active dropdown-item-active';
  } else {
    return '';
  }
}

function BlockFormatDropDown({
  editor,
  blockType,
  rootType,
  disabled = false,
}: {
  blockType: keyof typeof blockTypeToBlockName;
  rootType: keyof typeof rootTypeToRootName;
  editor: LexicalEditor;
  disabled?: boolean;
}): JSX.Element {
  const {t} = useRuntimeTranslation();
  const blockNames = {
    paragraph: t('dialogs:keyboard_shortcuts.labels.normal_text', 'Normal Text'),
    h1: t('dialogs:keyboard_shortcuts.labels.heading_1', 'Heading 1'),
    h2: t('dialogs:keyboard_shortcuts.labels.heading_2', 'Heading 2'),
    h3: t('dialogs:keyboard_shortcuts.labels.heading_3', 'Heading 3'),
    h4: t('editor:formatting.heading_level', 'Heading {{level}}', {level: 4}),
    h5: t('editor:formatting.heading_level', 'Heading {{level}}', {level: 5}),
    h6: t('editor:formatting.heading_level', 'Heading {{level}}', {level: 6}),
    number: t('dialogs:keyboard_shortcuts.labels.numbered_list', 'Numbered List'),
    bullet: t('dialogs:keyboard_shortcuts.labels.bullet_list', 'Bullet List'),
    check: t('dialogs:keyboard_shortcuts.labels.check_list', 'Check List'),
    quote: t('dialogs:keyboard_shortcuts.labels.quote', 'Quote'),
    code: t('dialogs:keyboard_shortcuts.labels.code_block', 'Code Block'),
  };
  return (
    <DropDown
      disabled={disabled}
      buttonClassName="toolbar-item block-controls"
      buttonIconClassName={'icon block-type ' + blockType}
      buttonLabel={blockNames[blockType]}
      buttonAriaLabel={t('editor:formatting.text_style_options', 'Formatting options for text style')}>
      <DropDownItem
        className={
          'item wide ' + dropDownActiveClass(blockType === 'paragraph')
        }
        onClick={() => formatParagraph(editor)}>
        <div className="icon-text-container">
          <i className="icon paragraph" />
          <span className="text">{blockNames.paragraph}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.NORMAL}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'h1')}
        onClick={() => formatHeading(editor, blockType, 'h1')}>
        <div className="icon-text-container">
          <i className="icon h1" />
          <span className="text">{blockNames.h1}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.HEADING1}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'h2')}
        onClick={() => formatHeading(editor, blockType, 'h2')}>
        <div className="icon-text-container">
          <i className="icon h2" />
          <span className="text">{blockNames.h2}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.HEADING2}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'h3')}
        onClick={() => formatHeading(editor, blockType, 'h3')}>
        <div className="icon-text-container">
          <i className="icon h3" />
          <span className="text">{blockNames.h3}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.HEADING3}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'number')}
        onClick={() => formatNumberedList(editor, blockType)}>
        <div className="icon-text-container">
          <i className="icon numbered-list" />
          <span className="text">{blockNames.number}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.NUMBERED_LIST}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'bullet')}
        onClick={() => formatBulletList(editor, blockType)}>
        <div className="icon-text-container">
          <i className="icon bullet-list" />
          <span className="text">{blockNames.bullet}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.BULLET_LIST}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'check')}
        onClick={() => formatCheckList(editor, blockType)}>
        <div className="icon-text-container">
          <i className="icon check-list" />
          <span className="text">{blockNames.check}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.CHECK_LIST}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'quote')}
        onClick={() => formatQuote(editor, blockType)}>
        <div className="icon-text-container">
          <i className="icon quote" />
          <span className="text">{blockNames.quote}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.QUOTE}</span>
      </DropDownItem>
      <DropDownItem
        className={'item wide ' + dropDownActiveClass(blockType === 'code')}
        onClick={() => formatCode(editor, blockType)}>
        <div className="icon-text-container">
          <i className="icon code" />
          <span className="text">{blockNames.code}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.CODE_BLOCK}</span>
      </DropDownItem>
    </DropDown>
  );
}

function Divider(): JSX.Element {
  return <div className="divider" />;
}

function FontDropDown({
  editor,
  value,
  style,
  disabled = false,
}: {
  editor: LexicalEditor;
  value: string;
  style: string;
  disabled?: boolean;
}): JSX.Element {
  const {t} = useRuntimeTranslation();
  const handleClick = useCallback(
    (option: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (selection !== null) {
          $patchStyleText(selection, {
            [style]: option,
          });
        }
      });
    },
    [editor, style],
  );

  const buttonAriaLabel =
    style === 'font-family'
      ? t('editor:formatting.font_family_options', 'Formatting options for font family')
      : t('editor:formatting.font_size_options', 'Formatting options for font size');

  return (
    <DropDown
      disabled={disabled}
      buttonClassName={'toolbar-item ' + style}
      buttonLabel={value}
      buttonIconClassName={
        style === 'font-family' ? 'icon block-type font-family' : ''
      }
      buttonAriaLabel={buttonAriaLabel}>
      {(style === 'font-family' ? FONT_FAMILY_OPTIONS : FONT_SIZE_OPTIONS).map(
        ([option, text]) => (
          <DropDownItem
            className={`item ${dropDownActiveClass(value === option)} ${
              style === 'font-size' ? 'fontsize-item' : ''
            }`}
            onClick={() => handleClick(option)}
            key={option}>
            <span className="text">{text}</span>
          </DropDownItem>
        ),
      )}
    </DropDown>
  );
}

function ElementFormatDropdown({
  editor,
  value,
  isRTL,
  disabled = false,
}: {
  editor: LexicalEditor;
  value: ElementFormatType;
  isRTL: boolean;
  disabled: boolean;
}) {
  const {t} = useRuntimeTranslation();
  const formatNames = {
    left: t('dialogs:keyboard_shortcuts.labels.left_align', 'Left Align'),
    center: t('dialogs:keyboard_shortcuts.labels.center_align', 'Center Align'),
    right: t('dialogs:keyboard_shortcuts.labels.right_align', 'Right Align'),
    justify: t('dialogs:keyboard_shortcuts.labels.justify', 'Justify'),
    start: t('editor:formatting.start_align', 'Start Align'),
    end: t('editor:formatting.end_align', 'End Align'),
  };
  const formatOption = ELEMENT_FORMAT_OPTIONS[value || 'left'];

  return (
    <DropDown
      disabled={disabled}
      buttonLabel={formatNames[value || 'left']}
      buttonIconClassName={`icon ${
        isRTL ? formatOption.iconRTL : formatOption.icon
      }`}
      buttonClassName="toolbar-item spaced alignment"
      buttonAriaLabel={t('editor:formatting.alignment_options', 'Formatting options for text alignment')}>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
        }}
        className="item wide">
        <div className="icon-text-container">
          <i className="icon left-align" />
          <span className="text">{formatNames.left}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.LEFT_ALIGN}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
        }}
        className="item wide">
        <div className="icon-text-container">
          <i className="icon center-align" />
          <span className="text">{formatNames.center}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.CENTER_ALIGN}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
        }}
        className="item wide">
        <div className="icon-text-container">
          <i className="icon right-align" />
          <span className="text">{formatNames.right}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.RIGHT_ALIGN}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
        }}
        className="item wide">
        <div className="icon-text-container">
          <i className="icon justify-align" />
          <span className="text">{formatNames.justify}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.JUSTIFY_ALIGN}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'start');
        }}
        className="item wide">
        <i
          className={`icon ${
            isRTL
              ? ELEMENT_FORMAT_OPTIONS.start.iconRTL
              : ELEMENT_FORMAT_OPTIONS.start.icon
          }`}
        />
        <span className="text">{formatNames.start}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'end');
        }}
        className="item wide">
        <i
          className={`icon ${
            isRTL
              ? ELEMENT_FORMAT_OPTIONS.end.iconRTL
              : ELEMENT_FORMAT_OPTIONS.end.icon
          }`}
        />
        <span className="text">{formatNames.end}</span>
      </DropDownItem>
      <Divider />
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
        }}
        className="item wide">
        <div className="icon-text-container">
          <i className={'icon ' + (isRTL ? 'indent' : 'outdent')} />
          <span className="text">{t('dialogs:keyboard_shortcuts.labels.outdent', 'Outdent')}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.OUTDENT}</span>
      </DropDownItem>
      <DropDownItem
        onClick={() => {
          editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
        }}
        className="item wide">
        <div className="icon-text-container">
          <i className={'icon ' + (isRTL ? 'outdent' : 'indent')} />
          <span className="text">{t('dialogs:keyboard_shortcuts.labels.indent', 'Indent')}</span>
        </div>
        <span className="shortcut">{SHORTCUTS.INDENT}</span>
      </DropDownItem>
    </DropDown>
  );
}

function $findTopLevelElement(node: LexicalNode) {
  let topLevelElement =
    node.getKey() === 'root'
      ? node
      : $findMatchingParent(node, (e) => {
          const parent = e.getParent();
          return parent !== null && $isRootOrShadowRoot(parent);
        });

  if (topLevelElement === null) {
    topLevelElement = node.getTopLevelElementOrThrow();
  }
  return topLevelElement;
}

function InsertModalTitle({kind}: {kind: 'image' | 'table' | 'layout'}): JSX.Element {
  const {t} = useRuntimeTranslation();
  const titles = {
    image: t('editor:formatting.insert_image', 'Insert Image'),
    table: t('editor:formatting.insert_table', 'Insert Table'),
    layout: t('editor:formatting.insert_layout', 'Insert Columns Layout'),
  };
  return <>{titles[kind]}</>;
}

export default function ToolbarPlugin({
  editor,
  activeEditor,
  setActiveEditor,
  setIsLinkEditMode,
  markdownOnly = false,
  shouldPreserveNewLinesInMarkdown = true,
  isCodeHighlighted = true,
  markdownTransformers,
}: {
  editor: LexicalEditor;
  activeEditor: LexicalEditor;
  setActiveEditor: Dispatch<LexicalEditor>;
  setIsLinkEditMode: Dispatch<boolean>;
  markdownOnly?: boolean;
  shouldPreserveNewLinesInMarkdown?: boolean;
  isCodeHighlighted?: boolean;
  markdownTransformers?: Transformer[];
}): JSX.Element {
  const {t} = useRuntimeTranslation();
  const transformers = useMemo(
    () => markdownTransformers ?? getEditorTransformers(),
    [markdownTransformers],
  );

  const [selectedElementKey, setSelectedElementKey] = useState<NodeKey | null>(
    null,
  );
  const [modal, showModal] = useModal();
  const [isEditable, setIsEditable] = useState(() => editor.isEditable());
  const {toolbarState, updateToolbarState} = useToolbarState();

  const { toggleSetting } = useRuntimeSettings();


    const $handleHeadingNode = useCallback(
    (selectedElement: LexicalNode) => {
      const type = $isHeadingNode(selectedElement)
        ? selectedElement.getTag()
        : selectedElement.getType();

      if (type in blockTypeToBlockName) {
        updateToolbarState(
          'blockType',
          type as keyof typeof blockTypeToBlockName,
        );
      }
    },
    [updateToolbarState],
  );


    const $handleCodeNode = useCallback(
    (element: LexicalNode) => {
      if ($isCodeNode(element)) {
        const language = element.getLanguage();
        updateToolbarState(
          'codeLanguage',
          language
            ? (isCodeHighlighted && normalizeCodeLanguageShiki(language)) ||
                language
            : '',
        );
        return;
      }
    },
    [updateToolbarState, isCodeHighlighted],
  );

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      if (activeEditor !== editor && $isEditorIsNestedEditor(activeEditor)) {
        const rootElement = activeEditor.getRootElement();
        updateToolbarState(
          'isImageCaption',
          !!rootElement?.parentElement?.classList.contains(
            'image-caption-container',
          ),
        );
      } else {
        updateToolbarState('isImageCaption', false);
      }

      const anchorNode = selection.anchor.getNode();
      const element = $findTopLevelElement(anchorNode);
      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      updateToolbarState('isRTL', $isParentElementRTL(selection));

      // Update links
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      const isLink = $isLinkNode(parent) || $isLinkNode(node);
      updateToolbarState('isLink', isLink);

      const tableNode = $findMatchingParent(node, $isTableNode);
      if ($isTableNode(tableNode)) {
        updateToolbarState('rootType', 'table');
      } else {
        updateToolbarState('rootType', 'root');
      }

      if (elementDOM !== null) {
        setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode,
          );
          const type = parentList
            ? parentList.getListType()
            : element.getListType();

          updateToolbarState('blockType', type);
        } else {
          $handleHeadingNode(element);
          $handleCodeNode(element);
        }
      }

      // Handle buttons
      updateToolbarState(
        'fontColor',
        $getSelectionStyleValueForProperty(selection, 'color', '#000'),
      );
      updateToolbarState(
        'bgColor',
        $getSelectionStyleValueForProperty(
          selection,
          'background-color',
          '#fff',
        ),
      );
      updateToolbarState(
        'fontFamily',
        $getSelectionStyleValueForProperty(selection, 'font-family', 'Arial'),
      );
      let matchingParent;
      if ($isLinkNode(parent)) {
        // If node is a link, we need to fetch the parent paragraph node to set format
        matchingParent = $findMatchingParent(
          node,
          (parentNode) => $isElementNode(parentNode) && !parentNode.isInline(),
        );
      }

      // If matchingParent is a valid node, pass it's format type
      updateToolbarState(
        'elementFormat',
        $isElementNode(matchingParent)
          ? matchingParent.getFormatType()
          : $isElementNode(node)
          ? node.getFormatType()
          : parent?.getFormatType() || 'left',
      );
    }
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      // Update text format
      updateToolbarState('isBold', selection.hasFormat('bold'));
      updateToolbarState('isItalic', selection.hasFormat('italic'));
      updateToolbarState('isUnderline', selection.hasFormat('underline'));
      updateToolbarState(
        'isStrikethrough',
        selection.hasFormat('strikethrough'),
      );
      updateToolbarState('isSubscript', selection.hasFormat('subscript'));
      updateToolbarState('isSuperscript', selection.hasFormat('superscript'));
      updateToolbarState('isHighlight', selection.hasFormat('highlight'));
      updateToolbarState('isCode', selection.hasFormat('code'));
      updateToolbarState(
        'fontSize',
        $getSelectionStyleValueForProperty(selection, 'font-size', '15px'),
      );
      updateToolbarState('isLowercase', selection.hasFormat('lowercase'));
      updateToolbarState('isUppercase', selection.hasFormat('uppercase'));
      updateToolbarState('isCapitalize', selection.hasFormat('capitalize'));
    }
    if ($isNodeSelection(selection)) {
      const nodes = selection.getNodes();
      for (const selectedNode of nodes) {
        const parentList = $getNearestNodeOfType<ListNode>(
          selectedNode,
          ListNode,
        );
        if (parentList) {
          const type = parentList.getListType();
          updateToolbarState('blockType', type);
        } else {
          const selectedElement = $findTopLevelElement(selectedNode);
          $handleHeadingNode(selectedElement);
          $handleCodeNode(selectedElement);
          // Update elementFormat for node selection (e.g., images)
          if ($isElementNode(selectedElement)) {
            updateToolbarState(
              'elementFormat',
              selectedElement.getFormatType(),
            );
          }
        }
      }
    }
  }, [
    activeEditor,
    editor,
    updateToolbarState,
    $handleHeadingNode,
    $handleCodeNode,
  ]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        $updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
  }, [editor, $updateToolbar, setActiveEditor]);

  useEffect(() => {
    activeEditor.getEditorState().read(() => {
      $updateToolbar();
    }, {editor: activeEditor});
  }, [activeEditor, $updateToolbar]);

  useEffect(() => {
    return mergeRegister(
      editor.registerEditableListener((editable) => {
        setIsEditable(editable);
      }),
      activeEditor.registerUpdateListener(({editorState}) => {
        editorState.read(() => {
            try {
              // this throws errors when selection is not valid after toggling markdown
              $updateToolbar();
            } catch (error) {
              console.error('Error updating toolbar:', error);
            }
        }, {editor: activeEditor});
      }),
      activeEditor.registerCommand<boolean>(
        CAN_UNDO_COMMAND,
        (payload) => {
          updateToolbarState('canUndo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      activeEditor.registerCommand<boolean>(
        CAN_REDO_COMMAND,
        (payload) => {
          updateToolbarState('canRedo', payload);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    );
  }, [$updateToolbar, activeEditor, editor, updateToolbarState]);

  const applyStyleText = useCallback(
    (styles: Record<string, string>, skipHistoryStack?: boolean) => {
      activeEditor.update(
        () => {
          const selection = $getSelection();
          if (selection !== null) {
            $patchStyleText(selection, styles);
          }
        },
        skipHistoryStack ? {tag: HISTORIC_TAG} : {},
      );
    },
    [activeEditor],
  );

  const onFontColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean) => {
      applyStyleText({color: value}, skipHistoryStack);
    },
    [applyStyleText],
  );

  const onBgColorSelect = useCallback(
    (value: string, skipHistoryStack: boolean) => {
      applyStyleText({'background-color': value}, skipHistoryStack);
    },
    [applyStyleText],
  );

  const insertLink = useCallback(() => {
    if (!toolbarState.isLink) {
      setIsLinkEditMode(true);
      activeEditor.dispatchCommand(
        TOGGLE_LINK_COMMAND,
        sanitizeUrl('https://'),
      );
    } else {
      setIsLinkEditMode(false);
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [activeEditor, setIsLinkEditMode, toolbarState.isLink]);

  const onCodeLanguageSelect = useCallback(
    (value: string) => {
      activeEditor.update(() => {
        if (selectedElementKey !== null) {
          const node = $getNodeByKey(selectedElementKey);
          if ($isCodeNode(node)) {
            node.setLanguage(value);
          }
        }
      });
    },
    [activeEditor, selectedElementKey],
  );

  const handleMarkdownToggle = useCallback(() => {
    activeEditor.update(() => {

      const root = $getRoot();
      const firstChild = root.getFirstChild();
      if ($isCodeNode(firstChild) && firstChild.getLanguage() === 'markdown') {
        $convertFromEnhancedMarkdownString(
          firstChild.getTextContent(),
          transformers
        );
      } else {
        const markdown = $convertToEnhancedMarkdownString(transformers);
        const codeNode = $createCodeNode('markdown');
        codeNode.append($createTextNode(markdown));
        root.clear().append(codeNode);
        if (markdown.length === 0) {
          codeNode.select();
        }
      }
      $getRoot().selectStart();
    }, {discrete: true});

  }, [activeEditor, shouldPreserveNewLinesInMarkdown, transformers]);

  const canViewerSeeInsertDropdown = !toolbarState.isImageCaption;
  const canViewerSeeInsertCodeButton = !toolbarState.isImageCaption;

    return (
    <div className="toolbar">
      {import.meta.env?.DEV && (
        <button
          className="toolbar-item spaced"
          onClick={handleMarkdownToggle}
          title={t('editor:diff.markdown_mode_toggle', 'Toggle Markdown Mode')}
          aria-label={t('editor:diff.markdown_mode_toggle', 'Toggle Markdown Mode')}>
          <i className="format markdown" />
        </button>
      )}
      {import.meta.env?.DEV && (
        <button
          onClick={() => {
            toggleSetting('showTreeView');
          }}
          className="toolbar-item spaced"
          title={t('editor:diff.debug_tree_toggle', 'Toggle Debug Tree')}
          type="button"
          aria-label={t('editor:diff.debug_tree_toggle', 'Toggle Debug Tree')}>
          <i className="format bug" />
        </button>
      )}
      <div className="divider toolbar-main-divider" />
      <button
        disabled={!toolbarState.canUndo || !isEditable}
        onClick={() => {
          activeEditor.dispatchCommand(UNDO_COMMAND, undefined);
        }}
        title={`${t('dialogs:keyboard_shortcuts.labels.undo', 'Undo')} (${IS_APPLE ? '⌘Z' : 'Ctrl+Z'})`}
        type="button"
        className="toolbar-item spaced"
        aria-label={t('dialogs:keyboard_shortcuts.labels.undo', 'Undo')}>
        <i className="format undo" />
      </button>
      <button
        disabled={!toolbarState.canRedo || !isEditable}
        onClick={() => {
          activeEditor.dispatchCommand(REDO_COMMAND, undefined);
        }}
        title={`${t('dialogs:keyboard_shortcuts.labels.redo', 'Redo')} (${IS_APPLE ? '⇧⌘Z' : 'Ctrl+Y'})`}
        type="button"
        className="toolbar-item"
        aria-label={t('dialogs:keyboard_shortcuts.labels.redo', 'Redo')}>
        <i className="format redo" />
      </button>
      <div className="divider toolbar-main-divider" />
      {toolbarState.blockType in blockTypeToBlockName &&
        activeEditor === editor && (
          <>
            <BlockFormatDropDown
              disabled={!isEditable}
              blockType={toolbarState.blockType}
              rootType={toolbarState.rootType}
              editor={activeEditor}
            />
            <div className="divider toolbar-main-divider" />
          </>
        )}
      {toolbarState.blockType === 'code' && isCodeHighlighted ? (
        <>

          <>
              <div className="toolbar-code-language">
                <DropDown
                  disabled={!isEditable}
                  buttonClassName="toolbar-item code-language"
                  buttonLabel={
                    (CODE_LANGUAGE_OPTIONS_SHIKI.find(
                      (opt) =>
                        opt[0] ===
                        normalizeCodeLanguageShiki(toolbarState.codeLanguage),
                    ) || ['', ''])[1]
                  }
                  buttonAriaLabel={t('editor:formatting.select_code_language', 'Select language')}>
                  {CODE_LANGUAGE_OPTIONS_SHIKI.map(([value, name]) => {
                    return (
                      <DropDownItem
                        className={`item ${dropDownActiveClass(
                          value === toolbarState.codeLanguage,
                        )}`}
                        onClick={() => onCodeLanguageSelect(value)}
                        key={value}>
                        <span className="text">{name}</span>
                      </DropDownItem>
                    );
                  })}
                </DropDown>
              </div>
            </>
        </>
      ) : (
        <>
          {!markdownOnly && (
            <>
              <div className="toolbar-font">
                <FontDropDown
                  disabled={!isEditable}
                  style={'font-family'}
                  value={toolbarState.fontFamily}
                  editor={activeEditor}
                />
                <div className="divider" />
                <FontSize
                  selectionFontSize={toolbarState.fontSize.slice(0, -2)}
                  editor={activeEditor}
                  disabled={!isEditable}
                />
              </div>
              <div className="divider toolbar-font-divider" />
            </>
          )}
          <div className="toolbar-formatting">
            <button
              disabled={!isEditable}
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
              }}
              className={
                'toolbar-item spaced ' + (toolbarState.isBold ? 'active' : '')
              }
              title={`${t('dialogs:keyboard_shortcuts.labels.bold', 'Bold')} (${SHORTCUTS.BOLD})`}
              type="button"
              aria-label={t('editor:formatting.with_shortcut', '{{description}}. Shortcut: {{shortcut}}', {description: t('editor:formatting.bold_description', 'Format text as bold'), shortcut: SHORTCUTS.BOLD})}>
              <i className="format bold" />
            </button>
            <button
              disabled={!isEditable}
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
              }}
              className={
                'toolbar-item spaced ' + (toolbarState.isItalic ? 'active' : '')
              }
              title={`${t('dialogs:keyboard_shortcuts.labels.italic', 'Italic')} (${SHORTCUTS.ITALIC})`}
              type="button"
              aria-label={t('editor:formatting.with_shortcut', '{{description}}. Shortcut: {{shortcut}}', {description: t('editor:formatting.italic_description', 'Format text as italics'), shortcut: SHORTCUTS.ITALIC})}>
              <i className="format italic" />
            </button>
            <button
              disabled={!isEditable}
              onClick={() => {
                activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
              }}
              className={
                'toolbar-item spaced ' +
                (toolbarState.isUnderline ? 'active' : '')
              }
              title={`${t('dialogs:keyboard_shortcuts.labels.underline', 'Underline')} (${SHORTCUTS.UNDERLINE})`}
              type="button"
              aria-label={t('editor:formatting.with_shortcut', '{{description}}. Shortcut: {{shortcut}}', {description: t('editor:formatting.underline_description', 'Format text to underlined'), shortcut: SHORTCUTS.UNDERLINE})}>
              <i className="format underline" />
            </button>
            {canViewerSeeInsertCodeButton && (
              <button
                disabled={!isEditable}
                onClick={() => {
                  activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
                }}
                className={
                  'toolbar-item spaced ' + (toolbarState.isCode ? 'active' : '')
                }
                title={`${t('editor:formatting.insert_code', 'Insert code block')} (${SHORTCUTS.INSERT_CODE_BLOCK})`}
                type="button"
                aria-label={t('editor:formatting.insert_code', 'Insert code block')}>
                <i className="format code" />
              </button>
            )}
            <button
              disabled={!isEditable}
              onClick={insertLink}
              className={
                'toolbar-item spaced ' + (toolbarState.isLink ? 'active' : '')
              }
              aria-label={t('dialogs:keyboard_shortcuts.labels.insert_link', 'Insert Link')}
              title={`${t('dialogs:keyboard_shortcuts.labels.insert_link', 'Insert Link')} (${SHORTCUTS.INSERT_LINK})`}
              type="button">
              <i className="format link" />
            </button>
          </div>
          {!markdownOnly && (
            <>
              <div className="toolbar-colors">
                <DropdownColorPicker
                  disabled={!isEditable}
                  buttonClassName="toolbar-item color-picker"
                  buttonAriaLabel={t('editor:formatting.text_color_options', 'Formatting text color')}
                  buttonIconClassName="icon font-color"
                  color={toolbarState.fontColor}
                  onChange={onFontColorSelect}
                  title={t('editor:formatting.text_color', 'text color')}
                />
                <DropdownColorPicker
                  disabled={!isEditable}
                  buttonClassName="toolbar-item color-picker"
                  buttonAriaLabel={t('editor:formatting.background_color_options', 'Formatting background color')}
                  buttonIconClassName="icon bg-color"
                  color={toolbarState.bgColor}
                  onChange={onBgColorSelect}
                  title={t('editor:formatting.background_color', 'bg color')}
                />
              </div>
            </>
          )}
          <div className="toolbar-additional">
            <DropDown
              disabled={!isEditable}
              buttonClassName="toolbar-item spaced"
              buttonLabel=""
              buttonAriaLabel={t('editor:formatting.additional_options', 'Formatting options for additional text styles')}
              buttonIconClassName="icon dropdown-more">
            {!markdownOnly && (
              <>
                <DropDownItem
                  onClick={() => {
                    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'lowercase');
                  }}
                  className={
                    'item wide ' + dropDownActiveClass(toolbarState.isLowercase)
                  }
                  title={t('dialogs:keyboard_shortcuts.labels.lowercase', 'Lowercase')}
                  aria-label={t('editor:formatting.lowercase_description', 'Format text to lowercase')}>
                  <div className="icon-text-container">
                    <i className="icon lowercase" />
                    <span className="text">{t('dialogs:keyboard_shortcuts.labels.lowercase', 'Lowercase')}</span>
                  </div>
                  <span className="shortcut">{SHORTCUTS.LOWERCASE}</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() => {
                    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'uppercase');
                  }}
                  className={
                    'item wide ' + dropDownActiveClass(toolbarState.isUppercase)
                  }
                  title={t('dialogs:keyboard_shortcuts.labels.uppercase', 'Uppercase')}
                  aria-label={t('editor:formatting.uppercase_description', 'Format text to uppercase')}>
                  <div className="icon-text-container">
                    <i className="icon uppercase" />
                    <span className="text">{t('dialogs:keyboard_shortcuts.labels.uppercase', 'Uppercase')}</span>
                  </div>
                  <span className="shortcut">{SHORTCUTS.UPPERCASE}</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() => {
                    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'capitalize');
                  }}
                  className={
                    'item wide ' + dropDownActiveClass(toolbarState.isCapitalize)
                  }
                  title={t('dialogs:keyboard_shortcuts.labels.capitalize', 'Capitalize')}
                  aria-label={t('editor:formatting.capitalize_description', 'Format text to capitalize')}>
                  <div className="icon-text-container">
                    <i className="icon capitalize" />
                    <span className="text">{t('dialogs:keyboard_shortcuts.labels.capitalize', 'Capitalize')}</span>
                  </div>
                  <span className="shortcut">{SHORTCUTS.CAPITALIZE}</span>
                </DropDownItem>
              </>
            )}
            <DropDownItem
              onClick={() => {
                activeEditor.dispatchCommand(
                  FORMAT_TEXT_COMMAND,
                  'strikethrough',
                );
              }}
              className={
                'item wide ' + dropDownActiveClass(toolbarState.isStrikethrough)
              }
              title={t('dialogs:keyboard_shortcuts.labels.strikethrough', 'Strikethrough')}
              aria-label={t('editor:formatting.strikethrough_description', 'Format text with a strikethrough')}>
              <div className="icon-text-container">
                <i className="icon strikethrough" />
                <span className="text">{t('dialogs:keyboard_shortcuts.labels.strikethrough', 'Strikethrough')}</span>
              </div>
              <span className="shortcut">{SHORTCUTS.STRIKETHROUGH}</span>
            </DropDownItem>
            {!markdownOnly && (
              <>
                <DropDownItem
                  onClick={() => {
                    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
                  }}
                  className={
                    'item wide ' + dropDownActiveClass(toolbarState.isSubscript)
                  }
                  title={t('dialogs:keyboard_shortcuts.labels.subscript', 'Subscript')}
                  aria-label={t('editor:formatting.subscript_description', 'Format text with a subscript')}>
                  <div className="icon-text-container">
                    <i className="icon subscript" />
                    <span className="text">{t('dialogs:keyboard_shortcuts.labels.subscript', 'Subscript')}</span>
                  </div>
                  <span className="shortcut">{SHORTCUTS.SUBSCRIPT}</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() => {
                    activeEditor.dispatchCommand(
                      FORMAT_TEXT_COMMAND,
                      'superscript',
                    );
                  }}
                  className={
                    'item wide ' + dropDownActiveClass(toolbarState.isSuperscript)
                  }
                  title={t('dialogs:keyboard_shortcuts.labels.superscript', 'Superscript')}
                  aria-label={t('editor:formatting.superscript_description', 'Format text with a superscript')}>
                  <div className="icon-text-container">
                    <i className="icon superscript" />
                    <span className="text">{t('dialogs:keyboard_shortcuts.labels.superscript', 'Superscript')}</span>
                  </div>
                  <span className="shortcut">{SHORTCUTS.SUPERSCRIPT}</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() => {
                    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight');
                  }}
                  className={
                    'item wide ' + dropDownActiveClass(toolbarState.isHighlight)
                  }
                  title={t('editor:formatting.highlight', 'Highlight')}
                  aria-label={t('editor:formatting.highlight_description', 'Format text with a highlight')}>
                  <div className="icon-text-container">
                    <i className="icon highlight" />
                    <span className="text">{t('editor:formatting.highlight', 'Highlight')}</span>
                  </div>
                </DropDownItem>
              </>
            )}
            <DropDownItem
              onClick={() => clearFormatting(activeEditor)}
              className="item wide"
              title={t('dialogs:keyboard_shortcuts.labels.clear_formatting', 'Clear Formatting')}
              aria-label={t('editor:formatting.clear_description', 'Clear all text formatting')}>
              <div className="icon-text-container">
                <i className="icon clear" />
                <span className="text">{t('dialogs:keyboard_shortcuts.labels.clear_formatting', 'Clear Formatting')}</span>
              </div>
              <span className="shortcut">{SHORTCUTS.CLEAR_FORMATTING}</span>
            </DropDownItem>
            </DropDown>
          </div>
          {canViewerSeeInsertDropdown && (
            <>
              <div className="divider toolbar-insert-divider" />
              <div className="toolbar-insert">
                <DropDown
                  disabled={!isEditable}
                  buttonClassName="toolbar-item spaced"
                  buttonLabel={t('editor:formatting.insert', 'Insert')}
                  buttonAriaLabel={t('editor:formatting.insert_node', 'Insert specialized editor node')}
                  buttonIconClassName="icon plus">
                <DropDownItem
                  onClick={() => {
                    activeEditor.dispatchCommand(
                      INSERT_HORIZONTAL_RULE_COMMAND,
                      undefined,
                    );
                  }}
                  className="item">
                  <i className="icon horizontal-rule" />
                  <span className="text">{t('editor:formatting.horizontal_rule', 'Horizontal Rule')}</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() => {
                    activeEditor.dispatchCommand(INSERT_PAGE_BREAK, undefined);
                  }}
                  className="item">
                  <i className="icon page-break" />
                  <span className="text">{t('editor:formatting.page_break', 'Page Break')}</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() => {
                    showModal(<InsertModalTitle kind="image" />, (onClose) => (
                      <InsertImageDialog
                        activeEditor={activeEditor}
                        onClose={onClose}
                      />
                    ));
                  }}
                  className="item">
                  <i className="icon image" />
                  <span className="text">{t('aichat:visual.image', 'Image')}</span>
                </DropDownItem>
                <DropDownItem
                  onClick={() => {
                    showModal(<InsertModalTitle kind="table" />, (onClose) => (
                      <InsertTableDialog
                        activeEditor={activeEditor}
                        onClose={onClose}
                      />
                    ));
                  }}
                  className="item">
                  <i className="icon table" />
                  <span className="text">{t('settings:database.table', 'Table')}</span>
                </DropDownItem>
                {!markdownOnly && (
                  <>

                    <DropDownItem
                      onClick={() => {
                        showModal(<InsertModalTitle kind="layout" />, (onClose) => (
                          <InsertLayoutDialog
                            activeEditor={activeEditor}
                            onClose={onClose}
                          />
                        ));
                      }}
                      className="item">
                      <i className="icon columns" />
                      <span className="text">{t('editor:formatting.columns_layout', 'Columns Layout')}</span>
                    </DropDownItem>

                  </>
                )}
                <DropDownItem
                  onClick={() => {
                    editor.dispatchCommand(
                      INSERT_COLLAPSIBLE_COMMAND,
                      undefined,
                    );
                  }}
                  className="item">
                  <i className="icon caret-right" />
                  <span className="text">{t('editor:formatting.collapsible_container', 'Collapsible container')}</span>
                </DropDownItem>
                {/* Disabled until the embed insert handlers are implemented.
                {!markdownOnly && EmbedConfigs.map((embedConfig) => (
                  <DropDownItem
                    key={embedConfig.type}
                    onClick={() => {
                      activeEditor.dispatchCommand(
                        INSERT_EMBED_COMMAND,
                        embedConfig.type,
                      );
                    }}
                    className="item">
                    {embedConfig.icon}
                    <span className="text">{embedConfig.contentName}</span>
                  </DropDownItem>
                ))} */}
                </DropDown>
              </div>
            </>
          )}
        </>
      )}
      {!markdownOnly && (
        <>
          <div className="divider toolbar-alignment-divider" />
          <div className="toolbar-alignment">
            <ElementFormatDropdown
              disabled={!isEditable}
              value={toolbarState.elementFormat}
              editor={activeEditor}
              isRTL={toolbarState.isRTL}
            />
          </div>
        </>
      )}
      <div className="divider toolbar-main-divider" />
      <TableOfContentsDropdownPlugin disabled={!isEditable} />
      {/*<ThemeToggle className="toolbar-item" />*/}

      {modal}
    </div>
  );
}
