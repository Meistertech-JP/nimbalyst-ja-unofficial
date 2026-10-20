/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useTheme} from '../context/ThemeContext';
import {useRuntimeTranslation} from '../../ui/RuntimeTranslation';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({className = ''}: ThemeToggleProps): JSX.Element {
  const {t} = useRuntimeTranslation();
  const {theme, toggleTheme} = useTheme();
  const label = theme === 'light'
    ? t('editor:shared_ui.switch_dark', 'Switch to dark mode')
    : t('editor:shared_ui.switch_light', 'Switch to light mode');

  return (
    <button
      className={`theme-toggle flex items-center justify-center border-none bg-none rounded-[10px] p-2 cursor-pointer transition-colors duration-200 min-w-[36px] h-9 hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
      onClick={toggleTheme}
      title={label}
      aria-label={label}
    >
      <span className={`theme-toggle-icon text-base flex items-center justify-center transition-transform duration-200 hover:scale-110 ${theme}`}>
        {theme === 'light' ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
