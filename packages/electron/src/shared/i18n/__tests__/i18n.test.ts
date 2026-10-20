import { describe, it, expect } from 'vitest';
import { createInstance } from 'i18next';
import { resources } from '../resources';
import { defaultNS, fallbackLng, normalizeLocale, resolveLocalePreference, resolveSystemLocale, supportedLngs } from '../types';
import { getDescriptor } from '../../settings/keys';

function flattenStrings(value: unknown, prefix = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[prefix, value]];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenStrings(child, prefix ? `${prefix}.${key}` : key));
}

function interpolationVariables(text: string): string[] {
  return [...new Set(Array.from(text.matchAll(/\{\{\s*([^},]+)[^}]*\}\}/g), match => match[1].trim()))].sort();
}

describe('i18n infrastructure', () => {
  it('normalizes locale correctly', () => {
    expect(normalizeLocale('system')).toBe('system');
    expect(normalizeLocale('ja')).toBe('ja');
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('invalid' as any)).toBe('system');
    expect(normalizeLocale(null)).toBe('system');
    expect(normalizeLocale(undefined)).toBe('system');
  });

  it('resolves system locale', () => {
    expect(resolveSystemLocale('ja-JP')).toBe('ja');
    expect(resolveSystemLocale('en-US')).toBe('en');
    expect(resolveSystemLocale('fr-FR')).toBe('en');
  });

  it('identifies supported locales via constant', () => {
    expect(supportedLngs).toContain('en');
    expect(supportedLngs).toContain('ja');
  });

  it('resolves an explicit or system language preference', () => {
    expect(resolveLocalePreference('system', 'ja-JP')).toBe('ja');
    expect(resolveLocalePreference('system', 'en-US')).toBe('en');
    expect(resolveLocalePreference('ja', 'en-US')).toBe('ja');
    expect(resolveLocalePreference('en', 'ja-JP')).toBe('en');
  });

  it('registers uiLanguage independently in the flat-key settings store', () => {
    const descriptor = getDescriptor('uiLanguage');
    expect(descriptor.defaultValue).toBe('system');
    expect(descriptor.storage).toEqual({ store: 'app-settings', path: 'uiLanguage' });
    expect(descriptor.schema.safeParse('ja').success).toBe(true);
    expect(descriptor.schema.safeParse('invalid').success).toBe(false);
  });
  it('maintains key consistency between en and ja namespaces', () => {
    const enNamespaces = Object.keys(resources.en);
    const jaNamespaces = Object.keys(resources.ja);
    expect(enNamespaces).toEqual(jaNamespaces);

    const collectKeys = (obj: any, prefix = ''): string[] => {
      let keys: string[] = [];
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          keys = keys.concat(collectKeys(obj[key], `${prefix}${key}.`));
        } else {
          keys.push(`${prefix}${key}`);
        }
      }
      return keys;
    };

    for (const ns of enNamespaces) {
      const enKeys = collectKeys((resources.en as any)[ns]).sort();
      const jaKeys = collectKeys((resources.ja as any)[ns]).sort();

      const missingInJa = enKeys.filter(k => !jaKeys.includes(k));
      const missingInEn = jaKeys.filter(k => !enKeys.includes(k));

      expect(missingInJa, `Namespace "${ns}" is missing these keys in Japanese`).toEqual([]);
      expect(missingInEn, `Namespace "${ns}" is missing these keys in English`).toEqual([]);
    }
  });

  it('provides nonempty translations with matching interpolation variables', () => {
    const en = Object.fromEntries(flattenStrings(resources.en));
    const ja = Object.fromEntries(flattenStrings(resources.ja));
    for (const [key, english] of Object.entries(en)) {
      expect(english.trim(), `${key}: empty English value`).not.toBe('');
      expect(ja[key]?.trim(), `${key}: empty Japanese value`).toBeTruthy();
      expect(interpolationVariables(ja[key]), `${key}: interpolation mismatch`).toEqual(interpolationVariables(english));
    }
  });

  it('uses native i18next plural forms rather than unsupported ICU expressions', async () => {
    for (const [key, text] of flattenStrings(resources)) {
      expect(text, `${key}: unsupported ICU plural expression`).not.toMatch(/\{\w+,\s*plural,/);
    }
    const instance = createInstance();
    await instance.init({ lng: 'en', resources, fallbackLng, defaultNS, supportedLngs, interpolation: { escapeValue: false } });
    expect(instance.t('project:team.move_seat_impact', { name: 'User team', count: 1 })).toBe('Seat impact on User team: +1 seat.');
    expect(instance.t('project:team.move_seat_impact', { name: 'User team', count: 2 })).toBe('Seat impact on User team: +2 seats.');
    await instance.changeLanguage('ja');
    expect(instance.t('project:team.move_seat_impact', { name: 'User team', count: 2 })).toBe('User teamへの席数の影響：+2席。');
  });

  it('preserves newline formatting in native confirmation dialogs', () => {
    for (const language of [resources.en, resources.ja]) {
      expect(language.menu.project_not_found_message).toContain('\n');
      expect(language.menu.project_not_found_message).not.toContain('\\n');
      expect(language.project.trust_toast.confirm_revoke).toContain('\n\n');
      expect(language.project.trust_toast.confirm_revoke).not.toContain('\\n');
    }
  });

  it('falls back to English and preserves explicit unknown-key defaults', async () => {
    const instance = createInstance();
    await instance.init({ lng: 'fr', resources, fallbackLng, defaultNS, supportedLngs, returnEmptyString: false, returnNull: false, interpolation: { escapeValue: false } });
    expect(instance.resolvedLanguage).toBe('en');
    expect(instance.t('editor:collab.copy_current_document')).toBe('Copy current document');
    await instance.changeLanguage('ja');
    expect(instance.t('editor:collab.copy_current_document')).toBe('現在のドキュメントをコピー');
    expect(instance.t('unknown-extension:title', { defaultValue: 'User-defined title' })).toBe('User-defined title');
  });
});
