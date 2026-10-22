// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createI18nInstance } from '@nimbalyst/i18n/core';
import { UiLanguageProvider } from '@nimbalyst/i18n/react';
import { RtlSettingsPanel } from '../RtlSettingsPanel';

afterEach(cleanup);

test('the RTL settings panel localizes its labels and helper text in Japanese', async () => {
  const i18n = await createI18nInstance('ja');
  render(
    <UiLanguageProvider i18n={i18n} preference="ja" systemLocale="ja">
      <RtlSettingsPanel />
    </UiLanguageProvider>,
  );

  expect(screen.getByRole('heading', { name: 'RTLサポート' })).toBeDefined();
  expect(screen.getByText('エージェントのトランスクリプトやMarkdown内の右から左へ書くテキストを自動検出します。変更はすぐに反映されます。')).toBeDefined();
  expect(screen.getByText('RTLサポートを有効にする')).toBeDefined();
  expect(screen.getByText('拡張機能のオン・オフを切り替えます')).toBeDefined();
  expect(screen.getByText('モード')).toBeDefined();
  expect(screen.getByText('ブロックごとに自動検出し、RTL/LTRは方向を固定します')).toBeDefined();
  expect(screen.getByRole('button', { name: '自動' })).toBeDefined();
  expect(screen.getByText('RTL判定のしきい値：30%')).toBeDefined();
  expect(screen.getByText('ブロックをRTLと判定するために必要なRTL文字の最小割合です')).toBeDefined();
  expect(screen.getByText('ブロックごとに検出')).toBeDefined();
  expect(screen.getByText('メッセージが混在する場合に推奨。テキストブロックごとに個別に解析します')).toBeDefined();
  expect(screen.getByText('入力欄でRTLを使用')).toBeDefined();
  expect(screen.getByText('RTL言語を入力するとき、入力方向をRTLに切り替えます')).toBeDefined();
  expect(screen.getByText('文中の検出')).toBeDefined();
  expect(screen.getByText('LTRの段落内にあるRTLテキストを分離し、双方向テキストを正しく表示します')).toBeDefined();
  expect(screen.getByText('デバッグログ')).toBeDefined();
  expect(screen.getByText('問題調査のため、検出ログをコンソールに出力します')).toBeDefined();
  expect(screen.getByText('既定値に戻す')).toBeDefined();
  expect(screen.getByText('Ctrl+Shift+RでRTLサポートをすばやく切り替え')).toBeDefined();
});
