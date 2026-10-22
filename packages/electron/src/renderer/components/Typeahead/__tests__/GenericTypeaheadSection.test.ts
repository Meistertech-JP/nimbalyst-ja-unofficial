import { describe, expect, it } from 'vitest';
import { getTypeaheadSectionTranslationKey } from '../GenericTypeahead';

describe('getTypeaheadSectionTranslationKey', () => {
  it('maps built-in slash-command and skill groups to existing editor keys', () => {
    expect(getTypeaheadSectionTranslationKey('Built-in Commands')).toBe('typeahead.builtin_commands');
    expect(getTypeaheadSectionTranslationKey('Project Commands')).toBe('typeahead.project_commands');
    expect(getTypeaheadSectionTranslationKey('User Commands')).toBe('typeahead.user_commands');
    expect(getTypeaheadSectionTranslationKey('Extension Commands')).toBe('typeahead.extension_commands');
    expect(getTypeaheadSectionTranslationKey('Project Skills')).toBe('typeahead.project_skills');
    expect(getTypeaheadSectionTranslationKey('User Skills')).toBe('typeahead.user_skills');
    expect(getTypeaheadSectionTranslationKey('Plugin Skills')).toBe('typeahead.plugin_skills');
  });

  it('leaves dynamic or user-provided section labels untouched', () => {
    expect(getTypeaheadSectionTranslationKey('Acme Extension')).toBeNull();
  });
});
