import { useId, useLayoutEffect } from 'react';
import {
  LexicalTypeaheadMenuPlugin,
  type MenuOption,
  type TypeaheadMenuPluginProps,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { useTranslation } from '@nimbalyst/i18n/react';

/** Localize only the anchor owned by this plugin, including its closed state. */
export function LocalizedTypeaheadMenuPlugin<TOption extends MenuOption>(
  props: TypeaheadMenuPluginProps<TOption>,
) {
  const { t } = useTranslation('editor');
  const anchorClass = `localized-typeahead-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const label = t('typeahead_menu_label');

  useLayoutEffect(() => {
    const anchor = document.getElementsByClassName(anchorClass)[0];
    if (!anchor) return;
    const updateLabel = () => {
      if (anchor.getAttribute('aria-label') !== label) {
        anchor.setAttribute('aria-label', label);
      }
    };
    updateLabel();
    // Lexical reapplies its default when reconnecting the same menu anchor.
    const observer = new MutationObserver(updateLabel);
    observer.observe(anchor, { attributes: true, attributeFilter: ['aria-label'] });
    return () => observer.disconnect();
  }, [anchorClass, label]);

  return <LexicalTypeaheadMenuPlugin {...props} anchorClassName={`${props.anchorClassName ?? ''} ${anchorClass}`} />;
}
